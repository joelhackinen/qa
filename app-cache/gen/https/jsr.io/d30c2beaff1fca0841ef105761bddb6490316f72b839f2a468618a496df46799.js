// Copyright 2018-2024 the oak authors. All rights reserved. MIT license.
/**
 * Contains the core concept of oak, the middleware application. Typical usage
 * is the creation of an application instance, registration of middleware, and
 * then starting to listen for requests.
 *
 * # Example
 *
 * ```ts
 * import { Application } from "jsr:@oak/oak@14/application";
 *
 * const app = new Application();
 * app.use((ctx) => {
 *   ctx.response.body = "hello world!";
 * });
 *
 * app.listen({ port: 8080 });
 * ```
 *
 * @module
 */ var _computedKey, _computedKey1;
import { Context } from "./context.ts";
import { assert, KeyStack, STATUS_TEXT } from "./deps.ts";
import { compose, isMiddlewareObject } from "./middleware.ts";
import { cloneState } from "./utils/clone_state.ts";
import { createPromiseWithResolvers } from "./utils/create_promise_with_resolvers.ts";
import { isBun, isNetAddr, isNode } from "./utils/type_guards.ts";
const ADDR_REGEXP = /^\[?([^\]]*)\]?:([0-9]{1,5})$/;
let DefaultServerCtor;
let NativeRequestCtor;
/** An event that occurs when the application closes. */ export class ApplicationCloseEvent extends Event {
  constructor(eventInitDict){
    super("close", eventInitDict);
  }
}
/** An event that occurs when an application error occurs.
 *
 * When the error occurs related to the handling of a request, the `.context`
 * property will be populated.
 */ export class ApplicationErrorEvent extends ErrorEvent {
  context;
  constructor(eventInitDict){
    super("error", eventInitDict);
    this.context = eventInitDict.context;
  }
}
function logErrorListener({ error, context }) {
  if (error instanceof Error) {
    console.error(`[uncaught application error]: ${error.name} - ${error.message}`);
  } else {
    console.error(`[uncaught application error]\n`, error);
  }
  if (context) {
    let url;
    try {
      url = context.request.url.toString();
    } catch  {
      url = "[malformed url]";
    }
    console.error(`\nrequest:`, {
      url,
      method: context.request.method,
      hasBody: context.request.hasBody
    });
    console.error(`response:`, {
      status: context.response.status,
      type: context.response.type,
      hasBody: !!context.response.body,
      writable: context.response.writable
    });
  }
  if (error instanceof Error && error.stack) {
    console.error(`\n${error.stack.split("\n").slice(1).join("\n")}`);
  }
}
/**
 * An event that occurs when the application starts listening for requests.
 */ export class ApplicationListenEvent extends Event {
  hostname;
  listener;
  port;
  secure;
  serverType;
  constructor(eventInitDict){
    super("listen", eventInitDict);
    this.hostname = eventInitDict.hostname;
    this.listener = eventInitDict.listener;
    this.port = eventInitDict.port;
    this.secure = eventInitDict.secure;
    this.serverType = eventInitDict.serverType;
  }
}
_computedKey = Symbol.for("Deno.customInspect"), _computedKey1 = Symbol.for("nodejs.util.inspect.custom");
/** A class which registers middleware (via `.use()`) and then processes
 * inbound requests against that middleware (via `.listen()`).
 *
 * The `context.state` can be typed via passing a generic argument when
 * constructing an instance of `Application`. It can also be inferred by setting
 * the {@linkcode ApplicationOptions.state} option when constructing the
 * application.
 *
 * ### Basic example
 *
 * ```ts
 * import { Application } from "jsr:@oak/oak/application";
 *
 * const app = new Application();
 *
 * app.use((ctx, next) => {
 *   // called on each request with the context (`ctx`) of the request,
 *   // response, and other data.
 *   // `next()` is use to modify the flow control of the middleware stack.
 * });
 *
 * app.listen({ port: 8080 });
 * ```
 *
 * @template AS the type of the application state which extends
 *              {@linkcode State} and defaults to a simple string record.
 */ // deno-lint-ignore no-explicit-any
