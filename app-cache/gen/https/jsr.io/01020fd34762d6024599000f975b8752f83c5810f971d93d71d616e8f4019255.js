// Copyright 2018-2024 the oak authors. All rights reserved. MIT license.
/**
 * Contains the {@linkcode Response} abstraction used by oak.
 *
 * Most end users would not need to directly access this module.
 *
 * @module
 */ var _computedKey, _computedKey1;
import { contentType, isRedirectStatus, Status, STATUS_TEXT } from "./deps.ts";
import { DomResponse } from "./http_server_native_request.ts";
import { isAsyncIterable, isHtml, isReader } from "./utils/type_guards.ts";
import { BODY_TYPES } from "./utils/consts.ts";
import { encodeUrl } from "./utils/encode_url.ts";
import { readableStreamFromAsyncIterable, readableStreamFromReader, Uint8ArrayTransformStream } from "./utils/streams.ts";
/** A symbol that indicates to `response.redirect()` to attempt to redirect
 * back to the request referrer.  For example:
 *
 * ```ts
 * import { Application, REDIRECT_BACK } from "jsr:@oak/oak/";
 *
 * const app = new Application();
 *
 * app.use((ctx) => {
 *   if (ctx.request.url.pathName === "/back") {
 *     ctx.response.redirect(REDIRECT_BACK, "/");
 *   }
 * });
 *
 * await app.listen({ port: 80 });
 * ```
 */ export const REDIRECT_BACK = Symbol("redirect backwards");
