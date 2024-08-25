// Copyright 2018-2024 the oak authors. All rights reserved. MIT license.
/** The abstraction that oak uses when dealing with requests and responses
 * within the Deno runtime.
 *
 * @module
 */ var _computedKey;
import { NativeRequest } from "./http_server_native_request.ts";
import { createPromiseWithResolvers } from "./utils/create_promise_with_resolvers.ts";
const serve = "Deno" in globalThis && "serve" in globalThis.Deno ? globalThis.Deno.serve.bind(globalThis.Deno) : undefined;
_computedKey = Symbol.asyncIterator;
/** The oak abstraction of the Deno native HTTP server which is used internally
 * for handling native HTTP requests. Generally users of oak do not need to
 * worry about this class. */ // deno-lint-ignore no-explicit-any
export class Server {
  #app;
  #closed = false;
  #httpServer;
  #options;
  #stream;
  constructor(app, options){
    if (!serve) {
      throw new Error("The native bindings for serving HTTP are not available.");
    }
    this.#app = app;
    this.#options = options;
  }
  get app() {
    return this.#app;
  }
  get closed() {
    return this.#closed;
  }
  async close() {
    if (this.#closed) {
      return;
    }
    if (this.#httpServer) {
      this.#httpServer.unref();
      await this.#httpServer.shutdown();
      this.#httpServer = undefined;
    }
    this.#closed = true;
  }
  listen() {
    if (this.#httpServer) {
      throw new Error("Server already listening.");
    }
    const { signal } = this.#options;
    const { onListen, ...options } = this.#options;
    const { promise, resolve } = createPromiseWithResolvers();
    this.#stream = new ReadableStream({
      start: (controller)=>{
        this.#httpServer = serve?.({
          handler: (req, info)=>{
            const nativeRequest = new NativeRequest(req, info);
            controller.enqueue(nativeRequest);
            return nativeRequest.response;
          },
          onListen ({ hostname, port }) {
            if (onListen) {
              onListen({
                hostname,
                port
              });
            }
            resolve({
              addr: {
                hostname,
                port
              }
            });
          },
          signal,
          ...options
        });
      }
    });
    signal?.addEventListener("abort", ()=>this.close(), {
      once: true
    });
    return promise;
  }
  [_computedKey]() {
    if (!this.#stream) {
      throw new TypeError("Server hasn't started listening.");
    }
    return this.#stream[Symbol.asyncIterator]();
  }
  static type = "native";
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvb2FrLzE2LjEuMC9odHRwX3NlcnZlcl9uYXRpdmUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNCB0aGUgb2FrIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuXG4vKiogVGhlIGFic3RyYWN0aW9uIHRoYXQgb2FrIHVzZXMgd2hlbiBkZWFsaW5nIHdpdGggcmVxdWVzdHMgYW5kIHJlc3BvbnNlc1xuICogd2l0aGluIHRoZSBEZW5vIHJ1bnRpbWUuXG4gKlxuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB0eXBlIHsgQXBwbGljYXRpb24sIFN0YXRlIH0gZnJvbSBcIi4vYXBwbGljYXRpb24udHNcIjtcbmltcG9ydCB7IE5hdGl2ZVJlcXVlc3QgfSBmcm9tIFwiLi9odHRwX3NlcnZlcl9uYXRpdmVfcmVxdWVzdC50c1wiO1xuaW1wb3J0IHR5cGUge1xuICBIdHRwU2VydmVyLFxuICBMaXN0ZW5lcixcbiAgT2FrU2VydmVyLFxuICBTZXJ2ZUluaXQsXG4gIFNlcnZlT3B0aW9ucyxcbiAgU2VydmVUbHNPcHRpb25zLFxufSBmcm9tIFwiLi90eXBlcy50c1wiO1xuaW1wb3J0IHsgY3JlYXRlUHJvbWlzZVdpdGhSZXNvbHZlcnMgfSBmcm9tIFwiLi91dGlscy9jcmVhdGVfcHJvbWlzZV93aXRoX3Jlc29sdmVycy50c1wiO1xuXG5jb25zdCBzZXJ2ZTpcbiAgfCAoKFxuICAgIG9wdGlvbnM6IFNlcnZlSW5pdCAmIChTZXJ2ZU9wdGlvbnMgfCBTZXJ2ZVRsc09wdGlvbnMpLFxuICApID0+IEh0dHBTZXJ2ZXIpXG4gIHwgdW5kZWZpbmVkID0gXCJEZW5vXCIgaW4gZ2xvYmFsVGhpcyAmJiBcInNlcnZlXCIgaW4gZ2xvYmFsVGhpcy5EZW5vXG4gICAgPyBnbG9iYWxUaGlzLkRlbm8uc2VydmUuYmluZChnbG9iYWxUaGlzLkRlbm8pXG4gICAgOiB1bmRlZmluZWQ7XG5cbi8qKiBUaGUgb2FrIGFic3RyYWN0aW9uIG9mIHRoZSBEZW5vIG5hdGl2ZSBIVFRQIHNlcnZlciB3aGljaCBpcyB1c2VkIGludGVybmFsbHlcbiAqIGZvciBoYW5kbGluZyBuYXRpdmUgSFRUUCByZXF1ZXN0cy4gR2VuZXJhbGx5IHVzZXJzIG9mIG9hayBkbyBub3QgbmVlZCB0b1xuICogd29ycnkgYWJvdXQgdGhpcyBjbGFzcy4gKi9cbi8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG5leHBvcnQgY2xhc3MgU2VydmVyPEFTIGV4dGVuZHMgU3RhdGUgPSBSZWNvcmQ8c3RyaW5nLCBhbnk+PlxuICBpbXBsZW1lbnRzIE9ha1NlcnZlcjxOYXRpdmVSZXF1ZXN0PiB7XG4gICNhcHA6IEFwcGxpY2F0aW9uPEFTPjtcbiAgI2Nsb3NlZCA9IGZhbHNlO1xuICAjaHR0cFNlcnZlcj86IEh0dHBTZXJ2ZXI7XG4gICNvcHRpb25zOiBTZXJ2ZU9wdGlvbnMgfCBTZXJ2ZVRsc09wdGlvbnM7XG4gICNzdHJlYW0/OiBSZWFkYWJsZVN0cmVhbTxOYXRpdmVSZXF1ZXN0PjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcGxpY2F0aW9uPEFTPixcbiAgICBvcHRpb25zOiBPbWl0PFNlcnZlT3B0aW9ucyB8IFNlcnZlVGxzT3B0aW9ucywgXCJzaWduYWxcIj4sXG4gICkge1xuICAgIGlmICghc2VydmUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgXCJUaGUgbmF0aXZlIGJpbmRpbmdzIGZvciBzZXJ2aW5nIEhUVFAgYXJlIG5vdCBhdmFpbGFibGUuXCIsXG4gICAgICApO1xuICAgIH1cbiAgICB0aGlzLiNhcHAgPSBhcHA7XG4gICAgdGhpcy4jb3B0aW9ucyA9IG9wdGlvbnM7XG4gIH1cblxuICBnZXQgYXBwKCk6IEFwcGxpY2F0aW9uPEFTPiB7XG4gICAgcmV0dXJuIHRoaXMuI2FwcDtcbiAgfVxuXG4gIGdldCBjbG9zZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuI2Nsb3NlZDtcbiAgfVxuXG4gIGFzeW5jIGNsb3NlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLiNjbG9zZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy4jaHR0cFNlcnZlcikge1xuICAgICAgdGhpcy4jaHR0cFNlcnZlci51bnJlZigpO1xuICAgICAgYXdhaXQgdGhpcy4jaHR0cFNlcnZlci5zaHV0ZG93bigpO1xuICAgICAgdGhpcy4jaHR0cFNlcnZlciA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdGhpcy4jY2xvc2VkID0gdHJ1ZTtcbiAgfVxuXG4gIGxpc3RlbigpOiBQcm9taXNlPExpc3RlbmVyPiB7XG4gICAgaWYgKHRoaXMuI2h0dHBTZXJ2ZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlNlcnZlciBhbHJlYWR5IGxpc3RlbmluZy5cIik7XG4gICAgfVxuICAgIGNvbnN0IHsgc2lnbmFsIH0gPSB0aGlzLiNvcHRpb25zO1xuICAgIGNvbnN0IHsgb25MaXN0ZW4sIC4uLm9wdGlvbnMgfSA9IHRoaXMuI29wdGlvbnM7XG4gICAgY29uc3QgeyBwcm9taXNlLCByZXNvbHZlIH0gPSBjcmVhdGVQcm9taXNlV2l0aFJlc29sdmVyczxMaXN0ZW5lcj4oKTtcbiAgICB0aGlzLiNzdHJlYW0gPSBuZXcgUmVhZGFibGVTdHJlYW08TmF0aXZlUmVxdWVzdD4oe1xuICAgICAgc3RhcnQ6IChjb250cm9sbGVyKSA9PiB7XG4gICAgICAgIHRoaXMuI2h0dHBTZXJ2ZXIgPSBzZXJ2ZT8uKHtcbiAgICAgICAgICBoYW5kbGVyOiAocmVxLCBpbmZvKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuYXRpdmVSZXF1ZXN0ID0gbmV3IE5hdGl2ZVJlcXVlc3QocmVxLCBpbmZvKTtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZShuYXRpdmVSZXF1ZXN0KTtcbiAgICAgICAgICAgIHJldHVybiBuYXRpdmVSZXF1ZXN0LnJlc3BvbnNlO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgb25MaXN0ZW4oeyBob3N0bmFtZSwgcG9ydCB9KSB7XG4gICAgICAgICAgICBpZiAob25MaXN0ZW4pIHtcbiAgICAgICAgICAgICAgb25MaXN0ZW4oeyBob3N0bmFtZSwgcG9ydCB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUoeyBhZGRyOiB7IGhvc3RuYW1lLCBwb3J0IH0gfSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBzaWduYWwsXG4gICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgc2lnbmFsPy5hZGRFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgKCkgPT4gdGhpcy5jbG9zZSgpLCB7IG9uY2U6IHRydWUgfSk7XG4gICAgcmV0dXJuIHByb21pc2U7XG4gIH1cblxuICBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxOYXRpdmVSZXF1ZXN0PiB7XG4gICAgaWYgKCF0aGlzLiNzdHJlYW0pIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTZXJ2ZXIgaGFzbid0IHN0YXJ0ZWQgbGlzdGVuaW5nLlwiKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuI3N0cmVhbVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTtcbiAgfVxuXG4gIHN0YXRpYyB0eXBlOiBcIm5hdGl2ZVwiID0gXCJuYXRpdmVcIjtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSx5RUFBeUU7QUFFekU7Ozs7Q0FJQztBQUdELFNBQVMsYUFBYSxRQUFRLGtDQUFrQztBQVNoRSxTQUFTLDBCQUEwQixRQUFRLDJDQUEyQztBQUV0RixNQUFNLFFBSVUsVUFBVSxjQUFjLFdBQVcsV0FBVyxJQUFJLEdBQzVELFdBQVcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxJQUFJLElBQzFDO2VBK0VILE9BQU8sYUFBYTtBQTdFdkI7OzJCQUUyQixHQUMzQixtQ0FBbUM7QUFDbkMsT0FBTyxNQUFNO0VBRVgsQ0FBQyxHQUFHLENBQWtCO0VBQ3RCLENBQUMsTUFBTSxHQUFHLE1BQU07RUFDaEIsQ0FBQyxVQUFVLENBQWM7RUFDekIsQ0FBQyxPQUFPLENBQWlDO0VBQ3pDLENBQUMsTUFBTSxDQUFpQztFQUV4QyxZQUNFLEdBQW9CLEVBQ3BCLE9BQXVELENBQ3ZEO0lBQ0EsSUFBSSxDQUFDLE9BQU87TUFDVixNQUFNLElBQUksTUFDUjtJQUVKO0lBQ0EsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHO0lBQ1osSUFBSSxDQUFDLENBQUMsT0FBTyxHQUFHO0VBQ2xCO0VBRUEsSUFBSSxNQUF1QjtJQUN6QixPQUFPLElBQUksQ0FBQyxDQUFDLEdBQUc7RUFDbEI7RUFFQSxJQUFJLFNBQWtCO0lBQ3BCLE9BQU8sSUFBSSxDQUFDLENBQUMsTUFBTTtFQUNyQjtFQUVBLE1BQU0sUUFBdUI7SUFDM0IsSUFBSSxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUU7TUFDaEI7SUFDRjtJQUVBLElBQUksSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFO01BQ3BCLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLO01BQ3RCLE1BQU0sSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVE7TUFDL0IsSUFBSSxDQUFDLENBQUMsVUFBVSxHQUFHO0lBQ3JCO0lBQ0EsSUFBSSxDQUFDLENBQUMsTUFBTSxHQUFHO0VBQ2pCO0VBRUEsU0FBNEI7SUFDMUIsSUFBSSxJQUFJLENBQUMsQ0FBQyxVQUFVLEVBQUU7TUFDcEIsTUFBTSxJQUFJLE1BQU07SUFDbEI7SUFDQSxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTztJQUNoQyxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU87SUFDOUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRztJQUM3QixJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxlQUE4QjtNQUMvQyxPQUFPLENBQUM7UUFDTixJQUFJLENBQUMsQ0FBQyxVQUFVLEdBQUcsUUFBUTtVQUN6QixTQUFTLENBQUMsS0FBSztZQUNiLE1BQU0sZ0JBQWdCLElBQUksY0FBYyxLQUFLO1lBQzdDLFdBQVcsT0FBTyxDQUFDO1lBQ25CLE9BQU8sY0FBYyxRQUFRO1VBQy9CO1VBQ0EsVUFBUyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7WUFDekIsSUFBSSxVQUFVO2NBQ1osU0FBUztnQkFBRTtnQkFBVTtjQUFLO1lBQzVCO1lBQ0EsUUFBUTtjQUFFLE1BQU07Z0JBQUU7Z0JBQVU7Y0FBSztZQUFFO1VBQ3JDO1VBQ0E7VUFDQSxHQUFHLE9BQU87UUFDWjtNQUNGO0lBQ0Y7SUFFQSxRQUFRLGlCQUFpQixTQUFTLElBQU0sSUFBSSxDQUFDLEtBQUssSUFBSTtNQUFFLE1BQU07SUFBSztJQUNuRSxPQUFPO0VBQ1Q7RUFFQSxpQkFBK0Q7SUFDN0QsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRTtNQUNqQixNQUFNLElBQUksVUFBVTtJQUN0QjtJQUNBLE9BQU8sSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sYUFBYSxDQUFDO0VBQzNDO0VBRUEsT0FBTyxPQUFpQixTQUFTO0FBQ25DIn0=