/**
 * A module which provides capabilities to deal with handling HTTP
 * [range requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests).
 *
 * The {@linkcode range} function can be used to determine if a range can be
 * satisfied for a requested resource. The {@linkcode responseRange} can be used
 * to fulfill range requests.
 *
 * The module provides specific support for {@linkcode Deno.FsFile} to provide
 * an efficient way of send the response to the range request without having to
 * read the whole file into memory by using the `.seek()` API.
 *
 * There are also some lower level constructs which can be used for advanced
 * use cases.
 *
 *   - {@linkcode MultiPartByteRangesStream} is a readable stream which
 *     generates a body that converts the source to a multipart byte range
 *     document.
 *   - {@linkcode RangeByteTransformStream} is a transform stream which will
 *     only stream the bytes indicated by the range.
 *   - {@linkcode contentRange} sets the headers that are appropriate when
 *     sending a range content response.
 *   - {@linkcode multiPartByteRanges} sets the headers that are appropriate
 *     when sending a multi part byte range content response.
 *   - {@linkcode asLimitedReadableStream} leverages the `.seek()` APIs with a
 *     {@linkcode Deno.FsFile} to provide a more performant and memory efficient
 *     way to stream just a range of bytes form a file.
 *
 * @example A simple static webserver supporting range requests
 *
 * ```ts
 * import { range, responseRange } from "jsr:@oak/commons/range";
 * import { typeByExtension } from "jsr:@std/media-types/type-by-extension";
 * import { extname } from "jsr:@std/path/extname";
 *
 * Deno.serve(async (req) => {
 *   const url = new URL(req.url);
 *   const file = await Deno.open(`./static${url.pathname}`);
 *   const fileInfo = await file.stat();
 *   const headers = { "accept-ranges": "bytes", "content-type": type };
 *   if (req.method === "HEAD") {
 *     return new Response(null, {
 *       headers: {
 *         ...headers,
 *         "content-length": String(fileInfo.size),
 *       },
 *     });
 *   }
 *   if (req.method === "GET") {
 *     const result = await range(req, fileInfo);
 *     if (result.ok) {
 *       if (result.ranges) {
 *         return responseRange(file, fileInfo.size, result.ranges, {
 *           headers,
 *         }, { type });
 *       } else {
 *         return new Response(file.readable, {
 *           headers: {
 *             ...headers,
 *             "content-length": String(fileInfo.size),
 *           },
 *         });
 *       }
 *     } else {
 *       return new Response(null, {
 *         status: 416,
 *         statusText: "Range Not Satisfiable",
 *         headers,
 *       });
 *     }
 *   }
 *   return new Response(null, { status: 405, statusText: "Method Not Allowed" });
 * });
 * ```
 *
 * @module
 */ import { assert } from "jsr:/@std/assert@0.226/assert";
