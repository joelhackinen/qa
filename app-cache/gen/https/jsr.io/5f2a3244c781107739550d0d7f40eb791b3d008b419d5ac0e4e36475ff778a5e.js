// Copyright 2018-2024 the oak authors. All rights reserved. MIT license.
/**
 * Contains the {@linkcode Request} abstraction used by oak.
 *
 * Most end users would not need to directly access this module.
 *
 * @module
 */ var _computedKey, _computedKey1;
import { Body } from "./body.ts";
import { ServerSentEventStreamTarget } from "./deps.ts";
import { accepts, acceptsEncodings, acceptsLanguages, UserAgent } from "./deps.ts";
_computedKey = Symbol.for("Deno.customInspect"), _computedKey1 = Symbol.for("nodejs.util.inspect.custom");
/** An interface which provides information about the current request. The
 * instance related to the current request is available on the
 * {@linkcode Context}'s `.request` property.
 *
 * The interface contains several properties to get information about the
 * request as well as several methods, which include content negotiation and
 * the ability to decode a request body.
 */ export class Request {
  #body;
  #proxy;
  #secure;
  #serverRequest;
  #url;
  #userAgent;
  #getRemoteAddr() {
    return this.#serverRequest.remoteAddr ?? "";
  }
  /** An interface to access the body of the request. This provides an API that
   * aligned to the **Fetch Request** API, but in a dedicated API.
   */ get body() {
    return this.#body;
  }
  /** Is `true` if the request might have a body, otherwise `false`.
   *
   * **WARNING** this is an unreliable API. In HTTP/2 in many situations you
   * cannot determine if a request has a body or not unless you attempt to read
   * the body, due to the streaming nature of HTTP/2. As of Deno 1.16.1, for
   * HTTP/1.1, Deno also reflects that behaviour.  The only reliable way to
   * determine if a request has a body or not is to attempt to read the body.
   */ get hasBody() {
    return this.#body.has;
  }
  /** The `Headers` supplied in the request. */ get headers() {
    return this.#serverRequest.headers;
  }
  /** Request remote address. When the application's `.proxy` is true, the
   * `X-Forwarded-For` will be used to determine the requesting remote address.
   */ get ip() {
    return (this.#proxy ? this.ips[0] : this.#getRemoteAddr()) ?? "";
  }
  /** When the application's `.proxy` is `true`, this will be set to an array of
   * IPs, ordered from upstream to downstream, based on the value of the header
   * `X-Forwarded-For`.  When `false` an empty array is returned. */ get ips() {
    return this.#proxy ? (this.#serverRequest.headers.get("x-forwarded-for") ?? this.#getRemoteAddr()).split(/\s*,\s*/) : [];
  }
  /** The HTTP Method used by the request. */ get method() {
    return this.#serverRequest.method;
  }
  /** Shortcut to `request.url.protocol === "https:"`. */ get secure() {
    return this.#secure;
  }
  /** Set to the value of the low level oak server request abstraction.
   *
   * @deprecated this will be removed in future versions of oak. Accessing this
   * abstraction is not useful to end users and is now a bit of a misnomer.
   */ get originalRequest() {
    return this.#serverRequest;
  }
  /** Returns the original Fetch API `Request` if available.
   *
   * This should be set with requests on Deno, but will not be set when running
   * on Node.js.
   */ get source() {
    return this.#serverRequest.request;
  }
  /** A parsed URL for the request which complies with the browser standards.
   * When the application's `.proxy` is `true`, this value will be based off of
   * the `X-Forwarded-Proto` and `X-Forwarded-Host` header values if present in
   * the request. */ get url() {
    if (!this.#url) {
      const serverRequest = this.#serverRequest;
      // between Deno 1.9.0 and 1.9.1 the request.url of the native HTTP started
      // returning the full URL, where previously it only returned the path
      // so we will try to use that URL here, but default back to old logic
      // if the URL isn't valid.
      try {
        if (serverRequest.rawUrl) {
          this.#url = new URL(serverRequest.rawUrl);
        }
      } catch  {
      // we don't care about errors here
      }
      if (this.#proxy || !this.#url) {
        let proto;
        let host;
        if (this.#proxy) {
          proto = serverRequest.headers.get("x-forwarded-proto")?.split(/\s*,\s*/, 1)[0] ?? "http";
          host = serverRequest.headers.get("x-forwarded-host") ?? this.#url?.hostname ?? serverRequest.headers.get("host") ?? serverRequest.headers.get(":authority") ?? "";
        } else {
          proto = this.#secure ? "https" : "http";
          host = serverRequest.headers.get("host") ?? serverRequest.headers.get(":authority") ?? "";
        }
        try {
          this.#url = new URL(`${proto}://${host}${serverRequest.url}`);
        } catch  {
          throw new TypeError(`The server request URL of "${proto}://${host}${serverRequest.url}" is invalid.`);
        }
      }
    }
    return this.#url;
  }
  /** An object representing the requesting user agent. If the `User-Agent`
   * header isn't defined in the request, all the properties will be undefined.
   *
   * See [std/http/user_agent#UserAgent](https://deno.land/std@0.223/http/user_agent.ts?s=UserAgent)
   * for more information.
   */ get userAgent() {
    return this.#userAgent;
  }
  constructor(serverRequest, { proxy = false, secure = false, jsonBodyReviver } = {}){
    this.#proxy = proxy;
    this.#secure = secure;
    this.#serverRequest = serverRequest;
    this.#body = new Body(serverRequest, jsonBodyReviver);
    this.#userAgent = new UserAgent(serverRequest.headers.get("user-agent"));
  }
  accepts(...types) {
    if (!this.#serverRequest.headers.has("Accept")) {
      return types.length ? types[0] : [
        "*/*"
      ];
    }
    if (types.length) {
      return accepts(this.#serverRequest, ...types);
    }
    return accepts(this.#serverRequest);
  }
  acceptsEncodings(...encodings) {
    if (!this.#serverRequest.headers.has("Accept-Encoding")) {
      return encodings.length ? encodings[0] : [
        "*"
      ];
    }
    if (encodings.length) {
      return acceptsEncodings(this.#serverRequest, ...encodings);
    }
    return acceptsEncodings(this.#serverRequest);
  }
  acceptsLanguages(...langs) {
    if (!this.#serverRequest.headers.get("Accept-Language")) {
      return langs.length ? langs[0] : [
        "*"
      ];
    }
    if (langs.length) {
      return acceptsLanguages(this.#serverRequest, ...langs);
    }
    return acceptsLanguages(this.#serverRequest);
  }
  /** Take the current request and initiate server sent event connection.
   *
   * > ![WARNING]
   * > This is not intended for direct use, as it will not manage the target in
   * > the overall context or ensure that additional middleware does not attempt
   * > to respond to the request.
   */ async sendEvents(options, init) {
    const sse = new ServerSentEventStreamTarget(options);
    await this.#serverRequest.respond(sse.asResponse(init));
    return sse;
  }
  /** Take the current request and upgrade it to a web socket, returning a web
   * standard `WebSocket` object.
   *
   * If the underlying server abstraction does not support upgrades, this will
   * throw.
   *
   * > ![WARNING]
   * > This is not intended for direct use, as it will not manage the websocket
   * > in the overall context or ensure that additional middleware does not
   * > attempt to respond to the request.
   */ upgrade(options) {
    if (!this.#serverRequest.upgrade) {
      throw new TypeError("Web sockets upgrade not supported in this runtime.");
    }
    return this.#serverRequest.upgrade(options);
  }
  [_computedKey](inspect) {
    const { body, hasBody, headers, ip, ips, method, secure, url, userAgent } = this;
    return `${this.constructor.name} ${inspect({
      body,
      hasBody,
      headers,
      ip,
      ips,
      method,
      secure,
      url: url.toString(),
      userAgent
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
    const { body, hasBody, headers, ip, ips, method, secure, url, userAgent } = this;
    return `${options.stylize(this.constructor.name, "special")} ${inspect({
      body,
      hasBody,
      headers,
      ip,
      ips,
      method,
      secure,
      url,
      userAgent
    }, newOptions)}`;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvb2FrLzE2LjEuMC9yZXF1ZXN0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjQgdGhlIG9hayBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuLyoqXG4gKiBDb250YWlucyB0aGUge0BsaW5rY29kZSBSZXF1ZXN0fSBhYnN0cmFjdGlvbiB1c2VkIGJ5IG9hay5cbiAqXG4gKiBNb3N0IGVuZCB1c2VycyB3b3VsZCBub3QgbmVlZCB0byBkaXJlY3RseSBhY2Nlc3MgdGhpcyBtb2R1bGUuXG4gKlxuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IEJvZHkgfSBmcm9tIFwiLi9ib2R5LnRzXCI7XG5pbXBvcnQgeyBTZXJ2ZXJTZW50RXZlbnRTdHJlYW1UYXJnZXQgfSBmcm9tIFwiLi9kZXBzLnRzXCI7XG5pbXBvcnQge1xuICBhY2NlcHRzLFxuICBhY2NlcHRzRW5jb2RpbmdzLFxuICBhY2NlcHRzTGFuZ3VhZ2VzLFxuICB0eXBlIEhUVFBNZXRob2RzLFxuICB0eXBlIFNlcnZlclNlbnRFdmVudFRhcmdldCxcbiAgdHlwZSBTZXJ2ZXJTZW50RXZlbnRUYXJnZXRPcHRpb25zLFxuICBVc2VyQWdlbnQsXG59IGZyb20gXCIuL2RlcHMudHNcIjtcbmltcG9ydCB0eXBlIHsgU2VydmVyUmVxdWVzdCwgVXBncmFkZVdlYlNvY2tldE9wdGlvbnMgfSBmcm9tIFwiLi90eXBlcy50c1wiO1xuXG5pbnRlcmZhY2UgT2FrUmVxdWVzdE9wdGlvbnMge1xuICBqc29uQm9keVJldml2ZXI/OiAoa2V5OiBzdHJpbmcsIHZhbHVlOiB1bmtub3duKSA9PiB1bmtub3duO1xuICBwcm94eT86IGJvb2xlYW47XG4gIHNlY3VyZT86IGJvb2xlYW47XG59XG5cbi8qKiBBbiBpbnRlcmZhY2Ugd2hpY2ggcHJvdmlkZXMgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGN1cnJlbnQgcmVxdWVzdC4gVGhlXG4gKiBpbnN0YW5jZSByZWxhdGVkIHRvIHRoZSBjdXJyZW50IHJlcXVlc3QgaXMgYXZhaWxhYmxlIG9uIHRoZVxuICoge0BsaW5rY29kZSBDb250ZXh0fSdzIGAucmVxdWVzdGAgcHJvcGVydHkuXG4gKlxuICogVGhlIGludGVyZmFjZSBjb250YWlucyBzZXZlcmFsIHByb3BlcnRpZXMgdG8gZ2V0IGluZm9ybWF0aW9uIGFib3V0IHRoZVxuICogcmVxdWVzdCBhcyB3ZWxsIGFzIHNldmVyYWwgbWV0aG9kcywgd2hpY2ggaW5jbHVkZSBjb250ZW50IG5lZ290aWF0aW9uIGFuZFxuICogdGhlIGFiaWxpdHkgdG8gZGVjb2RlIGEgcmVxdWVzdCBib2R5LlxuICovXG5leHBvcnQgY2xhc3MgUmVxdWVzdCB7XG4gICNib2R5OiBCb2R5O1xuICAjcHJveHk6IGJvb2xlYW47XG4gICNzZWN1cmU6IGJvb2xlYW47XG4gICNzZXJ2ZXJSZXF1ZXN0OiBTZXJ2ZXJSZXF1ZXN0O1xuICAjdXJsPzogVVJMO1xuICAjdXNlckFnZW50OiBVc2VyQWdlbnQ7XG5cbiAgI2dldFJlbW90ZUFkZHIoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy4jc2VydmVyUmVxdWVzdC5yZW1vdGVBZGRyID8/IFwiXCI7XG4gIH1cblxuICAvKiogQW4gaW50ZXJmYWNlIHRvIGFjY2VzcyB0aGUgYm9keSBvZiB0aGUgcmVxdWVzdC4gVGhpcyBwcm92aWRlcyBhbiBBUEkgdGhhdFxuICAgKiBhbGlnbmVkIHRvIHRoZSAqKkZldGNoIFJlcXVlc3QqKiBBUEksIGJ1dCBpbiBhIGRlZGljYXRlZCBBUEkuXG4gICAqL1xuICBnZXQgYm9keSgpOiBCb2R5IHtcbiAgICByZXR1cm4gdGhpcy4jYm9keTtcbiAgfVxuXG4gIC8qKiBJcyBgdHJ1ZWAgaWYgdGhlIHJlcXVlc3QgbWlnaHQgaGF2ZSBhIGJvZHksIG90aGVyd2lzZSBgZmFsc2VgLlxuICAgKlxuICAgKiAqKldBUk5JTkcqKiB0aGlzIGlzIGFuIHVucmVsaWFibGUgQVBJLiBJbiBIVFRQLzIgaW4gbWFueSBzaXR1YXRpb25zIHlvdVxuICAgKiBjYW5ub3QgZGV0ZXJtaW5lIGlmIGEgcmVxdWVzdCBoYXMgYSBib2R5IG9yIG5vdCB1bmxlc3MgeW91IGF0dGVtcHQgdG8gcmVhZFxuICAgKiB0aGUgYm9keSwgZHVlIHRvIHRoZSBzdHJlYW1pbmcgbmF0dXJlIG9mIEhUVFAvMi4gQXMgb2YgRGVubyAxLjE2LjEsIGZvclxuICAgKiBIVFRQLzEuMSwgRGVubyBhbHNvIHJlZmxlY3RzIHRoYXQgYmVoYXZpb3VyLiAgVGhlIG9ubHkgcmVsaWFibGUgd2F5IHRvXG4gICAqIGRldGVybWluZSBpZiBhIHJlcXVlc3QgaGFzIGEgYm9keSBvciBub3QgaXMgdG8gYXR0ZW1wdCB0byByZWFkIHRoZSBib2R5LlxuICAgKi9cbiAgZ2V0IGhhc0JvZHkoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuI2JvZHkuaGFzO1xuICB9XG5cbiAgLyoqIFRoZSBgSGVhZGVyc2Agc3VwcGxpZWQgaW4gdGhlIHJlcXVlc3QuICovXG4gIGdldCBoZWFkZXJzKCk6IEhlYWRlcnMge1xuICAgIHJldHVybiB0aGlzLiNzZXJ2ZXJSZXF1ZXN0LmhlYWRlcnM7XG4gIH1cblxuICAvKiogUmVxdWVzdCByZW1vdGUgYWRkcmVzcy4gV2hlbiB0aGUgYXBwbGljYXRpb24ncyBgLnByb3h5YCBpcyB0cnVlLCB0aGVcbiAgICogYFgtRm9yd2FyZGVkLUZvcmAgd2lsbCBiZSB1c2VkIHRvIGRldGVybWluZSB0aGUgcmVxdWVzdGluZyByZW1vdGUgYWRkcmVzcy5cbiAgICovXG4gIGdldCBpcCgpOiBzdHJpbmcge1xuICAgIHJldHVybiAodGhpcy4jcHJveHkgPyB0aGlzLmlwc1swXSA6IHRoaXMuI2dldFJlbW90ZUFkZHIoKSkgPz8gXCJcIjtcbiAgfVxuXG4gIC8qKiBXaGVuIHRoZSBhcHBsaWNhdGlvbidzIGAucHJveHlgIGlzIGB0cnVlYCwgdGhpcyB3aWxsIGJlIHNldCB0byBhbiBhcnJheSBvZlxuICAgKiBJUHMsIG9yZGVyZWQgZnJvbSB1cHN0cmVhbSB0byBkb3duc3RyZWFtLCBiYXNlZCBvbiB0aGUgdmFsdWUgb2YgdGhlIGhlYWRlclxuICAgKiBgWC1Gb3J3YXJkZWQtRm9yYC4gIFdoZW4gYGZhbHNlYCBhbiBlbXB0eSBhcnJheSBpcyByZXR1cm5lZC4gKi9cbiAgZ2V0IGlwcygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIHRoaXMuI3Byb3h5XG4gICAgICA/ICh0aGlzLiNzZXJ2ZXJSZXF1ZXN0LmhlYWRlcnMuZ2V0KFwieC1mb3J3YXJkZWQtZm9yXCIpID8/XG4gICAgICAgIHRoaXMuI2dldFJlbW90ZUFkZHIoKSkuc3BsaXQoL1xccyosXFxzKi8pXG4gICAgICA6IFtdO1xuICB9XG5cbiAgLyoqIFRoZSBIVFRQIE1ldGhvZCB1c2VkIGJ5IHRoZSByZXF1ZXN0LiAqL1xuICBnZXQgbWV0aG9kKCk6IEhUVFBNZXRob2RzIHtcbiAgICByZXR1cm4gdGhpcy4jc2VydmVyUmVxdWVzdC5tZXRob2QgYXMgSFRUUE1ldGhvZHM7XG4gIH1cblxuICAvKiogU2hvcnRjdXQgdG8gYHJlcXVlc3QudXJsLnByb3RvY29sID09PSBcImh0dHBzOlwiYC4gKi9cbiAgZ2V0IHNlY3VyZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy4jc2VjdXJlO1xuICB9XG5cbiAgLyoqIFNldCB0byB0aGUgdmFsdWUgb2YgdGhlIGxvdyBsZXZlbCBvYWsgc2VydmVyIHJlcXVlc3QgYWJzdHJhY3Rpb24uXG4gICAqXG4gICAqIEBkZXByZWNhdGVkIHRoaXMgd2lsbCBiZSByZW1vdmVkIGluIGZ1dHVyZSB2ZXJzaW9ucyBvZiBvYWsuIEFjY2Vzc2luZyB0aGlzXG4gICAqIGFic3RyYWN0aW9uIGlzIG5vdCB1c2VmdWwgdG8gZW5kIHVzZXJzIGFuZCBpcyBub3cgYSBiaXQgb2YgYSBtaXNub21lci5cbiAgICovXG4gIGdldCBvcmlnaW5hbFJlcXVlc3QoKTogU2VydmVyUmVxdWVzdCB7XG4gICAgcmV0dXJuIHRoaXMuI3NlcnZlclJlcXVlc3Q7XG4gIH1cblxuICAvKiogUmV0dXJucyB0aGUgb3JpZ2luYWwgRmV0Y2ggQVBJIGBSZXF1ZXN0YCBpZiBhdmFpbGFibGUuXG4gICAqXG4gICAqIFRoaXMgc2hvdWxkIGJlIHNldCB3aXRoIHJlcXVlc3RzIG9uIERlbm8sIGJ1dCB3aWxsIG5vdCBiZSBzZXQgd2hlbiBydW5uaW5nXG4gICAqIG9uIE5vZGUuanMuXG4gICAqL1xuICBnZXQgc291cmNlKCk6IGdsb2JhbFRoaXMuUmVxdWVzdCB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuI3NlcnZlclJlcXVlc3QucmVxdWVzdDtcbiAgfVxuXG4gIC8qKiBBIHBhcnNlZCBVUkwgZm9yIHRoZSByZXF1ZXN0IHdoaWNoIGNvbXBsaWVzIHdpdGggdGhlIGJyb3dzZXIgc3RhbmRhcmRzLlxuICAgKiBXaGVuIHRoZSBhcHBsaWNhdGlvbidzIGAucHJveHlgIGlzIGB0cnVlYCwgdGhpcyB2YWx1ZSB3aWxsIGJlIGJhc2VkIG9mZiBvZlxuICAgKiB0aGUgYFgtRm9yd2FyZGVkLVByb3RvYCBhbmQgYFgtRm9yd2FyZGVkLUhvc3RgIGhlYWRlciB2YWx1ZXMgaWYgcHJlc2VudCBpblxuICAgKiB0aGUgcmVxdWVzdC4gKi9cbiAgZ2V0IHVybCgpOiBVUkwge1xuICAgIGlmICghdGhpcy4jdXJsKSB7XG4gICAgICBjb25zdCBzZXJ2ZXJSZXF1ZXN0ID0gdGhpcy4jc2VydmVyUmVxdWVzdDtcbiAgICAgIC8vIGJldHdlZW4gRGVubyAxLjkuMCBhbmQgMS45LjEgdGhlIHJlcXVlc3QudXJsIG9mIHRoZSBuYXRpdmUgSFRUUCBzdGFydGVkXG4gICAgICAvLyByZXR1cm5pbmcgdGhlIGZ1bGwgVVJMLCB3aGVyZSBwcmV2aW91c2x5IGl0IG9ubHkgcmV0dXJuZWQgdGhlIHBhdGhcbiAgICAgIC8vIHNvIHdlIHdpbGwgdHJ5IHRvIHVzZSB0aGF0IFVSTCBoZXJlLCBidXQgZGVmYXVsdCBiYWNrIHRvIG9sZCBsb2dpY1xuICAgICAgLy8gaWYgdGhlIFVSTCBpc24ndCB2YWxpZC5cbiAgICAgIHRyeSB7XG4gICAgICAgIGlmIChzZXJ2ZXJSZXF1ZXN0LnJhd1VybCkge1xuICAgICAgICAgIHRoaXMuI3VybCA9IG5ldyBVUkwoc2VydmVyUmVxdWVzdC5yYXdVcmwpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gd2UgZG9uJ3QgY2FyZSBhYm91dCBlcnJvcnMgaGVyZVxuICAgICAgfVxuICAgICAgaWYgKHRoaXMuI3Byb3h5IHx8ICF0aGlzLiN1cmwpIHtcbiAgICAgICAgbGV0IHByb3RvOiBzdHJpbmc7XG4gICAgICAgIGxldCBob3N0OiBzdHJpbmc7XG4gICAgICAgIGlmICh0aGlzLiNwcm94eSkge1xuICAgICAgICAgIHByb3RvID0gc2VydmVyUmVxdWVzdFxuICAgICAgICAgICAgLmhlYWRlcnMuZ2V0KFwieC1mb3J3YXJkZWQtcHJvdG9cIik/LnNwbGl0KC9cXHMqLFxccyovLCAxKVswXSA/P1xuICAgICAgICAgICAgXCJodHRwXCI7XG4gICAgICAgICAgaG9zdCA9IHNlcnZlclJlcXVlc3QuaGVhZGVycy5nZXQoXCJ4LWZvcndhcmRlZC1ob3N0XCIpID8/XG4gICAgICAgICAgICB0aGlzLiN1cmw/Lmhvc3RuYW1lID8/XG4gICAgICAgICAgICBzZXJ2ZXJSZXF1ZXN0LmhlYWRlcnMuZ2V0KFwiaG9zdFwiKSA/P1xuICAgICAgICAgICAgc2VydmVyUmVxdWVzdC5oZWFkZXJzLmdldChcIjphdXRob3JpdHlcIikgPz8gXCJcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwcm90byA9IHRoaXMuI3NlY3VyZSA/IFwiaHR0cHNcIiA6IFwiaHR0cFwiO1xuICAgICAgICAgIGhvc3QgPSBzZXJ2ZXJSZXF1ZXN0LmhlYWRlcnMuZ2V0KFwiaG9zdFwiKSA/P1xuICAgICAgICAgICAgc2VydmVyUmVxdWVzdC5oZWFkZXJzLmdldChcIjphdXRob3JpdHlcIikgPz8gXCJcIjtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgIHRoaXMuI3VybCA9IG5ldyBVUkwoYCR7cHJvdG99Oi8vJHtob3N0fSR7c2VydmVyUmVxdWVzdC51cmx9YCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgICBgVGhlIHNlcnZlciByZXF1ZXN0IFVSTCBvZiBcIiR7cHJvdG99Oi8vJHtob3N0fSR7c2VydmVyUmVxdWVzdC51cmx9XCIgaXMgaW52YWxpZC5gLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuI3VybDtcbiAgfVxuXG4gIC8qKiBBbiBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSByZXF1ZXN0aW5nIHVzZXIgYWdlbnQuIElmIHRoZSBgVXNlci1BZ2VudGBcbiAgICogaGVhZGVyIGlzbid0IGRlZmluZWQgaW4gdGhlIHJlcXVlc3QsIGFsbCB0aGUgcHJvcGVydGllcyB3aWxsIGJlIHVuZGVmaW5lZC5cbiAgICpcbiAgICogU2VlIFtzdGQvaHR0cC91c2VyX2FnZW50I1VzZXJBZ2VudF0oaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQDAuMjIzL2h0dHAvdXNlcl9hZ2VudC50cz9zPVVzZXJBZ2VudClcbiAgICogZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gICAqL1xuICBnZXQgdXNlckFnZW50KCk6IFVzZXJBZ2VudCB7XG4gICAgcmV0dXJuIHRoaXMuI3VzZXJBZ2VudDtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHNlcnZlclJlcXVlc3Q6IFNlcnZlclJlcXVlc3QsXG4gICAgeyBwcm94eSA9IGZhbHNlLCBzZWN1cmUgPSBmYWxzZSwganNvbkJvZHlSZXZpdmVyIH06IE9ha1JlcXVlc3RPcHRpb25zID0ge30sXG4gICkge1xuICAgIHRoaXMuI3Byb3h5ID0gcHJveHk7XG4gICAgdGhpcy4jc2VjdXJlID0gc2VjdXJlO1xuICAgIHRoaXMuI3NlcnZlclJlcXVlc3QgPSBzZXJ2ZXJSZXF1ZXN0O1xuICAgIHRoaXMuI2JvZHkgPSBuZXcgQm9keShzZXJ2ZXJSZXF1ZXN0LCBqc29uQm9keVJldml2ZXIpO1xuICAgIHRoaXMuI3VzZXJBZ2VudCA9IG5ldyBVc2VyQWdlbnQoc2VydmVyUmVxdWVzdC5oZWFkZXJzLmdldChcInVzZXItYWdlbnRcIikpO1xuICB9XG5cbiAgLyoqIFJldHVybnMgYW4gYXJyYXkgb2YgbWVkaWEgdHlwZXMsIGFjY2VwdGVkIGJ5IHRoZSByZXF1ZXN0b3IsIGluIG9yZGVyIG9mXG4gICAqIHByZWZlcmVuY2UuICBJZiB0aGVyZSBhcmUgbm8gZW5jb2RpbmdzIHN1cHBsaWVkIGJ5IHRoZSByZXF1ZXN0b3IsXG4gICAqIHRoZW4gYWNjZXB0aW5nIGFueSBpcyBpbXBsaWVkIGlzIHJldHVybmVkLlxuICAgKi9cbiAgYWNjZXB0cygpOiBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcbiAgLyoqIEZvciBhIGdpdmVuIHNldCBvZiBtZWRpYSB0eXBlcywgcmV0dXJuIHRoZSBiZXN0IG1hdGNoIGFjY2VwdGVkIGJ5IHRoZVxuICAgKiByZXF1ZXN0b3IuICBJZiB0aGVyZSBhcmUgbm8gZW5jb2RpbmcgdGhhdCBtYXRjaCwgdGhlbiB0aGUgbWV0aG9kIHJldHVybnNcbiAgICogYHVuZGVmaW5lZGAuXG4gICAqL1xuICBhY2NlcHRzKC4uLnR5cGVzOiBzdHJpbmdbXSk6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgYWNjZXB0cyguLi50eXBlczogc3RyaW5nW10pOiBzdHJpbmcgfCBzdHJpbmdbXSB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLiNzZXJ2ZXJSZXF1ZXN0LmhlYWRlcnMuaGFzKFwiQWNjZXB0XCIpKSB7XG4gICAgICByZXR1cm4gdHlwZXMubGVuZ3RoID8gdHlwZXNbMF0gOiBbXCIqLypcIl07XG4gICAgfVxuICAgIGlmICh0eXBlcy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBhY2NlcHRzKHRoaXMuI3NlcnZlclJlcXVlc3QsIC4uLnR5cGVzKTtcbiAgICB9XG4gICAgcmV0dXJuIGFjY2VwdHModGhpcy4jc2VydmVyUmVxdWVzdCk7XG4gIH1cblxuICAvKiogUmV0dXJucyBhbiBhcnJheSBvZiBlbmNvZGluZ3MsIGFjY2VwdGVkIGJ5IHRoZSByZXF1ZXN0b3IsIGluIG9yZGVyIG9mXG4gICAqIHByZWZlcmVuY2UuICBJZiB0aGVyZSBhcmUgbm8gZW5jb2RpbmdzIHN1cHBsaWVkIGJ5IHRoZSByZXF1ZXN0b3IsXG4gICAqIHRoZW4gYFtcIipcIl1gIGlzIHJldHVybmVkLCBtYXRjaGluZyBhbnkuXG4gICAqL1xuICBhY2NlcHRzRW5jb2RpbmdzKCk6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuICAvKiogRm9yIGEgZ2l2ZW4gc2V0IG9mIGVuY29kaW5ncywgcmV0dXJuIHRoZSBiZXN0IG1hdGNoIGFjY2VwdGVkIGJ5IHRoZVxuICAgKiByZXF1ZXN0b3IuICBJZiB0aGVyZSBhcmUgbm8gZW5jb2RpbmdzIHRoYXQgbWF0Y2gsIHRoZW4gdGhlIG1ldGhvZCByZXR1cm5zXG4gICAqIGB1bmRlZmluZWRgLlxuICAgKlxuICAgKiAqKk5PVEU6KiogWW91IHNob3VsZCBhbHdheXMgc3VwcGx5IGBpZGVudGl0eWAgYXMgb25lIG9mIHRoZSBlbmNvZGluZ3NcbiAgICogdG8gZW5zdXJlIHRoYXQgdGhlcmUgaXMgYSBtYXRjaCB3aGVuIHRoZSBgQWNjZXB0LUVuY29kaW5nYCBoZWFkZXIgaXMgcGFydFxuICAgKiBvZiB0aGUgcmVxdWVzdC5cbiAgICovXG4gIGFjY2VwdHNFbmNvZGluZ3MoLi4uZW5jb2RpbmdzOiBzdHJpbmdbXSk6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgYWNjZXB0c0VuY29kaW5ncyguLi5lbmNvZGluZ3M6IHN0cmluZ1tdKTogc3RyaW5nW10gfCBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGlmICghdGhpcy4jc2VydmVyUmVxdWVzdC5oZWFkZXJzLmhhcyhcIkFjY2VwdC1FbmNvZGluZ1wiKSkge1xuICAgICAgcmV0dXJuIGVuY29kaW5ncy5sZW5ndGggPyBlbmNvZGluZ3NbMF0gOiBbXCIqXCJdO1xuICAgIH1cbiAgICBpZiAoZW5jb2RpbmdzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGFjY2VwdHNFbmNvZGluZ3ModGhpcy4jc2VydmVyUmVxdWVzdCwgLi4uZW5jb2RpbmdzKTtcbiAgICB9XG4gICAgcmV0dXJuIGFjY2VwdHNFbmNvZGluZ3ModGhpcy4jc2VydmVyUmVxdWVzdCk7XG4gIH1cblxuICAvKiogUmV0dXJucyBhbiBhcnJheSBvZiBsYW5ndWFnZXMsIGFjY2VwdGVkIGJ5IHRoZSByZXF1ZXN0b3IsIGluIG9yZGVyIG9mXG4gICAqIHByZWZlcmVuY2UuICBJZiB0aGVyZSBhcmUgbm8gbGFuZ3VhZ2VzIHN1cHBsaWVkIGJ5IHRoZSByZXF1ZXN0b3IsXG4gICAqIGBbXCIqXCJdYCBpcyByZXR1cm5lZCwgaW5kaWNhdGluZyBhbnkgbGFuZ3VhZ2UgaXMgYWNjZXB0ZWQuXG4gICAqL1xuICBhY2NlcHRzTGFuZ3VhZ2VzKCk6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuICAvKiogRm9yIGEgZ2l2ZW4gc2V0IG9mIGxhbmd1YWdlcywgcmV0dXJuIHRoZSBiZXN0IG1hdGNoIGFjY2VwdGVkIGJ5IHRoZVxuICAgKiByZXF1ZXN0b3IuICBJZiB0aGVyZSBhcmUgbm8gbGFuZ3VhZ2VzIHRoYXQgbWF0Y2gsIHRoZW4gdGhlIG1ldGhvZCByZXR1cm5zXG4gICAqIGB1bmRlZmluZWRgLiAqL1xuICBhY2NlcHRzTGFuZ3VhZ2VzKC4uLmxhbmdzOiBzdHJpbmdbXSk6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgYWNjZXB0c0xhbmd1YWdlcyguLi5sYW5nczogc3RyaW5nW10pOiBzdHJpbmdbXSB8IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLiNzZXJ2ZXJSZXF1ZXN0LmhlYWRlcnMuZ2V0KFwiQWNjZXB0LUxhbmd1YWdlXCIpKSB7XG4gICAgICByZXR1cm4gbGFuZ3MubGVuZ3RoID8gbGFuZ3NbMF0gOiBbXCIqXCJdO1xuICAgIH1cbiAgICBpZiAobGFuZ3MubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gYWNjZXB0c0xhbmd1YWdlcyh0aGlzLiNzZXJ2ZXJSZXF1ZXN0LCAuLi5sYW5ncyk7XG4gICAgfVxuICAgIHJldHVybiBhY2NlcHRzTGFuZ3VhZ2VzKHRoaXMuI3NlcnZlclJlcXVlc3QpO1xuICB9XG5cbiAgLyoqIFRha2UgdGhlIGN1cnJlbnQgcmVxdWVzdCBhbmQgaW5pdGlhdGUgc2VydmVyIHNlbnQgZXZlbnQgY29ubmVjdGlvbi5cbiAgICpcbiAgICogPiAhW1dBUk5JTkddXG4gICAqID4gVGhpcyBpcyBub3QgaW50ZW5kZWQgZm9yIGRpcmVjdCB1c2UsIGFzIGl0IHdpbGwgbm90IG1hbmFnZSB0aGUgdGFyZ2V0IGluXG4gICAqID4gdGhlIG92ZXJhbGwgY29udGV4dCBvciBlbnN1cmUgdGhhdCBhZGRpdGlvbmFsIG1pZGRsZXdhcmUgZG9lcyBub3QgYXR0ZW1wdFxuICAgKiA+IHRvIHJlc3BvbmQgdG8gdGhlIHJlcXVlc3QuXG4gICAqL1xuICBhc3luYyBzZW5kRXZlbnRzKFxuICAgIG9wdGlvbnM/OiBTZXJ2ZXJTZW50RXZlbnRUYXJnZXRPcHRpb25zLFxuICAgIGluaXQ/OiBSZXF1ZXN0SW5pdCxcbiAgKTogUHJvbWlzZTxTZXJ2ZXJTZW50RXZlbnRUYXJnZXQ+IHtcbiAgICBjb25zdCBzc2UgPSBuZXcgU2VydmVyU2VudEV2ZW50U3RyZWFtVGFyZ2V0KG9wdGlvbnMpO1xuICAgIGF3YWl0IHRoaXMuI3NlcnZlclJlcXVlc3QucmVzcG9uZChzc2UuYXNSZXNwb25zZShpbml0KSk7XG4gICAgcmV0dXJuIHNzZTtcbiAgfVxuXG4gIC8qKiBUYWtlIHRoZSBjdXJyZW50IHJlcXVlc3QgYW5kIHVwZ3JhZGUgaXQgdG8gYSB3ZWIgc29ja2V0LCByZXR1cm5pbmcgYSB3ZWJcbiAgICogc3RhbmRhcmQgYFdlYlNvY2tldGAgb2JqZWN0LlxuICAgKlxuICAgKiBJZiB0aGUgdW5kZXJseWluZyBzZXJ2ZXIgYWJzdHJhY3Rpb24gZG9lcyBub3Qgc3VwcG9ydCB1cGdyYWRlcywgdGhpcyB3aWxsXG4gICAqIHRocm93LlxuICAgKlxuICAgKiA+ICFbV0FSTklOR11cbiAgICogPiBUaGlzIGlzIG5vdCBpbnRlbmRlZCBmb3IgZGlyZWN0IHVzZSwgYXMgaXQgd2lsbCBub3QgbWFuYWdlIHRoZSB3ZWJzb2NrZXRcbiAgICogPiBpbiB0aGUgb3ZlcmFsbCBjb250ZXh0IG9yIGVuc3VyZSB0aGF0IGFkZGl0aW9uYWwgbWlkZGxld2FyZSBkb2VzIG5vdFxuICAgKiA+IGF0dGVtcHQgdG8gcmVzcG9uZCB0byB0aGUgcmVxdWVzdC5cbiAgICovXG4gIHVwZ3JhZGUob3B0aW9ucz86IFVwZ3JhZGVXZWJTb2NrZXRPcHRpb25zKTogV2ViU29ja2V0IHtcbiAgICBpZiAoIXRoaXMuI3NlcnZlclJlcXVlc3QudXBncmFkZSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIldlYiBzb2NrZXRzIHVwZ3JhZGUgbm90IHN1cHBvcnRlZCBpbiB0aGlzIHJ1bnRpbWUuXCIpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy4jc2VydmVyUmVxdWVzdC51cGdyYWRlKG9wdGlvbnMpO1xuICB9XG5cbiAgW1N5bWJvbC5mb3IoXCJEZW5vLmN1c3RvbUluc3BlY3RcIildKFxuICAgIGluc3BlY3Q6ICh2YWx1ZTogdW5rbm93bikgPT4gc3RyaW5nLFxuICApOiBzdHJpbmcge1xuICAgIGNvbnN0IHsgYm9keSwgaGFzQm9keSwgaGVhZGVycywgaXAsIGlwcywgbWV0aG9kLCBzZWN1cmUsIHVybCwgdXNlckFnZW50IH0gPVxuICAgICAgdGhpcztcbiAgICByZXR1cm4gYCR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfSAke1xuICAgICAgaW5zcGVjdCh7XG4gICAgICAgIGJvZHksXG4gICAgICAgIGhhc0JvZHksXG4gICAgICAgIGhlYWRlcnMsXG4gICAgICAgIGlwLFxuICAgICAgICBpcHMsXG4gICAgICAgIG1ldGhvZCxcbiAgICAgICAgc2VjdXJlLFxuICAgICAgICB1cmw6IHVybC50b1N0cmluZygpLFxuICAgICAgICB1c2VyQWdlbnQsXG4gICAgICB9KVxuICAgIH1gO1xuICB9XG5cbiAgW1N5bWJvbC5mb3IoXCJub2RlanMudXRpbC5pbnNwZWN0LmN1c3RvbVwiKV0oXG4gICAgZGVwdGg6IG51bWJlcixcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIG9wdGlvbnM6IGFueSxcbiAgICBpbnNwZWN0OiAodmFsdWU6IHVua25vd24sIG9wdGlvbnM/OiB1bmtub3duKSA9PiBzdHJpbmcsXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgKTogYW55IHtcbiAgICBpZiAoZGVwdGggPCAwKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKGBbJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9XWAsIFwic3BlY2lhbFwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBuZXdPcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywge1xuICAgICAgZGVwdGg6IG9wdGlvbnMuZGVwdGggPT09IG51bGwgPyBudWxsIDogb3B0aW9ucy5kZXB0aCAtIDEsXG4gICAgfSk7XG4gICAgY29uc3QgeyBib2R5LCBoYXNCb2R5LCBoZWFkZXJzLCBpcCwgaXBzLCBtZXRob2QsIHNlY3VyZSwgdXJsLCB1c2VyQWdlbnQgfSA9XG4gICAgICB0aGlzO1xuICAgIHJldHVybiBgJHtvcHRpb25zLnN0eWxpemUodGhpcy5jb25zdHJ1Y3Rvci5uYW1lLCBcInNwZWNpYWxcIil9ICR7XG4gICAgICBpbnNwZWN0KFxuICAgICAgICB7IGJvZHksIGhhc0JvZHksIGhlYWRlcnMsIGlwLCBpcHMsIG1ldGhvZCwgc2VjdXJlLCB1cmwsIHVzZXJBZ2VudCB9LFxuICAgICAgICBuZXdPcHRpb25zLFxuICAgICAgKVxuICAgIH1gO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEseUVBQXlFO0FBRXpFOzs7Ozs7Q0FNQztBQUVELFNBQVMsSUFBSSxRQUFR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