async function convertBodyToBodyInit(body, type, jsonBodyReplacer) {
  let result;
  if (BODY_TYPES.includes(typeof body)) {
    result = String(body);
    type = type ?? (isHtml(result) ? "html" : "text/plain");
  } else if (isReader(body)) {
    result = readableStreamFromReader(body);
  } else if (ArrayBuffer.isView(body) || body instanceof ArrayBuffer || body instanceof Blob || body instanceof URLSearchParams) {
    // deno-lint-ignore no-explicit-any
    result = body;
  } else if (body instanceof ReadableStream) {
    result = body.pipeThrough(new Uint8ArrayTransformStream());
  } else if (body instanceof FormData) {
    result = body;
    type = undefined;
  } else if (isAsyncIterable(body)) {
    result = readableStreamFromAsyncIterable(body);
  } else if (body && typeof body === "object") {
    result = JSON.stringify(body, jsonBodyReplacer);
    type = type ?? "json";
  } else if (typeof body === "function") {
    const result = body.call(null);
    return convertBodyToBodyInit(await result, type, jsonBodyReplacer);
  } else if (body) {
    throw new TypeError("Response body was set but could not be converted.");
  }
  return [
    result,
    type
  ];
}
_computedKey = Symbol.for("Deno.customInspect"), _computedKey1 = Symbol.for("nodejs.util.inspect.custom");
/** An interface to control what response will be sent when the middleware
 * finishes processing the request.
 *
 * The response is usually accessed via the context's `.response` property.
 *
 * ### Example
 *
 * ```ts
 * import { Application, Status } from "jsr:@oak/oak/";
 *
 * const app = new Application();
 *
 * app.use((ctx) => {
 *   ctx.response.body = { hello: "oak" };
 *   ctx.response.type = "json";
 *   ctx.response.status = Status.OK;
 * });
 * ```
 */ export class Response {
  #body;
  #bodySet = false;
  #domResponse;
  #headers = new Headers();
  #jsonBodyReplacer;
  #request;
  #resources = [];
  #status;
  #type;
  #writable = true;
  async #getBodyInit() {
    const [body, type] = await convertBodyToBodyInit(this.body, this.type, this.#jsonBodyReplacer);
    this.type = type;
    return body;
  }
  #setContentType() {
    if (this.type) {
      const contentTypeString = contentType(this.type);
      if (contentTypeString && !this.headers.has("Content-Type")) {
        this.headers.append("Content-Type", contentTypeString);
      }
    }
  }
  /** The body of the response.  The body will be automatically processed when
   * the response is being sent and converted to a `Uint8Array` or a
   * `Deno.Reader`.
   *
   * Automatic conversion to a `Deno.Reader` occurs for async iterables. */ get body() {
    return this.#body;
  }
  /** The body of the response.  The body will be automatically processed when
   * the response is being sent and converted to a `Uint8Array` or a
   * `Deno.Reader`.
   *
   * Automatic conversion to a `Deno.Reader` occurs for async iterables. */ set body(value) {
    if (!this.#writable) {
      throw new Error("The response is not writable.");
    }
    this.#bodySet = true;
    this.#body = value;
  }
  /** Headers that will be returned in the response. */ get headers() {
    return this.#headers;
  }
  /** Headers that will be returned in the response. */ set headers(value) {
    if (!this.#writable) {
      throw new Error("The response is not writable.");
    }
    this.#headers = value;
  }
  /** The HTTP status of the response.  If this has not been explicitly set,
   * reading the value will return what would be the value of status if the
   * response were sent at this point in processing the middleware.  If the body
   * has been set, the status will be `200 OK`.  If a value for the body has
   * not been set yet, the status will be `404 Not Found`. */ get status() {
    if (this.#status) {
      return this.#status;
    }
    return this.body != null ? Status.OK : this.#bodySet ? Status.NoContent : Status.NotFound;
  }
  /** The HTTP status of the response.  If this has not been explicitly set,
   * reading the value will return what would be the value of status if the
   * response were sent at this point in processing the middleware.  If the body
   * has been set, the status will be `200 OK`.  If a value for the body has
   * not been set yet, the status will be `404 Not Found`. */ set status(value) {
    if (!this.#writable) {
      throw new Error("The response is not writable.");
    }
    this.#status = value;
  }
  /** The media type, or extension of the response.  Setting this value will
   * ensure an appropriate `Content-Type` header is added to the response. */ get type() {
    return this.#type;
  }
  /** The media type, or extension of the response.  Setting this value will
   * ensure an appropriate `Content-Type` header is added to the response. */ set type(value) {
    if (!this.#writable) {
      throw new Error("The response is not writable.");
    }
    this.#type = value;
  }
  /** A read-only property which determines if the response is writable or not.
   * Once the response has been processed, this value is set to `false`. */ get writable() {
    return this.#writable;
  }
  constructor(request, jsonBodyReplacer){
    this.#request = request;
    this.#jsonBodyReplacer = jsonBodyReplacer;
  }
  /** Add a resource to the list of resources that will be closed when the
   * request is destroyed. */ addResource(resource) {
    this.#resources.push(resource);
  }
  /** Release any resources that are being tracked by the response.
   *
   * @param closeResources close any resource IDs registered with the response
   */ destroy(closeResources = true) {
    this.#writable = false;
    this.#body = undefined;
    this.#domResponse = undefined;
    if (closeResources) {
      for (const resource of this.#resources){
        try {
          resource.close();
        } catch  {
        // we don't care about errors here
        }
      }
    }
  }
  redirect(url, alt = "/") {
    if (url === REDIRECT_BACK) {
      url = this.#request.headers.get("Referer") ?? String(alt);
    } else if (typeof url === "object") {
      url = String(url);
    }
    this.headers.set("Location", encodeUrl(url));
    if (!this.status || !isRedirectStatus(this.status)) {
      this.status = Status.Found;
    }
    if (this.#request.accepts("html")) {
      url = encodeURI(url);
      this.type = "text/html; charset=UTF-8";
      this.body = `Redirecting to <a href="${url}">${url}</a>.`;
      return;
    }
    this.type = "text/plain; charset=UTF-8";
    this.body = `Redirecting to ${url}.`;
  }
  async toDomResponse() {
    if (this.#domResponse) {
      return this.#domResponse;
    }
    const bodyInit = await this.#getBodyInit();
    this.#setContentType();
    const { headers } = this;
    // If there is no body and no content type and no set length, then set the
    // content length to 0
    if (!(bodyInit || headers.has("Content-Type") || headers.has("Content-Length"))) {
      headers.append("Content-Length", "0");
    }
    this.#writable = false;
    const status = this.status;
    const responseInit = {
      headers,
      status,
      statusText: STATUS_TEXT[status]
    };
    return this.#domResponse = new DomResponse(bodyInit, responseInit);
  }
  with(responseOrBody, init) {
    if (this.#domResponse || !this.#writable) {
      throw new Error("A response has already been finalized.");
    }
    this.#writable = false;
    this.#domResponse = responseOrBody instanceof DomResponse ? responseOrBody : new DomResponse(responseOrBody, init);
  }
  [_computedKey](inspect) {
    const { body, headers, status, type, writable } = this;
    return `${this.constructor.name} ${inspect({
      body,
      headers,
      status,
      type,
      writable
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
    const { body, headers, status, type, writable } = this;
    return `${options.stylize(this.constructor.name, "special")} ${inspect({
      body,
      headers,
      status,
      type,
      writable
    }, newOptions)}`;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvb2FrLzE2LjEuMC9yZXNwb25zZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI0IHRoZSBvYWsgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbi8qKlxuICogQ29udGFpbnMgdGhlIHtAbGlua2NvZGUgUmVzcG9uc2V9IGFic3RyYWN0aW9uIHVzZWQgYnkgb2FrLlxuICpcbiAqIE1vc3QgZW5kIHVzZXJzIHdvdWxkIG5vdCBuZWVkIHRvIGRpcmVjdGx5IGFjY2VzcyB0aGlzIG1vZHVsZS5cbiAqXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgY29udGVudFR5cGUsIGlzUmVkaXJlY3RTdGF0dXMsIFN0YXR1cywgU1RBVFVTX1RFWFQgfSBmcm9tIFwiLi9kZXBzLnRzXCI7XG5pbXBvcnQgeyBEb21SZXNwb25zZSB9IGZyb20gXCIuL2h0dHBfc2VydmVyX25hdGl2ZV9yZXF1ZXN0LnRzXCI7XG5pbXBvcnQgdHlwZSB7IFJlcXVlc3QgfSBmcm9tIFwiLi9yZXF1ZXN0LnRzXCI7XG5pbXBvcnQgeyBpc0FzeW5jSXRlcmFibGUsIGlzSHRtbCwgaXNSZWFkZXIgfSBmcm9tIFwiLi91dGlscy90eXBlX2d1YXJkcy50c1wiO1xuaW1wb3J0IHsgQk9EWV9UWVBFUyB9IGZyb20gXCIuL3V0aWxzL2NvbnN0cy50c1wiO1xuaW1wb3J0IHsgZW5jb2RlVXJsIH0gZnJvbSBcIi4vdXRpbHMvZW5jb2RlX3VybC50c1wiO1xuaW1wb3J0IHtcbiAgcmVhZGFibGVTdHJlYW1Gcm9tQXN5bmNJdGVyYWJsZSxcbiAgcmVhZGFibGVTdHJlYW1Gcm9tUmVhZGVyLFxuICBVaW50OEFycmF5VHJhbnNmb3JtU3RyZWFtLFxufSBmcm9tIFwiLi91dGlscy9zdHJlYW1zLnRzXCI7XG5cbi8qKiBUaGUgdmFyaW91cyB0eXBlcyBvZiBib2RpZXMgc3VwcG9ydGVkIHdoZW4gc2V0dGluZyB0aGUgdmFsdWUgb2YgYC5ib2R5YFxuICogb24gYSB7QGxpbmtjb2RlIFJlc3BvbnNlfSAqL1xuZXhwb3J0IHR5cGUgUmVzcG9uc2VCb2R5ID1cbiAgfCBzdHJpbmdcbiAgfCBudW1iZXJcbiAgfCBiaWdpbnRcbiAgfCBib29sZWFuXG4gIHwgc3ltYm9sXG4gIHwgb2JqZWN0XG4gIHwgdW5kZWZpbmVkXG4gIHwgbnVsbDtcblxuLyoqIEEgZnVuY3Rpb24gdGhhdCB3aGVuIGludm9rZWQgcmV0dXJucyBvciByZXNvbHZlcyB0byBhXG4gKiB7QGxpbmtjb2RlIFJlc3BvbnNlQm9keX0uICovXG5leHBvcnQgdHlwZSBSZXNwb25zZUJvZHlGdW5jdGlvbiA9ICgpID0+IFJlc3BvbnNlQm9keSB8IFByb21pc2U8UmVzcG9uc2VCb2R5PjtcblxuLyoqIEEgc3ltYm9sIHRoYXQgaW5kaWNhdGVzIHRvIGByZXNwb25zZS5yZWRpcmVjdCgpYCB0byBhdHRlbXB0IHRvIHJlZGlyZWN0XG4gKiBiYWNrIHRvIHRoZSByZXF1ZXN0IHJlZmVycmVyLiAgRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEFwcGxpY2F0aW9uLCBSRURJUkVDVF9CQUNLIH0gZnJvbSBcImpzcjpAb2FrL29hay9cIjtcbiAqXG4gKiBjb25zdCBhcHAgPSBuZXcgQXBwbGljYXRpb24oKTtcbiAqXG4gKiBhcHAudXNlKChjdHgpID0+IHtcbiAqICAgaWYgKGN0eC5yZXF1ZXN0LnVybC5wYXRoTmFtZSA9PT0gXCIvYmFja1wiKSB7XG4gKiAgICAgY3R4LnJlc3BvbnNlLnJlZGlyZWN0KFJFRElSRUNUX0JBQ0ssIFwiL1wiKTtcbiAqICAgfVxuICogfSk7XG4gKlxuICogYXdhaXQgYXBwLmxpc3Rlbih7IHBvcnQ6IDgwIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBSRURJUkVDVF9CQUNLID0gU3ltYm9sKFwicmVkaXJlY3QgYmFja3dhcmRzXCIpO1xuXG5hc3luYyBmdW5jdGlvbiBjb252ZXJ0Qm9keVRvQm9keUluaXQoXG4gIGJvZHk6IFJlc3BvbnNlQm9keSB8IFJlc3BvbnNlQm9keUZ1bmN0aW9uLFxuICB0eXBlPzogc3RyaW5nLFxuICBqc29uQm9keVJlcGxhY2VyPzogKGtleTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bikgPT4gdW5rbm93bixcbik6IFByb21pc2U8W2dsb2JhbFRoaXMuQm9keUluaXQgfCB1bmRlZmluZWQsIHN0cmluZyB8IHVuZGVmaW5lZF0+IHtcbiAgbGV0IHJlc3VsdDogZ2xvYmFsVGhpcy5Cb2R5SW5pdCB8IHVuZGVmaW5lZDtcbiAgaWYgKEJPRFlfVFlQRVMuaW5jbHVkZXModHlwZW9mIGJvZHkpKSB7XG4gICAgcmVzdWx0ID0gU3RyaW5nKGJvZHkpO1xuICAgIHR5cGUgPSB0eXBlID8/IChpc0h0bWwocmVzdWx0KSA/IFwiaHRtbFwiIDogXCJ0ZXh0L3BsYWluXCIpO1xuICB9IGVsc2UgaWYgKGlzUmVhZGVyKGJvZHkpKSB7XG4gICAgcmVzdWx0ID0gcmVhZGFibGVTdHJlYW1Gcm9tUmVhZGVyKGJvZHkpO1xuICB9IGVsc2UgaWYgKFxuICAgIEFycmF5QnVmZmVyLmlzVmlldyhib2R5KSB8fCBib2R5IGluc3RhbmNlb2YgQXJyYXlCdWZmZXIgfHxcbiAgICBib2R5IGluc3RhbmNlb2YgQmxvYiB8fCBib2R5IGluc3RhbmNlb2YgVVJMU2VhcmNoUGFyYW1zXG4gICkge1xuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgcmVzdWx0ID0gYm9keSBhcyBhbnk7XG4gIH0gZWxzZSBpZiAoYm9keSBpbnN0YW5jZW9mIFJlYWRhYmxlU3RyZWFtKSB7XG4gICAgcmVzdWx0ID0gYm9keS5waXBlVGhyb3VnaChuZXcgVWludDhBcnJheVRyYW5zZm9ybVN0cmVhbSgpKTtcbiAgfSBlbHNlIGlmIChib2R5IGluc3RhbmNlb2YgRm9ybURhdGEpIHtcbiAgICByZXN1bHQgPSBib2R5O1xuICAgIHR5cGUgPSB1bmRlZmluZWQ7XG4gIH0gZWxzZSBpZiAoaXNBc3luY0l0ZXJhYmxlKGJvZHkpKSB7XG4gICAgcmVzdWx0ID0gcmVhZGFibGVTdHJlYW1Gcm9tQXN5bmNJdGVyYWJsZShib2R5KTtcbiAgfSBlbHNlIGlmIChib2R5ICYmIHR5cGVvZiBib2R5ID09PSBcIm9iamVjdFwiKSB7XG4gICAgcmVzdWx0ID0gSlNPTi5zdHJpbmdpZnkoYm9keSwganNvbkJvZHlSZXBsYWNlcik7XG4gICAgdHlwZSA9IHR5cGUgPz8gXCJqc29uXCI7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGJvZHkgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGNvbnN0IHJlc3VsdCA9IGJvZHkuY2FsbChudWxsKTtcbiAgICByZXR1cm4gY29udmVydEJvZHlUb0JvZHlJbml0KGF3YWl0IHJlc3VsdCwgdHlwZSwganNvbkJvZHlSZXBsYWNlcik7XG4gIH0gZWxzZSBpZiAoYm9keSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJSZXNwb25zZSBib2R5IHdhcyBzZXQgYnV0IGNvdWxkIG5vdCBiZSBjb252ZXJ0ZWQuXCIpO1xuICB9XG4gIHJldHVybiBbcmVzdWx0LCB0eXBlXTtcbn1cblxuLyoqIEFuIGludGVyZmFjZSB0byBjb250cm9sIHdoYXQgcmVzcG9uc2Ugd2lsbCBiZSBzZW50IHdoZW4gdGhlIG1pZGRsZXdhcmVcbiAqIGZpbmlzaGVzIHByb2Nlc3NpbmcgdGhlIHJlcXVlc3QuXG4gKlxuICogVGhlIHJlc3BvbnNlIGlzIHVzdWFsbHkgYWNjZXNzZWQgdmlhIHRoZSBjb250ZXh0J3MgYC5yZXNwb25zZWAgcHJvcGVydHkuXG4gKlxuICogIyMjIEV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgQXBwbGljYXRpb24sIFN0YXR1cyB9IGZyb20gXCJqc3I6QG9hay9vYWsvXCI7XG4gKlxuICogY29uc3QgYXBwID0gbmV3IEFwcGxpY2F0aW9uKCk7XG4gKlxuICogYXBwLnVzZSgoY3R4KSA9PiB7XG4gKiAgIGN0eC5yZXNwb25zZS5ib2R5ID0geyBoZWxsbzogXCJvYWtcIiB9O1xuICogICBjdHgucmVzcG9uc2UudHlwZSA9IFwianNvblwiO1xuICogICBjdHgucmVzcG9uc2Uuc3RhdHVzID0gU3RhdHVzLk9LO1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIFJlc3BvbnNlIHtcbiAgI2JvZHk/OiBSZXNwb25zZUJvZHkgfCBSZXNwb25zZUJvZHlGdW5jdGlvbjtcbiAgI2JvZHlTZXQgPSBmYWxzZTtcbiAgI2RvbVJlc3BvbnNlPzogZ2xvYmFsVGhpcy5SZXNwb25zZTtcbiAgI2hlYWRlcnMgPSBuZXcgSGVhZGVycygpO1xuICAjanNvbkJvZHlSZXBsYWNlcj86IChrZXk6IHN0cmluZywgdmFsdWU6IHVua25vd24pID0+IHVua25vd247XG4gICNyZXF1ZXN0OiBSZXF1ZXN0O1xuICAjcmVzb3VyY2VzOiB7IGNsb3NlKCk6IHZvaWQgfVtdID0gW107XG4gICNzdGF0dXM/OiBTdGF0dXM7XG4gICN0eXBlPzogc3RyaW5nO1xuICAjd3JpdGFibGUgPSB0cnVlO1xuXG4gIGFzeW5jICNnZXRCb2R5SW5pdCgpOiBQcm9taXNlPGdsb2JhbFRoaXMuQm9keUluaXQgfCB1bmRlZmluZWQ+IHtcbiAgICBjb25zdCBbYm9keSwgdHlwZV0gPSBhd2FpdCBjb252ZXJ0Qm9keVRvQm9keUluaXQoXG4gICAgICB0aGlzLmJvZHksXG4gICAgICB0aGlzLnR5cGUsXG4gICAgICB0aGlzLiNqc29uQm9keVJlcGxhY2VyLFxuICAgICk7XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICByZXR1cm4gYm9keTtcbiAgfVxuXG4gICNzZXRDb250ZW50VHlwZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy50eXBlKSB7XG4gICAgICBjb25zdCBjb250ZW50VHlwZVN0cmluZyA9IGNvbnRlbnRUeXBlKHRoaXMudHlwZSk7XG4gICAgICBpZiAoY29udGVudFR5cGVTdHJpbmcgJiYgIXRoaXMuaGVhZGVycy5oYXMoXCJDb250ZW50LVR5cGVcIikpIHtcbiAgICAgICAgdGhpcy5oZWFkZXJzLmFwcGVuZChcIkNvbnRlbnQtVHlwZVwiLCBjb250ZW50VHlwZVN0cmluZyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqIFRoZSBib2R5IG9mIHRoZSByZXNwb25zZS4gIFRoZSBib2R5IHdpbGwgYmUgYXV0b21hdGljYWxseSBwcm9jZXNzZWQgd2hlblxuICAgKiB0aGUgcmVzcG9uc2UgaXMgYmVpbmcgc2VudCBhbmQgY29udmVydGVkIHRvIGEgYFVpbnQ4QXJyYXlgIG9yIGFcbiAgICogYERlbm8uUmVhZGVyYC5cbiAgICpcbiAgICogQXV0b21hdGljIGNvbnZlcnNpb24gdG8gYSBgRGVuby5SZWFkZXJgIG9jY3VycyBmb3IgYXN5bmMgaXRlcmFibGVzLiAqL1xuICBnZXQgYm9keSgpOiBSZXNwb25zZUJvZHkgfCBSZXNwb25zZUJvZHlGdW5jdGlvbiB7XG4gICAgcmV0dXJuIHRoaXMuI2JvZHk7XG4gIH1cblxuICAvKiogVGhlIGJvZHkgb2YgdGhlIHJlc3BvbnNlLiAgVGhlIGJvZHkgd2lsbCBiZSBhdXRvbWF0aWNhbGx5IHByb2Nlc3NlZCB3aGVuXG4gICAqIHRoZSByZXNwb25zZSBpcyBiZWluZyBzZW50IGFuZCBjb252ZXJ0ZWQgdG8gYSBgVWludDhBcnJheWAgb3IgYVxuICAgKiBgRGVuby5SZWFkZXJgLlxuICAgKlxuICAgKiBBdXRvbWF0aWMgY29udmVyc2lvbiB0byBhIGBEZW5vLlJlYWRlcmAgb2NjdXJzIGZvciBhc3luYyBpdGVyYWJsZXMuICovXG4gIHNldCBib2R5KHZhbHVlOiBSZXNwb25zZUJvZHkgfCBSZXNwb25zZUJvZHlGdW5jdGlvbikge1xuICAgIGlmICghdGhpcy4jd3JpdGFibGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSByZXNwb25zZSBpcyBub3Qgd3JpdGFibGUuXCIpO1xuICAgIH1cbiAgICB0aGlzLiNib2R5U2V0ID0gdHJ1ZTtcbiAgICB0aGlzLiNib2R5ID0gdmFsdWU7XG4gIH1cblxuICAvKiogSGVhZGVycyB0aGF0IHdpbGwgYmUgcmV0dXJuZWQgaW4gdGhlIHJlc3BvbnNlLiAqL1xuICBnZXQgaGVhZGVycygpOiBIZWFkZXJzIHtcbiAgICByZXR1cm4gdGhpcy4jaGVhZGVycztcbiAgfVxuXG4gIC8qKiBIZWFkZXJzIHRoYXQgd2lsbCBiZSByZXR1cm5lZCBpbiB0aGUgcmVzcG9uc2UuICovXG4gIHNldCBoZWFkZXJzKHZhbHVlOiBIZWFkZXJzKSB7XG4gICAgaWYgKCF0aGlzLiN3cml0YWJsZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIHJlc3BvbnNlIGlzIG5vdCB3cml0YWJsZS5cIik7XG4gICAgfVxuICAgIHRoaXMuI2hlYWRlcnMgPSB2YWx1ZTtcbiAgfVxuXG4gIC8qKiBUaGUgSFRUUCBzdGF0dXMgb2YgdGhlIHJlc3BvbnNlLiAgSWYgdGhpcyBoYXMgbm90IGJlZW4gZXhwbGljaXRseSBzZXQsXG4gICAqIHJlYWRpbmcgdGhlIHZhbHVlIHdpbGwgcmV0dXJuIHdoYXQgd291bGQgYmUgdGhlIHZhbHVlIG9mIHN0YXR1cyBpZiB0aGVcbiAgICogcmVzcG9uc2Ugd2VyZSBzZW50IGF0IHRoaXMgcG9pbnQgaW4gcHJvY2Vzc2luZyB0aGUgbWlkZGxld2FyZS4gIElmIHRoZSBib2R5XG4gICAqIGhhcyBiZWVuIHNldCwgdGhlIHN0YXR1cyB3aWxsIGJlIGAyMDAgT0tgLiAgSWYgYSB2YWx1ZSBmb3IgdGhlIGJvZHkgaGFzXG4gICAqIG5vdCBiZWVuIHNldCB5ZXQsIHRoZSBzdGF0dXMgd2lsbCBiZSBgNDA0IE5vdCBGb3VuZGAuICovXG4gIGdldCBzdGF0dXMoKTogU3RhdHVzIHtcbiAgICBpZiAodGhpcy4jc3RhdHVzKSB7XG4gICAgICByZXR1cm4gdGhpcy4jc3RhdHVzO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ib2R5ICE9IG51bGxcbiAgICAgID8gU3RhdHVzLk9LXG4gICAgICA6IHRoaXMuI2JvZHlTZXRcbiAgICAgID8gU3RhdHVzLk5vQ29udGVudFxuICAgICAgOiBTdGF0dXMuTm90Rm91bmQ7XG4gIH1cblxuICAvKiogVGhlIEhUVFAgc3RhdHVzIG9mIHRoZSByZXNwb25zZS4gIElmIHRoaXMgaGFzIG5vdCBiZWVuIGV4cGxpY2l0bHkgc2V0LFxuICAgKiByZWFkaW5nIHRoZSB2YWx1ZSB3aWxsIHJldHVybiB3aGF0IHdvdWxkIGJlIHRoZSB2YWx1ZSBvZiBzdGF0dXMgaWYgdGhlXG4gICAqIHJlc3BvbnNlIHdlcmUgc2VudCBhdCB0aGlzIHBvaW50IGluIHByb2Nlc3NpbmcgdGhlIG1pZGRsZXdhcmUuICBJZiB0aGUgYm9keVxuICAgKiBoYXMgYmVlbiBzZXQsIHRoZSBzdGF0dXMgd2lsbCBiZSBgMjAwIE9LYC4gIElmIGEgdmFsdWUgZm9yIHRoZSBib2R5IGhhc1xuICAgKiBub3QgYmVlbiBzZXQgeWV0LCB0aGUgc3RhdHVzIHdpbGwgYmUgYDQwNCBOb3QgRm91bmRgLiAqL1xuICBzZXQgc3RhdHVzKHZhbHVlOiBTdGF0dXMpIHtcbiAgICBpZiAoIXRoaXMuI3dyaXRhYmxlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgcmVzcG9uc2UgaXMgbm90IHdyaXRhYmxlLlwiKTtcbiAgICB9XG4gICAgdGhpcy4jc3RhdHVzID0gdmFsdWU7XG4gIH1cblxuICAvKiogVGhlIG1lZGlhIHR5cGUsIG9yIGV4dGVuc2lvbiBvZiB0aGUgcmVzcG9uc2UuICBTZXR0aW5nIHRoaXMgdmFsdWUgd2lsbFxuICAgKiBlbnN1cmUgYW4gYXBwcm9wcmlhdGUgYENvbnRlbnQtVHlwZWAgaGVhZGVyIGlzIGFkZGVkIHRvIHRoZSByZXNwb25zZS4gKi9cbiAgZ2V0IHR5cGUoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy4jdHlwZTtcbiAgfVxuICAvKiogVGhlIG1lZGlhIHR5cGUsIG9yIGV4dGVuc2lvbiBvZiB0aGUgcmVzcG9uc2UuICBTZXR0aW5nIHRoaXMgdmFsdWUgd2lsbFxuICAgKiBlbnN1cmUgYW4gYXBwcm9wcmlhdGUgYENvbnRlbnQtVHlwZWAgaGVhZGVyIGlzIGFkZGVkIHRvIHRoZSByZXNwb25zZS4gKi9cbiAgc2V0IHR5cGUodmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCkge1xuICAgIGlmICghdGhpcy4jd3JpdGFibGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSByZXNwb25zZSBpcyBub3Qgd3JpdGFibGUuXCIpO1xuICAgIH1cbiAgICB0aGlzLiN0eXBlID0gdmFsdWU7XG4gIH1cblxuICAvKiogQSByZWFkLW9ubHkgcHJvcGVydHkgd2hpY2ggZGV0ZXJtaW5lcyBpZiB0aGUgcmVzcG9uc2UgaXMgd3JpdGFibGUgb3Igbm90LlxuICAgKiBPbmNlIHRoZSByZXNwb25zZSBoYXMgYmVlbiBwcm9jZXNzZWQsIHRoaXMgdmFsdWUgaXMgc2V0IHRvIGBmYWxzZWAuICovXG4gIGdldCB3cml0YWJsZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy4jd3JpdGFibGU7XG4gIH1cblxuICBjb25zdHJ1Y3RvcihcbiAgICByZXF1ZXN0OiBSZXF1ZXN0LFxuICAgIGpzb25Cb2R5UmVwbGFjZXI/OiAoa2V5OiBzdHJpbmcsIHZhbHVlOiB1bmtub3duKSA9PiB1bmtub3duLFxuICApIHtcbiAgICB0aGlzLiNyZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICB0aGlzLiNqc29uQm9keVJlcGxhY2VyID0ganNvbkJvZHlSZXBsYWNlcjtcbiAgfVxuXG4gIC8qKiBBZGQgYSByZXNvdXJjZSB0byB0aGUgbGlzdCBvZiByZXNvdXJjZXMgdGhhdCB3aWxsIGJlIGNsb3NlZCB3aGVuIHRoZVxuICAgKiByZXF1ZXN0IGlzIGRlc3Ryb3llZC4gKi9cbiAgYWRkUmVzb3VyY2UocmVzb3VyY2U6IHsgY2xvc2UoKTogdm9pZCB9KTogdm9pZCB7XG4gICAgdGhpcy4jcmVzb3VyY2VzLnB1c2gocmVzb3VyY2UpO1xuICB9XG5cbiAgLyoqIFJlbGVhc2UgYW55IHJlc291cmNlcyB0aGF0IGFyZSBiZWluZyB0cmFja2VkIGJ5IHRoZSByZXNwb25zZS5cbiAgICpcbiAgICogQHBhcmFtIGNsb3NlUmVzb3VyY2VzIGNsb3NlIGFueSByZXNvdXJjZSBJRHMgcmVnaXN0ZXJlZCB3aXRoIHRoZSByZXNwb25zZVxuICAgKi9cbiAgZGVzdHJveShjbG9zZVJlc291cmNlcyA9IHRydWUpOiB2b2lkIHtcbiAgICB0aGlzLiN3cml0YWJsZSA9IGZhbHNlO1xuICAgIHRoaXMuI2JvZHkgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy4jZG9tUmVzcG9uc2UgPSB1bmRlZmluZWQ7XG4gICAgaWYgKGNsb3NlUmVzb3VyY2VzKSB7XG4gICAgICBmb3IgKGNvbnN0IHJlc291cmNlIG9mIHRoaXMuI3Jlc291cmNlcykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJlc291cmNlLmNsb3NlKCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIHdlIGRvbid0IGNhcmUgYWJvdXQgZXJyb3JzIGhlcmVcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKiBTZXRzIHRoZSByZXNwb25zZSB0byByZWRpcmVjdCB0byB0aGUgc3VwcGxpZWQgYHVybGAuXG4gICAqXG4gICAqIElmIHRoZSBgLnN0YXR1c2AgaXMgbm90IGN1cnJlbnRseSBhIHJlZGlyZWN0IHN0YXR1cywgdGhlIHN0YXR1cyB3aWxsIGJlIHNldFxuICAgKiB0byBgMzAyIEZvdW5kYC5cbiAgICpcbiAgICogVGhlIGJvZHkgd2lsbCBiZSBzZXQgdG8gYSBtZXNzYWdlIGluZGljYXRpbmcgdGhlIHJlZGlyZWN0aW9uIGlzIG9jY3VycmluZy5cbiAgICovXG4gIHJlZGlyZWN0KHVybDogc3RyaW5nIHwgVVJMKTogdm9pZDtcbiAgLyoqIFNldHMgdGhlIHJlc3BvbnNlIHRvIHJlZGlyZWN0IGJhY2sgdG8gdGhlIHJlZmVycmVyIGlmIGF2YWlsYWJsZSwgd2l0aCBhblxuICAgKiBvcHRpb25hbCBgYWx0YCBVUkwgaWYgdGhlcmUgaXMgbm8gcmVmZXJyZXIgaGVhZGVyIG9uIHRoZSByZXF1ZXN0LiAgSWYgdGhlcmVcbiAgICogaXMgbm8gcmVmZXJyZXIgaGVhZGVyLCBub3IgYW4gYGFsdGAgcGFyYW1ldGVyLCB0aGUgcmVkaXJlY3QgaXMgc2V0IHRvIGAvYC5cbiAgICpcbiAgICogSWYgdGhlIGAuc3RhdHVzYCBpcyBub3QgY3VycmVudGx5IGEgcmVkaXJlY3Qgc3RhdHVzLCB0aGUgc3RhdHVzIHdpbGwgYmUgc2V0XG4gICAqIHRvIGAzMDIgRm91bmRgLlxuICAgKlxuICAgKiBUaGUgYm9keSB3aWxsIGJlIHNldCB0byBhIG1lc3NhZ2UgaW5kaWNhdGluZyB0aGUgcmVkaXJlY3Rpb24gaXMgb2NjdXJyaW5nLlxuICAgKi9cbiAgcmVkaXJlY3QodXJsOiB0eXBlb2YgUkVESVJFQ1RfQkFDSywgYWx0Pzogc3RyaW5nIHwgVVJMKTogdm9pZDtcbiAgcmVkaXJlY3QoXG4gICAgdXJsOiBzdHJpbmcgfCBVUkwgfCB0eXBlb2YgUkVESVJFQ1RfQkFDSyxcbiAgICBhbHQ6IHN0cmluZyB8IFVSTCA9IFwiL1wiLFxuICApOiB2b2lkIHtcbiAgICBpZiAodXJsID09PSBSRURJUkVDVF9CQUNLKSB7XG4gICAgICB1cmwgPSB0aGlzLiNyZXF1ZXN0LmhlYWRlcnMuZ2V0KFwiUmVmZXJlclwiKSA/PyBTdHJpbmcoYWx0KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB1cmwgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgIHVybCA9IFN0cmluZyh1cmwpO1xuICAgIH1cbiAgICB0aGlzLmhlYWRlcnMuc2V0KFwiTG9jYXRpb25cIiwgZW5jb2RlVXJsKHVybCkpO1xuICAgIGlmICghdGhpcy5zdGF0dXMgfHwgIWlzUmVkaXJlY3RTdGF0dXModGhpcy5zdGF0dXMpKSB7XG4gICAgICB0aGlzLnN0YXR1cyA9IFN0YXR1cy5Gb3VuZDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy4jcmVxdWVzdC5hY2NlcHRzKFwiaHRtbFwiKSkge1xuICAgICAgdXJsID0gZW5jb2RlVVJJKHVybCk7XG4gICAgICB0aGlzLnR5cGUgPSBcInRleHQvaHRtbDsgY2hhcnNldD1VVEYtOFwiO1xuICAgICAgdGhpcy5ib2R5ID0gYFJlZGlyZWN0aW5nIHRvIDxhIGhyZWY9XCIke3VybH1cIj4ke3VybH08L2E+LmA7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMudHlwZSA9IFwidGV4dC9wbGFpbjsgY2hhcnNldD1VVEYtOFwiO1xuICAgIHRoaXMuYm9keSA9IGBSZWRpcmVjdGluZyB0byAke3VybH0uYDtcbiAgfVxuXG4gIGFzeW5jIHRvRG9tUmVzcG9uc2UoKTogUHJvbWlzZTxnbG9iYWxUaGlzLlJlc3BvbnNlPiB7XG4gICAgaWYgKHRoaXMuI2RvbVJlc3BvbnNlKSB7XG4gICAgICByZXR1cm4gdGhpcy4jZG9tUmVzcG9uc2U7XG4gICAgfVxuXG4gICAgY29uc3QgYm9keUluaXQgPSBhd2FpdCB0aGlzLiNnZXRCb2R5SW5pdCgpO1xuXG4gICAgdGhpcy4jc2V0Q29udGVudFR5cGUoKTtcblxuICAgIGNvbnN0IHsgaGVhZGVycyB9ID0gdGhpcztcblxuICAgIC8vIElmIHRoZXJlIGlzIG5vIGJvZHkgYW5kIG5vIGNvbnRlbnQgdHlwZSBhbmQgbm8gc2V0IGxlbmd0aCwgdGhlbiBzZXQgdGhlXG4gICAgLy8gY29udGVudCBsZW5ndGggdG8gMFxuICAgIGlmIChcbiAgICAgICEoXG4gICAgICAgIGJvZHlJbml0IHx8XG4gICAgICAgIGhlYWRlcnMuaGFzKFwiQ29udGVudC1UeXBlXCIpIHx8XG4gICAgICAgIGhlYWRlcnMuaGFzKFwiQ29udGVudC1MZW5ndGhcIilcbiAgICAgIClcbiAgICApIHtcbiAgICAgIGhlYWRlcnMuYXBwZW5kKFwiQ29udGVudC1MZW5ndGhcIiwgXCIwXCIpO1xuICAgIH1cblxuICAgIHRoaXMuI3dyaXRhYmxlID0gZmFsc2U7XG5cbiAgICBjb25zdCBzdGF0dXMgPSB0aGlzLnN0YXR1cztcbiAgICBjb25zdCByZXNwb25zZUluaXQ6IFJlc3BvbnNlSW5pdCA9IHtcbiAgICAgIGhlYWRlcnMsXG4gICAgICBzdGF0dXMsXG4gICAgICBzdGF0dXNUZXh0OiBTVEFUVVNfVEVYVFtzdGF0dXNdLFxuICAgIH07XG5cbiAgICByZXR1cm4gdGhpcy4jZG9tUmVzcG9uc2UgPSBuZXcgRG9tUmVzcG9uc2UoYm9keUluaXQsIHJlc3BvbnNlSW5pdCk7XG4gIH1cblxuICAvKiogSW5zdGVhZCBvZiByZXNwb25kaW5nIGJhc2VkIG9uIHRoZSB2YWx1ZXMgb2YgdGhlIHJlc3BvbnNlLCBleHBsaWNpdGx5IHNldFxuICAgKiB0aGUgcmVzcG9uc2Ugd2l0aCBhIEZldGNoIEFQSSBgUmVzcG9uc2VgLlxuICAgKlxuICAgKiBJZiB0aGUgcmVzcG9uc2UgaXMgYWxyZWFkeSBmaW5hbGl6ZWQsIHRoaXMgd2lsbCB0aHJvdy4gWW91IGNhbiBjaGVja1xuICAgKiB0aGUgYC53cml0YWJsZWAgcHJvcGVydHkgdG8gZGV0ZXJtaW5lIHRoZSBzdGF0ZSBpZiB5b3UgYXJlIHVuc3VyZS5cbiAgICpcbiAgICogPiBbIU5PVEVdXG4gICAqID4gVGhpcyB3aWxsIGlnbm9yZS9vdmVycmlkZSB2YWx1ZXMgc2V0IGluIHRoZSByZXNwb25zZSBsaWtlIHRoZSBib2R5LFxuICAgKiA+IGhlYWRlcnMgYW5kIHN0YXR1cywgbWVhbmluZyB0aGluZ3MgbGlrZSBjb29raWUgbWFuYWdlbWVudCBhbmQgYXV0b21hdGljXG4gICAqID4gYm9keSB0eXBpbmcgd2lsbCBiZSBpZ25vcmVkLlxuICAgKi9cbiAgd2l0aChyZXNwb25zZTogZ2xvYmFsVGhpcy5SZXNwb25zZSk6IHZvaWQ7XG4gIC8qKiBJbnN0ZWFkIG9mIHJlc3BvbmRpbmcgYmFzZWQgb24gdGhlIHZhbHVlcyBvZiB0aGUgcmVzcG9uc2UsIGV4cGxpY2l0bHkgc2V0XG4gICAqIHRoZSByZXNwb25zZSBieSBwcm92aWRpbmcgdGhlIGluaXRpYWxpemF0aW9uIHRvIGNyZWF0ZSBhIEZldGNoIEFQSVxuICAgKiBgUmVzcG9uc2VgLlxuICAgKlxuICAgKiBJZiB0aGUgcmVzcG9uc2UgaXMgYWxyZWFkeSBmaW5hbGl6ZWQsIHRoaXMgd2lsbCB0aHJvdy4gWW91IGNhbiBjaGVja1xuICAgKiB0aGUgYC53cml0YWJsZWAgcHJvcGVydHkgdG8gZGV0ZXJtaW5lIHRoZSBzdGF0ZSBpZiB5b3UgYXJlIHVuc3VyZS5cbiAgICpcbiAgICogPiBbIU5PVEVdXG4gICAqID4gVGhpcyB3aWxsIGlnbm9yZS9vdmVycmlkZSB2YWx1ZXMgc2V0IGluIHRoZSByZXNwb25zZSBsaWtlIHRoZSBib2R5LFxuICAgKiA+IGhlYWRlcnMgYW5kIHN0YXR1cywgbWVhbmluZyB0aGluZ3MgbGlrZSBjb29raWUgbWFuYWdlbWVudCBhbmQgYXV0b21hdGljXG4gICAqID4gYm9keSB0eXBpbmcgd2lsbCBiZSBpZ25vcmVkLlxuICAgKi9cbiAgd2l0aChib2R5PzogQm9keUluaXQgfCBudWxsLCBpbml0PzogUmVzcG9uc2VJbml0KTogdm9pZDtcbiAgd2l0aChcbiAgICByZXNwb25zZU9yQm9keT86IGdsb2JhbFRoaXMuUmVzcG9uc2UgfCBCb2R5SW5pdCB8IG51bGwsXG4gICAgaW5pdD86IFJlc3BvbnNlSW5pdCxcbiAgKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuI2RvbVJlc3BvbnNlIHx8ICF0aGlzLiN3cml0YWJsZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQSByZXNwb25zZSBoYXMgYWxyZWFkeSBiZWVuIGZpbmFsaXplZC5cIik7XG4gICAgfVxuICAgIHRoaXMuI3dyaXRhYmxlID0gZmFsc2U7XG4gICAgdGhpcy4jZG9tUmVzcG9uc2UgPSByZXNwb25zZU9yQm9keSBpbnN0YW5jZW9mIERvbVJlc3BvbnNlXG4gICAgICA/IHJlc3BvbnNlT3JCb2R5XG4gICAgICA6IG5ldyBEb21SZXNwb25zZShyZXNwb25zZU9yQm9keSwgaW5pdCk7XG4gIH1cblxuICBbU3ltYm9sLmZvcihcIkRlbm8uY3VzdG9tSW5zcGVjdFwiKV0oXG4gICAgaW5zcGVjdDogKHZhbHVlOiB1bmtub3duKSA9PiBzdHJpbmcsXG4gICk6IHN0cmluZyB7XG4gICAgY29uc3QgeyBib2R5LCBoZWFkZXJzLCBzdGF0dXMsIHR5cGUsIHdyaXRhYmxlIH0gPSB0aGlzO1xuICAgIHJldHVybiBgJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9ICR7XG4gICAgICBpbnNwZWN0KHsgYm9keSwgaGVhZGVycywgc3RhdHVzLCB0eXBlLCB3cml0YWJsZSB9KVxuICAgIH1gO1xuICB9XG5cbiAgW1N5bWJvbC5mb3IoXCJub2RlanMudXRpbC5pbnNwZWN0LmN1c3RvbVwiKV0oXG4gICAgZGVwdGg6IG51bWJlcixcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIG9wdGlvbnM6IGFueSxcbiAgICBpbnNwZWN0OiAodmFsdWU6IHVua25vd24sIG9wdGlvbnM/OiB1bmtub3duKSA9PiBzdHJpbmcsXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgKTogYW55IHtcbiAgICBpZiAoZGVwdGggPCAwKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKGBbJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9XWAsIFwic3BlY2lhbFwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBuZXdPcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywge1xuICAgICAgZGVwdGg6IG9wdGlvbnMuZGVwdGggPT09IG51bGwgPyBudWxsIDogb3B0aW9ucy5kZXB0aCAtIDEsXG4gICAgfSk7XG4gICAgY29uc3QgeyBib2R5LCBoZWFkZXJzLCBzdGF0dXMsIHR5cGUsIHdyaXRhYmxlIH0gPSB0aGlzO1xuICAgIHJldHVybiBgJHtvcHRpb25zLnN0eWxpemUodGhpcy5jb25zdHJ1Y3Rvci5uYW1lLCBcInNwZWNpYWxcIil9ICR7XG4gICAgICBpbnNwZWN0KFxuICAgICAgICB7IGJvZHksIGhlYWRlcnMsIHN0YXR1cywgdHlwZSwgd3JpdGFibGUgfSxcbiAgICAgICAgbmV3T3B0aW9ucyxcbiAgICAgIClcbiAgICB9YDtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFB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