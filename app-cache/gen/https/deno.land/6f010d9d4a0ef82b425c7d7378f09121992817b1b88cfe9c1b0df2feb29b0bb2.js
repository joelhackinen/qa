// Copyright 2018-2023 the oak authors. All rights reserved. MIT license.
// deno-lint-ignore no-explicit-any
export const DomResponse = globalThis.Response ?? class MockResponse {
};
const maybeUpgradeWebSocket = "upgradeWebSocket" in Deno ? Deno.upgradeWebSocket.bind(Deno) : undefined;
export function isNativeRequest(r) {
  return r instanceof NativeRequest;
}
/** An internal oak abstraction for handling a Deno native request. Most users
 * of oak do not need to worry about this abstraction. */ export class NativeRequest {
  #conn;
  // deno-lint-ignore no-explicit-any
  #reject;
  #request;
  #requestPromise;
  #resolve;
  #resolved = false;
  #upgradeWebSocket;
  constructor(requestEvent, options = {}){
    const { conn } = options;
    this.#conn = conn;
    // this allows for the value to be explicitly undefined in the options
    this.#upgradeWebSocket = "upgradeWebSocket" in options ? options["upgradeWebSocket"] : maybeUpgradeWebSocket;
    this.#request = requestEvent.request;
    const p = new Promise((resolve, reject)=>{
      this.#resolve = resolve;
      this.#reject = reject;
    });
    this.#requestPromise = requestEvent.respondWith(p);
  }
  get body() {
    // when shimming with undici under Node.js, this is a
    // `ControlledAsyncIterable`
    // deno-lint-ignore no-explicit-any
    return this.#request.body;
  }
  get donePromise() {
    return this.#requestPromise;
  }
  get headers() {
    return this.#request.headers;
  }
  get method() {
    return this.#request.method;
  }
  get remoteAddr() {
    return this.#conn?.remoteAddr?.hostname;
  }
  get request() {
    return this.#request;
  }
  get url() {
    try {
      const url = new URL(this.#request.url);
      return this.#request.url.replace(url.origin, "");
    } catch  {
    // we don't care about errors, we just want to fall back
    }
    return this.#request.url;
  }
  get rawUrl() {
    return this.#request.url;
  }
  // deno-lint-ignore no-explicit-any
  error(reason) {
    if (this.#resolved) {
      throw new Error("Request already responded to.");
    }
    this.#reject(reason);
    this.#resolved = true;
  }
  getBody() {
    return {
      // when emitting to Node.js, the body is not compatible, and thought it
      // doesn't run at runtime, it still gets type checked.
      // deno-lint-ignore no-explicit-any
      body: this.#request.body,
      readBody: async ()=>{
        const ab = await this.#request.arrayBuffer();
        return new Uint8Array(ab);
      }
    };
  }
  respond(response) {
    if (this.#resolved) {
      throw new Error("Request already responded to.");
    }
    this.#resolve(response);
    this.#resolved = true;
    return this.#requestPromise;
  }
  upgrade(options) {
    if (this.#resolved) {
      throw new Error("Request already responded to.");
    }
    if (!this.#upgradeWebSocket) {
      throw new TypeError("Upgrading web sockets not supported.");
    }
    const { response, socket } = this.#upgradeWebSocket(this.#request, options);
    this.#resolve(response);
    this.#resolved = true;
    return socket;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvb2FrQHYxMi42LjEvaHR0cF9zZXJ2ZXJfbmF0aXZlX3JlcXVlc3QudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMyB0aGUgb2FrIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuXG5pbXBvcnQgdHlwZSB7XG4gIFJlcXVlc3RFdmVudCxcbiAgU2VydmVyUmVxdWVzdCxcbiAgU2VydmVyUmVxdWVzdEJvZHksXG4gIFVwZ3JhZGVXZWJTb2NrZXRGbixcbiAgVXBncmFkZVdlYlNvY2tldE9wdGlvbnMsXG59IGZyb20gXCIuL3R5cGVzLmQudHNcIjtcblxuLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbmV4cG9ydCBjb25zdCBEb21SZXNwb25zZTogdHlwZW9mIFJlc3BvbnNlID0gKGdsb2JhbFRoaXMgYXMgYW55KS5SZXNwb25zZSA/P1xuICBjbGFzcyBNb2NrUmVzcG9uc2Uge307XG5cbmNvbnN0IG1heWJlVXBncmFkZVdlYlNvY2tldDogVXBncmFkZVdlYlNvY2tldEZuIHwgdW5kZWZpbmVkID1cbiAgXCJ1cGdyYWRlV2ViU29ja2V0XCIgaW4gRGVub1xuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgPyAoRGVubyBhcyBhbnkpLnVwZ3JhZGVXZWJTb2NrZXQuYmluZChEZW5vKVxuICAgIDogdW5kZWZpbmVkO1xuXG5leHBvcnQgZnVuY3Rpb24gaXNOYXRpdmVSZXF1ZXN0KHI6IFNlcnZlclJlcXVlc3QpOiByIGlzIE5hdGl2ZVJlcXVlc3Qge1xuICByZXR1cm4gciBpbnN0YW5jZW9mIE5hdGl2ZVJlcXVlc3Q7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTmF0aXZlUmVxdWVzdE9wdGlvbnMge1xuICBjb25uPzogRGVuby5Db25uO1xuICB1cGdyYWRlV2ViU29ja2V0PzogVXBncmFkZVdlYlNvY2tldEZuO1xufVxuXG4vKiogQW4gaW50ZXJuYWwgb2FrIGFic3RyYWN0aW9uIGZvciBoYW5kbGluZyBhIERlbm8gbmF0aXZlIHJlcXVlc3QuIE1vc3QgdXNlcnNcbiAqIG9mIG9hayBkbyBub3QgbmVlZCB0byB3b3JyeSBhYm91dCB0aGlzIGFic3RyYWN0aW9uLiAqL1xuZXhwb3J0IGNsYXNzIE5hdGl2ZVJlcXVlc3QgaW1wbGVtZW50cyBTZXJ2ZXJSZXF1ZXN0IHtcbiAgI2Nvbm4/OiBEZW5vLkNvbm47XG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICNyZWplY3QhOiAocmVhc29uPzogYW55KSA9PiB2b2lkO1xuICAjcmVxdWVzdDogUmVxdWVzdDtcbiAgI3JlcXVlc3RQcm9taXNlOiBQcm9taXNlPHZvaWQ+O1xuICAjcmVzb2x2ZSE6ICh2YWx1ZTogUmVzcG9uc2UpID0+IHZvaWQ7XG4gICNyZXNvbHZlZCA9IGZhbHNlO1xuICAjdXBncmFkZVdlYlNvY2tldD86IFVwZ3JhZGVXZWJTb2NrZXRGbjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICByZXF1ZXN0RXZlbnQ6IFJlcXVlc3RFdmVudCxcbiAgICBvcHRpb25zOiBOYXRpdmVSZXF1ZXN0T3B0aW9ucyA9IHt9LFxuICApIHtcbiAgICBjb25zdCB7IGNvbm4gfSA9IG9wdGlvbnM7XG4gICAgdGhpcy4jY29ubiA9IGNvbm47XG4gICAgLy8gdGhpcyBhbGxvd3MgZm9yIHRoZSB2YWx1ZSB0byBiZSBleHBsaWNpdGx5IHVuZGVmaW5lZCBpbiB0aGUgb3B0aW9uc1xuICAgIHRoaXMuI3VwZ3JhZGVXZWJTb2NrZXQgPSBcInVwZ3JhZGVXZWJTb2NrZXRcIiBpbiBvcHRpb25zXG4gICAgICA/IG9wdGlvbnNbXCJ1cGdyYWRlV2ViU29ja2V0XCJdXG4gICAgICA6IG1heWJlVXBncmFkZVdlYlNvY2tldDtcbiAgICB0aGlzLiNyZXF1ZXN0ID0gcmVxdWVzdEV2ZW50LnJlcXVlc3Q7XG4gICAgY29uc3QgcCA9IG5ldyBQcm9taXNlPFJlc3BvbnNlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLiNyZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgIHRoaXMuI3JlamVjdCA9IHJlamVjdDtcbiAgICB9KTtcbiAgICB0aGlzLiNyZXF1ZXN0UHJvbWlzZSA9IHJlcXVlc3RFdmVudC5yZXNwb25kV2l0aChwKTtcbiAgfVxuXG4gIGdldCBib2R5KCk6IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+IHwgbnVsbCB7XG4gICAgLy8gd2hlbiBzaGltbWluZyB3aXRoIHVuZGljaSB1bmRlciBOb2RlLmpzLCB0aGlzIGlzIGFcbiAgICAvLyBgQ29udHJvbGxlZEFzeW5jSXRlcmFibGVgXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICByZXR1cm4gdGhpcy4jcmVxdWVzdC5ib2R5IGFzIGFueTtcbiAgfVxuXG4gIGdldCBkb25lUHJvbWlzZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gdGhpcy4jcmVxdWVzdFByb21pc2U7XG4gIH1cblxuICBnZXQgaGVhZGVycygpOiBIZWFkZXJzIHtcbiAgICByZXR1cm4gdGhpcy4jcmVxdWVzdC5oZWFkZXJzO1xuICB9XG5cbiAgZ2V0IG1ldGhvZCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLiNyZXF1ZXN0Lm1ldGhvZDtcbiAgfVxuXG4gIGdldCByZW1vdGVBZGRyKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuICh0aGlzLiNjb25uPy5yZW1vdGVBZGRyIGFzIERlbm8uTmV0QWRkcik/Lmhvc3RuYW1lO1xuICB9XG5cbiAgZ2V0IHJlcXVlc3QoKTogUmVxdWVzdCB7XG4gICAgcmV0dXJuIHRoaXMuI3JlcXVlc3Q7XG4gIH1cblxuICBnZXQgdXJsKCk6IHN0cmluZyB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwodGhpcy4jcmVxdWVzdC51cmwpO1xuICAgICAgcmV0dXJuIHRoaXMuI3JlcXVlc3QudXJsLnJlcGxhY2UodXJsLm9yaWdpbiwgXCJcIik7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyB3ZSBkb24ndCBjYXJlIGFib3V0IGVycm9ycywgd2UganVzdCB3YW50IHRvIGZhbGwgYmFja1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy4jcmVxdWVzdC51cmw7XG4gIH1cblxuICBnZXQgcmF3VXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuI3JlcXVlc3QudXJsO1xuICB9XG5cbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgZXJyb3IocmVhc29uPzogYW55KTogdm9pZCB7XG4gICAgaWYgKHRoaXMuI3Jlc29sdmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJSZXF1ZXN0IGFscmVhZHkgcmVzcG9uZGVkIHRvLlwiKTtcbiAgICB9XG4gICAgdGhpcy4jcmVqZWN0KHJlYXNvbik7XG4gICAgdGhpcy4jcmVzb2x2ZWQgPSB0cnVlO1xuICB9XG5cbiAgZ2V0Qm9keSgpOiBTZXJ2ZXJSZXF1ZXN0Qm9keSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIC8vIHdoZW4gZW1pdHRpbmcgdG8gTm9kZS5qcywgdGhlIGJvZHkgaXMgbm90IGNvbXBhdGlibGUsIGFuZCB0aG91Z2h0IGl0XG4gICAgICAvLyBkb2Vzbid0IHJ1biBhdCBydW50aW1lLCBpdCBzdGlsbCBnZXRzIHR5cGUgY2hlY2tlZC5cbiAgICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgICBib2R5OiB0aGlzLiNyZXF1ZXN0LmJvZHkgYXMgYW55LFxuICAgICAgcmVhZEJvZHk6IGFzeW5jICgpID0+IHtcbiAgICAgICAgY29uc3QgYWIgPSBhd2FpdCB0aGlzLiNyZXF1ZXN0LmFycmF5QnVmZmVyKCk7XG4gICAgICAgIHJldHVybiBuZXcgVWludDhBcnJheShhYik7XG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICByZXNwb25kKHJlc3BvbnNlOiBSZXNwb25zZSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLiNyZXNvbHZlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUmVxdWVzdCBhbHJlYWR5IHJlc3BvbmRlZCB0by5cIik7XG4gICAgfVxuICAgIHRoaXMuI3Jlc29sdmUocmVzcG9uc2UpO1xuICAgIHRoaXMuI3Jlc29sdmVkID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcy4jcmVxdWVzdFByb21pc2U7XG4gIH1cblxuICB1cGdyYWRlKG9wdGlvbnM/OiBVcGdyYWRlV2ViU29ja2V0T3B0aW9ucyk6IFdlYlNvY2tldCB7XG4gICAgaWYgKHRoaXMuI3Jlc29sdmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJSZXF1ZXN0IGFscmVhZHkgcmVzcG9uZGVkIHRvLlwiKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLiN1cGdyYWRlV2ViU29ja2V0KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiVXBncmFkaW5nIHdlYiBzb2NrZXRzIG5vdCBzdXBwb3J0ZWQuXCIpO1xuICAgIH1cbiAgICBjb25zdCB7IHJlc3BvbnNlLCBzb2NrZXQgfSA9IHRoaXMuI3VwZ3JhZGVXZWJTb2NrZXQoXG4gICAgICB0aGlzLiNyZXF1ZXN0LFxuICAgICAgb3B0aW9ucyxcbiAgICApO1xuICAgIHRoaXMuI3Jlc29sdmUocmVzcG9uc2UpO1xuICAgIHRoaXMuI3Jlc29sdmVkID0gdHJ1ZTtcbiAgICByZXR1cm4gc29ja2V0O1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEseUVBQXlFO0FBVXpFLG1DQUFtQztBQUNuQyxPQUFPLE1BQU0sY0FBK0IsQUFBQyxXQUFtQixRQUFRLElBQ3RFLE1BQU07QUFBYyxFQUFFO0FBRXhCLE1BQU0sd0JBQ0osc0JBQXNCLE9BRWxCLEFBQUMsS0FBYSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsUUFDcEM7QUFFTixPQUFPLFNBQVMsZ0JBQWdCLENBQWdCO0VBQzlDLE9BQU8sYUFBYTtBQUN0QjtBQU9BO3VEQUN1RCxHQUN2RCxP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