export class Application extends EventTarget {
  #composedMiddleware;
  #contextOptions;
  #contextState;
  #keys;
  #middleware = [];
  #serverConstructor;
  /** A set of keys, or an instance of `KeyStack` which will be used to sign
   * cookies read and set by the application to avoid tampering with the
   * cookies. */ get keys() {
    return this.#keys;
  }
  set keys(keys) {
    if (!keys) {
      this.#keys = undefined;
      return;
    } else if (Array.isArray(keys)) {
      this.#keys = new KeyStack(keys);
    } else {
      this.#keys = keys;
    }
  }
  /** If `true`, proxy headers will be trusted when processing requests.  This
   * defaults to `false`. */ proxy;
  /** Generic state of the application, which can be specified by passing the
   * generic argument when constructing:
   *
   *       const app = new Application<{ foo: string }>();
   *
   * Or can be contextually inferred based on setting an initial state object:
   *
   *       const app = new Application({ state: { foo: "bar" } });
   *
   * When a new context is created, the application's state is cloned and the
   * state is unique to that request/response.  Changes can be made to the
   * application state that will be shared with all contexts.
   */ state;
  constructor(options = {}){
    super();
    const { state, keys, proxy, serverConstructor, contextState = "clone", logErrors = true, ...contextOptions } = options;
    this.proxy = proxy ?? false;
    this.keys = keys;
    this.state = state ?? {};
    this.#serverConstructor = serverConstructor;
    this.#contextOptions = contextOptions;
    this.#contextState = contextState;
    if (logErrors) {
      this.addEventListener("error", logErrorListener);
    }
  }
  #getComposed() {
    if (!this.#composedMiddleware) {
      this.#composedMiddleware = compose(this.#middleware);
    }
    return this.#composedMiddleware;
  }
  #getContextState() {
    switch(this.#contextState){
      case "alias":
        return this.state;
      case "clone":
        return cloneState(this.state);
      case "empty":
        return {};
      case "prototype":
        return Object.create(this.state);
    }
  }
  /** Deal with uncaught errors in either the middleware or sending the
   * response. */ // deno-lint-ignore no-explicit-any
  #handleError(context, error) {
    if (!(error instanceof Error)) {
      error = new Error(`non-error thrown: ${JSON.stringify(error)}`);
    }
    const { message } = error;
    if (!context.response.writable) {
      this.dispatchEvent(new ApplicationErrorEvent({
        context,
        message,
        error
      }));
      return;
    }
    for (const key of [
      ...context.response.headers.keys()
    ]){
      context.response.headers.delete(key);
    }
    if (error.headers && error.headers instanceof Headers) {
      for (const [key, value] of error.headers){
        context.response.headers.set(key, value);
      }
    }
    context.response.type = "text";
    const status = context.response.status = globalThis.Deno && Deno.errors && error instanceof Deno.errors.NotFound ? 404 : error.status && typeof error.status === "number" ? error.status : 500;
    context.response.body = error.expose ? error.message : STATUS_TEXT[status];
    this.dispatchEvent(new ApplicationErrorEvent({
      context,
      message,
      error
    }));
  }
  /** Processing registered middleware on each request. */ async #handleRequest(request, secure, state) {
    let context;
    try {
      context = new Context(this, request, this.#getContextState(), {
        secure,
        ...this.#contextOptions
      });
    } catch (e) {
      const error = e instanceof Error ? e : new Error(`non-error thrown: ${JSON.stringify(e)}`);
      const { message } = error;
      this.dispatchEvent(new ApplicationErrorEvent({
        message,
        error
      }));
      return;
    }
    assert(context, "Context was not created.");
    const { promise, resolve } = createPromiseWithResolvers();
    state.handling.add(promise);
    if (!state.closing && !state.closed) {
      try {
        await this.#getComposed()(context);
      } catch (err) {
        this.#handleError(context, err);
      }
    }
    if (context.respond === false) {
      context.response.destroy();
      resolve();
      state.handling.delete(promise);
      return;
    }
    let closeResources = true;
    let response;
    try {
      closeResources = false;
      response = await context.response.toDomResponse();
    } catch (err) {
      this.#handleError(context, err);
      response = await context.response.toDomResponse();
    }
    assert(response);
    try {
      await request.respond(response);
    } catch (err) {
      this.#handleError(context, err);
    } finally{
      context.response.destroy(closeResources);
      resolve();
      state.handling.delete(promise);
      if (state.closing) {
        await state.server.close();
        if (!state.closed) {
          this.dispatchEvent(new ApplicationCloseEvent({}));
        }
        state.closed = true;
      }
    }
  }
  /** Add an event listener for an event.  Currently valid event types are
   * `"error"` and `"listen"`. */ addEventListener(type, listener, options) {
    super.addEventListener(type, listener, options);
  }
  /** A method that is compatible with the Cloudflare Worker
   * [Fetch Handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/fetch/)
   * and can be exported to handle Cloudflare Worker fetch requests.
   *
   * # Example
   *
   * ```ts
   * import { Application } from "@oak/oak";
   *
   * const app = new Application();
   * app.use((ctx) => {
   *   ctx.response.body = "hello world!";
   * });
   *
   * export default { fetch: app.fetch };
   * ```
   */ fetch = async (request, _env, _ctx)=>{
    if (!this.#middleware.length) {
      throw new TypeError("There is no middleware to process requests.");
    }
    if (!NativeRequestCtor) {
      const { NativeRequest } = await import("./http_server_native_request.ts");
      NativeRequestCtor = NativeRequest;
    }
    let remoteAddr;
    const hostname = request.headers.get("CF-Connecting-IP") ?? undefined;
    if (hostname) {
      remoteAddr = {
        hostname,
        port: 0,
        transport: "tcp"
      };
    }
    const contextRequest = new NativeRequestCtor(request, {
      remoteAddr
    });
    const context = new Context(this, contextRequest, this.#getContextState(), this.#contextOptions);
    try {
      await this.#getComposed()(context);
      const response = await context.response.toDomResponse();
      context.response.destroy(false);
      return response;
    } catch (err) {
      this.#handleError(context, err);
      throw err;
    }
  };
  /** Handle an individual server request, returning the server response.  This
   * is similar to `.listen()`, but opening the connection and retrieving
   * requests are not the responsibility of the application.  If the generated
   * context gets set to not to respond, then the method resolves with
   * `undefined`, otherwise it resolves with a request that is compatible with
   * `std/http/server`. */ handle = async (request, secureOrAddr, secure = false)=>{
    if (!this.#middleware.length) {
      throw new TypeError("There is no middleware to process requests.");
    }
    assert(isNetAddr(secureOrAddr) || typeof secureOrAddr === "undefined");
    if (!NativeRequestCtor) {
      const { NativeRequest } = await import("./http_server_native_request.ts");
      NativeRequestCtor = NativeRequest;
    }
    const contextRequest = new NativeRequestCtor(request, {
      remoteAddr: secureOrAddr
    });
    const context = new Context(this, contextRequest, this.#getContextState(), {
      secure,
      ...this.#contextOptions
    });
    try {
      await this.#getComposed()(context);
    } catch (err) {
      this.#handleError(context, err);
    }
    if (context.respond === false) {
      context.response.destroy();
      return;
    }
    try {
      const response = await context.response.toDomResponse();
      context.response.destroy(false);
      return response;
    } catch (err) {
      this.#handleError(context, err);
      throw err;
    }
  };
  async listen(options = {
    port: 0
  }) {
    if (!this.#middleware.length) {
      throw new TypeError("There is no middleware to process requests.");
    }
    for (const middleware of this.#middleware){
      if (isMiddlewareObject(middleware) && middleware.init) {
        await middleware.init();
      }
    }
    if (typeof options === "string") {
      const match = ADDR_REGEXP.exec(options);
      if (!match) {
        throw TypeError(`Invalid address passed: "${options}"`);
      }
      const [, hostname, portStr] = match;
      options = {
        hostname,
        port: parseInt(portStr, 10)
      };
    }
    options = Object.assign({
      port: 0
    }, options);
    if (!this.#serverConstructor) {
      if (!DefaultServerCtor) {
        const { Server } = await (isBun() ? import("./http_server_bun.ts") : isNode() ? import("./http_server_node.ts") : import("./http_server_native.ts"));
        DefaultServerCtor = Server;
      }
      this.#serverConstructor = DefaultServerCtor;
    }
    const server = new this.#serverConstructor(this, options);
    const state = {
      closed: false,
      closing: false,
      handling: new Set(),
      server
    };
    const { signal } = options;
    if (signal) {
      signal.addEventListener("abort", ()=>{
        if (!state.handling.size) {
          state.closed = true;
          this.dispatchEvent(new ApplicationCloseEvent({}));
        }
        state.closing = true;
      }, {
        once: true
      });
    }
    const { secure = false } = options;
    const serverType = this.#serverConstructor.type ?? "custom";
    const listener = await server.listen();
    const { hostname, port } = listener.addr;
    this.dispatchEvent(new ApplicationListenEvent({
      hostname,
      listener,
      port,
      secure,
      serverType
    }));
    try {
      for await (const request of server){
        this.#handleRequest(request, secure, state);
      }
      await Promise.all(state.handling);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Application Error";
      this.dispatchEvent(new ApplicationErrorEvent({
        message,
        error
      }));
    }
  }
  use(...middleware) {
    this.#middleware.push(...middleware);
    this.#composedMiddleware = undefined;
    // deno-lint-ignore no-explicit-any
    return this;
  }
  [_computedKey](inspect) {
    const { keys, proxy, state } = this;
    return `${this.constructor.name} ${inspect({
      "#middleware": this.#middleware,
      keys,
      proxy,
      state
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
    const { keys, proxy, state } = this;
    return `${options.stylize(this.constructor.name, "special")} ${inspect({
      "#middleware": this.#middleware,
      keys,
      proxy,
      state
    }, newOptions)}`;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvb2FrLzE2LjEuMC9hcHBsaWNhdGlvbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI0IHRoZSBvYWsgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbi8qKlxuICogQ29udGFpbnMgdGhlIGNvcmUgY29uY2VwdCBvZiBvYWssIHRoZSBtaWRkbGV3YXJlIGFwcGxpY2F0aW9uLiBUeXBpY2FsIHVzYWdlXG4gKiBpcyB0aGUgY3JlYXRpb24gb2YgYW4gYXBwbGljYXRpb24gaW5zdGFuY2UsIHJlZ2lzdHJhdGlvbiBvZiBtaWRkbGV3YXJlLCBhbmRcbiAqIHRoZW4gc3RhcnRpbmcgdG8gbGlzdGVuIGZvciByZXF1ZXN0cy5cbiAqXG4gKiAjIEV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgQXBwbGljYXRpb24gfSBmcm9tIFwianNyOkBvYWsvb2FrQDE0L2FwcGxpY2F0aW9uXCI7XG4gKlxuICogY29uc3QgYXBwID0gbmV3IEFwcGxpY2F0aW9uKCk7XG4gKiBhcHAudXNlKChjdHgpID0+IHtcbiAqICAgY3R4LnJlc3BvbnNlLmJvZHkgPSBcImhlbGxvIHdvcmxkIVwiO1xuICogfSk7XG4gKlxuICogYXBwLmxpc3Rlbih7IHBvcnQ6IDgwODAgfSk7XG4gKiBgYGBcbiAqXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgQ29udGV4dCB9IGZyb20gXCIuL2NvbnRleHQudHNcIjtcbmltcG9ydCB7IGFzc2VydCwgS2V5U3RhY2ssIHR5cGUgU3RhdHVzLCBTVEFUVVNfVEVYVCB9IGZyb20gXCIuL2RlcHMudHNcIjtcbmltcG9ydCB0eXBlIHsgTmF0aXZlUmVxdWVzdCB9IGZyb20gXCIuL2h0dHBfc2VydmVyX25hdGl2ZV9yZXF1ZXN0LnRzXCI7XG5pbXBvcnQge1xuICBjb21wb3NlLFxuICBpc01pZGRsZXdhcmVPYmplY3QsXG4gIHR5cGUgTWlkZGxld2FyZU9yTWlkZGxld2FyZU9iamVjdCxcbn0gZnJvbSBcIi4vbWlkZGxld2FyZS50c1wiO1xuaW1wb3J0IHsgY2xvbmVTdGF0ZSB9IGZyb20gXCIuL3V0aWxzL2Nsb25lX3N0YXRlLnRzXCI7XG5pbXBvcnQgeyBjcmVhdGVQcm9taXNlV2l0aFJlc29sdmVycyB9IGZyb20gXCIuL3V0aWxzL2NyZWF0ZV9wcm9taXNlX3dpdGhfcmVzb2x2ZXJzLnRzXCI7XG5pbXBvcnQgdHlwZSB7XG4gIEtleSxcbiAgTGlzdGVuZXIsXG4gIE5ldEFkZHIsXG4gIE9ha1NlcnZlcixcbiAgU2VydmVyQ29uc3RydWN0b3IsXG4gIFNlcnZlclJlcXVlc3QsXG59IGZyb20gXCIuL3R5cGVzLnRzXCI7XG5pbXBvcnQgeyBpc0J1biwgaXNOZXRBZGRyLCBpc05vZGUgfSBmcm9tIFwiLi91dGlscy90eXBlX2d1YXJkcy50c1wiO1xuXG4vKiogQmFzZSBpbnRlcmZhY2UgZm9yIGFwcGxpY2F0aW9uIGxpc3RlbmluZyBvcHRpb25zLiAqL1xuZXhwb3J0IGludGVyZmFjZSBMaXN0ZW5PcHRpb25zQmFzZSB7XG4gIC8qKiBUaGUgcG9ydCB0byBsaXN0ZW4gb24uIElmIG5vdCBzcGVjaWZpZWQsIGRlZmF1bHRzIHRvIGAwYCwgd2hpY2ggYWxsb3dzIHRoZVxuICAgKiBvcGVyYXRpbmcgc3lzdGVtIHRvIGRldGVybWluZSB0aGUgdmFsdWUuICovXG4gIHBvcnQ/OiBudW1iZXI7XG4gIC8qKiBBIGxpdGVyYWwgSVAgYWRkcmVzcyBvciBob3N0IG5hbWUgdGhhdCBjYW4gYmUgcmVzb2x2ZWQgdG8gYW4gSVAgYWRkcmVzcy5cbiAgICogSWYgbm90IHNwZWNpZmllZCwgZGVmYXVsdHMgdG8gYDAuMC4wLjBgLlxuICAgKlxuICAgKiBfX05vdGUgYWJvdXQgYDAuMC4wLjBgX18gV2hpbGUgbGlzdGVuaW5nIGAwLjAuMC4wYCB3b3JrcyBvbiBhbGwgcGxhdGZvcm1zLFxuICAgKiB0aGUgYnJvd3NlcnMgb24gV2luZG93cyBkb24ndCB3b3JrIHdpdGggdGhlIGFkZHJlc3MgYDAuMC4wLjBgLlxuICAgKiBZb3Ugc2hvdWxkIHNob3cgdGhlIG1lc3NhZ2UgbGlrZSBgc2VydmVyIHJ1bm5pbmcgb24gbG9jYWxob3N0OjgwODBgIGluc3RlYWQgb2ZcbiAgICogYHNlcnZlciBydW5uaW5nIG9uIDAuMC4wLjA6ODA4MGAgaWYgeW91ciBwcm9ncmFtIHN1cHBvcnRzIFdpbmRvd3MuICovXG4gIGhvc3RuYW1lPzogc3RyaW5nO1xuICBzZWN1cmU/OiBmYWxzZTtcbiAgLyoqIEFuIG9wdGlvbmFsIGFib3J0IHNpZ25hbCB3aGljaCBjYW4gYmUgdXNlZCB0byBjbG9zZSB0aGUgbGlzdGVuZXIuICovXG4gIHNpZ25hbD86IEFib3J0U2lnbmFsO1xufVxuXG5pbnRlcmZhY2UgVGxzQ2VydGlmaWVkS2V5UGVtIHtcbiAgLyoqIFRoZSBmb3JtYXQgb2YgdGhpcyBrZXkgbWF0ZXJpYWwsIHdoaWNoIG11c3QgYmUgUEVNLiAqL1xuICBrZXlGb3JtYXQ/OiBcInBlbVwiO1xuICAvKiogUHJpdmF0ZSBrZXkgaW4gYFBFTWAgZm9ybWF0LiBSU0EsIEVDLCBhbmQgUEtDUzgtZm9ybWF0IGtleXMgYXJlIHN1cHBvcnRlZC4gKi9cbiAga2V5OiBzdHJpbmc7XG4gIC8qKiBDZXJ0aWZpY2F0ZSBjaGFpbiBpbiBgUEVNYCBmb3JtYXQuICovXG4gIGNlcnQ6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFRsc0NlcnRpZmllZEtleUZyb21GaWxlIHtcbiAgLyoqIFBhdGggdG8gYSBmaWxlIGNvbnRhaW5pbmcgYSBQRU0gZm9ybWF0dGVkIENBIGNlcnRpZmljYXRlLiBSZXF1aXJlc1xuICAgKiBgLS1hbGxvdy1yZWFkYC5cbiAgICpcbiAgICogQHRhZ3MgYWxsb3ctcmVhZFxuICAgKiBAZGVwcmVjYXRlZCBUaGlzIHdpbGwgYmUgcmVtb3ZlZCBpbiBEZW5vIDIuMC4gU2VlIHRoZVxuICAgKiB7QGxpbmsgaHR0cHM6Ly9kb2NzLmRlbm8uY29tL3J1bnRpbWUvbWFudWFsL2FkdmFuY2VkL21pZ3JhdGVfZGVwcmVjYXRpb25zIHwgRGVubyAxLnggdG8gMi54IE1pZ3JhdGlvbiBHdWlkZX1cbiAgICogZm9yIG1pZ3JhdGlvbiBpbnN0cnVjdGlvbnMuXG4gICAqL1xuICBjZXJ0RmlsZTogc3RyaW5nO1xuICAvKiogUGF0aCB0byBhIGZpbGUgY29udGFpbmluZyBhIHByaXZhdGUga2V5IGZpbGUuIFJlcXVpcmVzIGAtLWFsbG93LXJlYWRgLlxuICAgKlxuICAgKiBAdGFncyBhbGxvdy1yZWFkXG4gICAqIEBkZXByZWNhdGVkIFRoaXMgd2lsbCBiZSByZW1vdmVkIGluIERlbm8gMi4wLiBTZWUgdGhlXG4gICAqIHtAbGluayBodHRwczovL2RvY3MuZGVuby5jb20vcnVudGltZS9tYW51YWwvYWR2YW5jZWQvbWlncmF0ZV9kZXByZWNhdGlvbnMgfCBEZW5vIDEueCB0byAyLnggTWlncmF0aW9uIEd1aWRlfVxuICAgKiBmb3IgbWlncmF0aW9uIGluc3RydWN0aW9ucy5cbiAgICovXG4gIGtleUZpbGU6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFRsc0NlcnRpZmllZEtleUNvbm5lY3RUbHMge1xuICAvKipcbiAgICogQ2VydGlmaWNhdGUgY2hhaW4gaW4gYFBFTWAgZm9ybWF0LlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBUaGlzIHdpbGwgYmUgcmVtb3ZlZCBpbiBEZW5vIDIuMC4gU2VlIHRoZVxuICAgKiB7QGxpbmsgaHR0cHM6Ly9kb2NzLmRlbm8uY29tL3J1bnRpbWUvbWFudWFsL2FkdmFuY2VkL21pZ3JhdGVfZGVwcmVjYXRpb25zIHwgRGVubyAxLnggdG8gMi54IE1pZ3JhdGlvbiBHdWlkZX1cbiAgICogZm9yIG1pZ3JhdGlvbiBpbnN0cnVjdGlvbnMuXG4gICAqL1xuICBjZXJ0Q2hhaW46IHN0cmluZztcbiAgLyoqXG4gICAqIFByaXZhdGUga2V5IGluIGBQRU1gIGZvcm1hdC4gUlNBLCBFQywgYW5kIFBLQ1M4LWZvcm1hdCBrZXlzIGFyZSBzdXBwb3J0ZWQuXG4gICAqXG4gICAqIEBkZXByZWNhdGVkIFRoaXMgd2lsbCBiZSByZW1vdmVkIGluIERlbm8gMi4wLiBTZWUgdGhlXG4gICAqIHtAbGluayBodHRwczovL2RvY3MuZGVuby5jb20vcnVudGltZS9tYW51YWwvYWR2YW5jZWQvbWlncmF0ZV9kZXByZWNhdGlvbnMgfCBEZW5vIDEueCB0byAyLnggTWlncmF0aW9uIEd1aWRlfVxuICAgKiBmb3IgbWlncmF0aW9uIGluc3RydWN0aW9ucy5cbiAgICovXG4gIHByaXZhdGVLZXk6IHN0cmluZztcbn1cblxudHlwZSBUbHNDZXJ0aWZpZWRLZXlPcHRpb25zID1cbiAgfCBUbHNDZXJ0aWZpZWRLZXlQZW1cbiAgfCBUbHNDZXJ0aWZpZWRLZXlGcm9tRmlsZVxuICB8IFRsc0NlcnRpZmllZEtleUNvbm5lY3RUbHM7XG5cbi8qKiBJbnRlcmZhY2Ugb3B0aW9ucyB3aGVuIGxpc3RlbmluZyBvbiBUTFMuICovXG5leHBvcnQgdHlwZSBMaXN0ZW5PcHRpb25zVGxzID0ge1xuICAvKiogVGhlIHBvcnQgdG8gbGlzdGVuIG9uLiAqL1xuICBwb3J0OiBudW1iZXI7XG4gIC8qKiBBIGxpdGVyYWwgSVAgYWRkcmVzcyBvciBob3N0IG5hbWUgdGhhdCBjYW4gYmUgcmVzb2x2ZWQgdG8gYW4gSVAgYWRkcmVzcy5cbiAgICpcbiAgICogX19Ob3RlIGFib3V0IGAwLjAuMC4wYF9fIFdoaWxlIGxpc3RlbmluZyBgMC4wLjAuMGAgd29ya3Mgb24gYWxsIHBsYXRmb3JtcyxcbiAgICogdGhlIGJyb3dzZXJzIG9uIFdpbmRvd3MgZG9uJ3Qgd29yayB3aXRoIHRoZSBhZGRyZXNzIGAwLjAuMC4wYC5cbiAgICogWW91IHNob3VsZCBzaG93IHRoZSBtZXNzYWdlIGxpa2UgYHNlcnZlciBydW5uaW5nIG9uIGxvY2FsaG9zdDo4MDgwYCBpbnN0ZWFkIG9mXG4gICAqIGBzZXJ2ZXIgcnVubmluZyBvbiAwLjAuMC4wOjgwODBgIGlmIHlvdXIgcHJvZ3JhbSBzdXBwb3J0cyBXaW5kb3dzLlxuICAgKlxuICAgKiBAZGVmYXVsdCB7XCIwLjAuMC4wXCJ9ICovXG4gIGhvc3RuYW1lPzogc3RyaW5nO1xuXG4gIHRyYW5zcG9ydD86IFwidGNwXCI7XG5cbiAgLyoqIEFwcGxpY2F0aW9uLUxheWVyIFByb3RvY29sIE5lZ290aWF0aW9uIChBTFBOKSBwcm90b2NvbHMgdG8gYW5ub3VuY2UgdG9cbiAgICogdGhlIGNsaWVudC4gSWYgbm90IHNwZWNpZmllZCwgbm8gQUxQTiBleHRlbnNpb24gd2lsbCBiZSBpbmNsdWRlZCBpbiB0aGVcbiAgICogVExTIGhhbmRzaGFrZS5cbiAgICovXG4gIGFscG5Qcm90b2NvbHM/OiBzdHJpbmdbXTtcbiAgc2VjdXJlOiB0cnVlO1xuICAvKiogQW4gb3B0aW9uYWwgYWJvcnQgc2lnbmFsIHdoaWNoIGNhbiBiZSB1c2VkIHRvIGNsb3NlIHRoZSBsaXN0ZW5lci4gKi9cbiAgc2lnbmFsPzogQWJvcnRTaWduYWw7XG59ICYgVGxzQ2VydGlmaWVkS2V5T3B0aW9ucztcblxuaW50ZXJmYWNlIEhhbmRsZU1ldGhvZCB7XG4gIC8qKiBIYW5kbGUgYW4gaW5kaXZpZHVhbCBzZXJ2ZXIgcmVxdWVzdCwgcmV0dXJuaW5nIHRoZSBzZXJ2ZXIgcmVzcG9uc2UuICBUaGlzXG4gICAqIGlzIHNpbWlsYXIgdG8gYC5saXN0ZW4oKWAsIGJ1dCBvcGVuaW5nIHRoZSBjb25uZWN0aW9uIGFuZCByZXRyaWV2aW5nXG4gICAqIHJlcXVlc3RzIGFyZSBub3QgdGhlIHJlc3BvbnNpYmlsaXR5IG9mIHRoZSBhcHBsaWNhdGlvbi4gIElmIHRoZSBnZW5lcmF0ZWRcbiAgICogY29udGV4dCBnZXRzIHNldCB0byBub3QgdG8gcmVzcG9uZCwgdGhlbiB0aGUgbWV0aG9kIHJlc29sdmVzIHdpdGhcbiAgICogYHVuZGVmaW5lZGAsIG90aGVyd2lzZSBpdCByZXNvbHZlcyB3aXRoIGEgRE9NIGBSZXNwb25zZWAgb2JqZWN0LiAqL1xuICAoXG4gICAgcmVxdWVzdDogUmVxdWVzdCxcbiAgICByZW1vdGVBZGRyPzogTmV0QWRkcixcbiAgICBzZWN1cmU/OiBib29sZWFuLFxuICApOiBQcm9taXNlPFJlc3BvbnNlIHwgdW5kZWZpbmVkPjtcbn1cblxuaW50ZXJmYWNlIENsb3VkZmxhcmVFeGVjdXRpb25Db250ZXh0IHtcbiAgd2FpdFVudGlsKHByb21pc2U6IFByb21pc2U8dW5rbm93bj4pOiB2b2lkO1xuICBwYXNzVGhyb3VnaE9uRXhjZXB0aW9uKCk6IHZvaWQ7XG59XG5cbmludGVyZmFjZSBDbG91ZGZsYXJlRmV0Y2hIYW5kbGVyPFxuICBFbnYgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0gUmVjb3JkPHN0cmluZywgc3RyaW5nPixcbj4ge1xuICAvKiogQSBtZXRob2QgdGhhdCBpcyBjb21wYXRpYmxlIHdpdGggdGhlIENsb3VkZmxhcmUgV29ya2VyXG4gICAqIFtGZXRjaCBIYW5kbGVyXShodHRwczovL2RldmVsb3BlcnMuY2xvdWRmbGFyZS5jb20vd29ya2Vycy9ydW50aW1lLWFwaXMvaGFuZGxlcnMvZmV0Y2gvKVxuICAgKiBhbmQgY2FuIGJlIGV4cG9ydGVkIHRvIGhhbmRsZSBDbG91ZGZsYXJlIFdvcmtlciBmZXRjaCByZXF1ZXN0cy5cbiAgICpcbiAgICogIyBFeGFtcGxlXG4gICAqXG4gICAqIGBgYHRzXG4gICAqIGltcG9ydCB7IEFwcGxpY2F0aW9uIH0gZnJvbSBcIkBvYWsvb2FrXCI7XG4gICAqXG4gICAqIGNvbnN0IGFwcCA9IG5ldyBBcHBsaWNhdGlvbigpO1xuICAgKiBhcHAudXNlKChjdHgpID0+IHtcbiAgICogICBjdHgucmVzcG9uc2UuYm9keSA9IFwiaGVsbG8gd29ybGQhXCI7XG4gICAqIH0pO1xuICAgKlxuICAgKiBleHBvcnQgZGVmYXVsdCB7IGZldGNoOiBhcHAuZmV0Y2ggfTtcbiAgICogYGBgXG4gICAqL1xuICAoXG4gICAgcmVxdWVzdDogUmVxdWVzdCxcbiAgICBlbnY6IEVudixcbiAgICBjdHg6IENsb3VkZmxhcmVFeGVjdXRpb25Db250ZXh0LFxuICApOiBQcm9taXNlPFJlc3BvbnNlPjtcbn1cblxuLyoqIE9wdGlvbnMgd2hpY2ggY2FuIGJlIHNwZWNpZmllZCB3aGVuIGxpc3RlbmluZy4gKi9cbmV4cG9ydCB0eXBlIExpc3Rlbk9wdGlvbnMgPSBMaXN0ZW5PcHRpb25zVGxzIHwgTGlzdGVuT3B0aW9uc0Jhc2U7XG5cbmludGVyZmFjZSBBcHBsaWNhdGlvbkNsb3NlRXZlbnRMaXN0ZW5lciB7XG4gIChldnQ6IEFwcGxpY2F0aW9uQ2xvc2VFdmVudCk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+O1xufVxuXG5pbnRlcmZhY2UgQXBwbGljYXRpb25DbG9zZUV2ZW50TGlzdGVuZXJPYmplY3Qge1xuICBoYW5kbGVFdmVudChldnQ6IEFwcGxpY2F0aW9uQ2xvc2VFdmVudCk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+O1xufVxuXG50eXBlIEFwcGxpY2F0aW9uQ2xvc2VFdmVudExpc3RlbmVyT3JFdmVudExpc3RlbmVyT2JqZWN0ID1cbiAgfCBBcHBsaWNhdGlvbkNsb3NlRXZlbnRMaXN0ZW5lclxuICB8IEFwcGxpY2F0aW9uQ2xvc2VFdmVudExpc3RlbmVyT2JqZWN0O1xuXG5pbnRlcmZhY2UgQXBwbGljYXRpb25FcnJvckV2ZW50TGlzdGVuZXI8UyBleHRlbmRzIEFTLCBBUyBleHRlbmRzIFN0YXRlPiB7XG4gIChldnQ6IEFwcGxpY2F0aW9uRXJyb3JFdmVudDxTLCBBUz4pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPjtcbn1cblxuaW50ZXJmYWNlIEFwcGxpY2F0aW9uRXJyb3JFdmVudExpc3RlbmVyT2JqZWN0PFMgZXh0ZW5kcyBBUywgQVMgZXh0ZW5kcyBTdGF0ZT4ge1xuICBoYW5kbGVFdmVudChldnQ6IEFwcGxpY2F0aW9uRXJyb3JFdmVudDxTLCBBUz4pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPjtcbn1cblxuaW50ZXJmYWNlIEFwcGxpY2F0aW9uRXJyb3JFdmVudEluaXQ8UyBleHRlbmRzIEFTLCBBUyBleHRlbmRzIFN0YXRlPlxuICBleHRlbmRzIEVycm9yRXZlbnRJbml0IHtcbiAgY29udGV4dD86IENvbnRleHQ8UywgQVM+O1xufVxuXG50eXBlIEFwcGxpY2F0aW9uRXJyb3JFdmVudExpc3RlbmVyT3JFdmVudExpc3RlbmVyT2JqZWN0PFxuICBTIGV4dGVuZHMgQVMsXG4gIEFTIGV4dGVuZHMgU3RhdGUsXG4+ID1cbiAgfCBBcHBsaWNhdGlvbkVycm9yRXZlbnRMaXN0ZW5lcjxTLCBBUz5cbiAgfCBBcHBsaWNhdGlvbkVycm9yRXZlbnRMaXN0ZW5lck9iamVjdDxTLCBBUz47XG5cbmludGVyZmFjZSBBcHBsaWNhdGlvbkxpc3RlbkV2ZW50TGlzdGVuZXIge1xuICAoZXZ0OiBBcHBsaWNhdGlvbkxpc3RlbkV2ZW50KTogdm9pZCB8IFByb21pc2U8dm9pZD47XG59XG5cbmludGVyZmFjZSBBcHBsaWNhdGlvbkxpc3RlbkV2ZW50TGlzdGVuZXJPYmplY3Qge1xuICBoYW5kbGVFdmVudChldnQ6IEFwcGxpY2F0aW9uTGlzdGVuRXZlbnQpOiB2b2lkIHwgUHJvbWlzZTx2b2lkPjtcbn1cblxuaW50ZXJmYWNlIEFwcGxpY2F0aW9uTGlzdGVuRXZlbnRJbml0IGV4dGVuZHMgRXZlbnRJbml0IHtcbiAgaG9zdG5hbWU6IHN0cmluZztcbiAgbGlzdGVuZXI6IExpc3RlbmVyO1xuICBwb3J0OiBudW1iZXI7XG4gIHNlY3VyZTogYm9vbGVhbjtcbiAgc2VydmVyVHlwZTogXCJuYXRpdmVcIiB8IFwibm9kZVwiIHwgXCJidW5cIiB8IFwiY3VzdG9tXCI7XG59XG5cbnR5cGUgQXBwbGljYXRpb25MaXN0ZW5FdmVudExpc3RlbmVyT3JFdmVudExpc3RlbmVyT2JqZWN0ID1cbiAgfCBBcHBsaWNhdGlvbkxpc3RlbkV2ZW50TGlzdGVuZXJcbiAgfCBBcHBsaWNhdGlvbkxpc3RlbkV2ZW50TGlzdGVuZXJPYmplY3Q7XG5cbi8qKiBBdmFpbGFibGUgb3B0aW9ucyB0aGF0IGFyZSB1c2VkIHdoZW4gY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2Ugb2ZcbiAqIHtAbGlua2NvZGUgQXBwbGljYXRpb259LiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcHBsaWNhdGlvbk9wdGlvbnM8UyBleHRlbmRzIFN0YXRlLCBSIGV4dGVuZHMgU2VydmVyUmVxdWVzdD4ge1xuICAvKiogRGV0ZXJtaW5lIGhvdyB3aGVuIGNyZWF0aW5nIGEgbmV3IGNvbnRleHQsIHRoZSBzdGF0ZSBmcm9tIHRoZSBhcHBsaWNhdGlvblxuICAgKiBzaG91bGQgYmUgYXBwbGllZC4gQSB2YWx1ZSBvZiBgXCJjbG9uZVwiYCB3aWxsIHNldCB0aGUgc3RhdGUgYXMgYSBjbG9uZSBvZlxuICAgKiB0aGUgYXBwIHN0YXRlLiBBbnkgbm9uLWNsb25lYWJsZSBvciBub24tZW51bWVyYWJsZSBwcm9wZXJ0aWVzIHdpbGwgbm90IGJlXG4gICAqIGNvcGllZC4gQSB2YWx1ZSBvZiBgXCJwcm90b3R5cGVcImAgbWVhbnMgdGhhdCB0aGUgYXBwbGljYXRpb24ncyBzdGF0ZSB3aWxsIGJlXG4gICAqIHVzZWQgYXMgdGhlIHByb3RvdHlwZSBvZiB0aGUgdGhlIGNvbnRleHQncyBzdGF0ZSwgbWVhbmluZyBzaGFsbG93XG4gICAqIHByb3BlcnRpZXMgb24gdGhlIGNvbnRleHQncyBzdGF0ZSB3aWxsIG5vdCBiZSByZWZsZWN0ZWQgaW4gdGhlXG4gICAqIGFwcGxpY2F0aW9uJ3Mgc3RhdGUuIEEgdmFsdWUgb2YgYFwiYWxpYXNcImAgbWVhbnMgdGhhdCBhcHBsaWNhdGlvbidzIGAuc3RhdGVgXG4gICAqIGFuZCB0aGUgY29udGV4dCdzIGAuc3RhdGVgIHdpbGwgYmUgYSByZWZlcmVuY2UgdG8gdGhlIHNhbWUgb2JqZWN0LiBBIHZhbHVlXG4gICAqIG9mIGBcImVtcHR5XCJgIHdpbGwgaW5pdGlhbGl6ZSB0aGUgY29udGV4dCdzIGAuc3RhdGVgIHdpdGggYW4gZW1wdHkgb2JqZWN0LlxuICAgKlxuICAgKiBUaGUgZGVmYXVsdCB2YWx1ZSBpcyBgXCJjbG9uZVwiYC5cbiAgICovXG4gIGNvbnRleHRTdGF0ZT86IFwiY2xvbmVcIiB8IFwicHJvdG90eXBlXCIgfCBcImFsaWFzXCIgfCBcImVtcHR5XCI7XG5cbiAgLyoqIEFuIG9wdGlvbmFsIHJlcGxhY2VyIGZ1bmN0aW9uIHRvIGJlIHVzZWQgd2hlbiBzZXJpYWxpemluZyBhIEpTT05cbiAgICogcmVzcG9uc2UuIFRoZSByZXBsYWNlciB3aWxsIGJlIHVzZWQgd2l0aCBgSlNPTi5zdHJpbmdpZnkoKWAgdG8gZW5jb2RlIGFueVxuICAgKiByZXNwb25zZSBib2RpZXMgdGhhdCBuZWVkIHRvIGJlIGNvbnZlcnRlZCBiZWZvcmUgc2VuZGluZyB0aGUgcmVzcG9uc2UuXG4gICAqXG4gICAqIFRoaXMgaXMgaW50ZW5kZWQgdG8gYWxsb3cgcmVzcG9uc2VzIHRvIGNvbnRhaW4gYmlnaW50cyBhbmQgY2lyY3VsYXJcbiAgICogcmVmZXJlbmNlcyBhbmQgZW5jb2Rpbmcgb3RoZXIgdmFsdWVzIHdoaWNoIEpTT04gZG9lcyBub3Qgc3VwcG9ydCBkaXJlY3RseS5cbiAgICpcbiAgICogVGhpcyBjYW4gYmUgdXNlZCBpbiBjb25qdW5jdGlvbiB3aXRoIGBqc29uQm9keVJldml2ZXJgIHRvIGhhbmRsZSBkZWNvZGluZ1xuICAgKiBvZiByZXF1ZXN0IGJvZGllcyBpZiB0aGUgc2FtZSBzZW1hbnRpY3MgYXJlIHVzZWQgZm9yIGNsaWVudCByZXF1ZXN0cy5cbiAgICpcbiAgICogSWYgbW9yZSBkZXRhaWxlZCBvciBjb25kaXRpb25hbCB1c2FnZSBpcyByZXF1aXJlZCwgdGhlbiBzZXJpYWxpemF0aW9uXG4gICAqIHNob3VsZCBiZSBpbXBsZW1lbnRlZCBkaXJlY3RseSBpbiBtaWRkbGV3YXJlLiAqL1xuICBqc29uQm9keVJlcGxhY2VyPzogKFxuICAgIGtleTogc3RyaW5nLFxuICAgIHZhbHVlOiB1bmtub3duLFxuICAgIGNvbnRleHQ6IENvbnRleHQ8Uz4sXG4gICkgPT4gdW5rbm93bjtcblxuICAvKiogQW4gb3B0aW9uYWwgcmV2aXZlciBmdW5jdGlvbiB0byBiZSB1c2VkIHdoZW4gcGFyc2luZyBhIEpTT04gcmVxdWVzdC4gVGhlXG4gICAqIHJldml2ZXIgd2lsbCBiZSB1c2VkIHdpdGggYEpTT04ucGFyc2UoKWAgdG8gZGVjb2RlIGFueSByZXNwb25zZSBib2RpZXMgdGhhdFxuICAgKiBhcmUgYmVpbmcgY29udmVydGVkIGFzIEpTT04uXG4gICAqXG4gICAqIFRoaXMgaXMgaW50ZW5kZWQgdG8gYWxsb3cgcmVxdWVzdHMgdG8gZGVzZXJpYWxpemUgdG8gYmlnaW50cywgY2lyY3VsYXJcbiAgICogcmVmZXJlbmNlcywgb3Igb3RoZXIgdmFsdWVzIHdoaWNoIEpTT04gZG9lcyBub3Qgc3VwcG9ydCBkaXJlY3RseS5cbiAgICpcbiAgICogVGhpcyBjYW4gYmUgdXNlZCBpbiBjb25qdW5jdGlvbiB3aXRoIGBqc29uQm9keVJlcGxhY2VyYCB0byBoYW5kbGUgZGVjb2RpbmdcbiAgICogb2YgcmVzcG9uc2UgYm9kaWVzIGlmIHRoZSBzYW1lIHNlbWFudGljcyBhcmUgdXNlZCBmb3IgcmVzcG9uc2VzLlxuICAgKlxuICAgKiBJZiBtb3JlIGRldGFpbGVkIG9yIGNvbmRpdGlvbmFsIHVzYWdlIGlzIHJlcXVpcmVkLCB0aGVuIGRlc2VyaWFsaXphdGlvblxuICAgKiBzaG91bGQgYmUgaW1wbGVtZW50ZWQgZGlyZWN0bHkgaW4gdGhlIG1pZGRsZXdhcmUuXG4gICAqL1xuICBqc29uQm9keVJldml2ZXI/OiAoXG4gICAga2V5OiBzdHJpbmcsXG4gICAgdmFsdWU6IHVua25vd24sXG4gICAgY29udGV4dDogQ29udGV4dDxTPixcbiAgKSA9PiB1bmtub3duO1xuXG4gIC8qKiBBbiBpbml0aWFsIHNldCBvZiBrZXlzIChvciBpbnN0YW5jZSBvZiB7QGxpbmtjb2RlIEtleVN0YWNrfSkgdG8gYmUgdXNlZCBmb3Igc2lnbmluZ1xuICAgKiBjb29raWVzIHByb2R1Y2VkIGJ5IHRoZSBhcHBsaWNhdGlvbi4gKi9cbiAga2V5cz86IEtleVN0YWNrIHwgS2V5W107XG5cbiAgLyoqIElmIGB0cnVlYCwgYW55IGVycm9ycyBoYW5kbGVkIGJ5IHRoZSBhcHBsaWNhdGlvbiB3aWxsIGJlIGxvZ2dlZCB0byB0aGVcbiAgICogc3RkZXJyLiBJZiBgZmFsc2VgIG5vdGhpbmcgd2lsbCBiZSBsb2dnZWQuIFRoZSBkZWZhdWx0IGlzIGB0cnVlYC5cbiAgICpcbiAgICogQWxsIGVycm9ycyBhcmUgYXZhaWxhYmxlIGFzIGV2ZW50cyBvbiB0aGUgYXBwbGljYXRpb24gb2YgdHlwZSBgXCJlcnJvclwiYCBhbmRcbiAgICogY2FuIGJlIGFjY2Vzc2VkIGZvciBjdXN0b20gbG9nZ2luZy9hcHBsaWNhdGlvbiBtYW5hZ2VtZW50IHZpYSBhZGRpbmcgYW5cbiAgICogZXZlbnQgbGlzdGVuZXIgdG8gdGhlIGFwcGxpY2F0aW9uOlxuICAgKlxuICAgKiBgYGB0c1xuICAgKiBjb25zdCBhcHAgPSBuZXcgQXBwbGljYXRpb24oeyBsb2dFcnJvcnM6IGZhbHNlIH0pO1xuICAgKiBhcHAuYWRkRXZlbnRMaXN0ZW5lcihcImVycm9yXCIsIChldnQpID0+IHtcbiAgICogICAvLyBldnQuZXJyb3Igd2lsbCBjb250YWluIHdoYXQgZXJyb3Igd2FzIHRocm93blxuICAgKiB9KTtcbiAgICogYGBgXG4gICAqL1xuICBsb2dFcnJvcnM/OiBib29sZWFuO1xuXG4gIC8qKiBJZiBzZXQgdG8gYHRydWVgLCBwcm94eSBoZWFkZXJzIHdpbGwgYmUgdHJ1c3RlZCB3aGVuIHByb2Nlc3NpbmcgcmVxdWVzdHMuXG4gICAqIFRoaXMgZGVmYXVsdHMgdG8gYGZhbHNlYC4gKi9cbiAgcHJveHk/OiBib29sZWFuO1xuXG4gIC8qKiBBIHNlcnZlciBjb25zdHJ1Y3RvciB0byB1c2UgaW5zdGVhZCBvZiB0aGUgZGVmYXVsdCBzZXJ2ZXIgZm9yIHJlY2VpdmluZ1xuICAgKiByZXF1ZXN0cy5cbiAgICpcbiAgICogR2VuZXJhbGx5IHRoaXMgaXMgb25seSB1c2VkIGZvciB0ZXN0aW5nLiAqL1xuICBzZXJ2ZXJDb25zdHJ1Y3Rvcj86IFNlcnZlckNvbnN0cnVjdG9yPFI+O1xuXG4gIC8qKiBUaGUgaW5pdGlhbCBzdGF0ZSBvYmplY3QgZm9yIHRoZSBhcHBsaWNhdGlvbiwgb2Ygd2hpY2ggdGhlIHR5cGUgY2FuIGJlXG4gICAqIHVzZWQgdG8gaW5mZXIgdGhlIHR5cGUgb2YgdGhlIHN0YXRlIGZvciBib3RoIHRoZSBhcHBsaWNhdGlvbiBhbmQgYW55IG9mIHRoZVxuICAgKiBhcHBsaWNhdGlvbidzIGNvbnRleHQuICovXG4gIHN0YXRlPzogUztcbn1cblxuaW50ZXJmYWNlIFJlcXVlc3RTdGF0ZSB7XG4gIGhhbmRsaW5nOiBTZXQ8UHJvbWlzZTx2b2lkPj47XG4gIGNsb3Npbmc6IGJvb2xlYW47XG4gIGNsb3NlZDogYm9vbGVhbjtcbiAgc2VydmVyOiBPYWtTZXJ2ZXI8U2VydmVyUmVxdWVzdD47XG59XG5cbi8qKiBUaGUgYmFzZSB0eXBlIG9mIHN0YXRlIHdoaWNoIGlzIGFzc29jaWF0ZWQgd2l0aCBhbiBhcHBsaWNhdGlvbiBvclxuICogY29udGV4dC4gKi9cbi8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG5leHBvcnQgdHlwZSBTdGF0ZSA9IFJlY29yZDxzdHJpbmcgfCBudW1iZXIgfCBzeW1ib2wsIGFueT47XG5cbmNvbnN0IEFERFJfUkVHRVhQID0gL15cXFs/KFteXFxdXSopXFxdPzooWzAtOV17MSw1fSkkLztcblxubGV0IERlZmF1bHRTZXJ2ZXJDdG9yOiBTZXJ2ZXJDb25zdHJ1Y3RvcjxTZXJ2ZXJSZXF1ZXN0PiB8IHVuZGVmaW5lZDtcbmxldCBOYXRpdmVSZXF1ZXN0Q3RvcjogdHlwZW9mIE5hdGl2ZVJlcXVlc3QgfCB1bmRlZmluZWQ7XG5cbi8qKiBBbiBldmVudCB0aGF0IG9jY3VycyB3aGVuIHRoZSBhcHBsaWNhdGlvbiBjbG9zZXMuICovXG5leHBvcnQgY2xhc3MgQXBwbGljYXRpb25DbG9zZUV2ZW50IGV4dGVuZHMgRXZlbnQge1xuICBjb25zdHJ1Y3RvcihldmVudEluaXREaWN0OiBFdmVudEluaXQpIHtcbiAgICBzdXBlcihcImNsb3NlXCIsIGV2ZW50SW5pdERpY3QpO1xuICB9XG59XG5cbi8qKiBBbiBldmVudCB0aGF0IG9jY3VycyB3aGVuIGFuIGFwcGxpY2F0aW9uIGVycm9yIG9jY3Vycy5cbiAqXG4gKiBXaGVuIHRoZSBlcnJvciBvY2N1cnMgcmVsYXRlZCB0byB0aGUgaGFuZGxpbmcgb2YgYSByZXF1ZXN0LCB0aGUgYC5jb250ZXh0YFxuICogcHJvcGVydHkgd2lsbCBiZSBwb3B1bGF0ZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBBcHBsaWNhdGlvbkVycm9yRXZlbnQ8UyBleHRlbmRzIEFTLCBBUyBleHRlbmRzIFN0YXRlPlxuICBleHRlbmRzIEVycm9yRXZlbnQge1xuICBjb250ZXh0PzogQ29udGV4dDxTLCBBUz47XG5cbiAgY29uc3RydWN0b3IoZXZlbnRJbml0RGljdDogQXBwbGljYXRpb25FcnJvckV2ZW50SW5pdDxTLCBBUz4pIHtcbiAgICBzdXBlcihcImVycm9yXCIsIGV2ZW50SW5pdERpY3QpO1xuICAgIHRoaXMuY29udGV4dCA9IGV2ZW50SW5pdERpY3QuY29udGV4dDtcbiAgfVxufVxuXG5mdW5jdGlvbiBsb2dFcnJvckxpc3RlbmVyPFMgZXh0ZW5kcyBBUywgQVMgZXh0ZW5kcyBTdGF0ZT4oXG4gIHsgZXJyb3IsIGNvbnRleHQgfTogQXBwbGljYXRpb25FcnJvckV2ZW50PFMsIEFTPixcbikge1xuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICBgW3VuY2F1Z2h0IGFwcGxpY2F0aW9uIGVycm9yXTogJHtlcnJvci5uYW1lfSAtICR7ZXJyb3IubWVzc2FnZX1gLFxuICAgICk7XG4gIH0gZWxzZSB7XG4gICAgY29uc29sZS5lcnJvcihgW3VuY2F1Z2h0IGFwcGxpY2F0aW9uIGVycm9yXVxcbmAsIGVycm9yKTtcbiAgfVxuICBpZiAoY29udGV4dCkge1xuICAgIGxldCB1cmw6IHN0cmluZztcbiAgICB0cnkge1xuICAgICAgdXJsID0gY29udGV4dC5yZXF1ZXN0LnVybC50b1N0cmluZygpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgdXJsID0gXCJbbWFsZm9ybWVkIHVybF1cIjtcbiAgICB9XG4gICAgY29uc29sZS5lcnJvcihgXFxucmVxdWVzdDpgLCB7XG4gICAgICB1cmwsXG4gICAgICBtZXRob2Q6IGNvbnRleHQucmVxdWVzdC5tZXRob2QsXG4gICAgICBoYXNCb2R5OiBjb250ZXh0LnJlcXVlc3QuaGFzQm9keSxcbiAgICB9KTtcbiAgICBjb25zb2xlLmVycm9yKGByZXNwb25zZTpgLCB7XG4gICAgICBzdGF0dXM6IGNvbnRleHQucmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgdHlwZTogY29udGV4dC5yZXNwb25zZS50eXBlLFxuICAgICAgaGFzQm9keTogISFjb250ZXh0LnJlc3BvbnNlLmJvZHksXG4gICAgICB3cml0YWJsZTogY29udGV4dC5yZXNwb25zZS53cml0YWJsZSxcbiAgICB9KTtcbiAgfVxuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciAmJiBlcnJvci5zdGFjaykge1xuICAgIGNvbnNvbGUuZXJyb3IoYFxcbiR7ZXJyb3Iuc3RhY2suc3BsaXQoXCJcXG5cIikuc2xpY2UoMSkuam9pbihcIlxcblwiKX1gKTtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRoYXQgb2NjdXJzIHdoZW4gdGhlIGFwcGxpY2F0aW9uIHN0YXJ0cyBsaXN0ZW5pbmcgZm9yIHJlcXVlc3RzLlxuICovXG5leHBvcnQgY2xhc3MgQXBwbGljYXRpb25MaXN0ZW5FdmVudCBleHRlbmRzIEV2ZW50IHtcbiAgaG9zdG5hbWU6IHN0cmluZztcbiAgbGlzdGVuZXI6IExpc3RlbmVyO1xuICBwb3J0OiBudW1iZXI7XG4gIHNlY3VyZTogYm9vbGVhbjtcbiAgc2VydmVyVHlwZTogXCJuYXRpdmVcIiB8IFwibm9kZVwiIHwgXCJidW5cIiB8IFwiY3VzdG9tXCI7XG5cbiAgY29uc3RydWN0b3IoZXZlbnRJbml0RGljdDogQXBwbGljYXRpb25MaXN0ZW5FdmVudEluaXQpIHtcbiAgICBzdXBlcihcImxpc3RlblwiLCBldmVudEluaXREaWN0KTtcbiAgICB0aGlzLmhvc3RuYW1lID0gZXZlbnRJbml0RGljdC5ob3N0bmFtZTtcbiAgICB0aGlzLmxpc3RlbmVyID0gZXZlbnRJbml0RGljdC5saXN0ZW5lcjtcbiAgICB0aGlzLnBvcnQgPSBldmVudEluaXREaWN0LnBvcnQ7XG4gICAgdGhpcy5zZWN1cmUgPSBldmVudEluaXREaWN0LnNlY3VyZTtcbiAgICB0aGlzLnNlcnZlclR5cGUgPSBldmVudEluaXREaWN0LnNlcnZlclR5cGU7XG4gIH1cbn1cblxuLyoqIEEgY2xhc3Mgd2hpY2ggcmVnaXN0ZXJzIG1pZGRsZXdhcmUgKHZpYSBgLnVzZSgpYCkgYW5kIHRoZW4gcHJvY2Vzc2VzXG4gKiBpbmJvdW5kIHJlcXVlc3RzIGFnYWluc3QgdGhhdCBtaWRkbGV3YXJlICh2aWEgYC5saXN0ZW4oKWApLlxuICpcbiAqIFRoZSBgY29udGV4dC5zdGF0ZWAgY2FuIGJlIHR5cGVkIHZpYSBwYXNzaW5nIGEgZ2VuZXJpYyBhcmd1bWVudCB3aGVuXG4gKiBjb25zdHJ1Y3RpbmcgYW4gaW5zdGFuY2Ugb2YgYEFwcGxpY2F0aW9uYC4gSXQgY2FuIGFsc28gYmUgaW5mZXJyZWQgYnkgc2V0dGluZ1xuICogdGhlIHtAbGlua2NvZGUgQXBwbGljYXRpb25PcHRpb25zLnN0YXRlfSBvcHRpb24gd2hlbiBjb25zdHJ1Y3RpbmcgdGhlXG4gKiBhcHBsaWNhdGlvbi5cbiAqXG4gKiAjIyMgQmFzaWMgZXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBBcHBsaWNhdGlvbiB9IGZyb20gXCJqc3I6QG9hay9vYWsvYXBwbGljYXRpb25cIjtcbiAqXG4gKiBjb25zdCBhcHAgPSBuZXcgQXBwbGljYXRpb24oKTtcbiAqXG4gKiBhcHAudXNlKChjdHgsIG5leHQpID0+IHtcbiAqICAgLy8gY2FsbGVkIG9uIGVhY2ggcmVxdWVzdCB3aXRoIHRoZSBjb250ZXh0IChgY3R4YCkgb2YgdGhlIHJlcXVlc3QsXG4gKiAgIC8vIHJlc3BvbnNlLCBhbmQgb3RoZXIgZGF0YS5cbiAqICAgLy8gYG5leHQoKWAgaXMgdXNlIHRvIG1vZGlmeSB0aGUgZmxvdyBjb250cm9sIG9mIHRoZSBtaWRkbGV3YXJlIHN0YWNrLlxuICogfSk7XG4gKlxuICogYXBwLmxpc3Rlbih7IHBvcnQ6IDgwODAgfSk7XG4gKiBgYGBcbiAqXG4gKiBAdGVtcGxhdGUgQVMgdGhlIHR5cGUgb2YgdGhlIGFwcGxpY2F0aW9uIHN0YXRlIHdoaWNoIGV4dGVuZHNcbiAqICAgICAgICAgICAgICB7QGxpbmtjb2RlIFN0YXRlfSBhbmQgZGVmYXVsdHMgdG8gYSBzaW1wbGUgc3RyaW5nIHJlY29yZC5cbiAqL1xuLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbmV4cG9ydCBjbGFzcyBBcHBsaWNhdGlvbjxBUyBleHRlbmRzIFN0YXRlID0gUmVjb3JkPHN0cmluZywgYW55Pj5cbiAgZXh0ZW5kcyBFdmVudFRhcmdldCB7XG4gICNjb21wb3NlZE1pZGRsZXdhcmU/OiAoY29udGV4dDogQ29udGV4dDxBUywgQVM+KSA9PiBQcm9taXNlPHVua25vd24+O1xuICAjY29udGV4dE9wdGlvbnM6IFBpY2s8XG4gICAgQXBwbGljYXRpb25PcHRpb25zPEFTLCBTZXJ2ZXJSZXF1ZXN0PixcbiAgICBcImpzb25Cb2R5UmVwbGFjZXJcIiB8IFwianNvbkJvZHlSZXZpdmVyXCJcbiAgPjtcbiAgI2NvbnRleHRTdGF0ZTogXCJjbG9uZVwiIHwgXCJwcm90b3R5cGVcIiB8IFwiYWxpYXNcIiB8IFwiZW1wdHlcIjtcbiAgI2tleXM/OiBLZXlTdGFjaztcbiAgI21pZGRsZXdhcmU6IE1pZGRsZXdhcmVPck1pZGRsZXdhcmVPYmplY3Q8U3RhdGUsIENvbnRleHQ8U3RhdGUsIEFTPj5bXSA9IFtdO1xuICAjc2VydmVyQ29uc3RydWN0b3I6IFNlcnZlckNvbnN0cnVjdG9yPFNlcnZlclJlcXVlc3Q+IHwgdW5kZWZpbmVkO1xuXG4gIC8qKiBBIHNldCBvZiBrZXlzLCBvciBhbiBpbnN0YW5jZSBvZiBgS2V5U3RhY2tgIHdoaWNoIHdpbGwgYmUgdXNlZCB0byBzaWduXG4gICAqIGNvb2tpZXMgcmVhZCBhbmQgc2V0IGJ5IHRoZSBhcHBsaWNhdGlvbiB0byBhdm9pZCB0YW1wZXJpbmcgd2l0aCB0aGVcbiAgICogY29va2llcy4gKi9cbiAgZ2V0IGtleXMoKTogS2V5U3RhY2sgfCBLZXlbXSB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuI2tleXM7XG4gIH1cblxuICBzZXQga2V5cyhrZXlzOiBLZXlTdGFjayB8IEtleVtdIHwgdW5kZWZpbmVkKSB7XG4gICAgaWYgKCFrZXlzKSB7XG4gICAgICB0aGlzLiNrZXlzID0gdW5kZWZpbmVkO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShrZXlzKSkge1xuICAgICAgdGhpcy4ja2V5cyA9IG5ldyBLZXlTdGFjayhrZXlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4ja2V5cyA9IGtleXM7XG4gICAgfVxuICB9XG5cbiAgLyoqIElmIGB0cnVlYCwgcHJveHkgaGVhZGVycyB3aWxsIGJlIHRydXN0ZWQgd2hlbiBwcm9jZXNzaW5nIHJlcXVlc3RzLiAgVGhpc1xuICAgKiBkZWZhdWx0cyB0byBgZmFsc2VgLiAqL1xuICBwcm94eTogYm9vbGVhbjtcblxuICAvKiogR2VuZXJpYyBzdGF0ZSBvZiB0aGUgYXBwbGljYXRpb24sIHdoaWNoIGNhbiBiZSBzcGVjaWZpZWQgYnkgcGFzc2luZyB0aGVcbiAgICogZ2VuZXJpYyBhcmd1bWVudCB3aGVuIGNvbnN0cnVjdGluZzpcbiAgICpcbiAgICogICAgICAgY29uc3QgYXBwID0gbmV3IEFwcGxpY2F0aW9uPHsgZm9vOiBzdHJpbmcgfT4oKTtcbiAgICpcbiAgICogT3IgY2FuIGJlIGNvbnRleHR1YWxseSBpbmZlcnJlZCBiYXNlZCBvbiBzZXR0aW5nIGFuIGluaXRpYWwgc3RhdGUgb2JqZWN0OlxuICAgKlxuICAgKiAgICAgICBjb25zdCBhcHAgPSBuZXcgQXBwbGljYXRpb24oeyBzdGF0ZTogeyBmb286IFwiYmFyXCIgfSB9KTtcbiAgICpcbiAgICogV2hlbiBhIG5ldyBjb250ZXh0IGlzIGNyZWF0ZWQsIHRoZSBhcHBsaWNhdGlvbidzIHN0YXRlIGlzIGNsb25lZCBhbmQgdGhlXG4gICAqIHN0YXRlIGlzIHVuaXF1ZSB0byB0aGF0IHJlcXVlc3QvcmVzcG9uc2UuICBDaGFuZ2VzIGNhbiBiZSBtYWRlIHRvIHRoZVxuICAgKiBhcHBsaWNhdGlvbiBzdGF0ZSB0aGF0IHdpbGwgYmUgc2hhcmVkIHdpdGggYWxsIGNvbnRleHRzLlxuICAgKi9cbiAgc3RhdGU6IEFTO1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9uczxBUywgU2VydmVyUmVxdWVzdD4gPSB7fSkge1xuICAgIHN1cGVyKCk7XG4gICAgY29uc3Qge1xuICAgICAgc3RhdGUsXG4gICAgICBrZXlzLFxuICAgICAgcHJveHksXG4gICAgICBzZXJ2ZXJDb25zdHJ1Y3RvcixcbiAgICAgIGNvbnRleHRTdGF0ZSA9IFwiY2xvbmVcIixcbiAgICAgIGxvZ0Vycm9ycyA9IHRydWUsXG4gICAgICAuLi5jb250ZXh0T3B0aW9uc1xuICAgIH0gPSBvcHRpb25zO1xuXG4gICAgdGhpcy5wcm94eSA9IHByb3h5ID8/IGZhbHNlO1xuICAgIHRoaXMua2V5cyA9IGtleXM7XG4gICAgdGhpcy5zdGF0ZSA9IHN0YXRlID8/IHt9IGFzIEFTO1xuICAgIHRoaXMuI3NlcnZlckNvbnN0cnVjdG9yID0gc2VydmVyQ29uc3RydWN0b3I7XG4gICAgdGhpcy4jY29udGV4dE9wdGlvbnMgPSBjb250ZXh0T3B0aW9ucztcbiAgICB0aGlzLiNjb250ZXh0U3RhdGUgPSBjb250ZXh0U3RhdGU7XG5cbiAgICBpZiAobG9nRXJyb3JzKSB7XG4gICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLCBsb2dFcnJvckxpc3RlbmVyKTtcbiAgICB9XG4gIH1cblxuICAjZ2V0Q29tcG9zZWQoKTogKGNvbnRleHQ6IENvbnRleHQ8QVMsIEFTPikgPT4gUHJvbWlzZTx1bmtub3duPiB7XG4gICAgaWYgKCF0aGlzLiNjb21wb3NlZE1pZGRsZXdhcmUpIHtcbiAgICAgIHRoaXMuI2NvbXBvc2VkTWlkZGxld2FyZSA9IGNvbXBvc2UodGhpcy4jbWlkZGxld2FyZSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLiNjb21wb3NlZE1pZGRsZXdhcmU7XG4gIH1cblxuICAjZ2V0Q29udGV4dFN0YXRlKCk6IEFTIHtcbiAgICBzd2l0Y2ggKHRoaXMuI2NvbnRleHRTdGF0ZSkge1xuICAgICAgY2FzZSBcImFsaWFzXCI6XG4gICAgICAgIHJldHVybiB0aGlzLnN0YXRlO1xuICAgICAgY2FzZSBcImNsb25lXCI6XG4gICAgICAgIHJldHVybiBjbG9uZVN0YXRlKHRoaXMuc3RhdGUpO1xuICAgICAgY2FzZSBcImVtcHR5XCI6XG4gICAgICAgIHJldHVybiB7fSBhcyBBUztcbiAgICAgIGNhc2UgXCJwcm90b3R5cGVcIjpcbiAgICAgICAgcmV0dXJuIE9iamVjdC5jcmVhdGUodGhpcy5zdGF0ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIERlYWwgd2l0aCB1bmNhdWdodCBlcnJvcnMgaW4gZWl0aGVyIHRoZSBtaWRkbGV3YXJlIG9yIHNlbmRpbmcgdGhlXG4gICAqIHJlc3BvbnNlLiAqL1xuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAjaGFuZGxlRXJyb3IoY29udGV4dDogQ29udGV4dDxBUz4sIGVycm9yOiBhbnkpOiB2b2lkIHtcbiAgICBpZiAoIShlcnJvciBpbnN0YW5jZW9mIEVycm9yKSkge1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoYG5vbi1lcnJvciB0aHJvd246ICR7SlNPTi5zdHJpbmdpZnkoZXJyb3IpfWApO1xuICAgIH1cbiAgICBjb25zdCB7IG1lc3NhZ2UgfSA9IGVycm9yO1xuICAgIGlmICghY29udGV4dC5yZXNwb25zZS53cml0YWJsZSkge1xuICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KFxuICAgICAgICBuZXcgQXBwbGljYXRpb25FcnJvckV2ZW50KHsgY29udGV4dCwgbWVzc2FnZSwgZXJyb3IgfSksXG4gICAgICApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGtleSBvZiBbLi4uY29udGV4dC5yZXNwb25zZS5oZWFkZXJzLmtleXMoKV0pIHtcbiAgICAgIGNvbnRleHQucmVzcG9uc2UuaGVhZGVycy5kZWxldGUoa2V5KTtcbiAgICB9XG4gICAgaWYgKGVycm9yLmhlYWRlcnMgJiYgZXJyb3IuaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIGVycm9yLmhlYWRlcnMpIHtcbiAgICAgICAgY29udGV4dC5yZXNwb25zZS5oZWFkZXJzLnNldChrZXksIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29udGV4dC5yZXNwb25zZS50eXBlID0gXCJ0ZXh0XCI7XG4gICAgY29uc3Qgc3RhdHVzOiBTdGF0dXMgPSBjb250ZXh0LnJlc3BvbnNlLnN0YXR1cyA9XG4gICAgICBnbG9iYWxUaGlzLkRlbm8gJiYgRGVuby5lcnJvcnMgJiYgZXJyb3IgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5Ob3RGb3VuZFxuICAgICAgICA/IDQwNFxuICAgICAgICA6IGVycm9yLnN0YXR1cyAmJiB0eXBlb2YgZXJyb3Iuc3RhdHVzID09PSBcIm51bWJlclwiXG4gICAgICAgID8gZXJyb3Iuc3RhdHVzXG4gICAgICAgIDogNTAwO1xuICAgIGNvbnRleHQucmVzcG9uc2UuYm9keSA9IGVycm9yLmV4cG9zZSA/IGVycm9yLm1lc3NhZ2UgOiBTVEFUVVNfVEVYVFtzdGF0dXNdO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQXBwbGljYXRpb25FcnJvckV2ZW50KHsgY29udGV4dCwgbWVzc2FnZSwgZXJyb3IgfSkpO1xuICB9XG5cbiAgLyoqIFByb2Nlc3NpbmcgcmVnaXN0ZXJlZCBtaWRkbGV3YXJlIG9uIGVhY2ggcmVxdWVzdC4gKi9cbiAgYXN5bmMgI2hhbmRsZVJlcXVlc3QoXG4gICAgcmVxdWVzdDogU2VydmVyUmVxdWVzdCxcbiAgICBzZWN1cmU6IGJvb2xlYW4sXG4gICAgc3RhdGU6IFJlcXVlc3RTdGF0ZSxcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgbGV0IGNvbnRleHQ6IENvbnRleHQ8QVMsIEFTPiB8IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgY29udGV4dCA9IG5ldyBDb250ZXh0KFxuICAgICAgICB0aGlzLFxuICAgICAgICByZXF1ZXN0LFxuICAgICAgICB0aGlzLiNnZXRDb250ZXh0U3RhdGUoKSxcbiAgICAgICAgeyBzZWN1cmUsIC4uLnRoaXMuI2NvbnRleHRPcHRpb25zIH0sXG4gICAgICApO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnN0IGVycm9yID0gZSBpbnN0YW5jZW9mIEVycm9yXG4gICAgICAgID8gZVxuICAgICAgICA6IG5ldyBFcnJvcihgbm9uLWVycm9yIHRocm93bjogJHtKU09OLnN0cmluZ2lmeShlKX1gKTtcbiAgICAgIGNvbnN0IHsgbWVzc2FnZSB9ID0gZXJyb3I7XG4gICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEFwcGxpY2F0aW9uRXJyb3JFdmVudCh7IG1lc3NhZ2UsIGVycm9yIH0pKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXNzZXJ0KGNvbnRleHQsIFwiQ29udGV4dCB3YXMgbm90IGNyZWF0ZWQuXCIpO1xuICAgIGNvbnN0IHsgcHJvbWlzZSwgcmVzb2x2ZSB9ID0gY3JlYXRlUHJvbWlzZVdpdGhSZXNvbHZlcnM8dm9pZD4oKTtcbiAgICBzdGF0ZS5oYW5kbGluZy5hZGQocHJvbWlzZSk7XG4gICAgaWYgKCFzdGF0ZS5jbG9zaW5nICYmICFzdGF0ZS5jbG9zZWQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMuI2dldENvbXBvc2VkKCkoY29udGV4dCk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgdGhpcy4jaGFuZGxlRXJyb3IoY29udGV4dCwgZXJyKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNvbnRleHQucmVzcG9uZCA9PT0gZmFsc2UpIHtcbiAgICAgIGNvbnRleHQucmVzcG9uc2UuZGVzdHJveSgpO1xuICAgICAgcmVzb2x2ZSEoKTtcbiAgICAgIHN0YXRlLmhhbmRsaW5nLmRlbGV0ZShwcm9taXNlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGV0IGNsb3NlUmVzb3VyY2VzID0gdHJ1ZTtcbiAgICBsZXQgcmVzcG9uc2U6IFJlc3BvbnNlO1xuICAgIHRyeSB7XG4gICAgICBjbG9zZVJlc291cmNlcyA9IGZhbHNlO1xuICAgICAgcmVzcG9uc2UgPSBhd2FpdCBjb250ZXh0LnJlc3BvbnNlLnRvRG9tUmVzcG9uc2UoKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuI2hhbmRsZUVycm9yKGNvbnRleHQsIGVycik7XG4gICAgICByZXNwb25zZSA9IGF3YWl0IGNvbnRleHQucmVzcG9uc2UudG9Eb21SZXNwb25zZSgpO1xuICAgIH1cbiAgICBhc3NlcnQocmVzcG9uc2UpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCByZXF1ZXN0LnJlc3BvbmQocmVzcG9uc2UpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy4jaGFuZGxlRXJyb3IoY29udGV4dCwgZXJyKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgY29udGV4dC5yZXNwb25zZS5kZXN0cm95KGNsb3NlUmVzb3VyY2VzKTtcbiAgICAgIHJlc29sdmUhKCk7XG4gICAgICBzdGF0ZS5oYW5kbGluZy5kZWxldGUocHJvbWlzZSk7XG4gICAgICBpZiAoc3RhdGUuY2xvc2luZykge1xuICAgICAgICBhd2FpdCBzdGF0ZS5zZXJ2ZXIuY2xvc2UoKTtcbiAgICAgICAgaWYgKCFzdGF0ZS5jbG9zZWQpIHtcbiAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEFwcGxpY2F0aW9uQ2xvc2VFdmVudCh7fSkpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmNsb3NlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqIEFkZCBhbiBldmVudCBsaXN0ZW5lciBmb3IgYSBgXCJjbG9zZVwiYCBldmVudCB3aGljaCBvY2N1cnMgd2hlbiB0aGVcbiAgICogYXBwbGljYXRpb24gaXMgY2xvc2VkIGFuZCBubyBsb25nZXIgbGlzdGVuaW5nIG9yIGhhbmRsaW5nIHJlcXVlc3RzLiAqL1xuICBhZGRFdmVudExpc3RlbmVyPFMgZXh0ZW5kcyBBUz4oXG4gICAgdHlwZTogXCJjbG9zZVwiLFxuICAgIGxpc3RlbmVyOiBBcHBsaWNhdGlvbkNsb3NlRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCB8IG51bGwsXG4gICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyxcbiAgKTogdm9pZDtcbiAgLyoqIEFkZCBhbiBldmVudCBsaXN0ZW5lciBmb3IgYW4gYFwiZXJyb3JcImAgZXZlbnQgd2hpY2ggb2NjdXJzIHdoZW4gYW5cbiAgICogdW4tY2F1Z2h0IGVycm9yIG9jY3VycyB3aGVuIHByb2Nlc3NpbmcgdGhlIG1pZGRsZXdhcmUgb3IgZHVyaW5nIHByb2Nlc3NpbmdcbiAgICogb2YgdGhlIHJlc3BvbnNlLiAqL1xuICBhZGRFdmVudExpc3RlbmVyPFMgZXh0ZW5kcyBBUz4oXG4gICAgdHlwZTogXCJlcnJvclwiLFxuICAgIGxpc3RlbmVyOiBBcHBsaWNhdGlvbkVycm9yRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdDxTLCBBUz4gfCBudWxsLFxuICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMsXG4gICk6IHZvaWQ7XG4gIC8qKiBBZGQgYW4gZXZlbnQgbGlzdGVuZXIgZm9yIGEgYFwibGlzdGVuXCJgIGV2ZW50IHdoaWNoIG9jY3VycyB3aGVuIHRoZSBzZXJ2ZXJcbiAgICogaGFzIHN1Y2Nlc3NmdWxseSBvcGVuZWQgYnV0IGJlZm9yZSBhbnkgcmVxdWVzdHMgc3RhcnQgYmVpbmcgcHJvY2Vzc2VkLiAqL1xuICBhZGRFdmVudExpc3RlbmVyKFxuICAgIHR5cGU6IFwibGlzdGVuXCIsXG4gICAgbGlzdGVuZXI6IEFwcGxpY2F0aW9uTGlzdGVuRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCB8IG51bGwsXG4gICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyxcbiAgKTogdm9pZDtcbiAgLyoqIEFkZCBhbiBldmVudCBsaXN0ZW5lciBmb3IgYW4gZXZlbnQuICBDdXJyZW50bHkgdmFsaWQgZXZlbnQgdHlwZXMgYXJlXG4gICAqIGBcImVycm9yXCJgIGFuZCBgXCJsaXN0ZW5cImAuICovXG4gIGFkZEV2ZW50TGlzdGVuZXIoXG4gICAgdHlwZTogXCJjbG9zZVwiIHwgXCJlcnJvclwiIHwgXCJsaXN0ZW5cIixcbiAgICBsaXN0ZW5lcjogRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCB8IG51bGwsXG4gICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyxcbiAgKTogdm9pZCB7XG4gICAgc3VwZXIuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lciwgb3B0aW9ucyk7XG4gIH1cblxuICAvKiogQSBtZXRob2QgdGhhdCBpcyBjb21wYXRpYmxlIHdpdGggdGhlIENsb3VkZmxhcmUgV29ya2VyXG4gICAqIFtGZXRjaCBIYW5kbGVyXShodHRwczovL2RldmVsb3BlcnMuY2xvdWRmbGFyZS5jb20vd29ya2Vycy9ydW50aW1lLWFwaXMvaGFuZGxlcnMvZmV0Y2gvKVxuICAgKiBhbmQgY2FuIGJlIGV4cG9ydGVkIHRvIGhhbmRsZSBDbG91ZGZsYXJlIFdvcmtlciBmZXRjaCByZXF1ZXN0cy5cbiAgICpcbiAgICogIyBFeGFtcGxlXG4gICAqXG4gICAqIGBgYHRzXG4gICAqIGltcG9ydCB7IEFwcGxpY2F0aW9uIH0gZnJvbSBcIkBvYWsvb2FrXCI7XG4gICAqXG4gICAqIGNvbnN0IGFwcCA9IG5ldyBBcHBsaWNhdGlvbigpO1xuICAgKiBhcHAudXNlKChjdHgpID0+IHtcbiAgICogICBjdHgucmVzcG9uc2UuYm9keSA9IFwiaGVsbG8gd29ybGQhXCI7XG4gICAqIH0pO1xuICAgKlxuICAgKiBleHBvcnQgZGVmYXVsdCB7IGZldGNoOiBhcHAuZmV0Y2ggfTtcbiAgICogYGBgXG4gICAqL1xuICBmZXRjaDogQ2xvdWRmbGFyZUZldGNoSGFuZGxlciA9IGFzeW5jIDxcbiAgICBFbnYgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0gUmVjb3JkPHN0cmluZywgc3RyaW5nPixcbiAgPihcbiAgICByZXF1ZXN0OiBSZXF1ZXN0LFxuICAgIF9lbnY6IEVudixcbiAgICBfY3R4OiBDbG91ZGZsYXJlRXhlY3V0aW9uQ29udGV4dCxcbiAgKTogUHJvbWlzZTxSZXNwb25zZT4gPT4ge1xuICAgIGlmICghdGhpcy4jbWlkZGxld2FyZS5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJUaGVyZSBpcyBubyBtaWRkbGV3YXJlIHRvIHByb2Nlc3MgcmVxdWVzdHMuXCIpO1xuICAgIH1cbiAgICBpZiAoIU5hdGl2ZVJlcXVlc3RDdG9yKSB7XG4gICAgICBjb25zdCB7IE5hdGl2ZVJlcXVlc3QgfSA9IGF3YWl0IGltcG9ydChcIi4vaHR0cF9zZXJ2ZXJfbmF0aXZlX3JlcXVlc3QudHNcIik7XG4gICAgICBOYXRpdmVSZXF1ZXN0Q3RvciA9IE5hdGl2ZVJlcXVlc3Q7XG4gICAgfVxuICAgIGxldCByZW1vdGVBZGRyOiBOZXRBZGRyIHwgdW5kZWZpbmVkO1xuICAgIGNvbnN0IGhvc3RuYW1lID0gcmVxdWVzdC5oZWFkZXJzLmdldChcIkNGLUNvbm5lY3RpbmctSVBcIikgPz8gdW5kZWZpbmVkO1xuICAgIGlmIChob3N0bmFtZSkge1xuICAgICAgcmVtb3RlQWRkciA9IHsgaG9zdG5hbWUsIHBvcnQ6IDAsIHRyYW5zcG9ydDogXCJ0Y3BcIiB9O1xuICAgIH1cbiAgICBjb25zdCBjb250ZXh0UmVxdWVzdCA9IG5ldyBOYXRpdmVSZXF1ZXN0Q3RvcihyZXF1ZXN0LCB7IHJlbW90ZUFkZHIgfSk7XG4gICAgY29uc3QgY29udGV4dCA9IG5ldyBDb250ZXh0KFxuICAgICAgdGhpcyxcbiAgICAgIGNvbnRleHRSZXF1ZXN0LFxuICAgICAgdGhpcy4jZ2V0Q29udGV4dFN0YXRlKCksXG4gICAgICB0aGlzLiNjb250ZXh0T3B0aW9ucyxcbiAgICApO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLiNnZXRDb21wb3NlZCgpKGNvbnRleHQpO1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjb250ZXh0LnJlc3BvbnNlLnRvRG9tUmVzcG9uc2UoKTtcbiAgICAgIGNvbnRleHQucmVzcG9uc2UuZGVzdHJveShmYWxzZSk7XG4gICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLiNoYW5kbGVFcnJvcihjb250ZXh0LCBlcnIpO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbiAgfTtcblxuICAvKiogSGFuZGxlIGFuIGluZGl2aWR1YWwgc2VydmVyIHJlcXVlc3QsIHJldHVybmluZyB0aGUgc2VydmVyIHJlc3BvbnNlLiAgVGhpc1xuICAgKiBpcyBzaW1pbGFyIHRvIGAubGlzdGVuKClgLCBidXQgb3BlbmluZyB0aGUgY29ubmVjdGlvbiBhbmQgcmV0cmlldmluZ1xuICAgKiByZXF1ZXN0cyBhcmUgbm90IHRoZSByZXNwb25zaWJpbGl0eSBvZiB0aGUgYXBwbGljYXRpb24uICBJZiB0aGUgZ2VuZXJhdGVkXG4gICAqIGNvbnRleHQgZ2V0cyBzZXQgdG8gbm90IHRvIHJlc3BvbmQsIHRoZW4gdGhlIG1ldGhvZCByZXNvbHZlcyB3aXRoXG4gICAqIGB1bmRlZmluZWRgLCBvdGhlcndpc2UgaXQgcmVzb2x2ZXMgd2l0aCBhIHJlcXVlc3QgdGhhdCBpcyBjb21wYXRpYmxlIHdpdGhcbiAgICogYHN0ZC9odHRwL3NlcnZlcmAuICovXG4gIGhhbmRsZTogSGFuZGxlTWV0aG9kID0gKGFzeW5jIChcbiAgICByZXF1ZXN0OiBSZXF1ZXN0LFxuICAgIHNlY3VyZU9yQWRkcjogTmV0QWRkciB8IGJvb2xlYW4gfCB1bmRlZmluZWQsXG4gICAgc2VjdXJlOiBib29sZWFuIHwgdW5kZWZpbmVkID0gZmFsc2UsXG4gICk6IFByb21pc2U8UmVzcG9uc2UgfCB1bmRlZmluZWQ+ID0+IHtcbiAgICBpZiAoIXRoaXMuI21pZGRsZXdhcmUubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiVGhlcmUgaXMgbm8gbWlkZGxld2FyZSB0byBwcm9jZXNzIHJlcXVlc3RzLlwiKTtcbiAgICB9XG4gICAgYXNzZXJ0KGlzTmV0QWRkcihzZWN1cmVPckFkZHIpIHx8IHR5cGVvZiBzZWN1cmVPckFkZHIgPT09IFwidW5kZWZpbmVkXCIpO1xuICAgIGlmICghTmF0aXZlUmVxdWVzdEN0b3IpIHtcbiAgICAgIGNvbnN0IHsgTmF0aXZlUmVxdWVzdCB9ID0gYXdhaXQgaW1wb3J0KFwiLi9odHRwX3NlcnZlcl9uYXRpdmVfcmVxdWVzdC50c1wiKTtcbiAgICAgIE5hdGl2ZVJlcXVlc3RDdG9yID0gTmF0aXZlUmVxdWVzdDtcbiAgICB9XG4gICAgY29uc3QgY29udGV4dFJlcXVlc3QgPSBuZXcgTmF0aXZlUmVxdWVzdEN0b3IocmVxdWVzdCwge1xuICAgICAgcmVtb3RlQWRkcjogc2VjdXJlT3JBZGRyLFxuICAgIH0pO1xuICAgIGNvbnN0IGNvbnRleHQgPSBuZXcgQ29udGV4dChcbiAgICAgIHRoaXMsXG4gICAgICBjb250ZXh0UmVxdWVzdCxcbiAgICAgIHRoaXMuI2dldENvbnRleHRTdGF0ZSgpLFxuICAgICAgeyBzZWN1cmUsIC4uLnRoaXMuI2NvbnRleHRPcHRpb25zIH0sXG4gICAgKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy4jZ2V0Q29tcG9zZWQoKShjb250ZXh0KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuI2hhbmRsZUVycm9yKGNvbnRleHQsIGVycik7XG4gICAgfVxuICAgIGlmIChjb250ZXh0LnJlc3BvbmQgPT09IGZhbHNlKSB7XG4gICAgICBjb250ZXh0LnJlc3BvbnNlLmRlc3Ryb3koKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY29udGV4dC5yZXNwb25zZS50b0RvbVJlc3BvbnNlKCk7XG4gICAgICBjb250ZXh0LnJlc3BvbnNlLmRlc3Ryb3koZmFsc2UpO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy4jaGFuZGxlRXJyb3IoY29udGV4dCwgZXJyKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH0pO1xuXG4gIC8qKiBTdGFydCBsaXN0ZW5pbmcgZm9yIHJlcXVlc3RzLCBwcm9jZXNzaW5nIHJlZ2lzdGVyZWQgbWlkZGxld2FyZSBvbiBlYWNoXG4gICAqIHJlcXVlc3QuICBJZiB0aGUgb3B0aW9ucyBgLnNlY3VyZWAgaXMgdW5kZWZpbmVkIG9yIGBmYWxzZWAsIHRoZSBsaXN0ZW5pbmdcbiAgICogd2lsbCBiZSBvdmVyIEhUVFAuICBJZiB0aGUgb3B0aW9ucyBgLnNlY3VyZWAgcHJvcGVydHkgaXMgYHRydWVgLCBhXG4gICAqIGAuY2VydEZpbGVgIGFuZCBhIGAua2V5RmlsZWAgcHJvcGVydHkgbmVlZCB0byBiZSBzdXBwbGllZCBhbmQgcmVxdWVzdHNcbiAgICogd2lsbCBiZSBwcm9jZXNzZWQgb3ZlciBIVFRQUy4gKi9cbiAgYXN5bmMgbGlzdGVuKGFkZHI6IHN0cmluZyk6IFByb21pc2U8dm9pZD47XG4gIC8qKiBTdGFydCBsaXN0ZW5pbmcgZm9yIHJlcXVlc3RzLCBwcm9jZXNzaW5nIHJlZ2lzdGVyZWQgbWlkZGxld2FyZSBvbiBlYWNoXG4gICAqIHJlcXVlc3QuICBJZiB0aGUgb3B0aW9ucyBgLnNlY3VyZWAgaXMgdW5kZWZpbmVkIG9yIGBmYWxzZWAsIHRoZSBsaXN0ZW5pbmdcbiAgICogd2lsbCBiZSBvdmVyIEhUVFAuICBJZiB0aGUgb3B0aW9ucyBgLnNlY3VyZWAgcHJvcGVydHkgaXMgYHRydWVgLCBhXG4gICAqIGAuY2VydEZpbGVgIGFuZCBhIGAua2V5RmlsZWAgcHJvcGVydHkgbmVlZCB0byBiZSBzdXBwbGllZCBhbmQgcmVxdWVzdHNcbiAgICogd2lsbCBiZSBwcm9jZXNzZWQgb3ZlciBIVFRQUy5cbiAgICpcbiAgICogT21pdHRpbmcgb3B0aW9ucyB3aWxsIGRlZmF1bHQgdG8gYHsgcG9ydDogMCB9YCB3aGljaCBhbGxvd3MgdGhlIG9wZXJhdGluZ1xuICAgKiBzeXN0ZW0gdG8gc2VsZWN0IHRoZSBwb3J0LiAqL1xuICBhc3luYyBsaXN0ZW4ob3B0aW9ucz86IExpc3Rlbk9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+O1xuICBhc3luYyBsaXN0ZW4ob3B0aW9uczogc3RyaW5nIHwgTGlzdGVuT3B0aW9ucyA9IHsgcG9ydDogMCB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLiNtaWRkbGV3YXJlLmxlbmd0aCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlRoZXJlIGlzIG5vIG1pZGRsZXdhcmUgdG8gcHJvY2VzcyByZXF1ZXN0cy5cIik7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbWlkZGxld2FyZSBvZiB0aGlzLiNtaWRkbGV3YXJlKSB7XG4gICAgICBpZiAoaXNNaWRkbGV3YXJlT2JqZWN0KG1pZGRsZXdhcmUpICYmIG1pZGRsZXdhcmUuaW5pdCkge1xuICAgICAgICBhd2FpdCBtaWRkbGV3YXJlLmluaXQoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBjb25zdCBtYXRjaCA9IEFERFJfUkVHRVhQLmV4ZWMob3B0aW9ucyk7XG4gICAgICBpZiAoIW1hdGNoKSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcihgSW52YWxpZCBhZGRyZXNzIHBhc3NlZDogXCIke29wdGlvbnN9XCJgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IFssIGhvc3RuYW1lLCBwb3J0U3RyXSA9IG1hdGNoO1xuICAgICAgb3B0aW9ucyA9IHsgaG9zdG5hbWUsIHBvcnQ6IHBhcnNlSW50KHBvcnRTdHIsIDEwKSB9O1xuICAgIH1cbiAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7IHBvcnQ6IDAgfSwgb3B0aW9ucyk7XG4gICAgaWYgKCF0aGlzLiNzZXJ2ZXJDb25zdHJ1Y3Rvcikge1xuICAgICAgaWYgKCFEZWZhdWx0U2VydmVyQ3Rvcikge1xuICAgICAgICBjb25zdCB7IFNlcnZlciB9ID0gYXdhaXQgKGlzQnVuKClcbiAgICAgICAgICA/IGltcG9ydChcIi4vaHR0cF9zZXJ2ZXJfYnVuLnRzXCIpXG4gICAgICAgICAgOiBpc05vZGUoKVxuICAgICAgICAgID8gaW1wb3J0KFwiLi9odHRwX3NlcnZlcl9ub2RlLnRzXCIpXG4gICAgICAgICAgOiBpbXBvcnQoXCIuL2h0dHBfc2VydmVyX25hdGl2ZS50c1wiKSk7XG4gICAgICAgIERlZmF1bHRTZXJ2ZXJDdG9yID0gU2VydmVyIGFzIFNlcnZlckNvbnN0cnVjdG9yPFNlcnZlclJlcXVlc3Q+O1xuICAgICAgfVxuICAgICAgdGhpcy4jc2VydmVyQ29uc3RydWN0b3IgPSBEZWZhdWx0U2VydmVyQ3RvcjtcbiAgICB9XG4gICAgY29uc3Qgc2VydmVyID0gbmV3IHRoaXMuI3NlcnZlckNvbnN0cnVjdG9yKHRoaXMsIG9wdGlvbnMpO1xuICAgIGNvbnN0IHN0YXRlID0ge1xuICAgICAgY2xvc2VkOiBmYWxzZSxcbiAgICAgIGNsb3Npbmc6IGZhbHNlLFxuICAgICAgaGFuZGxpbmc6IG5ldyBTZXQ8UHJvbWlzZTx2b2lkPj4oKSxcbiAgICAgIHNlcnZlcixcbiAgICB9O1xuICAgIGNvbnN0IHsgc2lnbmFsIH0gPSBvcHRpb25zO1xuICAgIGlmIChzaWduYWwpIHtcbiAgICAgIHNpZ25hbC5hZGRFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgKCkgPT4ge1xuICAgICAgICBpZiAoIXN0YXRlLmhhbmRsaW5nLnNpemUpIHtcbiAgICAgICAgICBzdGF0ZS5jbG9zZWQgPSB0cnVlO1xuICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQXBwbGljYXRpb25DbG9zZUV2ZW50KHt9KSk7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUuY2xvc2luZyA9IHRydWU7XG4gICAgICB9LCB7IG9uY2U6IHRydWUgfSk7XG4gICAgfVxuICAgIGNvbnN0IHsgc2VjdXJlID0gZmFsc2UgfSA9IG9wdGlvbnM7XG4gICAgY29uc3Qgc2VydmVyVHlwZSA9IHRoaXMuI3NlcnZlckNvbnN0cnVjdG9yLnR5cGUgPz8gXCJjdXN0b21cIjtcbiAgICBjb25zdCBsaXN0ZW5lciA9IGF3YWl0IHNlcnZlci5saXN0ZW4oKTtcbiAgICBjb25zdCB7IGhvc3RuYW1lLCBwb3J0IH0gPSBsaXN0ZW5lci5hZGRyO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChcbiAgICAgIG5ldyBBcHBsaWNhdGlvbkxpc3RlbkV2ZW50KHtcbiAgICAgICAgaG9zdG5hbWUsXG4gICAgICAgIGxpc3RlbmVyLFxuICAgICAgICBwb3J0LFxuICAgICAgICBzZWN1cmUsXG4gICAgICAgIHNlcnZlclR5cGUsXG4gICAgICB9KSxcbiAgICApO1xuICAgIHRyeSB7XG4gICAgICBmb3IgYXdhaXQgKGNvbnN0IHJlcXVlc3Qgb2Ygc2VydmVyKSB7XG4gICAgICAgIHRoaXMuI2hhbmRsZVJlcXVlc3QocmVxdWVzdCwgc2VjdXJlLCBzdGF0ZSk7XG4gICAgICB9XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChzdGF0ZS5oYW5kbGluZyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yXG4gICAgICAgID8gZXJyb3IubWVzc2FnZVxuICAgICAgICA6IFwiQXBwbGljYXRpb24gRXJyb3JcIjtcbiAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChcbiAgICAgICAgbmV3IEFwcGxpY2F0aW9uRXJyb3JFdmVudCh7IG1lc3NhZ2UsIGVycm9yIH0pLFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICAvKiogUmVnaXN0ZXIgbWlkZGxld2FyZSB0byBiZSB1c2VkIHdpdGggdGhlIGFwcGxpY2F0aW9uLiAgTWlkZGxld2FyZSB3aWxsXG4gICAqIGJlIHByb2Nlc3NlZCBpbiB0aGUgb3JkZXIgaXQgaXMgYWRkZWQsIGJ1dCBtaWRkbGV3YXJlIGNhbiBjb250cm9sIHRoZSBmbG93XG4gICAqIG9mIGV4ZWN1dGlvbiB2aWEgdGhlIHVzZSBvZiB0aGUgYG5leHQoKWAgZnVuY3Rpb24gdGhhdCB0aGUgbWlkZGxld2FyZVxuICAgKiBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCB3aXRoLiAgVGhlIGBjb250ZXh0YCBvYmplY3QgcHJvdmlkZXMgaW5mb3JtYXRpb25cbiAgICogYWJvdXQgdGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlIGFwcGxpY2F0aW9uLlxuICAgKlxuICAgKiBCYXNpYyB1c2FnZTpcbiAgICpcbiAgICogYGBgdHNcbiAgICogY29uc3QgaW1wb3J0IHsgQXBwbGljYXRpb24gfSBmcm9tIFwianNyOkBvYWsvb2FrL2FwcGxpY2F0aW9uXCI7XG4gICAqXG4gICAqIGNvbnN0IGFwcCA9IG5ldyBBcHBsaWNhdGlvbigpO1xuICAgKlxuICAgKiBhcHAudXNlKChjdHgsIG5leHQpID0+IHtcbiAgICogICBjdHgucmVxdWVzdDsgLy8gY29udGFpbnMgcmVxdWVzdCBpbmZvcm1hdGlvblxuICAgKiAgIGN0eC5yZXNwb25zZTsgLy8gc2V0dXBzIHVwIGluZm9ybWF0aW9uIHRvIHVzZSBpbiB0aGUgcmVzcG9uc2U7XG4gICAqICAgYXdhaXQgbmV4dCgpOyAvLyBtYW5hZ2VzIHRoZSBmbG93IGNvbnRyb2wgb2YgdGhlIG1pZGRsZXdhcmUgZXhlY3V0aW9uXG4gICAqIH0pO1xuICAgKlxuICAgKiBhd2FpdCBhcHAubGlzdGVuKHsgcG9ydDogODAgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgdXNlPFMgZXh0ZW5kcyBTdGF0ZSA9IEFTPihcbiAgICBtaWRkbGV3YXJlOiBNaWRkbGV3YXJlT3JNaWRkbGV3YXJlT2JqZWN0PFMsIENvbnRleHQ8UywgQVM+PixcbiAgICAuLi5taWRkbGV3YXJlczogTWlkZGxld2FyZU9yTWlkZGxld2FyZU9iamVjdDxTLCBDb250ZXh0PFMsIEFTPj5bXVxuICApOiBBcHBsaWNhdGlvbjxTIGV4dGVuZHMgQVMgPyBTIDogKFMgJiBBUyk+O1xuICB1c2U8UyBleHRlbmRzIFN0YXRlID0gQVM+KFxuICAgIC4uLm1pZGRsZXdhcmU6IE1pZGRsZXdhcmVPck1pZGRsZXdhcmVPYmplY3Q8UywgQ29udGV4dDxTLCBBUz4+W11cbiAgKTogQXBwbGljYXRpb248UyBleHRlbmRzIEFTID8gUyA6IChTICYgQVMpPiB7XG4gICAgdGhpcy4jbWlkZGxld2FyZS5wdXNoKC4uLm1pZGRsZXdhcmUpO1xuICAgIHRoaXMuI2NvbXBvc2VkTWlkZGxld2FyZSA9IHVuZGVmaW5lZDtcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIHJldHVybiB0aGlzIGFzIEFwcGxpY2F0aW9uPGFueT47XG4gIH1cblxuICBbU3ltYm9sLmZvcihcIkRlbm8uY3VzdG9tSW5zcGVjdFwiKV0oXG4gICAgaW5zcGVjdDogKHZhbHVlOiB1bmtub3duKSA9PiBzdHJpbmcsXG4gICk6IHN0cmluZyB7XG4gICAgY29uc3QgeyBrZXlzLCBwcm94eSwgc3RhdGUgfSA9IHRoaXM7XG4gICAgcmV0dXJuIGAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gJHtcbiAgICAgIGluc3BlY3QoeyBcIiNtaWRkbGV3YXJlXCI6IHRoaXMuI21pZGRsZXdhcmUsIGtleXMsIHByb3h5LCBzdGF0ZSB9KVxuICAgIH1gO1xuICB9XG5cbiAgW1N5bWJvbC5mb3IoXCJub2RlanMudXRpbC5pbnNwZWN0LmN1c3RvbVwiKV0oXG4gICAgZGVwdGg6IG51bWJlcixcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIG9wdGlvbnM6IGFueSxcbiAgICBpbnNwZWN0OiAodmFsdWU6IHVua25vd24sIG9wdGlvbnM/OiB1bmtub3duKSA9PiBzdHJpbmcsXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgKTogYW55IHtcbiAgICBpZiAoZGVwdGggPCAwKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKGBbJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9XWAsIFwic3BlY2lhbFwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBuZXdPcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywge1xuICAgICAgZGVwdGg6IG9wdGlvbnMuZGVwdGggPT09IG51bGwgPyBudWxsIDogb3B0aW9ucy5kZXB0aCAtIDEsXG4gICAgfSk7XG4gICAgY29uc3QgeyBrZXlzLCBwcm94eSwgc3RhdGUgfSA9IHRoaXM7XG4gICAgcmV0dXJuIGAke29wdGlvbnMuc3R5bGl6ZSh0aGlzLmNvbnN0cnVjdG9yLm5hbWUsIFwic3BlY2lhbFwiKX0gJHtcbiAgICAgIGluc3BlY3QoXG4gICAgICAgIHsgXCIjbWlkZGxld2FyZVwiOiB0aGlzLiNtaWRkbGV3YXJlLCBrZXlzLCBwcm94eSwgc3RhdGUgfSxcbiAgICAgICAgbmV3T3B0aW9ucyxcbiAgICAgIClcbiAgICB9YDtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHlFQUF5RTtBQUV6RTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQW1CQztBQUVELFNBQVMsT0FBTyxRQUFRLGVBQWU7QUFDdkMsU0FBUyxNQUFNLEVBQUUsUUFBUSxFQUFlLFdBQVcsUUFBUSxZQUFZO0FBRXZFLFNBQ0UsT0FBTyxFQUNQLGtCQUFrQixRQUViLGtCQUFrQjtBQUN6QixTQUFTLFVBQVUsUUFBUSx5QkFBeUI7QUFDcEQsU0FBUywwQkFBMEIsUUFB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