import { concat } from "jsr:/@std/bytes@0.224/concat";
import { calculate } from "jsr:/@std/http@0.224/etag";
const DEFAULT_CHUNK_SIZE = 524_288;
const ETAG_RE = /(?:W\/)?"[ !#-\x7E\x80-\xFF]+"/;
const encoder = new TextEncoder();
function isDenoFsFile(value) {
  if (!value || value === null || !("Deno" in globalThis) || !Deno.FsFile) {
    return false;
  }
  return value instanceof Deno.FsFile;
}
function isFileInfo(value) {
  return !!(typeof value === "object" && value && "mtime" in value);
}
function isModified(value, mtime) {
  const a = new Date(value).getTime();
  let b = mtime.getTime();
  // adjust to the precision of HTTP UTC time
  b -= b % 1000;
  return a < b;
}
async function readRange(file, { start, end }) {
  const parts = [];
  let read = 0;
  const length = end - start + 1;
  const pos = await file.seek(start, Deno.SeekMode.Start);
  if (pos !== start) {
    throw new RangeError("Could not seek to range start.");
  }
  while(read < length){
    const chunk = new Uint8Array(length - read);
    const count = await file.read(chunk);
    if (count === null) {
      throw new RangeError("Could not read to range end.");
    }
    parts.push(chunk);
    read += count;
  }
  return parts.length > 1 ? concat(parts) : parts[0];
}
/**
 * A readable stream that will stream a body formatted as a
 * `multipart/byteranges` document. The `source` needs to be a
 * {@linkcode Deno.FsFile}, {@linkcode ReadableStream}, {@linkcode Blob},
 * {@linkcode BufferSource}, or a `string`.
 */ export class MultiPartByteRangesStream extends ReadableStream {
  #boundary;
  #contentLength;
  #postscript;
  #previous;
  #ranges;
  #seen = 0;
  #source;
  #type;
  /**
   * The boundary being used when segmenting different parts of the body
   * response. This should be reflected in the `Content-Type` header when
   * being sent to a client.
   */ get boundary() {
    return this.#boundary;
  }
  /**
   * The length of the content being supplied by the stream. This should be
   * reflected in the `Content-Length` header when being sent to a client.
   */ get contentLength() {
    return this.#contentLength;
  }
  async #readRange({ start, end }) {
    if (isDenoFsFile(this.#source)) {
      return readRange(this.#source, {
        start,
        end
      });
    }
    if (this.#source instanceof Blob) {
      return new Uint8Array(await this.#source.slice(start, end + 1).arrayBuffer());
    }
    if (this.#source instanceof ArrayBuffer) {
      return new Uint8Array(this.#source.slice(start, end + 1));
    }
    const length = end - start;
    let read = 0;
    let result;
    const processChunk = (chunk)=>{
      if (this.#seen + chunk.byteLength >= start) {
        if (this.#seen < start) {
          chunk = chunk.slice(start - this.#seen);
          this.#seen = start;
        }
        if (read + chunk.byteLength > length + 1) {
          this.#previous = chunk.slice(length - read + 1);
          chunk = chunk.slice(0, length - read + 1);
        }
        read += chunk.byteLength;
        this.#seen += chunk.byteLength;
        return chunk;
      }
      this.#seen += chunk.byteLength;
    };
    if (this.#previous) {
      const chunk = this.#previous;
      this.#previous = undefined;
      const res = processChunk(chunk);
      if (res) {
        result = res;
      }
    }
    while(read < length){
      const { done, value: chunk } = await this.#source.read();
      if (chunk) {
        const res = processChunk(chunk);
        if (res) {
          result = result ? concat([
            result,
            res
          ]) : res;
        }
      }
      if (done) {
        throw new RangeError("Unable to read range.");
      }
    }
    assert(result);
    return result;
  }
  constructor(source, ranges, size, options = {}){
    const { autoClose = true, boundary = "OAK-COMMONS-BOUNDARY", type } = options;
    super({
      pull: async (controller)=>{
        const range = this.#ranges.shift();
        if (!range) {
          controller.enqueue(this.#postscript);
          controller.close();
          if (autoClose && isDenoFsFile(this.#source)) {
            this.#source.close();
          }
          if (this.#source instanceof ReadableStreamDefaultReader) {
            this.#source.releaseLock();
          }
          return;
        }
        const bytes = await this.#readRange(range);
        const preamble = encoder.encode(`\r\n--${boundary}\r\nContent-Type: ${this.#type}\r\nContent-Range: ${range.start}-${range.end}/${size}\r\n\r\n`);
        controller.enqueue(concat([
          preamble,
          bytes
        ]));
      }
    });
    this.#boundary = boundary;
    this.#ranges = [
      ...ranges
    ];
    this.#ranges.sort(({ start: a }, { start: b })=>a - b);
    if (ArrayBuffer.isView(source)) {
      this.#source = source.buffer;
    } else if (typeof source === "string") {
      this.#source = encoder.encode(source).buffer;
    } else if (source instanceof ReadableStream) {
      this.#source = source.getReader();
    } else {
      this.#source = source;
    }
    this.#type = type || source instanceof Blob && source.type || "application/octet-stream";
    this.#postscript = encoder.encode(`\r\n--${boundary}--\r\n`);
    this.#contentLength = ranges.reduce((prev, { start, end })=>prev + encoder.encode(`\r\n--${boundary}\r\nContent-Type: ${this.#type}\r\nContent-Range: ${start}-${end}/${size}\r\n\r\n`).byteLength + (end - start) + 1, this.#postscript.byteLength);
  }
}
/**
 * A {@linkcode TransformStream} which will only provide the range of bytes from
 * the source stream.
 */ export class RangeByteTransformStream extends TransformStream {
  constructor(range){
    const { start, end } = range;
    const length = end - start;
    let seen = 0;
    let read = 0;
    super({
      transform (chunk, controller) {
        if (seen + chunk.byteLength >= start) {
          if (seen < start) {
            // start is part way through chunk
            chunk = chunk.slice(start - seen);
            seen = start;
          }
          if (read + chunk.byteLength > length + 1) {
            // chunk extends past end
            chunk = chunk.slice(0, length - read + 1);
          }
          read += chunk.byteLength;
          seen += chunk.byteLength;
          controller.enqueue(chunk);
          if (read >= length) {
            controller.terminate();
          }
        } else {
          // skip chunk
          seen += chunk.byteLength;
        }
      }
    });
  }
}
/**
 * Set {@linkcode Headers} related to returning a content range to the client.
 *
 * This will set the `Accept-Ranges`, `Content-Range` and `Content-Length` as
 * appropriate. If the headers does not contain a `Content-Type` header, and one
 * is supplied, it will be added.
 */ export function contentRange(headers, range, size, type) {
  const { start, end } = range;
  headers.set("accept-ranges", "bytes");
  headers.set("content-range", `bytes ${start}-${end}/${size}`);
  headers.set("content-length", String(end - start + 1));
  if (type && !headers.has("content-type")) {
    headers.set("content-type", type);
  }
}
/**
 * Set {@linkcode Headers} related to returning a multipart byte range response.
 *
 * This will set the `Content-Type` and `Content-Length` headers as appropriate.
 */ export function multiPartByteRanges(headers, init) {
  const { contentLength, boundary } = init;
  headers.set("content-type", `multipart/byteranges; boundary=${boundary}`);
  headers.set("content-length", String(contentLength));
}
/**
 * Converts a {@linkcode DenoFile} and a {@linkcode ByteRange} into a byte
 * {@linkcode ReadableStream} which will provide just the range of bytes.
 *
 * When the stream is finished being ready, the file will be closed. Changing
 * the option to `autoClose` to `false` will disable this behavior.
 */ export function asLimitedReadableStream(fsFile, range, options = {}) {
  const { start, end } = range;
  const { autoClose = true, chunkSize = DEFAULT_CHUNK_SIZE } = options;
  let read = 0;
  const length = end - start + 1;
  return new ReadableStream({
    start (controller) {
      const pos = fsFile.seekSync(start, Deno.SeekMode.Start);
      if (pos !== start) {
        controller.error(new RangeError("Could not seek to range start."));
      }
    },
    async pull (controller) {
      const chunk = new Uint8Array(Math.min(length - read, chunkSize));
      const count = await fsFile.read(chunk);
      if (count == null) {
        controller.error(new RangeError("Could not read to range end."));
        return;
      }
      controller.enqueue(chunk);
      read += count;
      if (read >= length) {
        controller.close();
        if (autoClose) {
          fsFile.close();
        }
      }
    },
    autoAllocateChunkSize: chunkSize,
    type: "bytes"
  });
}
export async function range(request, entity, fileInfo) {
  const ifRange = request.headers.get("if-range");
  if (ifRange) {
    const matches = ETAG_RE.exec(ifRange);
    if (matches) {
      const [match] = matches;
      // this indicates that it would be a weak tag, and we cannot compare on
      // weak tags, the full entity should be returned
      if (!fileInfo || match.startsWith("W")) {
        return {
          ok: true,
          ranges: null
        };
      }
      if (match !== await calculate(entity)) {
        return {
          ok: true,
          ranges: null
        };
      }
    } else {
      assert(fileInfo || isFileInfo(entity));
      const { mtime } = fileInfo ?? entity;
      if (!mtime || isModified(ifRange, mtime)) {
        return {
          ok: true,
          ranges: null
        };
      }
    }
  }
  const value = request.headers.get("range");
  if (!value) {
    return {
      ok: true,
      ranges: null
    };
  }
  const [unit, rangesStr] = value.split("=");
  if (unit !== "bytes") {
    return {
      ok: false,
      ranges: null
    };
  }
  const ranges = [];
  for (const range of rangesStr.split(/\s*,\s+/)){
    const item = range.split("-");
    if (item.length !== 2) {
      return {
        ok: false,
        ranges: null
      };
    }
    const { size } = fileInfo ?? entity;
    const [startStr, endStr] = item;
    let start;
    let end;
    try {
      if (startStr === "") {
        start = size - parseInt(endStr, 10) - 1;
        end = size - 1;
      } else if (endStr === "") {
        start = parseInt(startStr, 10);
        end = size - 1;
      } else {
        start = parseInt(startStr, 10);
        end = parseInt(endStr, 10);
      }
    } catch  {
      return {
        ok: false,
        ranges: null
      };
    }
    if (start < 0 || start >= size || end < 0 || end >= size || start > end) {
      return {
        ok: false,
        ranges: null
      };
    }
    ranges.push({
      start,
      end
    });
  }
  return {
    ok: true,
    ranges
  };
}
/**
 * Resolves with a {@linkcode Response} with a body which is just the range of
 * bytes supplied, along with the appropriate headers which indicate that it is
 * the fulfillment of a range request.
 *
 * The `body` is a {@linkcode Response} {@linkcode BodyInit} with the addition
 * of supporting {@linkcode Deno.FsFile} and does not accept
 * {@linkcode FormData} or {@linkcode URLSearchParams}. When using
 * {@linkcode Deno.FsFile} the seek capabilities in order to read ranges more
 * efficiently.
 *
 * The `size` is the total number of bytes in the resource being responded to.
 * This needs to be provided, because the full size of the resource being
 * requested it may not be easy to determine at the time being requested.
 *
 * @example
 *
 * ```ts
 * import { responseRange } from "jsr:@oak/commons/range";
 *
 * const file = await Deno.open("./movie.mp4");
 * const { size } = await file.stat();
 * const res = responseRange(
 *   file,
 *   size,
 *   { start: 0, end: 1_048_575 },
 *   { headers: { "content-type": "video/mp4" } },
 * );
 * const ab = await res.arrayBuffer();
 * // ab will be the first 1MB of the video file
 * ```
 */ export function responseRange(body, size, ranges, init = {}, options = {}) {
  if (!ranges.length) {
    throw new RangeError("At least one range expected.");
  }
  if (ranges.length === 1) {
    const [range] = ranges;
    let type = options.type ?? "application/octet-stream";
    if (isDenoFsFile(body)) {
      body = asLimitedReadableStream(body, range, options);
    } else if (body instanceof ReadableStream) {
      body = body.pipeThrough(new RangeByteTransformStream(range));
    } else if (body instanceof Blob) {
      type = body.type;
      body = body.slice(range.start, range.end + 1);
    } else if (ArrayBuffer.isView(body)) {
      body = body.buffer.slice(range.start, range.end + 1);
    } else if (body instanceof ArrayBuffer) {
      body = body.slice(range.start, range.end + 1);
    } else if (typeof body === "string") {
      body = encoder.encode(body).slice(range.start, range.end + 1);
    } else {
      throw TypeError("Invalid body type.");
    }
    const res = new Response(body, {
      ...init,
      status: 206,
      statusText: "Partial Content"
    });
    contentRange(res.headers, range, size, type);
    return res;
  }
  const stream = new MultiPartByteRangesStream(body, ranges, size, options);
  const res = new Response(stream, {
    ...init,
    status: 206,
    statusText: "Partial Content"
  });
  multiPartByteRanges(res.headers, stream);
  return res;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvY29tbW9ucy8wLjExLjAvcmFuZ2UudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBIG1vZHVsZSB3aGljaCBwcm92aWRlcyBjYXBhYmlsaXRpZXMgdG8gZGVhbCB3aXRoIGhhbmRsaW5nIEhUVFBcbiAqIFtyYW5nZSByZXF1ZXN0c10oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSFRUUC9SYW5nZV9yZXF1ZXN0cykuXG4gKlxuICogVGhlIHtAbGlua2NvZGUgcmFuZ2V9IGZ1bmN0aW9uIGNhbiBiZSB1c2VkIHRvIGRldGVybWluZSBpZiBhIHJhbmdlIGNhbiBiZVxuICogc2F0aXNmaWVkIGZvciBhIHJlcXVlc3RlZCByZXNvdXJjZS4gVGhlIHtAbGlua2NvZGUgcmVzcG9uc2VSYW5nZX0gY2FuIGJlIHVzZWRcbiAqIHRvIGZ1bGZpbGwgcmFuZ2UgcmVxdWVzdHMuXG4gKlxuICogVGhlIG1vZHVsZSBwcm92aWRlcyBzcGVjaWZpYyBzdXBwb3J0IGZvciB7QGxpbmtjb2RlIERlbm8uRnNGaWxlfSB0byBwcm92aWRlXG4gKiBhbiBlZmZpY2llbnQgd2F5IG9mIHNlbmQgdGhlIHJlc3BvbnNlIHRvIHRoZSByYW5nZSByZXF1ZXN0IHdpdGhvdXQgaGF2aW5nIHRvXG4gKiByZWFkIHRoZSB3aG9sZSBmaWxlIGludG8gbWVtb3J5IGJ5IHVzaW5nIHRoZSBgLnNlZWsoKWAgQVBJLlxuICpcbiAqIFRoZXJlIGFyZSBhbHNvIHNvbWUgbG93ZXIgbGV2ZWwgY29uc3RydWN0cyB3aGljaCBjYW4gYmUgdXNlZCBmb3IgYWR2YW5jZWRcbiAqIHVzZSBjYXNlcy5cbiAqXG4gKiAgIC0ge0BsaW5rY29kZSBNdWx0aVBhcnRCeXRlUmFuZ2VzU3RyZWFtfSBpcyBhIHJlYWRhYmxlIHN0cmVhbSB3aGljaFxuICogICAgIGdlbmVyYXRlcyBhIGJvZHkgdGhhdCBjb252ZXJ0cyB0aGUgc291cmNlIHRvIGEgbXVsdGlwYXJ0IGJ5dGUgcmFuZ2VcbiAqICAgICBkb2N1bWVudC5cbiAqICAgLSB7QGxpbmtjb2RlIFJhbmdlQnl0ZVRyYW5zZm9ybVN0cmVhbX0gaXMgYSB0cmFuc2Zvcm0gc3RyZWFtIHdoaWNoIHdpbGxcbiAqICAgICBvbmx5IHN0cmVhbSB0aGUgYnl0ZXMgaW5kaWNhdGVkIGJ5IHRoZSByYW5nZS5cbiAqICAgLSB7QGxpbmtjb2RlIGNvbnRlbnRSYW5nZX0gc2V0cyB0aGUgaGVhZGVycyB0aGF0IGFyZSBhcHByb3ByaWF0ZSB3aGVuXG4gKiAgICAgc2VuZGluZyBhIHJhbmdlIGNvbnRlbnQgcmVzcG9uc2UuXG4gKiAgIC0ge0BsaW5rY29kZSBtdWx0aVBhcnRCeXRlUmFuZ2VzfSBzZXRzIHRoZSBoZWFkZXJzIHRoYXQgYXJlIGFwcHJvcHJpYXRlXG4gKiAgICAgd2hlbiBzZW5kaW5nIGEgbXVsdGkgcGFydCBieXRlIHJhbmdlIGNvbnRlbnQgcmVzcG9uc2UuXG4gKiAgIC0ge0BsaW5rY29kZSBhc0xpbWl0ZWRSZWFkYWJsZVN0cmVhbX0gbGV2ZXJhZ2VzIHRoZSBgLnNlZWsoKWAgQVBJcyB3aXRoIGFcbiAqICAgICB7QGxpbmtjb2RlIERlbm8uRnNGaWxlfSB0byBwcm92aWRlIGEgbW9yZSBwZXJmb3JtYW50IGFuZCBtZW1vcnkgZWZmaWNpZW50XG4gKiAgICAgd2F5IHRvIHN0cmVhbSBqdXN0IGEgcmFuZ2Ugb2YgYnl0ZXMgZm9ybSBhIGZpbGUuXG4gKlxuICogQGV4YW1wbGUgQSBzaW1wbGUgc3RhdGljIHdlYnNlcnZlciBzdXBwb3J0aW5nIHJhbmdlIHJlcXVlc3RzXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IHJhbmdlLCByZXNwb25zZVJhbmdlIH0gZnJvbSBcImpzcjpAb2FrL2NvbW1vbnMvcmFuZ2VcIjtcbiAqIGltcG9ydCB7IHR5cGVCeUV4dGVuc2lvbiB9IGZyb20gXCJqc3I6QHN0ZC9tZWRpYS10eXBlcy90eXBlLWJ5LWV4dGVuc2lvblwiO1xuICogaW1wb3J0IHsgZXh0bmFtZSB9IGZyb20gXCJqc3I6QHN0ZC9wYXRoL2V4dG5hbWVcIjtcbiAqXG4gKiBEZW5vLnNlcnZlKGFzeW5jIChyZXEpID0+IHtcbiAqICAgY29uc3QgdXJsID0gbmV3IFVSTChyZXEudXJsKTtcbiAqICAgY29uc3QgZmlsZSA9IGF3YWl0IERlbm8ub3BlbihgLi9zdGF0aWMke3VybC5wYXRobmFtZX1gKTtcbiAqICAgY29uc3QgZmlsZUluZm8gPSBhd2FpdCBmaWxlLnN0YXQoKTtcbiAqICAgY29uc3QgaGVhZGVycyA9IHsgXCJhY2NlcHQtcmFuZ2VzXCI6IFwiYnl0ZXNcIiwgXCJjb250ZW50LXR5cGVcIjogdHlwZSB9O1xuICogICBpZiAocmVxLm1ldGhvZCA9PT0gXCJIRUFEXCIpIHtcbiAqICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHtcbiAqICAgICAgIGhlYWRlcnM6IHtcbiAqICAgICAgICAgLi4uaGVhZGVycyxcbiAqICAgICAgICAgXCJjb250ZW50LWxlbmd0aFwiOiBTdHJpbmcoZmlsZUluZm8uc2l6ZSksXG4gKiAgICAgICB9LFxuICogICAgIH0pO1xuICogICB9XG4gKiAgIGlmIChyZXEubWV0aG9kID09PSBcIkdFVFwiKSB7XG4gKiAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcmFuZ2UocmVxLCBmaWxlSW5mbyk7XG4gKiAgICAgaWYgKHJlc3VsdC5vaykge1xuICogICAgICAgaWYgKHJlc3VsdC5yYW5nZXMpIHtcbiAqICAgICAgICAgcmV0dXJuIHJlc3BvbnNlUmFuZ2UoZmlsZSwgZmlsZUluZm8uc2l6ZSwgcmVzdWx0LnJhbmdlcywge1xuICogICAgICAgICAgIGhlYWRlcnMsXG4gKiAgICAgICAgIH0sIHsgdHlwZSB9KTtcbiAqICAgICAgIH0gZWxzZSB7XG4gKiAgICAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoZmlsZS5yZWFkYWJsZSwge1xuICogICAgICAgICAgIGhlYWRlcnM6IHtcbiAqICAgICAgICAgICAgIC4uLmhlYWRlcnMsXG4gKiAgICAgICAgICAgICBcImNvbnRlbnQtbGVuZ3RoXCI6IFN0cmluZyhmaWxlSW5mby5zaXplKSxcbiAqICAgICAgICAgICB9LFxuICogICAgICAgICB9KTtcbiAqICAgICAgIH1cbiAqICAgICB9IGVsc2Uge1xuICogICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShudWxsLCB7XG4gKiAgICAgICAgIHN0YXR1czogNDE2LFxuICogICAgICAgICBzdGF0dXNUZXh0OiBcIlJhbmdlIE5vdCBTYXRpc2ZpYWJsZVwiLFxuICogICAgICAgICBoZWFkZXJzLFxuICogICAgICAgfSk7XG4gKiAgICAgfVxuICogICB9XG4gKiAgIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwgeyBzdGF0dXM6IDQwNSwgc3RhdHVzVGV4dDogXCJNZXRob2QgTm90IEFsbG93ZWRcIiB9KTtcbiAqIH0pO1xuICogYGBgXG4gKlxuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IGFzc2VydCB9IGZyb20gXCJqc3I6L0BzdGQvYXNzZXJ0QDAuMjI2L2Fzc2VydFwiO1xuaW1wb3J0IHsgY29uY2F0IH0gZnJvbSBcImpzcjovQHN0ZC9ieXRlc0AwLjIyNC9jb25jYXRcIjtcbmltcG9ydCB7XG4gIGNhbGN1bGF0ZSxcbiAgdHlwZSBFbnRpdHksXG4gIHR5cGUgRmlsZUluZm8sXG59IGZyb20gXCJqc3I6L0BzdGQvaHR0cEAwLjIyNC9ldGFnXCI7XG5cbi8qKlxuICogQSBkZXNjcmlwdG9yIGZvciB0aGUgc3RhcnQgYW5kIGVuZCBvZiBhIGJ5dGUgcmFuZ2UsIHdoaWNoIGFyZSBpbmNsdXNpdmUgb2ZcbiAqIHRoZSBieXRlcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBCeXRlUmFuZ2Uge1xuICAvKiogVGhlIHN0YXJ0IGJ5dGUgb2YgdGhlIHJhbmdlLiBUaGUgbnVtYmVyIGlzIHplcm8gaW5kZXhlZC4gKi9cbiAgc3RhcnQ6IG51bWJlcjtcbiAgLyoqIFRoZSBsYXN0IGJ5dGUgdG8gYmUgaW5jbHVkZWQgaW4gdGhlIHJhbmdlLiBUaGUgbnVtYmVyIGlzIHplcm8gaW5kZXhlZC4gKi9cbiAgZW5kOiBudW1iZXI7XG59XG5cbi8qKlxuICogT3B0aW9ucyB3aGljaCBjYW4gYmUgdXNlZCB3aGVuIGNyZWF0aW5nIGFcbiAqIHtAbGlua2NvZGUgTXVsdGlQYXJ0Qnl0ZVJhbmdlc1N0cmVhbX0uXG4gKi9cbmludGVyZmFjZSBNdWx0aVBhcnRCeXRlUmFuZ2VTdHJlYW1PcHRpb25zIHtcbiAgLyoqXG4gICAqIElmIHRoZSBzb3VyY2UgaXMgYSB7QGxpbmtjb2RlIERlbm8uRnNGaWxlfSwgY2xvc2UgdGhlIGZpbGUgb25jZSB0aGUgcmFuZ2VzXG4gICAqIGhhdmUgYmVlbiByZWFkIGZyb20gdGhlIGZpbGUuIFRoaXMgZGVmYXVsdHMgdG8gYHRydWVgLlxuICAgKi9cbiAgYXV0b0Nsb3NlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFRoZSBib3VuZGFyeSB0aGF0IHNob3VsZCBiZSB1c2VkIHdoZW4gY3JlYXRpbmcgcGFydHMgb2YgdGhlIHJlc3BvbnNlLiBBXG4gICAqIGRlZmF1bHQgb25lIGlzIHVzZWQgaWYgbm9uZSBpcyBzdXBwbGllZC5cbiAgICovXG4gIGJvdW5kYXJ5Pzogc3RyaW5nO1xuICAvKipcbiAgICogQSBjb250ZW50IHR5cGUgdG8gYmUgdXNlZCB3aXRoIHRoZSBwYXJ0cyBvZiB0aGUgcmVzcG9uc2UuIElmIG9uZSBpcyBub3RcbiAgICogc3VwcGxpZWQgYW5kIHRoZSBzb3VyY2UgaXMgYSB7QGxpbmtjb2RlIEJsb2J9LCB0aGUgYmxvYidzIGAudHlwZWAgd2lsbCBiZVxuICAgKiB1c2VkLCBvdGhlcndpc2UgYFwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCJgLlxuICAgKi9cbiAgdHlwZT86IHN0cmluZztcbn1cblxuLyoqXG4gKiBMaWtlIHtAbGlua2NvZGUgQm9keUluaXR9IGJ1dCBvbmx5IGFjY2VwdHMgdGhlIGJvZGllcyB3aGljaCBjYW4gYmUgcHJvdmlkZWRcbiAqIGFzIHJhbmdlcyBhcyB3ZWxsIGFzIGFkZHMge0BsaW5rY29kZSBEZW5vLkZzRmlsZX0uXG4gKi9cbmV4cG9ydCB0eXBlIFJhbmdlQm9keUluaXQgPVxuICB8IEJsb2JcbiAgfCBCdWZmZXJTb3VyY2VcbiAgfCBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PlxuICB8IHN0cmluZ1xuICB8IERlbm8uRnNGaWxlO1xuXG4vKipcbiAqIFRoZSByZXN1bHRzIG9iamVjdCB3aGVuIGNhbGxpbmcge0BsaW5rY29kZSByYW5nZX0uXG4gKi9cbmV4cG9ydCB0eXBlIFJhbmdlUmVzdWx0ID0ge1xuICBvazogdHJ1ZTtcbiAgcmFuZ2VzOiBCeXRlUmFuZ2VbXSB8IG51bGw7XG59IHwge1xuICBvazogZmFsc2U7XG4gIHJhbmdlczogbnVsbDtcbn07XG5cbi8qKlxuICogT3B0aW9ucyB3aGljaCBjYW4gYmUgc2V0IHdpdGgge0BsaW5rY29kZSByZXNwb25zZVJhbmdlfSBvclxuICoge0BsaW5rY29kZSBhc0xpbWl0ZWRSZWFkYWJsZVN0cmVhbX0uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVzcG9uc2VSYW5nZU9wdGlvbnMge1xuICAvKipcbiAgICogT25jZSB0aGUgc3RyZWFtIG9yIGJvZHkgaXMgZmluaXNoZWQgYmVpbmcgcmVhZCwgY2xvc2UgdGhlIHNvdXJjZVxuICAgKiB7QGxpbmtjb2RlIERlbm8uRnNGaWxlfS5cbiAgICpcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgYXV0b0Nsb3NlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFdoZW4gaGFuZGxpbmcgbXVsdGlwbGUgcmFuZ2VzIGFuZCBzZW5kaW5nIGEgbXVsdGlwbGUgcmVzcG9uc2UsIG92ZXJyaWRlXG4gICAqIHRoZSBkZWZhdWx0IGJvdW5kYXJ5LlxuICAgKi9cbiAgYm91bmRhcnk/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBUaGUgc2l6ZSBvZiB3aGljaCBjaHVua3MgYXJlIGF0dGVtcHRlZCB0byBiZSByZWFkLiBUaGlzIGRlZmF1bHRzIHRvIDUxMmsuXG4gICAqIFRoZSB2YWx1ZSBpcyBzcGVjaWZpZWQgaW4gbnVtYmVyIG9mIGJ5dGVzLlxuICAgKi9cbiAgY2h1bmtTaXplPzogbnVtYmVyO1xuICAvKipcbiAgICogUHJvdmlkZSBhIGNvbnRlbnQgdHlwZSBmb3IgdGhlIHJlc3BvbnNlLiBUaGlzIHdpbGwgb3ZlcnJpZGUgYW55IGF1dG9tYXRpY1xuICAgKiBkZXRlcm1pbmF0aW9uIG9mIHRoZSB0eXBlLlxuICAgKi9cbiAgdHlwZT86IHN0cmluZztcbn1cblxuY29uc3QgREVGQVVMVF9DSFVOS19TSVpFID0gNTI0XzI4ODtcbmNvbnN0IEVUQUdfUkUgPSAvKD86V1xcLyk/XCJbICEjLVxceDdFXFx4ODAtXFx4RkZdK1wiLztcbmNvbnN0IGVuY29kZXIgPSBuZXcgVGV4dEVuY29kZXIoKTtcblxuZnVuY3Rpb24gaXNEZW5vRnNGaWxlKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgRGVuby5Gc0ZpbGUge1xuICBpZiAoIXZhbHVlIHx8IHZhbHVlID09PSBudWxsIHx8ICEoXCJEZW5vXCIgaW4gZ2xvYmFsVGhpcykgfHwgIURlbm8uRnNGaWxlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIERlbm8uRnNGaWxlO1xufVxuXG5mdW5jdGlvbiBpc0ZpbGVJbmZvKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgRmlsZUluZm8ge1xuICByZXR1cm4gISEodHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIHZhbHVlICYmIFwibXRpbWVcIiBpbiB2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIGlzTW9kaWZpZWQodmFsdWU6IHN0cmluZywgbXRpbWU6IERhdGUpOiBib29sZWFuIHtcbiAgY29uc3QgYSA9IG5ldyBEYXRlKHZhbHVlKS5nZXRUaW1lKCk7XG4gIGxldCBiID0gbXRpbWUuZ2V0VGltZSgpO1xuICAvLyBhZGp1c3QgdG8gdGhlIHByZWNpc2lvbiBvZiBIVFRQIFVUQyB0aW1lXG4gIGIgLT0gYiAlIDEwMDA7XG4gIHJldHVybiBhIDwgYjtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcmVhZFJhbmdlKFxuICBmaWxlOiBEZW5vLkZzRmlsZSxcbiAgeyBzdGFydCwgZW5kIH06IEJ5dGVSYW5nZSxcbik6IFByb21pc2U8VWludDhBcnJheT4ge1xuICBjb25zdCBwYXJ0czogVWludDhBcnJheVtdID0gW107XG4gIGxldCByZWFkID0gMDtcbiAgY29uc3QgbGVuZ3RoID0gZW5kIC0gc3RhcnQgKyAxO1xuICBjb25zdCBwb3MgPSBhd2FpdCBmaWxlLnNlZWsoc3RhcnQsIERlbm8uU2Vla01vZGUuU3RhcnQpO1xuICBpZiAocG9zICE9PSBzdGFydCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKFwiQ291bGQgbm90IHNlZWsgdG8gcmFuZ2Ugc3RhcnQuXCIpO1xuICB9XG4gIHdoaWxlIChyZWFkIDwgbGVuZ3RoKSB7XG4gICAgY29uc3QgY2h1bmsgPSBuZXcgVWludDhBcnJheShsZW5ndGggLSByZWFkKTtcbiAgICBjb25zdCBjb3VudCA9IGF3YWl0IGZpbGUucmVhZChjaHVuayk7XG4gICAgaWYgKGNvdW50ID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihcIkNvdWxkIG5vdCByZWFkIHRvIHJhbmdlIGVuZC5cIik7XG4gICAgfVxuICAgIHBhcnRzLnB1c2goY2h1bmspO1xuICAgIHJlYWQgKz0gY291bnQ7XG4gIH1cbiAgcmV0dXJuIHBhcnRzLmxlbmd0aCA+IDEgPyBjb25jYXQocGFydHMpIDogcGFydHNbMF07XG59XG5cbi8qKlxuICogQSByZWFkYWJsZSBzdHJlYW0gdGhhdCB3aWxsIHN0cmVhbSBhIGJvZHkgZm9ybWF0dGVkIGFzIGFcbiAqIGBtdWx0aXBhcnQvYnl0ZXJhbmdlc2AgZG9jdW1lbnQuIFRoZSBgc291cmNlYCBuZWVkcyB0byBiZSBhXG4gKiB7QGxpbmtjb2RlIERlbm8uRnNGaWxlfSwge0BsaW5rY29kZSBSZWFkYWJsZVN0cmVhbX0sIHtAbGlua2NvZGUgQmxvYn0sXG4gKiB7QGxpbmtjb2RlIEJ1ZmZlclNvdXJjZX0sIG9yIGEgYHN0cmluZ2AuXG4gKi9cbmV4cG9ydCBjbGFzcyBNdWx0aVBhcnRCeXRlUmFuZ2VzU3RyZWFtIGV4dGVuZHMgUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4ge1xuICAjYm91bmRhcnk6IHN0cmluZztcbiAgI2NvbnRlbnRMZW5ndGg6IG51bWJlcjtcbiAgI3Bvc3RzY3JpcHQ6IFVpbnQ4QXJyYXk7XG4gICNwcmV2aW91czogVWludDhBcnJheSB8IHVuZGVmaW5lZDtcbiAgI3JhbmdlczogQnl0ZVJhbmdlW107XG4gICNzZWVuID0gMDtcbiAgI3NvdXJjZTpcbiAgICB8IEFycmF5QnVmZmVyXG4gICAgfCBCbG9iXG4gICAgfCBSZWFkYWJsZVN0cmVhbURlZmF1bHRSZWFkZXI8VWludDhBcnJheT5cbiAgICB8IERlbm8uRnNGaWxlO1xuICAjdHlwZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgYm91bmRhcnkgYmVpbmcgdXNlZCB3aGVuIHNlZ21lbnRpbmcgZGlmZmVyZW50IHBhcnRzIG9mIHRoZSBib2R5XG4gICAqIHJlc3BvbnNlLiBUaGlzIHNob3VsZCBiZSByZWZsZWN0ZWQgaW4gdGhlIGBDb250ZW50LVR5cGVgIGhlYWRlciB3aGVuXG4gICAqIGJlaW5nIHNlbnQgdG8gYSBjbGllbnQuXG4gICAqL1xuICBnZXQgYm91bmRhcnkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy4jYm91bmRhcnk7XG4gIH1cblxuICAvKipcbiAgICogVGhlIGxlbmd0aCBvZiB0aGUgY29udGVudCBiZWluZyBzdXBwbGllZCBieSB0aGUgc3RyZWFtLiBUaGlzIHNob3VsZCBiZVxuICAgKiByZWZsZWN0ZWQgaW4gdGhlIGBDb250ZW50LUxlbmd0aGAgaGVhZGVyIHdoZW4gYmVpbmcgc2VudCB0byBhIGNsaWVudC5cbiAgICovXG4gIGdldCBjb250ZW50TGVuZ3RoKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuI2NvbnRlbnRMZW5ndGg7XG4gIH1cblxuICBhc3luYyAjcmVhZFJhbmdlKHsgc3RhcnQsIGVuZCB9OiBCeXRlUmFuZ2UpOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgICBpZiAoaXNEZW5vRnNGaWxlKHRoaXMuI3NvdXJjZSkpIHtcbiAgICAgIHJldHVybiByZWFkUmFuZ2UodGhpcy4jc291cmNlLCB7IHN0YXJ0LCBlbmQgfSk7XG4gICAgfVxuICAgIGlmICh0aGlzLiNzb3VyY2UgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoXG4gICAgICAgIGF3YWl0IHRoaXMuI3NvdXJjZS5zbGljZShzdGFydCwgZW5kICsgMSkuYXJyYXlCdWZmZXIoKSxcbiAgICAgICk7XG4gICAgfVxuICAgIGlmICh0aGlzLiNzb3VyY2UgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KHRoaXMuI3NvdXJjZS5zbGljZShzdGFydCwgZW5kICsgMSkpO1xuICAgIH1cblxuICAgIGNvbnN0IGxlbmd0aCA9IGVuZCAtIHN0YXJ0O1xuICAgIGxldCByZWFkID0gMDtcbiAgICBsZXQgcmVzdWx0OiBVaW50OEFycmF5IHwgdW5kZWZpbmVkO1xuXG4gICAgY29uc3QgcHJvY2Vzc0NodW5rID0gKGNodW5rOiBVaW50OEFycmF5KTogVWludDhBcnJheSB8IHVuZGVmaW5lZCA9PiB7XG4gICAgICBpZiAodGhpcy4jc2VlbiArIGNodW5rLmJ5dGVMZW5ndGggPj0gc3RhcnQpIHtcbiAgICAgICAgaWYgKHRoaXMuI3NlZW4gPCBzdGFydCkge1xuICAgICAgICAgIGNodW5rID0gY2h1bmsuc2xpY2Uoc3RhcnQgLSB0aGlzLiNzZWVuKTtcbiAgICAgICAgICB0aGlzLiNzZWVuID0gc3RhcnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlYWQgKyBjaHVuay5ieXRlTGVuZ3RoID4gbGVuZ3RoICsgMSkge1xuICAgICAgICAgIHRoaXMuI3ByZXZpb3VzID0gY2h1bmsuc2xpY2UobGVuZ3RoIC0gcmVhZCArIDEpO1xuICAgICAgICAgIGNodW5rID0gY2h1bmsuc2xpY2UoMCwgbGVuZ3RoIC0gcmVhZCArIDEpO1xuICAgICAgICB9XG4gICAgICAgIHJlYWQgKz0gY2h1bmsuYnl0ZUxlbmd0aDtcbiAgICAgICAgdGhpcy4jc2VlbiArPSBjaHVuay5ieXRlTGVuZ3RoO1xuICAgICAgICByZXR1cm4gY2h1bms7XG4gICAgICB9XG4gICAgICB0aGlzLiNzZWVuICs9IGNodW5rLmJ5dGVMZW5ndGg7XG4gICAgfTtcblxuICAgIGlmICh0aGlzLiNwcmV2aW91cykge1xuICAgICAgY29uc3QgY2h1bmsgPSB0aGlzLiNwcmV2aW91cztcbiAgICAgIHRoaXMuI3ByZXZpb3VzID0gdW5kZWZpbmVkO1xuICAgICAgY29uc3QgcmVzID0gcHJvY2Vzc0NodW5rKGNodW5rKTtcbiAgICAgIGlmIChyZXMpIHtcbiAgICAgICAgcmVzdWx0ID0gcmVzO1xuICAgICAgfVxuICAgIH1cblxuICAgIHdoaWxlIChyZWFkIDwgbGVuZ3RoKSB7XG4gICAgICBjb25zdCB7IGRvbmUsIHZhbHVlOiBjaHVuayB9ID0gYXdhaXQgdGhpcy4jc291cmNlLnJlYWQoKTtcbiAgICAgIGlmIChjaHVuaykge1xuICAgICAgICBjb25zdCByZXMgPSBwcm9jZXNzQ2h1bmsoY2h1bmspO1xuICAgICAgICBpZiAocmVzKSB7XG4gICAgICAgICAgcmVzdWx0ID0gcmVzdWx0ID8gY29uY2F0KFtyZXN1bHQsIHJlc10pIDogcmVzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZG9uZSkge1xuICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihcIlVuYWJsZSB0byByZWFkIHJhbmdlLlwiKTtcbiAgICAgIH1cbiAgICB9XG4gICAgYXNzZXJ0KHJlc3VsdCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHNvdXJjZTogUmFuZ2VCb2R5SW5pdCxcbiAgICByYW5nZXM6IEJ5dGVSYW5nZVtdLFxuICAgIHNpemU6IG51bWJlcixcbiAgICBvcHRpb25zOiBNdWx0aVBhcnRCeXRlUmFuZ2VTdHJlYW1PcHRpb25zID0ge30sXG4gICkge1xuICAgIGNvbnN0IHtcbiAgICAgIGF1dG9DbG9zZSA9IHRydWUsXG4gICAgICBib3VuZGFyeSA9IFwiT0FLLUNPTU1PTlMtQk9VTkRBUllcIixcbiAgICAgIHR5cGUsXG4gICAgfSA9IG9wdGlvbnM7XG4gICAgc3VwZXIoe1xuICAgICAgcHVsbDogYXN5bmMgKGNvbnRyb2xsZXIpID0+IHtcbiAgICAgICAgY29uc3QgcmFuZ2UgPSB0aGlzLiNyYW5nZXMuc2hpZnQoKTtcbiAgICAgICAgaWYgKCFyYW5nZSkge1xuICAgICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZSh0aGlzLiNwb3N0c2NyaXB0KTtcbiAgICAgICAgICBjb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgICAgaWYgKGF1dG9DbG9zZSAmJiBpc0Rlbm9Gc0ZpbGUodGhpcy4jc291cmNlKSkge1xuICAgICAgICAgICAgdGhpcy4jc291cmNlLmNsb3NlKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0aGlzLiNzb3VyY2UgaW5zdGFuY2VvZiBSZWFkYWJsZVN0cmVhbURlZmF1bHRSZWFkZXIpIHtcbiAgICAgICAgICAgIHRoaXMuI3NvdXJjZS5yZWxlYXNlTG9jaygpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYnl0ZXMgPSBhd2FpdCB0aGlzLiNyZWFkUmFuZ2UocmFuZ2UpO1xuICAgICAgICBjb25zdCBwcmVhbWJsZSA9IGVuY29kZXIuZW5jb2RlKFxuICAgICAgICAgIGBcXHJcXG4tLSR7Ym91bmRhcnl9XFxyXFxuQ29udGVudC1UeXBlOiAke3RoaXMuI3R5cGV9XFxyXFxuQ29udGVudC1SYW5nZTogJHtyYW5nZS5zdGFydH0tJHtyYW5nZS5lbmR9LyR7c2l6ZX1cXHJcXG5cXHJcXG5gLFxuICAgICAgICApO1xuICAgICAgICBjb250cm9sbGVyLmVucXVldWUoY29uY2F0KFtwcmVhbWJsZSwgYnl0ZXNdKSk7XG4gICAgICB9LFxuICAgIH0pO1xuICAgIHRoaXMuI2JvdW5kYXJ5ID0gYm91bmRhcnk7XG4gICAgdGhpcy4jcmFuZ2VzID0gWy4uLnJhbmdlc107XG4gICAgdGhpcy4jcmFuZ2VzLnNvcnQoKHsgc3RhcnQ6IGEgfSwgeyBzdGFydDogYiB9KSA9PiBhIC0gYik7XG4gICAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhzb3VyY2UpKSB7XG4gICAgICB0aGlzLiNzb3VyY2UgPSBzb3VyY2UuYnVmZmVyO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHNvdXJjZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgdGhpcy4jc291cmNlID0gZW5jb2Rlci5lbmNvZGUoc291cmNlKS5idWZmZXI7XG4gICAgfSBlbHNlIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBSZWFkYWJsZVN0cmVhbSkge1xuICAgICAgdGhpcy4jc291cmNlID0gc291cmNlLmdldFJlYWRlcigpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiNzb3VyY2UgPSBzb3VyY2U7XG4gICAgfVxuICAgIHRoaXMuI3R5cGUgPSB0eXBlIHx8IChzb3VyY2UgaW5zdGFuY2VvZiBCbG9iICYmIHNvdXJjZS50eXBlKSB8fFxuICAgICAgXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIjtcbiAgICB0aGlzLiNwb3N0c2NyaXB0ID0gZW5jb2Rlci5lbmNvZGUoYFxcclxcbi0tJHtib3VuZGFyeX0tLVxcclxcbmApO1xuICAgIHRoaXMuI2NvbnRlbnRMZW5ndGggPSByYW5nZXMucmVkdWNlKFxuICAgICAgKHByZXYsIHsgc3RhcnQsIGVuZCB9KTogbnVtYmVyID0+XG4gICAgICAgIHByZXYgK1xuICAgICAgICBlbmNvZGVyLmVuY29kZShcbiAgICAgICAgICBgXFxyXFxuLS0ke2JvdW5kYXJ5fVxcclxcbkNvbnRlbnQtVHlwZTogJHt0aGlzLiN0eXBlfVxcclxcbkNvbnRlbnQtUmFuZ2U6ICR7c3RhcnR9LSR7ZW5kfS8ke3NpemV9XFxyXFxuXFxyXFxuYCxcbiAgICAgICAgKS5ieXRlTGVuZ3RoICsgKGVuZCAtIHN0YXJ0KSArIDEsXG4gICAgICB0aGlzLiNwb3N0c2NyaXB0LmJ5dGVMZW5ndGgsXG4gICAgKTtcbiAgfVxufVxuXG4vKipcbiAqIEEge0BsaW5rY29kZSBUcmFuc2Zvcm1TdHJlYW19IHdoaWNoIHdpbGwgb25seSBwcm92aWRlIHRoZSByYW5nZSBvZiBieXRlcyBmcm9tXG4gKiB0aGUgc291cmNlIHN0cmVhbS5cbiAqL1xuZXhwb3J0IGNsYXNzIFJhbmdlQnl0ZVRyYW5zZm9ybVN0cmVhbVxuICBleHRlbmRzIFRyYW5zZm9ybVN0cmVhbTxVaW50OEFycmF5LCBVaW50OEFycmF5PiB7XG4gIGNvbnN0cnVjdG9yKHJhbmdlOiBCeXRlUmFuZ2UpIHtcbiAgICBjb25zdCB7IHN0YXJ0LCBlbmQgfSA9IHJhbmdlO1xuICAgIGNvbnN0IGxlbmd0aCA9IGVuZCAtIHN0YXJ0O1xuICAgIGxldCBzZWVuID0gMDtcbiAgICBsZXQgcmVhZCA9IDA7XG4gICAgc3VwZXIoe1xuICAgICAgdHJhbnNmb3JtKGNodW5rLCBjb250cm9sbGVyKSB7XG4gICAgICAgIGlmIChzZWVuICsgY2h1bmsuYnl0ZUxlbmd0aCA+PSBzdGFydCkge1xuICAgICAgICAgIGlmIChzZWVuIDwgc3RhcnQpIHtcbiAgICAgICAgICAgIC8vIHN0YXJ0IGlzIHBhcnQgd2F5IHRocm91Z2ggY2h1bmtcbiAgICAgICAgICAgIGNodW5rID0gY2h1bmsuc2xpY2Uoc3RhcnQgLSBzZWVuKTtcbiAgICAgICAgICAgIHNlZW4gPSBzdGFydDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlYWQgKyBjaHVuay5ieXRlTGVuZ3RoID4gbGVuZ3RoICsgMSkge1xuICAgICAgICAgICAgLy8gY2h1bmsgZXh0ZW5kcyBwYXN0IGVuZFxuICAgICAgICAgICAgY2h1bmsgPSBjaHVuay5zbGljZSgwLCBsZW5ndGggLSByZWFkICsgMSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlYWQgKz0gY2h1bmsuYnl0ZUxlbmd0aDtcbiAgICAgICAgICBzZWVuICs9IGNodW5rLmJ5dGVMZW5ndGg7XG4gICAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKGNodW5rKTtcbiAgICAgICAgICBpZiAocmVhZCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIudGVybWluYXRlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHNraXAgY2h1bmtcbiAgICAgICAgICBzZWVuICs9IGNodW5rLmJ5dGVMZW5ndGg7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBTZXQge0BsaW5rY29kZSBIZWFkZXJzfSByZWxhdGVkIHRvIHJldHVybmluZyBhIGNvbnRlbnQgcmFuZ2UgdG8gdGhlIGNsaWVudC5cbiAqXG4gKiBUaGlzIHdpbGwgc2V0IHRoZSBgQWNjZXB0LVJhbmdlc2AsIGBDb250ZW50LVJhbmdlYCBhbmQgYENvbnRlbnQtTGVuZ3RoYCBhc1xuICogYXBwcm9wcmlhdGUuIElmIHRoZSBoZWFkZXJzIGRvZXMgbm90IGNvbnRhaW4gYSBgQ29udGVudC1UeXBlYCBoZWFkZXIsIGFuZCBvbmVcbiAqIGlzIHN1cHBsaWVkLCBpdCB3aWxsIGJlIGFkZGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udGVudFJhbmdlKFxuICBoZWFkZXJzOiBIZWFkZXJzLFxuICByYW5nZTogQnl0ZVJhbmdlLFxuICBzaXplOiBudW1iZXIsXG4gIHR5cGU/OiBzdHJpbmcsXG4pOiB2b2lkIHtcbiAgY29uc3QgeyBzdGFydCwgZW5kIH0gPSByYW5nZTtcbiAgaGVhZGVycy5zZXQoXCJhY2NlcHQtcmFuZ2VzXCIsIFwiYnl0ZXNcIik7XG4gIGhlYWRlcnMuc2V0KFwiY29udGVudC1yYW5nZVwiLCBgYnl0ZXMgJHtzdGFydH0tJHtlbmR9LyR7c2l6ZX1gKTtcbiAgaGVhZGVycy5zZXQoXCJjb250ZW50LWxlbmd0aFwiLCBTdHJpbmcoZW5kIC0gc3RhcnQgKyAxKSk7XG4gIGlmICh0eXBlICYmICFoZWFkZXJzLmhhcyhcImNvbnRlbnQtdHlwZVwiKSkge1xuICAgIGhlYWRlcnMuc2V0KFwiY29udGVudC10eXBlXCIsIHR5cGUpO1xuICB9XG59XG5cbi8qKlxuICogU2V0IHtAbGlua2NvZGUgSGVhZGVyc30gcmVsYXRlZCB0byByZXR1cm5pbmcgYSBtdWx0aXBhcnQgYnl0ZSByYW5nZSByZXNwb25zZS5cbiAqXG4gKiBUaGlzIHdpbGwgc2V0IHRoZSBgQ29udGVudC1UeXBlYCBhbmQgYENvbnRlbnQtTGVuZ3RoYCBoZWFkZXJzIGFzIGFwcHJvcHJpYXRlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbXVsdGlQYXJ0Qnl0ZVJhbmdlcyhcbiAgaGVhZGVyczogSGVhZGVycyxcbiAgaW5pdDogeyBjb250ZW50TGVuZ3RoOiBudW1iZXI7IGJvdW5kYXJ5OiBzdHJpbmcgfSxcbikge1xuICBjb25zdCB7IGNvbnRlbnRMZW5ndGgsIGJvdW5kYXJ5IH0gPSBpbml0O1xuICBoZWFkZXJzLnNldChcImNvbnRlbnQtdHlwZVwiLCBgbXVsdGlwYXJ0L2J5dGVyYW5nZXM7IGJvdW5kYXJ5PSR7Ym91bmRhcnl9YCk7XG4gIGhlYWRlcnMuc2V0KFwiY29udGVudC1sZW5ndGhcIiwgU3RyaW5nKGNvbnRlbnRMZW5ndGgpKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhIHtAbGlua2NvZGUgRGVub0ZpbGV9IGFuZCBhIHtAbGlua2NvZGUgQnl0ZVJhbmdlfSBpbnRvIGEgYnl0ZVxuICoge0BsaW5rY29kZSBSZWFkYWJsZVN0cmVhbX0gd2hpY2ggd2lsbCBwcm92aWRlIGp1c3QgdGhlIHJhbmdlIG9mIGJ5dGVzLlxuICpcbiAqIFdoZW4gdGhlIHN0cmVhbSBpcyBmaW5pc2hlZCBiZWluZyByZWFkeSwgdGhlIGZpbGUgd2lsbCBiZSBjbG9zZWQuIENoYW5naW5nXG4gKiB0aGUgb3B0aW9uIHRvIGBhdXRvQ2xvc2VgIHRvIGBmYWxzZWAgd2lsbCBkaXNhYmxlIHRoaXMgYmVoYXZpb3IuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc0xpbWl0ZWRSZWFkYWJsZVN0cmVhbShcbiAgZnNGaWxlOiBEZW5vLkZzRmlsZSxcbiAgcmFuZ2U6IEJ5dGVSYW5nZSxcbiAgb3B0aW9uczogUmVzcG9uc2VSYW5nZU9wdGlvbnMgPSB7fSxcbik6IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+IHtcbiAgY29uc3QgeyBzdGFydCwgZW5kIH0gPSByYW5nZTtcbiAgY29uc3QgeyBhdXRvQ2xvc2UgPSB0cnVlLCBjaHVua1NpemUgPSBERUZBVUxUX0NIVU5LX1NJWkUgfSA9IG9wdGlvbnM7XG4gIGxldCByZWFkID0gMDtcbiAgY29uc3QgbGVuZ3RoID0gZW5kIC0gc3RhcnQgKyAxO1xuICByZXR1cm4gbmV3IFJlYWRhYmxlU3RyZWFtKHtcbiAgICBzdGFydChjb250cm9sbGVyKSB7XG4gICAgICBjb25zdCBwb3MgPSBmc0ZpbGUuc2Vla1N5bmMoc3RhcnQsIERlbm8uU2Vla01vZGUuU3RhcnQpO1xuICAgICAgaWYgKHBvcyAhPT0gc3RhcnQpIHtcbiAgICAgICAgY29udHJvbGxlci5lcnJvcihuZXcgUmFuZ2VFcnJvcihcIkNvdWxkIG5vdCBzZWVrIHRvIHJhbmdlIHN0YXJ0LlwiKSk7XG4gICAgICB9XG4gICAgfSxcbiAgICBhc3luYyBwdWxsKGNvbnRyb2xsZXIpIHtcbiAgICAgIGNvbnN0IGNodW5rID0gbmV3IFVpbnQ4QXJyYXkoTWF0aC5taW4obGVuZ3RoIC0gcmVhZCwgY2h1bmtTaXplKSk7XG4gICAgICBjb25zdCBjb3VudCA9IGF3YWl0IGZzRmlsZS5yZWFkKGNodW5rKTtcbiAgICAgIGlmIChjb3VudCA9PSBudWxsKSB7XG4gICAgICAgIGNvbnRyb2xsZXIuZXJyb3IobmV3IFJhbmdlRXJyb3IoXCJDb3VsZCBub3QgcmVhZCB0byByYW5nZSBlbmQuXCIpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29udHJvbGxlci5lbnF1ZXVlKGNodW5rKTtcbiAgICAgIHJlYWQgKz0gY291bnQ7XG4gICAgICBpZiAocmVhZCA+PSBsZW5ndGgpIHtcbiAgICAgICAgY29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICBpZiAoYXV0b0Nsb3NlKSB7XG4gICAgICAgICAgZnNGaWxlLmNsb3NlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGF1dG9BbGxvY2F0ZUNodW5rU2l6ZTogY2h1bmtTaXplLFxuICAgIHR5cGU6IFwiYnl0ZXNcIixcbiAgfSk7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgcmVxdWVzdGVkIGJ5dGUgcmFuZ2UgY2FuIGJlIGZ1bGZpbGxlZC4gQm90aCB0aGUgYFJhbmdlYCBhbmRcbiAqIGBJZi1SYW5nZWAgaGVhZGVyIHdpbGwgYmUgaW5zcGVjdGVkIGlmIHByZXNlbnQgdG8gZGV0ZXJtaW5lIGlmIHRoZSByZXF1ZXN0XG4gKiBjYW4gYmUgZnVsZmlsbGVkLlxuICpcbiAqIFRoZSBgcmVxdWVzdGAgaXMgdGhlIGN1cnJlbnQge0BsaW5rY29kZSBSZXF1ZXN0fSwgdGhlIGBlbnRpdHlgIGlzIHRoZVxuICogcmVzb3VyY2UgYmVpbmcgcmVxdWVzdGVkLiBJZiB7QGxpbmtjb2RlIEZpbGVJbmZvfSBpcyBiZWluZyB1c2VkIGZvciB0aGVcbiAqIGVudGl0eSwgbm8gZnVydGhlciBpbmZvcm1hdGlvbiBuZWVkcyB0byBiZSBwcm92aWRlZCwgYnV0IGlmIHRoZSBlbnRpdHkgaXMgYVxuICogYHN0cmluZ2Agb3Ige0BsaW5rY29kZSBVaW50OEFycmF5fSwgdGhlIGBmaWxlSW5mb2AgYXJndW1lbnQgYWxzbyBuZWVkcyB0b1xuICogYmUgcHJvdmlkZWQuXG4gKlxuICogVGhyZWUgZGlmZmVyZW50IHNjZW5hcmlvcyBjYW4gcmVzdWx0OlxuICpcbiAqIHwgUmVzdWx0IHwgVHlwaWNhbCBSZXNwb25zZSB8XG4gKiB8IC0gfCAtIHxcbiAqIHwgT2sgYW5kIGJ5dGUgcmFuZ2VzIHN1cHBsaWVkIHwgVGhlIHJhbmdlIHJlcXVlc3QgY2FuIGJlIGZ1bGZpbGxlZC4gVGhlIHJlc3BvbnNlIHNob3VsZCBiZSBhIGAyMDYgUGFydGlhbCBDb250ZW50YCBhbmQgcHJvdmlkZSB0aGUgcmVxdWVzdGVkIGJ5dGVzLiB8XG4gKiB8IE9rIGFuZCByYW5nZXMgYXJlIGBudWxsYCB8IEEgcmFuZ2Ugd2FzIHJlcXVlc3RlZCwgYnV0IHRoZSByZXF1ZXN0IGlzIG91dCBvZiBkYXRlLiBUaGUgcmVzcG9uc2Ugc2hvdWxkIGJlIGEgYDIwMCBPa2AgYW5kIHRoZSBmdWxsIGVudGl0eSBiZSBwcm92aWRlZC4gfFxuICogfCBOb3Qgb2sgfCBBIHJhbmdlIHdhcyByZXF1ZXN0ZWQsIGJ1dCBjYW5ub3QgYmUgZnVsZmlsbGVkLiBUaGUgcmVzcG9uc2Ugc2hvdWxkIGJlIGEgYDQxNiBSYW5nZSBOb3QgU2F0aXNmaWFibGVgIGFuZCBubyBjb250ZW50IHNob3VsZCBiZSBwcm92aWRlZC4gfFxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IHJhbmdlIH0gZnJvbSBcImpzcjovQG9hay9jb21tb25zL3JhbmdlXCI7XG4gKlxuICogY29uc3QgcmVxID0gbmV3IFJlcXVlc3QoXG4gKiAgIFwiaHR0cHM6Ly9sb2NhbGhvc3Q6ODA4MC9tb3ZpZS5tcDRcIixcbiAqICAgeyBoZWFkZXJzOiB7IFwiUmFuZ2VcIjogXCJieXRlcz0wLTQ5OVwiIH0gfVxuICogKTtcbiAqIGNvbnN0IHJlcyA9IHJhbmdlKHJlcSwgeyBzaXplOiA1MDAwLCBtdGltZTogbnVsbCB9KTtcbiAqIGlmIChyZXMub2sgJiYgcmVzLnJhbmdlKSB7XG4gKiAgIC8vIHJlc3BvbmQgd2l0aCAyMDYgUGFydGlhbCBDb250ZW50XG4gKiB9IGVsc2UgaWYgKHJlcy5vaykge1xuICogICAvLyByZXNwb25zZSB3aXRoIDIwMCBPS1xuICogfSBlbHNlIHtcbiAqICAgLy8gcmVzcG9uZCB3aXRoIDQxNiBSYW5nZSBOb3QgU2F0aXNmaWFibGVcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmFuZ2UoXG4gIHJlcXVlc3Q6IFJlcXVlc3QsXG4gIGVudGl0eTogRmlsZUluZm8sXG4pOiBQcm9taXNlPFJhbmdlUmVzdWx0Pjtcbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgcmVxdWVzdGVkIGJ5dGUgcmFuZ2UgY2FuIGJlIGZ1bGZpbGxlZC4gQm90aCB0aGUgYFJhbmdlYCBhbmRcbiAqIGBJZi1SYW5nZWAgaGVhZGVyIHdpbGwgYmUgaW5zcGVjdGVkIGlmIHByZXNlbnQgdG8gZGV0ZXJtaW5lIGlmIHRoZSByZXF1ZXN0XG4gKiBjYW4gYmUgZnVsZmlsbGVkLlxuICpcbiAqIFRoZSBgcmVxdWVzdGAgaXMgdGhlIGN1cnJlbnQge0BsaW5rY29kZSBSZXF1ZXN0fSwgdGhlIGBlbnRpdHlgIGlzIHRoZVxuICogcmVzb3VyY2UgYmVpbmcgcmVxdWVzdGVkLiBJZiB7QGxpbmtjb2RlIEZpbGVJbmZvfSBpcyBiZWluZyB1c2VkIGZvciB0aGVcbiAqIGVudGl0eSwgbm8gZnVydGhlciBpbmZvcm1hdGlvbiBuZWVkcyB0byBiZSBwcm92aWRlZCwgYnV0IGlmIHRoZSBlbnRpdHkgaXMgYVxuICogYHN0cmluZ2Agb3Ige0BsaW5rY29kZSBVaW50OEFycmF5fSwgdGhlIGBmaWxlSW5mb2AgYXJndW1lbnQgYWxzbyBuZWVkcyB0b1xuICogYmUgcHJvdmlkZWQuXG4gKlxuICogVGhyZWUgZGlmZmVyZW50IHNjZW5hcmlvcyBjYW4gcmVzdWx0OlxuICpcbiAqIHwgUmVzdWx0IHwgVHlwaWNhbCBSZXNwb25zZSB8XG4gKiB8IC0gfCAtIHxcbiAqIHwgT2sgYW5kIGJ5dGUgcmFuZ2VzIHN1cHBsaWVkIHwgVGhlIHJhbmdlIHJlcXVlc3QgY2FuIGJlIGZ1bGZpbGxlZC4gVGhlIHJlc3BvbnNlIHNob3VsZCBiZSBhIGAyMDYgUGFydGlhbCBDb250ZW50YCBhbmQgcHJvdmlkZSB0aGUgcmVxdWVzdGVkIGJ5dGVzLiB8XG4gKiB8IE9rIGFuZCByYW5nZXMgYXJlIGBudWxsYCB8IEEgcmFuZ2Ugd2FzIHJlcXVlc3RlZCwgYnV0IHRoZSByZXF1ZXN0IGlzIG91dCBvZiBkYXRlLiBUaGUgcmVzcG9uc2Ugc2hvdWxkIGJlIGEgYDIwMCBPa2AgYW5kIHRoZSBmdWxsIGVudGl0eSBiZSBwcm92aWRlZC4gfFxuICogfCBOb3Qgb2sgfCBBIHJhbmdlIHdhcyByZXF1ZXN0ZWQsIGJ1dCBjYW5ub3QgYmUgZnVsZmlsbGVkLiBUaGUgcmVzcG9uc2Ugc2hvdWxkIGJlIGEgYDQxNiBSYW5nZSBOb3QgU2F0aXNmaWFibGVgIGFuZCBubyBjb250ZW50IHNob3VsZCBiZSBwcm92aWRlZC4gfFxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IHJhbmdlIH0gZnJvbSBcImpzcjovQG9hay9jb21tb25zL3JhbmdlXCI7XG4gKlxuICogY29uc3QgcmVxID0gbmV3IFJlcXVlc3QoXG4gKiAgIFwiaHR0cHM6Ly9sb2NhbGhvc3Q6ODA4MC9tb3ZpZS5tcDRcIixcbiAqICAgeyBoZWFkZXJzOiB7IFwiUmFuZ2VcIjogXCJieXRlcz0wLTQ5OVwiIH0gfVxuICogKTtcbiAqIGNvbnN0IHJlcyA9IHJhbmdlKHJlcSwgeyBzaXplOiA1MDAwLCBtdGltZTogbnVsbCB9KTtcbiAqIGlmIChyZXMub2sgJiYgcmVzLnJhbmdlKSB7XG4gKiAgIC8vIHJlc3BvbmQgd2l0aCAyMDYgUGFydGlhbCBDb250ZW50XG4gKiB9IGVsc2UgaWYgKHJlcy5vaykge1xuICogICAvLyByZXNwb25zZSB3aXRoIDIwMCBPS1xuICogfSBlbHNlIHtcbiAqICAgLy8gcmVzcG9uZCB3aXRoIDQxNiBSYW5nZSBOb3QgU2F0aXNmaWFibGVcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmFuZ2UoXG4gIHJlcXVlc3Q6IFJlcXVlc3QsXG4gIGVudGl0eTogc3RyaW5nIHwgVWludDhBcnJheSxcbiAgZmlsZUluZm86IEZpbGVJbmZvLFxuKTogUHJvbWlzZTxSYW5nZVJlc3VsdD47XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmFuZ2UoXG4gIHJlcXVlc3Q6IFJlcXVlc3QsXG4gIGVudGl0eTogRW50aXR5LFxuICBmaWxlSW5mbz86IEZpbGVJbmZvLFxuKTogUHJvbWlzZTxSYW5nZVJlc3VsdD4ge1xuICBjb25zdCBpZlJhbmdlID0gcmVxdWVzdC5oZWFkZXJzLmdldChcImlmLXJhbmdlXCIpO1xuICBpZiAoaWZSYW5nZSkge1xuICAgIGNvbnN0IG1hdGNoZXMgPSBFVEFHX1JFLmV4ZWMoaWZSYW5nZSk7XG4gICAgaWYgKG1hdGNoZXMpIHtcbiAgICAgIGNvbnN0IFttYXRjaF0gPSBtYXRjaGVzO1xuICAgICAgLy8gdGhpcyBpbmRpY2F0ZXMgdGhhdCBpdCB3b3VsZCBiZSBhIHdlYWsgdGFnLCBhbmQgd2UgY2Fubm90IGNvbXBhcmUgb25cbiAgICAgIC8vIHdlYWsgdGFncywgdGhlIGZ1bGwgZW50aXR5IHNob3VsZCBiZSByZXR1cm5lZFxuICAgICAgaWYgKCFmaWxlSW5mbyB8fCBtYXRjaC5zdGFydHNXaXRoKFwiV1wiKSkge1xuICAgICAgICByZXR1cm4geyBvazogdHJ1ZSwgcmFuZ2VzOiBudWxsIH07XG4gICAgICB9XG4gICAgICBpZiAobWF0Y2ggIT09IGF3YWl0IGNhbGN1bGF0ZShlbnRpdHkpKSB7XG4gICAgICAgIHJldHVybiB7IG9rOiB0cnVlLCByYW5nZXM6IG51bGwgfTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYXNzZXJ0KGZpbGVJbmZvIHx8IGlzRmlsZUluZm8oZW50aXR5KSk7XG4gICAgICBjb25zdCB7IG10aW1lIH0gPSBmaWxlSW5mbyA/PyAoZW50aXR5IGFzIEZpbGVJbmZvKTtcbiAgICAgIGlmICghbXRpbWUgfHwgaXNNb2RpZmllZChpZlJhbmdlLCBtdGltZSkpIHtcbiAgICAgICAgcmV0dXJuIHsgb2s6IHRydWUsIHJhbmdlczogbnVsbCB9O1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBjb25zdCB2YWx1ZSA9IHJlcXVlc3QuaGVhZGVycy5nZXQoXCJyYW5nZVwiKTtcbiAgaWYgKCF2YWx1ZSkge1xuICAgIHJldHVybiB7IG9rOiB0cnVlLCByYW5nZXM6IG51bGwgfTtcbiAgfVxuICBjb25zdCBbdW5pdCwgcmFuZ2VzU3RyXSA9IHZhbHVlLnNwbGl0KFwiPVwiKTtcbiAgaWYgKHVuaXQgIT09IFwiYnl0ZXNcIikge1xuICAgIHJldHVybiB7IG9rOiBmYWxzZSwgcmFuZ2VzOiBudWxsIH07XG4gIH1cbiAgY29uc3QgcmFuZ2VzOiBCeXRlUmFuZ2VbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHJhbmdlIG9mIHJhbmdlc1N0ci5zcGxpdCgvXFxzKixcXHMrLykpIHtcbiAgICBjb25zdCBpdGVtID0gcmFuZ2Uuc3BsaXQoXCItXCIpO1xuICAgIGlmIChpdGVtLmxlbmd0aCAhPT0gMikge1xuICAgICAgcmV0dXJuIHsgb2s6IGZhbHNlLCByYW5nZXM6IG51bGwgfTtcbiAgICB9XG4gICAgY29uc3QgeyBzaXplIH0gPSBmaWxlSW5mbyA/PyAoZW50aXR5IGFzIEZpbGVJbmZvKTtcbiAgICBjb25zdCBbc3RhcnRTdHIsIGVuZFN0cl0gPSBpdGVtO1xuICAgIGxldCBzdGFydDogbnVtYmVyO1xuICAgIGxldCBlbmQ6IG51bWJlcjtcbiAgICB0cnkge1xuICAgICAgaWYgKHN0YXJ0U3RyID09PSBcIlwiKSB7XG4gICAgICAgIHN0YXJ0ID0gc2l6ZSAtIHBhcnNlSW50KGVuZFN0ciwgMTApIC0gMTtcbiAgICAgICAgZW5kID0gc2l6ZSAtIDE7XG4gICAgICB9IGVsc2UgaWYgKGVuZFN0ciA9PT0gXCJcIikge1xuICAgICAgICBzdGFydCA9IHBhcnNlSW50KHN0YXJ0U3RyLCAxMCk7XG4gICAgICAgIGVuZCA9IHNpemUgLSAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhcnQgPSBwYXJzZUludChzdGFydFN0ciwgMTApO1xuICAgICAgICBlbmQgPSBwYXJzZUludChlbmRTdHIsIDEwKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiB7IG9rOiBmYWxzZSwgcmFuZ2VzOiBudWxsIH07XG4gICAgfVxuICAgIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gc2l6ZSB8fCBlbmQgPCAwIHx8IGVuZCA+PSBzaXplIHx8IHN0YXJ0ID4gZW5kKSB7XG4gICAgICByZXR1cm4geyBvazogZmFsc2UsIHJhbmdlczogbnVsbCB9O1xuICAgIH1cbiAgICByYW5nZXMucHVzaCh7IHN0YXJ0LCBlbmQgfSk7XG4gIH1cbiAgcmV0dXJuIHsgb2s6IHRydWUsIHJhbmdlcyB9O1xufVxuXG4vKipcbiAqIFJlc29sdmVzIHdpdGggYSB7QGxpbmtjb2RlIFJlc3BvbnNlfSB3aXRoIGEgYm9keSB3aGljaCBpcyBqdXN0IHRoZSByYW5nZSBvZlxuICogYnl0ZXMgc3VwcGxpZWQsIGFsb25nIHdpdGggdGhlIGFwcHJvcHJpYXRlIGhlYWRlcnMgd2hpY2ggaW5kaWNhdGUgdGhhdCBpdCBpc1xuICogdGhlIGZ1bGZpbGxtZW50IG9mIGEgcmFuZ2UgcmVxdWVzdC5cbiAqXG4gKiBUaGUgYGJvZHlgIGlzIGEge0BsaW5rY29kZSBSZXNwb25zZX0ge0BsaW5rY29kZSBCb2R5SW5pdH0gd2l0aCB0aGUgYWRkaXRpb25cbiAqIG9mIHN1cHBvcnRpbmcge0BsaW5rY29kZSBEZW5vLkZzRmlsZX0gYW5kIGRvZXMgbm90IGFjY2VwdFxuICoge0BsaW5rY29kZSBGb3JtRGF0YX0gb3Ige0BsaW5rY29kZSBVUkxTZWFyY2hQYXJhbXN9LiBXaGVuIHVzaW5nXG4gKiB7QGxpbmtjb2RlIERlbm8uRnNGaWxlfSB0aGUgc2VlayBjYXBhYmlsaXRpZXMgaW4gb3JkZXIgdG8gcmVhZCByYW5nZXMgbW9yZVxuICogZWZmaWNpZW50bHkuXG4gKlxuICogVGhlIGBzaXplYCBpcyB0aGUgdG90YWwgbnVtYmVyIG9mIGJ5dGVzIGluIHRoZSByZXNvdXJjZSBiZWluZyByZXNwb25kZWQgdG8uXG4gKiBUaGlzIG5lZWRzIHRvIGJlIHByb3ZpZGVkLCBiZWNhdXNlIHRoZSBmdWxsIHNpemUgb2YgdGhlIHJlc291cmNlIGJlaW5nXG4gKiByZXF1ZXN0ZWQgaXQgbWF5IG5vdCBiZSBlYXN5IHRvIGRldGVybWluZSBhdCB0aGUgdGltZSBiZWluZyByZXF1ZXN0ZWQuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgcmVzcG9uc2VSYW5nZSB9IGZyb20gXCJqc3I6QG9hay9jb21tb25zL3JhbmdlXCI7XG4gKlxuICogY29uc3QgZmlsZSA9IGF3YWl0IERlbm8ub3BlbihcIi4vbW92aWUubXA0XCIpO1xuICogY29uc3QgeyBzaXplIH0gPSBhd2FpdCBmaWxlLnN0YXQoKTtcbiAqIGNvbnN0IHJlcyA9IHJlc3BvbnNlUmFuZ2UoXG4gKiAgIGZpbGUsXG4gKiAgIHNpemUsXG4gKiAgIHsgc3RhcnQ6IDAsIGVuZDogMV8wNDhfNTc1IH0sXG4gKiAgIHsgaGVhZGVyczogeyBcImNvbnRlbnQtdHlwZVwiOiBcInZpZGVvL21wNFwiIH0gfSxcbiAqICk7XG4gKiBjb25zdCBhYiA9IGF3YWl0IHJlcy5hcnJheUJ1ZmZlcigpO1xuICogLy8gYWIgd2lsbCBiZSB0aGUgZmlyc3QgMU1CIG9mIHRoZSB2aWRlbyBmaWxlXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc3BvbnNlUmFuZ2UoXG4gIGJvZHk6IFJhbmdlQm9keUluaXQsXG4gIHNpemU6IG51bWJlcixcbiAgcmFuZ2VzOiBCeXRlUmFuZ2VbXSxcbiAgaW5pdDogUmVzcG9uc2VJbml0ID0ge30sXG4gIG9wdGlvbnM6IFJlc3BvbnNlUmFuZ2VPcHRpb25zID0ge30sXG4pOiBSZXNwb25zZSB7XG4gIGlmICghcmFuZ2VzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKFwiQXQgbGVhc3Qgb25lIHJhbmdlIGV4cGVjdGVkLlwiKTtcbiAgfVxuICBpZiAocmFuZ2VzLmxlbmd0aCA9PT0gMSkge1xuICAgIGNvbnN0IFtyYW5nZV0gPSByYW5nZXM7XG4gICAgbGV0IHR5cGUgPSBvcHRpb25zLnR5cGUgPz8gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIjtcbiAgICBpZiAoaXNEZW5vRnNGaWxlKGJvZHkpKSB7XG4gICAgICBib2R5ID0gYXNMaW1pdGVkUmVhZGFibGVTdHJlYW0oYm9keSwgcmFuZ2UsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAoYm9keSBpbnN0YW5jZW9mIFJlYWRhYmxlU3RyZWFtKSB7XG4gICAgICBib2R5ID0gYm9keS5waXBlVGhyb3VnaChuZXcgUmFuZ2VCeXRlVHJhbnNmb3JtU3RyZWFtKHJhbmdlKSk7XG4gICAgfSBlbHNlIGlmIChib2R5IGluc3RhbmNlb2YgQmxvYikge1xuICAgICAgdHlwZSA9IGJvZHkudHlwZTtcbiAgICAgIGJvZHkgPSBib2R5LnNsaWNlKHJhbmdlLnN0YXJ0LCByYW5nZS5lbmQgKyAxKTtcbiAgICB9IGVsc2UgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhib2R5KSkge1xuICAgICAgYm9keSA9IGJvZHkuYnVmZmVyLnNsaWNlKHJhbmdlLnN0YXJ0LCByYW5nZS5lbmQgKyAxKTtcbiAgICB9IGVsc2UgaWYgKGJvZHkgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgYm9keSA9IGJvZHkuc2xpY2UocmFuZ2Uuc3RhcnQsIHJhbmdlLmVuZCArIDEpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGJvZHkgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIGJvZHkgPSBlbmNvZGVyLmVuY29kZShib2R5KS5zbGljZShyYW5nZS5zdGFydCwgcmFuZ2UuZW5kICsgMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IFR5cGVFcnJvcihcIkludmFsaWQgYm9keSB0eXBlLlwiKTtcbiAgICB9XG4gICAgY29uc3QgcmVzID0gbmV3IFJlc3BvbnNlKGJvZHksIHtcbiAgICAgIC4uLmluaXQsXG4gICAgICBzdGF0dXM6IDIwNixcbiAgICAgIHN0YXR1c1RleHQ6IFwiUGFydGlhbCBDb250ZW50XCIsXG4gICAgfSk7XG4gICAgY29udGVudFJhbmdlKHJlcy5oZWFkZXJzLCByYW5nZSwgc2l6ZSwgdHlwZSk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuICBjb25zdCBzdHJlYW0gPSBuZXcgTXVsdGlQYXJ0Qnl0ZVJhbmdlc1N0cmVhbShib2R5LCByYW5nZXMsIHNpemUsIG9wdGlvbnMpO1xuICBjb25zdCByZXMgPSBuZXcgUmVzcG9uc2Uoc3RyZWFtLCB7XG4gICAgLi4uaW5pdCxcbiAgICBzdGF0dXM6IDIwNixcbiAgICBzdGF0dXNUZXh0OiBcIlBhcnRpYWwgQ29udGVudFwiLFxuICB9KTtcbiAgbXVsdGlQYXJ0Qnl0ZVJhbmdlcyhyZXMuaGVhZGVycywgc3RyZWFtKTtcbiAgcmV0dXJuIHJlcztcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQTRFQyxHQUVELFNBQVMsTUFBTSxRQUFRLGdDQUFnQztBQUN2RCxTQUFTLE1BQU0sUUFBUSwrQkFBK0I7QUFDdEQsU0FDRSxTQUFTLFFBR0osNEJBQTRCO0FBdUZuQyxNQUFNLHFCQUFxQjtBQUMzQixNQUFNLFVBQVU7QUFDaEIsTUFBTSxVQUFVLElBQUk7QUFFcEIsU0FBUyxhQUFhLEtBQWM7RUFDbEMsSUFBSSxDQUFDLFNBQVMsVUFBVSxRQUFRLENBQUMsQ0FBQyxVQUFVLFVBQVUsS0FBSyxDQUFDLEtBQUssTUFBTSxFQUFFO0lBQ3ZFLE9BQU87RUFDVDtFQUNBLE9BQU8saUJBQWlCLEtBQUssTUFBTTtBQUNyQztBQUVBLFNBQVMsV0FBVyxLQUFjO0VBQ2hDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxVQUFVLFlBQVksU0FBUyxXQUFXLEtBQUs7QUFDbEU7QUFFQSxTQUFTLFdBQVcsS0FBYSxFQUFFLEtBQVc7RUFDNUMsTUFBTSxJQUFJLElBQUksS0FBSyxPQUFPLE9BQU87RUFDakMsSUFBSSxJQUFJLE1BQU0sT0FBTztFQUNyQiwyQ0FBMkM7RUFDM0MsS0FBSyxJQUFJO0VBQ1QsT0FBTyxJQUFJO0FB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