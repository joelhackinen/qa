// Copyright 2018-2024 the oak authors. All rights reserved. MIT license.
/**
 * Contains the oak abstraction to represent a request {@linkcode Body}.
 *
 * This is not normally used directly by end users.
 *
 * @module
 */ var _computedKey, _computedKey1;
import { createHttpError, matches, parseFormData, Status } from "./deps.ts";
const KNOWN_BODY_TYPES = [
  [
    "binary",
    [
      "image",
      "audio",
      "application/octet-stream"
    ]
  ],
  [
    "form",
    [
      "urlencoded"
    ]
  ],
  [
    "form-data",
    [
      "multipart"
    ]
  ],
  [
    "json",
    [
      "json",
      "application/*+json",
      "application/csp-report"
    ]
  ],
  [
    "text",
    [
      "text"
    ]
  ]
];
async function readBlob(body, type) {
  if (!body) {
    return new Blob(undefined, type ? {
      type
    } : undefined);
  }
  const chunks = [];
  for await (const chunk of body){
    chunks.push(chunk);
  }
  return new Blob(chunks, type ? {
    type
  } : undefined);
}
_computedKey = Symbol.for("Deno.customInspect"), _computedKey1 = Symbol.for("nodejs.util.inspect.custom");
/** An object which encapsulates information around a request body. */ export class Body {
  #body;
  #headers;
  #request;
  #reviver;
  #type;
  #used = false;
  constructor(serverRequest, reviver){
    if (serverRequest.request) {
      this.#request = serverRequest.request;
    } else {
      this.#headers = serverRequest.headers;
      this.#body = serverRequest.getBody();
    }
    this.#reviver = reviver;
  }
  /** Is `true` if the request might have a body, otherwise `false`.
   *
   * **WARNING** this is an unreliable API. In HTTP/2 in many situations you
   * cannot determine if a request has a body or not unless you attempt to read
   * the body, due to the streaming nature of HTTP/2. As of Deno 1.16.1, for
   * HTTP/1.1, Deno also reflects that behavior.  The only reliable way to
   * determine if a request has a body or not is to attempt to read the body.
   */ get has() {
    return !!(this.#request ? this.#request.body : this.#body);
  }
  /** Exposes the "raw" `ReadableStream` of the body. */ get stream() {
    return this.#request ? this.#request.body : this.#body;
  }
  /** Returns `true` if the body has been consumed yet, otherwise `false`. */ get used() {
    return this.#request?.bodyUsed ?? this.#used;
  }
  /** Reads a body to the end and resolves with the value as an
   * {@linkcode ArrayBuffer} */ async arrayBuffer() {
    if (this.#request) {
      return this.#request.arrayBuffer();
    }
    this.#used = true;
    return (await readBlob(this.#body)).arrayBuffer();
  }
  /** Reads a body to the end and resolves with the value as a
   * {@linkcode Blob}. */ blob() {
    if (this.#request) {
      return this.#request.blob();
    }
    this.#used = true;
    return readBlob(this.#body, this.#headers?.get("content-type"));
  }
  /** Reads a body as a URL encoded form, resolving the value as
   * {@linkcode URLSearchParams}. */ async form() {
    const text = await this.text();
    return new URLSearchParams(text);
  }
  /** Reads a body to the end attempting to parse the body as a set of
   * {@linkcode FormData}. */ formData() {
    if (this.#request) {
      return this.#request.formData();
    }
    this.#used = true;
    if (this.#body && this.#headers) {
      const contentType = this.#headers.get("content-type");
      if (contentType) {
        return parseFormData(contentType, this.#body);
      }
    }
    throw createHttpError(Status.BadRequest, "Missing content type.");
  }
  /** Reads a body to the end attempting to parse the body as a JSON value.
   *
   * If a JSON reviver has been assigned, it will be used to parse the body.
   */ // deno-lint-ignore no-explicit-any
  async json() {
    try {
      if (this.#reviver) {
        const text = await this.text();
        return JSON.parse(text, this.#reviver);
      } else if (this.#request) {
        const value = await this.#request.json();
        return value;
      } else {
        this.#used = true;
        return JSON.parse(await (await readBlob(this.#body)).text());
      }
    } catch (err) {
      if (err instanceof Error) {
        throw createHttpError(Status.BadRequest, err.message);
      }
      throw createHttpError(Status.BadRequest, JSON.stringify(err));
    }
  }
  /** Reads the body to the end resolving with a string. */ async text() {
    if (this.#request) {
      return this.#request.text();
    }
    this.#used = true;
    return (await readBlob(this.#body)).text();
  }
  /** Attempts to determine what type of the body is to help determine how best
   * to attempt to decode the body. This performs analysis on the supplied
   * `Content-Type` header of the request.
   *
   * **Note** these are not authoritative and should only be used as guidance.
   *
   * There is the ability to provide custom types when attempting to discern
   * the type. Custom types are provided in the format of an object where the
   * key is on of {@linkcode BodyType} and the value is an array of media types
   * to attempt to match. Values supplied will be additive to known media types.
   *
   * The returned value is one of the following:
   *
   * - `"binary"` - The body appears to be binary data and should be consumed as
   *   an array buffer, readable stream or blob.
   * - `"form"` - The value appears to be an URL encoded form and should be
   *   consumed as a form (`URLSearchParams`).
   * - `"form-data"` - The value appears to be multipart form data and should be
   *   consumed as form data.
   * - `"json"` - The value appears to be JSON data and should be consumed as
   *   decoded JSON.
   * - `"text"` - The value appears to be text data and should be consumed as
   *   text.
   * - `"unknown"` - Either there is no body or the body type could not be
   *   determined.
   */ type(customMediaTypes) {
    if (this.#type && !customMediaTypes) {
      return this.#type;
    }
    customMediaTypes = customMediaTypes ?? {};
    const headers = this.#request?.headers ?? this.#headers;
    const contentType = headers?.get("content-type");
    if (contentType) {
      for (const [bodyType, knownMediaTypes] of KNOWN_BODY_TYPES){
        const customTypes = customMediaTypes[bodyType] ?? [];
        if (matches(contentType, [
          ...knownMediaTypes,
          ...customTypes
        ])) {
          this.#type = bodyType;
          return this.#type;
        }
      }
    }
    return this.#type = "unknown";
  }
  [_computedKey](inspect) {
    const { has, used } = this;
    return `${this.constructor.name} ${inspect({
      has,
      used
    })}`;
  }
  [_computedKey1](depth, // deno-lint-ignore no-explicit-any
  options, inspect) {
    if (depth < 0) {
      return options.stylize(`[${this.constructor.name}]`, "special");
    }
    const newOptions = Object.assign({}, options, {
      depth: options.depth === null ? null : options.depth - 1
    });
    const { has, used } = this;
    return `${options.stylize(this.constructor.name, "special")} ${inspect({
      has,
      used
    }, newOptions)}`;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvb2FrLzE2LjEuMC9ib2R5LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjQgdGhlIG9hayBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuLyoqXG4gKiBDb250YWlucyB0aGUgb2FrIGFic3RyYWN0aW9uIHRvIHJlcHJlc2VudCBhIHJlcXVlc3Qge0BsaW5rY29kZSBCb2R5fS5cbiAqXG4gKiBUaGlzIGlzIG5vdCBub3JtYWxseSB1c2VkIGRpcmVjdGx5IGJ5IGVuZCB1c2Vycy5cbiAqXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgY3JlYXRlSHR0cEVycm9yLCBtYXRjaGVzLCBwYXJzZUZvcm1EYXRhLCBTdGF0dXMgfSBmcm9tIFwiLi9kZXBzLnRzXCI7XG5pbXBvcnQgdHlwZSB7IFNlcnZlclJlcXVlc3QgfSBmcm9tIFwiLi90eXBlcy50c1wiO1xuXG50eXBlIEpzb25SZXZpdmVyID0gKGtleTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bikgPT4gdW5rbm93bjtcblxuZXhwb3J0IHR5cGUgQm9keVR5cGUgPVxuICB8IFwiYmluYXJ5XCJcbiAgfCBcImZvcm1cIlxuICB8IFwiZm9ybS1kYXRhXCJcbiAgfCBcImpzb25cIlxuICB8IFwidGV4dFwiXG4gIHwgXCJ1bmtub3duXCI7XG5cbmNvbnN0IEtOT1dOX0JPRFlfVFlQRVM6IFtib2R5VHlwZTogQm9keVR5cGUsIGtub3duTWVkaWFUeXBlczogc3RyaW5nW11dW10gPSBbXG4gIFtcImJpbmFyeVwiLCBbXCJpbWFnZVwiLCBcImF1ZGlvXCIsIFwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCJdXSxcbiAgW1wiZm9ybVwiLCBbXCJ1cmxlbmNvZGVkXCJdXSxcbiAgW1wiZm9ybS1kYXRhXCIsIFtcIm11bHRpcGFydFwiXV0sXG4gIFtcImpzb25cIiwgW1wianNvblwiLCBcImFwcGxpY2F0aW9uLyoranNvblwiLCBcImFwcGxpY2F0aW9uL2NzcC1yZXBvcnRcIl1dLFxuICBbXCJ0ZXh0XCIsIFtcInRleHRcIl1dLFxuXTtcblxuYXN5bmMgZnVuY3Rpb24gcmVhZEJsb2IoXG4gIGJvZHk/OiBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PiB8IG51bGwsXG4gIHR5cGU/OiBzdHJpbmcgfCBudWxsLFxuKTogUHJvbWlzZTxCbG9iPiB7XG4gIGlmICghYm9keSkge1xuICAgIHJldHVybiBuZXcgQmxvYih1bmRlZmluZWQsIHR5cGUgPyB7IHR5cGUgfSA6IHVuZGVmaW5lZCk7XG4gIH1cbiAgY29uc3QgY2h1bmtzOiBVaW50OEFycmF5W10gPSBbXTtcbiAgZm9yIGF3YWl0IChjb25zdCBjaHVuayBvZiBib2R5KSB7XG4gICAgY2h1bmtzLnB1c2goY2h1bmspO1xuICB9XG4gIHJldHVybiBuZXcgQmxvYihjaHVua3MsIHR5cGUgPyB7IHR5cGUgfSA6IHVuZGVmaW5lZCk7XG59XG5cbi8qKiBBbiBvYmplY3Qgd2hpY2ggZW5jYXBzdWxhdGVzIGluZm9ybWF0aW9uIGFyb3VuZCBhIHJlcXVlc3QgYm9keS4gKi9cbmV4cG9ydCBjbGFzcyBCb2R5IHtcbiAgI2JvZHk/OiBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PiB8IG51bGw7XG4gICNoZWFkZXJzPzogSGVhZGVycztcbiAgI3JlcXVlc3Q/OiBSZXF1ZXN0O1xuICAjcmV2aXZlcj86IEpzb25SZXZpdmVyO1xuICAjdHlwZT86IEJvZHlUeXBlO1xuICAjdXNlZCA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHNlcnZlclJlcXVlc3Q6IFBpY2s8U2VydmVyUmVxdWVzdCwgXCJyZXF1ZXN0XCIgfCBcImhlYWRlcnNcIiB8IFwiZ2V0Qm9keVwiPixcbiAgICByZXZpdmVyPzogSnNvblJldml2ZXIsXG4gICkge1xuICAgIGlmIChzZXJ2ZXJSZXF1ZXN0LnJlcXVlc3QpIHtcbiAgICAgIHRoaXMuI3JlcXVlc3QgPSBzZXJ2ZXJSZXF1ZXN0LnJlcXVlc3Q7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuI2hlYWRlcnMgPSBzZXJ2ZXJSZXF1ZXN0LmhlYWRlcnM7XG4gICAgICB0aGlzLiNib2R5ID0gc2VydmVyUmVxdWVzdC5nZXRCb2R5KCk7XG4gICAgfVxuICAgIHRoaXMuI3Jldml2ZXIgPSByZXZpdmVyO1xuICB9XG5cbiAgLyoqIElzIGB0cnVlYCBpZiB0aGUgcmVxdWVzdCBtaWdodCBoYXZlIGEgYm9keSwgb3RoZXJ3aXNlIGBmYWxzZWAuXG4gICAqXG4gICAqICoqV0FSTklORyoqIHRoaXMgaXMgYW4gdW5yZWxpYWJsZSBBUEkuIEluIEhUVFAvMiBpbiBtYW55IHNpdHVhdGlvbnMgeW91XG4gICAqIGNhbm5vdCBkZXRlcm1pbmUgaWYgYSByZXF1ZXN0IGhhcyBhIGJvZHkgb3Igbm90IHVubGVzcyB5b3UgYXR0ZW1wdCB0byByZWFkXG4gICAqIHRoZSBib2R5LCBkdWUgdG8gdGhlIHN0cmVhbWluZyBuYXR1cmUgb2YgSFRUUC8yLiBBcyBvZiBEZW5vIDEuMTYuMSwgZm9yXG4gICAqIEhUVFAvMS4xLCBEZW5vIGFsc28gcmVmbGVjdHMgdGhhdCBiZWhhdmlvci4gIFRoZSBvbmx5IHJlbGlhYmxlIHdheSB0b1xuICAgKiBkZXRlcm1pbmUgaWYgYSByZXF1ZXN0IGhhcyBhIGJvZHkgb3Igbm90IGlzIHRvIGF0dGVtcHQgdG8gcmVhZCB0aGUgYm9keS5cbiAgICovXG4gIGdldCBoYXMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhKHRoaXMuI3JlcXVlc3QgPyB0aGlzLiNyZXF1ZXN0LmJvZHkgOiB0aGlzLiNib2R5KTtcbiAgfVxuXG4gIC8qKiBFeHBvc2VzIHRoZSBcInJhd1wiIGBSZWFkYWJsZVN0cmVhbWAgb2YgdGhlIGJvZHkuICovXG4gIGdldCBzdHJlYW0oKTogUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4gfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy4jcmVxdWVzdCA/IHRoaXMuI3JlcXVlc3QuYm9keSA6IHRoaXMuI2JvZHkhO1xuICB9XG5cbiAgLyoqIFJldHVybnMgYHRydWVgIGlmIHRoZSBib2R5IGhhcyBiZWVuIGNvbnN1bWVkIHlldCwgb3RoZXJ3aXNlIGBmYWxzZWAuICovXG4gIGdldCB1c2VkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLiNyZXF1ZXN0Py5ib2R5VXNlZCA/PyB0aGlzLiN1c2VkO1xuICB9XG5cbiAgLyoqIFJlYWRzIGEgYm9keSB0byB0aGUgZW5kIGFuZCByZXNvbHZlcyB3aXRoIHRoZSB2YWx1ZSBhcyBhblxuICAgKiB7QGxpbmtjb2RlIEFycmF5QnVmZmVyfSAqL1xuICBhc3luYyBhcnJheUJ1ZmZlcigpOiBQcm9taXNlPEFycmF5QnVmZmVyPiB7XG4gICAgaWYgKHRoaXMuI3JlcXVlc3QpIHtcbiAgICAgIHJldHVybiB0aGlzLiNyZXF1ZXN0LmFycmF5QnVmZmVyKCk7XG4gICAgfVxuICAgIHRoaXMuI3VzZWQgPSB0cnVlO1xuICAgIHJldHVybiAoYXdhaXQgcmVhZEJsb2IodGhpcy4jYm9keSkpLmFycmF5QnVmZmVyKCk7XG4gIH1cblxuICAvKiogUmVhZHMgYSBib2R5IHRvIHRoZSBlbmQgYW5kIHJlc29sdmVzIHdpdGggdGhlIHZhbHVlIGFzIGFcbiAgICoge0BsaW5rY29kZSBCbG9ifS4gKi9cbiAgYmxvYigpOiBQcm9taXNlPEJsb2I+IHtcbiAgICBpZiAodGhpcy4jcmVxdWVzdCkge1xuICAgICAgcmV0dXJuIHRoaXMuI3JlcXVlc3QuYmxvYigpO1xuICAgIH1cbiAgICB0aGlzLiN1c2VkID0gdHJ1ZTtcbiAgICByZXR1cm4gcmVhZEJsb2IodGhpcy4jYm9keSwgdGhpcy4jaGVhZGVycz8uZ2V0KFwiY29udGVudC10eXBlXCIpKTtcbiAgfVxuXG4gIC8qKiBSZWFkcyBhIGJvZHkgYXMgYSBVUkwgZW5jb2RlZCBmb3JtLCByZXNvbHZpbmcgdGhlIHZhbHVlIGFzXG4gICAqIHtAbGlua2NvZGUgVVJMU2VhcmNoUGFyYW1zfS4gKi9cbiAgYXN5bmMgZm9ybSgpOiBQcm9taXNlPFVSTFNlYXJjaFBhcmFtcz4ge1xuICAgIGNvbnN0IHRleHQgPSBhd2FpdCB0aGlzLnRleHQoKTtcbiAgICByZXR1cm4gbmV3IFVSTFNlYXJjaFBhcmFtcyh0ZXh0KTtcbiAgfVxuXG4gIC8qKiBSZWFkcyBhIGJvZHkgdG8gdGhlIGVuZCBhdHRlbXB0aW5nIHRvIHBhcnNlIHRoZSBib2R5IGFzIGEgc2V0IG9mXG4gICAqIHtAbGlua2NvZGUgRm9ybURhdGF9LiAqL1xuICBmb3JtRGF0YSgpOiBQcm9taXNlPEZvcm1EYXRhPiB7XG4gICAgaWYgKHRoaXMuI3JlcXVlc3QpIHtcbiAgICAgIHJldHVybiB0aGlzLiNyZXF1ZXN0LmZvcm1EYXRhKCk7XG4gICAgfVxuICAgIHRoaXMuI3VzZWQgPSB0cnVlO1xuICAgIGlmICh0aGlzLiNib2R5ICYmIHRoaXMuI2hlYWRlcnMpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnRUeXBlID0gdGhpcy4jaGVhZGVycy5nZXQoXCJjb250ZW50LXR5cGVcIik7XG4gICAgICBpZiAoY29udGVudFR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlRm9ybURhdGEoY29udGVudFR5cGUsIHRoaXMuI2JvZHkpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aHJvdyBjcmVhdGVIdHRwRXJyb3IoU3RhdHVzLkJhZFJlcXVlc3QsIFwiTWlzc2luZyBjb250ZW50IHR5cGUuXCIpO1xuICB9XG5cbiAgLyoqIFJlYWRzIGEgYm9keSB0byB0aGUgZW5kIGF0dGVtcHRpbmcgdG8gcGFyc2UgdGhlIGJvZHkgYXMgYSBKU09OIHZhbHVlLlxuICAgKlxuICAgKiBJZiBhIEpTT04gcmV2aXZlciBoYXMgYmVlbiBhc3NpZ25lZCwgaXQgd2lsbCBiZSB1c2VkIHRvIHBhcnNlIHRoZSBib2R5LlxuICAgKi9cbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgYXN5bmMganNvbigpOiBQcm9taXNlPGFueT4ge1xuICAgIHRyeSB7XG4gICAgICBpZiAodGhpcy4jcmV2aXZlcikge1xuICAgICAgICBjb25zdCB0ZXh0ID0gYXdhaXQgdGhpcy50ZXh0KCk7XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKHRleHQsIHRoaXMuI3Jldml2ZXIpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLiNyZXF1ZXN0KSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgdGhpcy4jcmVxdWVzdC5qc29uKCk7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuI3VzZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShhd2FpdCAoYXdhaXQgcmVhZEJsb2IodGhpcy4jYm9keSkpLnRleHQoKSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgY3JlYXRlSHR0cEVycm9yKFN0YXR1cy5CYWRSZXF1ZXN0LCBlcnIubWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB0aHJvdyBjcmVhdGVIdHRwRXJyb3IoU3RhdHVzLkJhZFJlcXVlc3QsIEpTT04uc3RyaW5naWZ5KGVycikpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBSZWFkcyB0aGUgYm9keSB0byB0aGUgZW5kIHJlc29sdmluZyB3aXRoIGEgc3RyaW5nLiAqL1xuICBhc3luYyB0ZXh0KCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgaWYgKHRoaXMuI3JlcXVlc3QpIHtcbiAgICAgIHJldHVybiB0aGlzLiNyZXF1ZXN0LnRleHQoKTtcbiAgICB9XG4gICAgdGhpcy4jdXNlZCA9IHRydWU7XG4gICAgcmV0dXJuIChhd2FpdCByZWFkQmxvYih0aGlzLiNib2R5KSkudGV4dCgpO1xuICB9XG5cbiAgLyoqIEF0dGVtcHRzIHRvIGRldGVybWluZSB3aGF0IHR5cGUgb2YgdGhlIGJvZHkgaXMgdG8gaGVscCBkZXRlcm1pbmUgaG93IGJlc3RcbiAgICogdG8gYXR0ZW1wdCB0byBkZWNvZGUgdGhlIGJvZHkuIFRoaXMgcGVyZm9ybXMgYW5hbHlzaXMgb24gdGhlIHN1cHBsaWVkXG4gICAqIGBDb250ZW50LVR5cGVgIGhlYWRlciBvZiB0aGUgcmVxdWVzdC5cbiAgICpcbiAgICogKipOb3RlKiogdGhlc2UgYXJlIG5vdCBhdXRob3JpdGF0aXZlIGFuZCBzaG91bGQgb25seSBiZSB1c2VkIGFzIGd1aWRhbmNlLlxuICAgKlxuICAgKiBUaGVyZSBpcyB0aGUgYWJpbGl0eSB0byBwcm92aWRlIGN1c3RvbSB0eXBlcyB3aGVuIGF0dGVtcHRpbmcgdG8gZGlzY2VyblxuICAgKiB0aGUgdHlwZS4gQ3VzdG9tIHR5cGVzIGFyZSBwcm92aWRlZCBpbiB0aGUgZm9ybWF0IG9mIGFuIG9iamVjdCB3aGVyZSB0aGVcbiAgICoga2V5IGlzIG9uIG9mIHtAbGlua2NvZGUgQm9keVR5cGV9IGFuZCB0aGUgdmFsdWUgaXMgYW4gYXJyYXkgb2YgbWVkaWEgdHlwZXNcbiAgICogdG8gYXR0ZW1wdCB0byBtYXRjaC4gVmFsdWVzIHN1cHBsaWVkIHdpbGwgYmUgYWRkaXRpdmUgdG8ga25vd24gbWVkaWEgdHlwZXMuXG4gICAqXG4gICAqIFRoZSByZXR1cm5lZCB2YWx1ZSBpcyBvbmUgb2YgdGhlIGZvbGxvd2luZzpcbiAgICpcbiAgICogLSBgXCJiaW5hcnlcImAgLSBUaGUgYm9keSBhcHBlYXJzIHRvIGJlIGJpbmFyeSBkYXRhIGFuZCBzaG91bGQgYmUgY29uc3VtZWQgYXNcbiAgICogICBhbiBhcnJheSBidWZmZXIsIHJlYWRhYmxlIHN0cmVhbSBvciBibG9iLlxuICAgKiAtIGBcImZvcm1cImAgLSBUaGUgdmFsdWUgYXBwZWFycyB0byBiZSBhbiBVUkwgZW5jb2RlZCBmb3JtIGFuZCBzaG91bGQgYmVcbiAgICogICBjb25zdW1lZCBhcyBhIGZvcm0gKGBVUkxTZWFyY2hQYXJhbXNgKS5cbiAgICogLSBgXCJmb3JtLWRhdGFcImAgLSBUaGUgdmFsdWUgYXBwZWFycyB0byBiZSBtdWx0aXBhcnQgZm9ybSBkYXRhIGFuZCBzaG91bGQgYmVcbiAgICogICBjb25zdW1lZCBhcyBmb3JtIGRhdGEuXG4gICAqIC0gYFwianNvblwiYCAtIFRoZSB2YWx1ZSBhcHBlYXJzIHRvIGJlIEpTT04gZGF0YSBhbmQgc2hvdWxkIGJlIGNvbnN1bWVkIGFzXG4gICAqICAgZGVjb2RlZCBKU09OLlxuICAgKiAtIGBcInRleHRcImAgLSBUaGUgdmFsdWUgYXBwZWFycyB0byBiZSB0ZXh0IGRhdGEgYW5kIHNob3VsZCBiZSBjb25zdW1lZCBhc1xuICAgKiAgIHRleHQuXG4gICAqIC0gYFwidW5rbm93blwiYCAtIEVpdGhlciB0aGVyZSBpcyBubyBib2R5IG9yIHRoZSBib2R5IHR5cGUgY291bGQgbm90IGJlXG4gICAqICAgZGV0ZXJtaW5lZC5cbiAgICovXG4gIHR5cGUoY3VzdG9tTWVkaWFUeXBlcz86IFBhcnRpYWw8UmVjb3JkPEJvZHlUeXBlLCBzdHJpbmdbXT4+KTogQm9keVR5cGUge1xuICAgIGlmICh0aGlzLiN0eXBlICYmICFjdXN0b21NZWRpYVR5cGVzKSB7XG4gICAgICByZXR1cm4gdGhpcy4jdHlwZTtcbiAgICB9XG4gICAgY3VzdG9tTWVkaWFUeXBlcyA9IGN1c3RvbU1lZGlhVHlwZXMgPz8ge307XG4gICAgY29uc3QgaGVhZGVycyA9IHRoaXMuI3JlcXVlc3Q/LmhlYWRlcnMgPz8gdGhpcy4jaGVhZGVycztcbiAgICBjb25zdCBjb250ZW50VHlwZSA9IGhlYWRlcnM/LmdldChcImNvbnRlbnQtdHlwZVwiKTtcbiAgICBpZiAoY29udGVudFR5cGUpIHtcbiAgICAgIGZvciAoY29uc3QgW2JvZHlUeXBlLCBrbm93bk1lZGlhVHlwZXNdIG9mIEtOT1dOX0JPRFlfVFlQRVMpIHtcbiAgICAgICAgY29uc3QgY3VzdG9tVHlwZXMgPSBjdXN0b21NZWRpYVR5cGVzW2JvZHlUeXBlXSA/PyBbXTtcbiAgICAgICAgaWYgKG1hdGNoZXMoY29udGVudFR5cGUsIFsuLi5rbm93bk1lZGlhVHlwZXMsIC4uLmN1c3RvbVR5cGVzXSkpIHtcbiAgICAgICAgICB0aGlzLiN0eXBlID0gYm9keVR5cGU7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuI3R5cGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuI3R5cGUgPSBcInVua25vd25cIjtcbiAgfVxuXG4gIFtTeW1ib2wuZm9yKFwiRGVuby5jdXN0b21JbnNwZWN0XCIpXShcbiAgICBpbnNwZWN0OiAodmFsdWU6IHVua25vd24pID0+IHN0cmluZyxcbiAgKTogc3RyaW5nIHtcbiAgICBjb25zdCB7IGhhcywgdXNlZCB9ID0gdGhpcztcbiAgICByZXR1cm4gYCR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfSAke2luc3BlY3QoeyBoYXMsIHVzZWQgfSl9YDtcbiAgfVxuXG4gIFtTeW1ib2wuZm9yKFwibm9kZWpzLnV0aWwuaW5zcGVjdC5jdXN0b21cIildKFxuICAgIGRlcHRoOiBudW1iZXIsXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICBvcHRpb25zOiBhbnksXG4gICAgaW5zcGVjdDogKHZhbHVlOiB1bmtub3duLCBvcHRpb25zPzogdW5rbm93bikgPT4gc3RyaW5nLFxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICk6IGFueSB7XG4gICAgaWYgKGRlcHRoIDwgMCkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShgWyR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfV1gLCBcInNwZWNpYWxcIik7XG4gICAgfVxuXG4gICAgY29uc3QgbmV3T3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHtcbiAgICAgIGRlcHRoOiBvcHRpb25zLmRlcHRoID09PSBudWxsID8gbnVsbCA6IG9wdGlvbnMuZGVwdGggLSAxLFxuICAgIH0pO1xuICAgIGNvbnN0IHsgaGFzLCB1c2VkIH0gPSB0aGlzO1xuICAgIHJldHVybiBgJHtvcHRpb25zLnN0eWxpemUodGhpcy5jb25zdHJ1Y3Rvci5uYW1lLCBcInNwZWNpYWxcIil9ICR7XG4gICAgICBpbnNwZWN0KFxuICAgICAgICB7IGhhcywgdXNlZCB9LFxuICAgICAgICBuZXdPcHRpb25zLFxuICAgICAgKVxuICAgIH1gO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEseUVBQXlFO0FBRXpFOzs7Ozs7Q0FNQztBQUVELFNBQVMsZUFBZSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxRQUFRLFlBQVk7QUFhNUUsTUFBTSxtQkFBc0U7RUFDMUU7SUFBQztJQUFVO01BQUM7TUFBUztNQUFTO0tBQTJCO0dBQUM7RUFDMUQ7SUFBQztJQUFRO01BQUM7S0FBYTtHQUFDO0VBQ3hCO0lBQUM7SUFBYTtNQUFDO0tBQVk7R0FBQztFQUM1QjtJQUFDO0lBQVE7TUFBQztNQUFRO01BQXNCO0tBQXlCO0dBQUM7RUFDbEU7SUFBQztJQUFRO01BQUM7S0FBTztHQUFDO0NBQ25CO0FBRUQsZUFBZSxTQUNiLElBQXdDLEVBQ3hDLElBQW9CO0VBRXBCLElBQUksQ0FBQyxNQUFNO0lBQ1QsT0FBTyxJQUFJLEtBQUssV0FBVyxPQUFPO01BQUU7SUFBSyxJQUFJO0VBQy9DO0VBQ0EsTUFBTSxTQUF1QixFQUFFO0VBQy9CLFdBQVcsTUFBTSxTQUFTLEtBQU07SUFDOUIsT0FBTyxJQUFJLENBQUM7RUFDZDtFQUNBLE9BQU8sSUFBSSxLQUFLLFFBQVEsT0FBTztJQUFFO0VBQUssSUFBSTtBQUM1QztlQXdLRyxPQUFPLEdBQUcsQ0FBQyx1Q0FPWCxPQUFPLEdBQUcsQ0FBQztBQTdLZCxvRUFBb0UsR0FDcEUsT0FBTyxNQUFNO0VBQ1gsQ0FBQyxJQUFJLENBQXFDO0VBQzFDLENBQUMsT0FBTyxDQUFXO0VBQ25CLENBQUMsT0FBTyxDQUFXO0VBQ25CLENBQUMsT0FBTyxDQUFlO0VBQ3ZCLENBQUMsSUFBSSxDQUFZO0VBQ2pCLENBQUMsSUFBSSxHQUFHLE1BQU07RUFFZCxZQUNFLGFBQXFFLEVBQ3JFLE9BQXFCLENBQ3JCO0lBQ0EsSUFBSSxjQUFjLE9BQU8sRUFBRTtNQUN6QixJQUFJLENBQUMs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