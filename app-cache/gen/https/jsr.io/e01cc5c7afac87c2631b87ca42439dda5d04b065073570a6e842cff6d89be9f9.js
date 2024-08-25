// Copyright 2018-2024 the oak authors. All rights reserved. MIT license.
import { BODY_TYPES } from "./consts.ts";
function isCloser(value) {
  return typeof value === "object" && value != null && "close" in value && // deno-lint-ignore no-explicit-any
  typeof value["close"] === "function";
}
const DEFAULT_CHUNK_SIZE = 16_640; // 17 Kib
const encoder = new TextEncoder();
/**
 * Create a `ReadableStream<Uint8Array>` from a `Reader`.
 *
 * When the pull algorithm is called on the stream, a chunk from the reader
 * will be read.  When `null` is returned from the reader, the stream will be
 * closed along with the reader (if it is also a `Closer`).
 */ export function readableStreamFromReader(reader, options = {}) {
  const { autoClose = true, chunkSize = DEFAULT_CHUNK_SIZE, strategy } = options;
  return new ReadableStream({
    async pull (controller) {
      const chunk = new Uint8Array(chunkSize);
      try {
        const read = await reader.read(chunk);
        if (read === null) {
          if (isCloser(reader) && autoClose) {
            reader.close();
          }
          controller.close();
          return;
        }
        controller.enqueue(chunk.subarray(0, read));
      } catch (e) {
        controller.error(e);
        if (isCloser(reader)) {
          reader.close();
        }
      }
    },
    cancel () {
      if (isCloser(reader) && autoClose) {
        reader.close();
      }
    }
  }, strategy);
}
/**
 * Create a `ReadableStream<Uint8Array>` from an `AsyncIterable`.
 */ export function readableStreamFromAsyncIterable(source) {
  return new ReadableStream({
    async start (controller) {
      for await (const chunk of source){
        if (BODY_TYPES.includes(typeof chunk)) {
          controller.enqueue(encoder.encode(String(chunk)));
        } else if (chunk instanceof Uint8Array) {
          controller.enqueue(chunk);
        } else if (ArrayBuffer.isView(chunk)) {
          controller.enqueue(new Uint8Array(chunk.buffer));
        } else if (chunk instanceof ArrayBuffer) {
          controller.enqueue(new Uint8Array(chunk));
        } else {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(chunk)));
          } catch  {
          // we just swallow errors here
          }
        }
      }
      controller.close();
    }
  });
}
/** A utility class that transforms "any" chunk into an `Uint8Array`. */ export class Uint8ArrayTransformStream extends TransformStream {
  constructor(){
    const init = {
      async transform (chunk, controller) {
        chunk = await chunk;
        switch(typeof chunk){
          case "object":
            if (chunk === null) {
              controller.terminate();
            } else if (ArrayBuffer.isView(chunk)) {
              controller.enqueue(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
            } else if (Array.isArray(chunk) && chunk.every((value)=>typeof value === "number")) {
              controller.enqueue(new Uint8Array(chunk));
            } else if (typeof chunk.valueOf === "function" && chunk.valueOf() !== chunk) {
              this.transform(chunk.valueOf(), controller);
            } else if ("toJSON" in chunk) {
              this.transform(JSON.stringify(chunk), controller);
            }
            break;
          case "symbol":
            controller.error(new TypeError("Cannot transform a symbol to a Uint8Array"));
            break;
          case "undefined":
            controller.error(new TypeError("Cannot transform undefined to a Uint8Array"));
            break;
          default:
            controller.enqueue(this.encoder.encode(String(chunk)));
        }
      },
      encoder
    };
    super(init);
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvb2FrLzE2LjEuMC91dGlscy9zdHJlYW1zLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjQgdGhlIG9hayBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuaW1wb3J0IHsgQk9EWV9UWVBFUyB9IGZyb20gXCIuL2NvbnN0cy50c1wiO1xuXG5pbnRlcmZhY2UgUmVhZGVyIHtcbiAgcmVhZChwOiBVaW50OEFycmF5KTogUHJvbWlzZTxudW1iZXIgfCBudWxsPjtcbn1cblxuaW50ZXJmYWNlIENsb3NlciB7XG4gIGNsb3NlKCk6IHZvaWQ7XG59XG5cbmludGVyZmFjZSBSZWFkYWJsZVN0cmVhbUZyb21SZWFkZXJPcHRpb25zIHtcbiAgLyoqIElmIHRoZSBgcmVhZGVyYCBpcyBhbHNvIGEgYENsb3NlcmAsIGF1dG9tYXRpY2FsbHkgY2xvc2UgdGhlIGByZWFkZXJgXG4gICAqIHdoZW4gYEVPRmAgaXMgZW5jb3VudGVyZWQsIG9yIGEgcmVhZCBlcnJvciBvY2N1cnMuXG4gICAqXG4gICAqIERlZmF1bHRzIHRvIGB0cnVlYC4gKi9cbiAgYXV0b0Nsb3NlPzogYm9vbGVhbjtcblxuICAvKiogVGhlIHNpemUgb2YgY2h1bmtzIHRvIGFsbG9jYXRlIHRvIHJlYWQsIHRoZSBkZWZhdWx0IGlzIH4xNktpQiwgd2hpY2ggaXNcbiAgICogdGhlIG1heGltdW0gc2l6ZSB0aGF0IERlbm8gb3BlcmF0aW9ucyBjYW4gY3VycmVudGx5IHN1cHBvcnQuICovXG4gIGNodW5rU2l6ZT86IG51bWJlcjtcblxuICAvKiogVGhlIHF1ZXVpbmcgc3RyYXRlZ3kgdG8gY3JlYXRlIHRoZSBgUmVhZGFibGVTdHJlYW1gIHdpdGguICovXG4gIHN0cmF0ZWd5PzogeyBoaWdoV2F0ZXJNYXJrPzogbnVtYmVyIHwgdW5kZWZpbmVkOyBzaXplPzogdW5kZWZpbmVkIH07XG59XG5cbmZ1bmN0aW9uIGlzQ2xvc2VyKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgRGVuby5DbG9zZXIge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIHZhbHVlICE9IG51bGwgJiYgXCJjbG9zZVwiIGluIHZhbHVlICYmXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICB0eXBlb2YgKHZhbHVlIGFzIFJlY29yZDxzdHJpbmcsIGFueT4pW1wiY2xvc2VcIl0gPT09IFwiZnVuY3Rpb25cIjtcbn1cblxuY29uc3QgREVGQVVMVF9DSFVOS19TSVpFID0gMTZfNjQwOyAvLyAxNyBLaWJcblxuY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuXG4vKipcbiAqIENyZWF0ZSBhIGBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PmAgZnJvbSBhIGBSZWFkZXJgLlxuICpcbiAqIFdoZW4gdGhlIHB1bGwgYWxnb3JpdGhtIGlzIGNhbGxlZCBvbiB0aGUgc3RyZWFtLCBhIGNodW5rIGZyb20gdGhlIHJlYWRlclxuICogd2lsbCBiZSByZWFkLiAgV2hlbiBgbnVsbGAgaXMgcmV0dXJuZWQgZnJvbSB0aGUgcmVhZGVyLCB0aGUgc3RyZWFtIHdpbGwgYmVcbiAqIGNsb3NlZCBhbG9uZyB3aXRoIHRoZSByZWFkZXIgKGlmIGl0IGlzIGFsc28gYSBgQ2xvc2VyYCkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkYWJsZVN0cmVhbUZyb21SZWFkZXIoXG4gIHJlYWRlcjogUmVhZGVyIHwgKFJlYWRlciAmIENsb3NlciksXG4gIG9wdGlvbnM6IFJlYWRhYmxlU3RyZWFtRnJvbVJlYWRlck9wdGlvbnMgPSB7fSxcbik6IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+IHtcbiAgY29uc3Qge1xuICAgIGF1dG9DbG9zZSA9IHRydWUsXG4gICAgY2h1bmtTaXplID0gREVGQVVMVF9DSFVOS19TSVpFLFxuICAgIHN0cmF0ZWd5LFxuICB9ID0gb3B0aW9ucztcblxuICByZXR1cm4gbmV3IFJlYWRhYmxlU3RyZWFtKHtcbiAgICBhc3luYyBwdWxsKGNvbnRyb2xsZXIpIHtcbiAgICAgIGNvbnN0IGNodW5rID0gbmV3IFVpbnQ4QXJyYXkoY2h1bmtTaXplKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlYWQgPSBhd2FpdCByZWFkZXIucmVhZChjaHVuayk7XG4gICAgICAgIGlmIChyZWFkID09PSBudWxsKSB7XG4gICAgICAgICAgaWYgKGlzQ2xvc2VyKHJlYWRlcikgJiYgYXV0b0Nsb3NlKSB7XG4gICAgICAgICAgICByZWFkZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb250cm9sbGVyLmVucXVldWUoY2h1bmsuc3ViYXJyYXkoMCwgcmVhZCkpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb250cm9sbGVyLmVycm9yKGUpO1xuICAgICAgICBpZiAoaXNDbG9zZXIocmVhZGVyKSkge1xuICAgICAgICAgIHJlYWRlci5jbG9zZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBjYW5jZWwoKSB7XG4gICAgICBpZiAoaXNDbG9zZXIocmVhZGVyKSAmJiBhdXRvQ2xvc2UpIHtcbiAgICAgICAgcmVhZGVyLmNsb3NlKCk7XG4gICAgICB9XG4gICAgfSxcbiAgfSwgc3RyYXRlZ3kpO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PmAgZnJvbSBhbiBgQXN5bmNJdGVyYWJsZWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkYWJsZVN0cmVhbUZyb21Bc3luY0l0ZXJhYmxlKFxuICBzb3VyY2U6IEFzeW5jSXRlcmFibGU8dW5rbm93bj4sXG4pOiBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PiB7XG4gIHJldHVybiBuZXcgUmVhZGFibGVTdHJlYW0oe1xuICAgIGFzeW5jIHN0YXJ0KGNvbnRyb2xsZXIpIHtcbiAgICAgIGZvciBhd2FpdCAoY29uc3QgY2h1bmsgb2Ygc291cmNlKSB7XG4gICAgICAgIGlmIChCT0RZX1RZUEVTLmluY2x1ZGVzKHR5cGVvZiBjaHVuaykpIHtcbiAgICAgICAgICBjb250cm9sbGVyLmVucXVldWUoZW5jb2Rlci5lbmNvZGUoU3RyaW5nKGNodW5rKSkpO1xuICAgICAgICB9IGVsc2UgaWYgKGNodW5rIGluc3RhbmNlb2YgVWludDhBcnJheSkge1xuICAgICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZShjaHVuayk7XG4gICAgICAgIH0gZWxzZSBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KGNodW5rKSkge1xuICAgICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZShuZXcgVWludDhBcnJheShjaHVuay5idWZmZXIpKTtcbiAgICAgICAgfSBlbHNlIGlmIChjaHVuayBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKG5ldyBVaW50OEFycmF5KGNodW5rKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZShlbmNvZGVyLmVuY29kZShKU09OLnN0cmluZ2lmeShjaHVuaykpKTtcbiAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIC8vIHdlIGp1c3Qgc3dhbGxvdyBlcnJvcnMgaGVyZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29udHJvbGxlci5jbG9zZSgpO1xuICAgIH0sXG4gIH0pO1xufVxuXG4vKiogQSB1dGlsaXR5IGNsYXNzIHRoYXQgdHJhbnNmb3JtcyBcImFueVwiIGNodW5rIGludG8gYW4gYFVpbnQ4QXJyYXlgLiAqL1xuZXhwb3J0IGNsYXNzIFVpbnQ4QXJyYXlUcmFuc2Zvcm1TdHJlYW1cbiAgZXh0ZW5kcyBUcmFuc2Zvcm1TdHJlYW08dW5rbm93biwgVWludDhBcnJheT4ge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBjb25zdCBpbml0ID0ge1xuICAgICAgYXN5bmMgdHJhbnNmb3JtKFxuICAgICAgICBjaHVuazogdW5rbm93bixcbiAgICAgICAgY29udHJvbGxlcjogVHJhbnNmb3JtU3RyZWFtRGVmYXVsdENvbnRyb2xsZXI8VWludDhBcnJheT4sXG4gICAgICApIHtcbiAgICAgICAgY2h1bmsgPSBhd2FpdCBjaHVuaztcbiAgICAgICAgc3dpdGNoICh0eXBlb2YgY2h1bmspIHtcbiAgICAgICAgICBjYXNlIFwib2JqZWN0XCI6XG4gICAgICAgICAgICBpZiAoY2h1bmsgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgY29udHJvbGxlci50ZXJtaW5hdGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KGNodW5rKSkge1xuICAgICAgICAgICAgICBjb250cm9sbGVyLmVucXVldWUoXG4gICAgICAgICAgICAgICAgbmV3IFVpbnQ4QXJyYXkoXG4gICAgICAgICAgICAgICAgICBjaHVuay5idWZmZXIsXG4gICAgICAgICAgICAgICAgICBjaHVuay5ieXRlT2Zmc2V0LFxuICAgICAgICAgICAgICAgICAgY2h1bmsuYnl0ZUxlbmd0aCxcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgICAgQXJyYXkuaXNBcnJheShjaHVuaykgJiZcbiAgICAgICAgICAgICAgY2h1bmsuZXZlcnkoKHZhbHVlKSA9PiB0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKG5ldyBVaW50OEFycmF5KGNodW5rKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICAgICB0eXBlb2YgY2h1bmsudmFsdWVPZiA9PT0gXCJmdW5jdGlvblwiICYmIGNodW5rLnZhbHVlT2YoKSAhPT0gY2h1bmtcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICB0aGlzLnRyYW5zZm9ybShjaHVuay52YWx1ZU9mKCksIGNvbnRyb2xsZXIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChcInRvSlNPTlwiIGluIGNodW5rKSB7XG4gICAgICAgICAgICAgIHRoaXMudHJhbnNmb3JtKEpTT04uc3RyaW5naWZ5KGNodW5rKSwgY29udHJvbGxlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIFwic3ltYm9sXCI6XG4gICAgICAgICAgICBjb250cm9sbGVyLmVycm9yKFxuICAgICAgICAgICAgICBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHRyYW5zZm9ybSBhIHN5bWJvbCB0byBhIFVpbnQ4QXJyYXlcIiksXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSBcInVuZGVmaW5lZFwiOlxuICAgICAgICAgICAgY29udHJvbGxlci5lcnJvcihcbiAgICAgICAgICAgICAgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB0cmFuc2Zvcm0gdW5kZWZpbmVkIHRvIGEgVWludDhBcnJheVwiKSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKHRoaXMuZW5jb2Rlci5lbmNvZGUoU3RyaW5nKGNodW5rKSkpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgZW5jb2RlcixcbiAgICB9O1xuICAgIHN1cGVyKGluaXQpO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEseUVBQXlFO0FBRXpFLFNBQVMsVUFBVSxRQUFRLGNBQWM7QUF5QnpDLFNBQVMsU0FBUyxLQUFjO0VBQzlCLE9BQU8sT0FBTyxVQUFVLFlBQVksU0FBUyxRQUFRLFdBQVcsU0FDOUQsbUNBQW1DO0VBQ25DLE9BQU8sQUFBQyxLQUE2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