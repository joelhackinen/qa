// Copyright 2018-2024 the oak authors. All rights reserved. MIT license.
/**
 * Contains the {@linkcode Context} class which is the context that is provided
 * to middleware.
 *
 * Typically this is not used directly by end users except when creating
 * re-usable middleware.
 *
 * @module
 */ var _computedKey, _computedKey1;
import { createHttpError, SecureCookieMap } from "./deps.ts";
import { Request } from "./request.ts";
import { Response } from "./response.ts";
import { send } from "./send.ts";
_computedKey = Symbol.for("Deno.customInspect"), _computedKey1 = Symbol.for("nodejs.util.inspect.custom");
/** Provides context about the current request and response to middleware
 * functions, and the current instance being processed is the first argument
 * provided a {@linkcode Middleware} function.
 *
 * _Typically this is only used as a type annotation and shouldn't be
 * constructed directly._
 *
 * ### Example
 *
 * ```ts
 * import { Application, Context } from "jsr:@oak/oak/";
 *
 * const app = new Application();
 *
 * app.use((ctx) => {
 *   // information about the request is here:
 *   ctx.request;
 *   // information about the response is here:
 *   ctx.response;
 *   // the cookie store is here:
 *   ctx.cookies;
 * });
 *
 * // Needs a type annotation because it cannot be inferred.
 * function mw(ctx: Context) {
 *   // process here...
 * }
 *
 * app.use(mw);
 * ```
 *
 * @template S the state which extends the application state (`AS`)
 * @template AS the type of the state derived from the application
 */ export class Context {
  #socket;
  #sse;
  #wrapReviverReplacer(reviver) {
    return reviver ? (key, value)=>reviver(key, value, this) : undefined;
  }
  /** A reference to the current application. */ app;
  /** An object which allows access to cookies, mediating both the request and
   * response. */ cookies;
  /** Is `true` if the current connection is upgradeable to a web socket.
   * Otherwise the value is `false`.  Use `.upgrade()` to upgrade the connection
   * and return the web socket. */ get isUpgradable() {
    const upgrade = this.request.headers.get("upgrade");
    if (!upgrade || upgrade.toLowerCase() !== "websocket") {
      return false;
    }
    const secKey = this.request.headers.get("sec-websocket-key");
    return typeof secKey === "string" && secKey != "";
  }
  /** Determines if the request should be responded to.  If `false` when the
   * middleware completes processing, the response will not be sent back to the
   * requestor.  Typically this is used if the middleware will take over low
   * level processing of requests and responses, for example if using web
   * sockets.  This automatically gets set to `false` when the context is
   * upgraded to a web socket via the `.upgrade()` method.
   *
   * The default is `true`. */ respond;
  /** An object which contains information about the current request. */ request;
  /** An object which contains information about the response that will be sent
   * when the middleware finishes processing. */ response;
  /** If the the current context has been upgraded, then this will be set to
   * with the current web socket, otherwise it is `undefined`. */ get socket() {
    return this.#socket;
  }
  /** The object to pass state to front-end views.  This can be typed by
   * supplying the generic state argument when creating a new app.  For
   * example:
   *
   * ```ts
   * const app = new Application<{ foo: string }>();
   * ```
   *
   * Or can be contextually inferred based on setting an initial state object:
   *
   * ```ts
   * const app = new Application({ state: { foo: "bar" } });
   * ```
   *
   * On each request/response cycle, the context's state is cloned from the
   * application state. This means changes to the context's `.state` will be
   * dropped when the request drops, but "defaults" can be applied to the
   * application's state.  Changes to the application's state though won't be
   * reflected until the next request in the context's state.
   */ state;
  constructor(app, serverRequest, state, { secure = false, jsonBodyReplacer, jsonBodyReviver } = {}){
    this.app = app;
    this.state = state;
    const { proxy } = app;
    this.request = new Request(serverRequest, {
      proxy,
      secure,
      jsonBodyReviver: this.#wrapReviverReplacer(jsonBodyReviver)
    });
    this.respond = true;
    this.response = new Response(this.request, this.#wrapReviverReplacer(jsonBodyReplacer));
    this.cookies = new SecureCookieMap(serverRequest, {
      keys: this.app.keys,
      response: this.response,
      secure: this.request.secure
    });
  }
  /** Asserts the condition and if the condition fails, creates an HTTP error
   * with the provided status (which defaults to `500`).  The error status by
   * default will be set on the `.response.status`.
   *
   * Because of limitation of TypeScript, any assertion type function requires
   * specific type annotations, so the {@linkcode Context} type should be used
   * even if it can be inferred from the context.
   *
   * ### Example
   *
   * ```ts
   * import { Context, Status } from "jsr:@oak/oak/";
   *
   * export function mw(ctx: Context) {
   *   const body = ctx.request.body();
   *   ctx.assert(body.type === "json", Status.NotAcceptable);
   *   // process the body and send a response...
   * }
   * ```
   */ assert(condition, errorStatus = 500, message, props) {
    if (condition) {
      return;
    }
    const httpErrorOptions = {};
    if (typeof props === "object") {
      if ("headers" in props) {
        httpErrorOptions.headers = props.headers;
        delete props.headers;
      }
      if ("expose" in props) {
        httpErrorOptions.expose = props.expose;
        delete props.expose;
      }
    }
    const err = createHttpError(errorStatus, message, httpErrorOptions);
    if (props) {
      Object.assign(err, props);
    }
    throw err;
  }
  /** Asynchronously fulfill a response with a file from the local file
   * system.
   *
   * If the `options.path` is not supplied, the file to be sent will default
   * to this `.request.url.pathname`.
   *
   * Requires Deno read permission. */ send(options) {
    const { path = this.request.url.pathname, ...sendOptions } = options;
    return send(this, path, sendOptions);
  }
  /** Convert the connection to stream events, resolving with an event target
   * for sending server sent events.  Events dispatched on the returned target
   * will be sent to the client and be available in the client's `EventSource`
   * that initiated the connection.
   *
   * Invoking this will cause the a response to be sent to the client
   * immediately to initialize the stream of events, and therefore any further
   * changes to the response, like headers will not reach the client.
   */ async sendEvents(options) {
    if (!this.#sse) {
      const sse = this.#sse = await this.request.sendEvents(options, {
        headers: this.response.headers
      });
      this.app.addEventListener("close", ()=>sse.close());
      this.respond = false;
    }
    return this.#sse;
  }
  /** Create and throw an HTTP Error, which can be used to pass status
   * information which can be caught by other middleware to send more
   * meaningful error messages back to the client.  The passed error status will
   * be set on the `.response.status` by default as well.
   */ throw(errorStatus, message, props) {
    const err = createHttpError(errorStatus, message);
    if (props) {
      Object.assign(err, props);
    }
    throw err;
  }
  /** Take the current request and upgrade it to a web socket, resolving with
   * the a web standard `WebSocket` object. This will set `.respond` to
   * `false`.  If the socket cannot be upgraded, this method will throw. */ upgrade(options) {
    if (!this.#socket) {
      const socket = this.#socket = this.request.upgrade(options);
      this.app.addEventListener("close", ()=>socket.close());
      this.respond = false;
    }
    return this.#socket;
  }
  [_computedKey](inspect) {
    const { app, cookies, isUpgradable, respond, request, response, socket, state } = this;
    return `${this.constructor.name} ${inspect({
      app,
      cookies,
      isUpgradable,
      respond,
      request,
      response,
      socket,
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
    const { app, cookies, isUpgradable, respond, request, response, socket, state } = this;
    return `${options.stylize(this.constructor.name, "special")} ${inspect({
      app,
      cookies,
      isUpgradable,
      respond,
      request,
      response,
      socket,
      state
    }, newOptions)}`;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvb2FrLzE2LjEuMC9jb250ZXh0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjQgdGhlIG9hayBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuLyoqXG4gKiBDb250YWlucyB0aGUge0BsaW5rY29kZSBDb250ZXh0fSBjbGFzcyB3aGljaCBpcyB0aGUgY29udGV4dCB0aGF0IGlzIHByb3ZpZGVkXG4gKiB0byBtaWRkbGV3YXJlLlxuICpcbiAqIFR5cGljYWxseSB0aGlzIGlzIG5vdCB1c2VkIGRpcmVjdGx5IGJ5IGVuZCB1c2VycyBleGNlcHQgd2hlbiBjcmVhdGluZ1xuICogcmUtdXNhYmxlIG1pZGRsZXdhcmUuXG4gKlxuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB0eXBlIHsgQXBwbGljYXRpb24sIFN0YXRlIH0gZnJvbSBcIi4vYXBwbGljYXRpb24udHNcIjtcbmltcG9ydCB7XG4gIGNyZWF0ZUh0dHBFcnJvcixcbiAgdHlwZSBFcnJvclN0YXR1cyxcbiAgdHlwZSBIdHRwRXJyb3JPcHRpb25zLFxuICB0eXBlIEtleVN0YWNrLFxuICBTZWN1cmVDb29raWVNYXAsXG4gIHR5cGUgU2VydmVyU2VudEV2ZW50VGFyZ2V0LFxuICB0eXBlIFNlcnZlclNlbnRFdmVudFRhcmdldE9wdGlvbnMsXG59IGZyb20gXCIuL2RlcHMudHNcIjtcbmltcG9ydCB7IFJlcXVlc3QgfSBmcm9tIFwiLi9yZXF1ZXN0LnRzXCI7XG5pbXBvcnQgeyBSZXNwb25zZSB9IGZyb20gXCIuL3Jlc3BvbnNlLnRzXCI7XG5pbXBvcnQgeyBzZW5kLCB0eXBlIFNlbmRPcHRpb25zIH0gZnJvbSBcIi4vc2VuZC50c1wiO1xuaW1wb3J0IHR5cGUgeyBTZXJ2ZXJSZXF1ZXN0LCBVcGdyYWRlV2ViU29ja2V0T3B0aW9ucyB9IGZyb20gXCIuL3R5cGVzLnRzXCI7XG5cbi8qKiBPcHRpb25zIHRoYXQgY2FuIGJlIHN1cHBsaWVkIHdoZW4gY3JlYXRpbmcgYSB7QGxpbmtjb2RlIENvbnRleHR9ICovXG5leHBvcnQgaW50ZXJmYWNlIENvbnRleHRPcHRpb25zPFxuICBTIGV4dGVuZHMgQVMgPSBTdGF0ZSxcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgQVMgZXh0ZW5kcyBTdGF0ZSA9IFJlY29yZDxzdHJpbmcsIGFueT4sXG4+IHtcbiAganNvbkJvZHlSZXBsYWNlcj86IChcbiAgICBrZXk6IHN0cmluZyxcbiAgICB2YWx1ZTogdW5rbm93bixcbiAgICBjb250ZXh0OiBDb250ZXh0PFM+LFxuICApID0+IHVua25vd247XG4gIGpzb25Cb2R5UmV2aXZlcj86IChcbiAgICBrZXk6IHN0cmluZyxcbiAgICB2YWx1ZTogdW5rbm93bixcbiAgICBjb250ZXh0OiBDb250ZXh0PFM+LFxuICApID0+IHVua25vd247XG4gIHNlY3VyZT86IGJvb2xlYW47XG59XG5cbi8qKiBPcHRpb25zIHRoYXQgY2FuIGJlIHN1cHBsaWVkIHdoZW4gdXNpbmcgdGhlIGAuc2VuZCgpYCBtZXRob2QuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbnRleHRTZW5kT3B0aW9ucyBleHRlbmRzIFNlbmRPcHRpb25zIHtcbiAgLyoqIFRoZSBmaWxlbmFtZSB0byBzZW5kLCB3aGljaCB3aWxsIGJlIHJlc29sdmVkIGJhc2VkIG9uIHRoZSBvdGhlciBvcHRpb25zLlxuICAgKiBJZiB0aGlzIHByb3BlcnR5IGlzIG9taXR0ZWQsIHRoZSBjdXJyZW50IGNvbnRleHQncyBgLnJlcXVlc3QudXJsLnBhdGhuYW1lYFxuICAgKiB3aWxsIGJlIHVzZWQuICovXG4gIHBhdGg/OiBzdHJpbmc7XG59XG5cbi8qKiBQcm92aWRlcyBjb250ZXh0IGFib3V0IHRoZSBjdXJyZW50IHJlcXVlc3QgYW5kIHJlc3BvbnNlIHRvIG1pZGRsZXdhcmVcbiAqIGZ1bmN0aW9ucywgYW5kIHRoZSBjdXJyZW50IGluc3RhbmNlIGJlaW5nIHByb2Nlc3NlZCBpcyB0aGUgZmlyc3QgYXJndW1lbnRcbiAqIHByb3ZpZGVkIGEge0BsaW5rY29kZSBNaWRkbGV3YXJlfSBmdW5jdGlvbi5cbiAqXG4gKiBfVHlwaWNhbGx5IHRoaXMgaXMgb25seSB1c2VkIGFzIGEgdHlwZSBhbm5vdGF0aW9uIGFuZCBzaG91bGRuJ3QgYmVcbiAqIGNvbnN0cnVjdGVkIGRpcmVjdGx5Ll9cbiAqXG4gKiAjIyMgRXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBBcHBsaWNhdGlvbiwgQ29udGV4dCB9IGZyb20gXCJqc3I6QG9hay9vYWsvXCI7XG4gKlxuICogY29uc3QgYXBwID0gbmV3IEFwcGxpY2F0aW9uKCk7XG4gKlxuICogYXBwLnVzZSgoY3R4KSA9PiB7XG4gKiAgIC8vIGluZm9ybWF0aW9uIGFib3V0IHRoZSByZXF1ZXN0IGlzIGhlcmU6XG4gKiAgIGN0eC5yZXF1ZXN0O1xuICogICAvLyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgcmVzcG9uc2UgaXMgaGVyZTpcbiAqICAgY3R4LnJlc3BvbnNlO1xuICogICAvLyB0aGUgY29va2llIHN0b3JlIGlzIGhlcmU6XG4gKiAgIGN0eC5jb29raWVzO1xuICogfSk7XG4gKlxuICogLy8gTmVlZHMgYSB0eXBlIGFubm90YXRpb24gYmVjYXVzZSBpdCBjYW5ub3QgYmUgaW5mZXJyZWQuXG4gKiBmdW5jdGlvbiBtdyhjdHg6IENvbnRleHQpIHtcbiAqICAgLy8gcHJvY2VzcyBoZXJlLi4uXG4gKiB9XG4gKlxuICogYXBwLnVzZShtdyk7XG4gKiBgYGBcbiAqXG4gKiBAdGVtcGxhdGUgUyB0aGUgc3RhdGUgd2hpY2ggZXh0ZW5kcyB0aGUgYXBwbGljYXRpb24gc3RhdGUgKGBBU2ApXG4gKiBAdGVtcGxhdGUgQVMgdGhlIHR5cGUgb2YgdGhlIHN0YXRlIGRlcml2ZWQgZnJvbSB0aGUgYXBwbGljYXRpb25cbiAqL1xuZXhwb3J0IGNsYXNzIENvbnRleHQ8XG4gIFMgZXh0ZW5kcyBBUyA9IFN0YXRlLFxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBBUyBleHRlbmRzIFN0YXRlID0gUmVjb3JkPHN0cmluZywgYW55Pixcbj4ge1xuICAjc29ja2V0PzogV2ViU29ja2V0O1xuICAjc3NlPzogU2VydmVyU2VudEV2ZW50VGFyZ2V0O1xuXG4gICN3cmFwUmV2aXZlclJlcGxhY2VyKFxuICAgIHJldml2ZXI/OiAoa2V5OiBzdHJpbmcsIHZhbHVlOiB1bmtub3duLCBjb250ZXh0OiB0aGlzKSA9PiB1bmtub3duLFxuICApOiB1bmRlZmluZWQgfCAoKGtleTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bikgPT4gdW5rbm93bikge1xuICAgIHJldHVybiByZXZpdmVyXG4gICAgICA/IChrZXk6IHN0cmluZywgdmFsdWU6IHVua25vd24pID0+IHJldml2ZXIoa2V5LCB2YWx1ZSwgdGhpcylcbiAgICAgIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqIEEgcmVmZXJlbmNlIHRvIHRoZSBjdXJyZW50IGFwcGxpY2F0aW9uLiAqL1xuICBhcHA6IEFwcGxpY2F0aW9uPEFTPjtcblxuICAvKiogQW4gb2JqZWN0IHdoaWNoIGFsbG93cyBhY2Nlc3MgdG8gY29va2llcywgbWVkaWF0aW5nIGJvdGggdGhlIHJlcXVlc3QgYW5kXG4gICAqIHJlc3BvbnNlLiAqL1xuICBjb29raWVzOiBTZWN1cmVDb29raWVNYXA7XG5cbiAgLyoqIElzIGB0cnVlYCBpZiB0aGUgY3VycmVudCBjb25uZWN0aW9uIGlzIHVwZ3JhZGVhYmxlIHRvIGEgd2ViIHNvY2tldC5cbiAgICogT3RoZXJ3aXNlIHRoZSB2YWx1ZSBpcyBgZmFsc2VgLiAgVXNlIGAudXBncmFkZSgpYCB0byB1cGdyYWRlIHRoZSBjb25uZWN0aW9uXG4gICAqIGFuZCByZXR1cm4gdGhlIHdlYiBzb2NrZXQuICovXG4gIGdldCBpc1VwZ3JhZGFibGUoKTogYm9vbGVhbiB7XG4gICAgY29uc3QgdXBncmFkZSA9IHRoaXMucmVxdWVzdC5oZWFkZXJzLmdldChcInVwZ3JhZGVcIik7XG4gICAgaWYgKCF1cGdyYWRlIHx8IHVwZ3JhZGUudG9Mb3dlckNhc2UoKSAhPT0gXCJ3ZWJzb2NrZXRcIikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCBzZWNLZXkgPSB0aGlzLnJlcXVlc3QuaGVhZGVycy5nZXQoXCJzZWMtd2Vic29ja2V0LWtleVwiKTtcbiAgICByZXR1cm4gdHlwZW9mIHNlY0tleSA9PT0gXCJzdHJpbmdcIiAmJiBzZWNLZXkgIT0gXCJcIjtcbiAgfVxuXG4gIC8qKiBEZXRlcm1pbmVzIGlmIHRoZSByZXF1ZXN0IHNob3VsZCBiZSByZXNwb25kZWQgdG8uICBJZiBgZmFsc2VgIHdoZW4gdGhlXG4gICAqIG1pZGRsZXdhcmUgY29tcGxldGVzIHByb2Nlc3NpbmcsIHRoZSByZXNwb25zZSB3aWxsIG5vdCBiZSBzZW50IGJhY2sgdG8gdGhlXG4gICAqIHJlcXVlc3Rvci4gIFR5cGljYWxseSB0aGlzIGlzIHVzZWQgaWYgdGhlIG1pZGRsZXdhcmUgd2lsbCB0YWtlIG92ZXIgbG93XG4gICAqIGxldmVsIHByb2Nlc3Npbmcgb2YgcmVxdWVzdHMgYW5kIHJlc3BvbnNlcywgZm9yIGV4YW1wbGUgaWYgdXNpbmcgd2ViXG4gICAqIHNvY2tldHMuICBUaGlzIGF1dG9tYXRpY2FsbHkgZ2V0cyBzZXQgdG8gYGZhbHNlYCB3aGVuIHRoZSBjb250ZXh0IGlzXG4gICAqIHVwZ3JhZGVkIHRvIGEgd2ViIHNvY2tldCB2aWEgdGhlIGAudXBncmFkZSgpYCBtZXRob2QuXG4gICAqXG4gICAqIFRoZSBkZWZhdWx0IGlzIGB0cnVlYC4gKi9cbiAgcmVzcG9uZDogYm9vbGVhbjtcblxuICAvKiogQW4gb2JqZWN0IHdoaWNoIGNvbnRhaW5zIGluZm9ybWF0aW9uIGFib3V0IHRoZSBjdXJyZW50IHJlcXVlc3QuICovXG4gIHJlcXVlc3Q6IFJlcXVlc3Q7XG5cbiAgLyoqIEFuIG9iamVjdCB3aGljaCBjb250YWlucyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgcmVzcG9uc2UgdGhhdCB3aWxsIGJlIHNlbnRcbiAgICogd2hlbiB0aGUgbWlkZGxld2FyZSBmaW5pc2hlcyBwcm9jZXNzaW5nLiAqL1xuICByZXNwb25zZTogUmVzcG9uc2U7XG5cbiAgLyoqIElmIHRoZSB0aGUgY3VycmVudCBjb250ZXh0IGhhcyBiZWVuIHVwZ3JhZGVkLCB0aGVuIHRoaXMgd2lsbCBiZSBzZXQgdG9cbiAgICogd2l0aCB0aGUgY3VycmVudCB3ZWIgc29ja2V0LCBvdGhlcndpc2UgaXQgaXMgYHVuZGVmaW5lZGAuICovXG4gIGdldCBzb2NrZXQoKTogV2ViU29ja2V0IHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy4jc29ja2V0O1xuICB9XG5cbiAgLyoqIFRoZSBvYmplY3QgdG8gcGFzcyBzdGF0ZSB0byBmcm9udC1lbmQgdmlld3MuICBUaGlzIGNhbiBiZSB0eXBlZCBieVxuICAgKiBzdXBwbHlpbmcgdGhlIGdlbmVyaWMgc3RhdGUgYXJndW1lbnQgd2hlbiBjcmVhdGluZyBhIG5ldyBhcHAuICBGb3JcbiAgICogZXhhbXBsZTpcbiAgICpcbiAgICogYGBgdHNcbiAgICogY29uc3QgYXBwID0gbmV3IEFwcGxpY2F0aW9uPHsgZm9vOiBzdHJpbmcgfT4oKTtcbiAgICogYGBgXG4gICAqXG4gICAqIE9yIGNhbiBiZSBjb250ZXh0dWFsbHkgaW5mZXJyZWQgYmFzZWQgb24gc2V0dGluZyBhbiBpbml0aWFsIHN0YXRlIG9iamVjdDpcbiAgICpcbiAgICogYGBgdHNcbiAgICogY29uc3QgYXBwID0gbmV3IEFwcGxpY2F0aW9uKHsgc3RhdGU6IHsgZm9vOiBcImJhclwiIH0gfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBPbiBlYWNoIHJlcXVlc3QvcmVzcG9uc2UgY3ljbGUsIHRoZSBjb250ZXh0J3Mgc3RhdGUgaXMgY2xvbmVkIGZyb20gdGhlXG4gICAqIGFwcGxpY2F0aW9uIHN0YXRlLiBUaGlzIG1lYW5zIGNoYW5nZXMgdG8gdGhlIGNvbnRleHQncyBgLnN0YXRlYCB3aWxsIGJlXG4gICAqIGRyb3BwZWQgd2hlbiB0aGUgcmVxdWVzdCBkcm9wcywgYnV0IFwiZGVmYXVsdHNcIiBjYW4gYmUgYXBwbGllZCB0byB0aGVcbiAgICogYXBwbGljYXRpb24ncyBzdGF0ZS4gIENoYW5nZXMgdG8gdGhlIGFwcGxpY2F0aW9uJ3Mgc3RhdGUgdGhvdWdoIHdvbid0IGJlXG4gICAqIHJlZmxlY3RlZCB1bnRpbCB0aGUgbmV4dCByZXF1ZXN0IGluIHRoZSBjb250ZXh0J3Mgc3RhdGUuXG4gICAqL1xuICBzdGF0ZTogUztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcGxpY2F0aW9uPEFTPixcbiAgICBzZXJ2ZXJSZXF1ZXN0OiBTZXJ2ZXJSZXF1ZXN0LFxuICAgIHN0YXRlOiBTLFxuICAgIHtcbiAgICAgIHNlY3VyZSA9IGZhbHNlLFxuICAgICAganNvbkJvZHlSZXBsYWNlcixcbiAgICAgIGpzb25Cb2R5UmV2aXZlcixcbiAgICB9OiBDb250ZXh0T3B0aW9uczxTLCBBUz4gPSB7fSxcbiAgKSB7XG4gICAgdGhpcy5hcHAgPSBhcHA7XG4gICAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xuICAgIGNvbnN0IHsgcHJveHkgfSA9IGFwcDtcbiAgICB0aGlzLnJlcXVlc3QgPSBuZXcgUmVxdWVzdChcbiAgICAgIHNlcnZlclJlcXVlc3QsXG4gICAgICB7XG4gICAgICAgIHByb3h5LFxuICAgICAgICBzZWN1cmUsXG4gICAgICAgIGpzb25Cb2R5UmV2aXZlcjogdGhpcy4jd3JhcFJldml2ZXJSZXBsYWNlcihqc29uQm9keVJldml2ZXIpLFxuICAgICAgfSxcbiAgICApO1xuICAgIHRoaXMucmVzcG9uZCA9IHRydWU7XG4gICAgdGhpcy5yZXNwb25zZSA9IG5ldyBSZXNwb25zZShcbiAgICAgIHRoaXMucmVxdWVzdCxcbiAgICAgIHRoaXMuI3dyYXBSZXZpdmVyUmVwbGFjZXIoanNvbkJvZHlSZXBsYWNlciksXG4gICAgKTtcbiAgICB0aGlzLmNvb2tpZXMgPSBuZXcgU2VjdXJlQ29va2llTWFwKHNlcnZlclJlcXVlc3QsIHtcbiAgICAgIGtleXM6IHRoaXMuYXBwLmtleXMgYXMgS2V5U3RhY2sgfCB1bmRlZmluZWQsXG4gICAgICByZXNwb25zZTogdGhpcy5yZXNwb25zZSxcbiAgICAgIHNlY3VyZTogdGhpcy5yZXF1ZXN0LnNlY3VyZSxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBBc3NlcnRzIHRoZSBjb25kaXRpb24gYW5kIGlmIHRoZSBjb25kaXRpb24gZmFpbHMsIGNyZWF0ZXMgYW4gSFRUUCBlcnJvclxuICAgKiB3aXRoIHRoZSBwcm92aWRlZCBzdGF0dXMgKHdoaWNoIGRlZmF1bHRzIHRvIGA1MDBgKS4gIFRoZSBlcnJvciBzdGF0dXMgYnlcbiAgICogZGVmYXVsdCB3aWxsIGJlIHNldCBvbiB0aGUgYC5yZXNwb25zZS5zdGF0dXNgLlxuICAgKlxuICAgKiBCZWNhdXNlIG9mIGxpbWl0YXRpb24gb2YgVHlwZVNjcmlwdCwgYW55IGFzc2VydGlvbiB0eXBlIGZ1bmN0aW9uIHJlcXVpcmVzXG4gICAqIHNwZWNpZmljIHR5cGUgYW5ub3RhdGlvbnMsIHNvIHRoZSB7QGxpbmtjb2RlIENvbnRleHR9IHR5cGUgc2hvdWxkIGJlIHVzZWRcbiAgICogZXZlbiBpZiBpdCBjYW4gYmUgaW5mZXJyZWQgZnJvbSB0aGUgY29udGV4dC5cbiAgICpcbiAgICogIyMjIEV4YW1wbGVcbiAgICpcbiAgICogYGBgdHNcbiAgICogaW1wb3J0IHsgQ29udGV4dCwgU3RhdHVzIH0gZnJvbSBcImpzcjpAb2FrL29hay9cIjtcbiAgICpcbiAgICogZXhwb3J0IGZ1bmN0aW9uIG13KGN0eDogQ29udGV4dCkge1xuICAgKiAgIGNvbnN0IGJvZHkgPSBjdHgucmVxdWVzdC5ib2R5KCk7XG4gICAqICAgY3R4LmFzc2VydChib2R5LnR5cGUgPT09IFwianNvblwiLCBTdGF0dXMuTm90QWNjZXB0YWJsZSk7XG4gICAqICAgLy8gcHJvY2VzcyB0aGUgYm9keSBhbmQgc2VuZCBhIHJlc3BvbnNlLi4uXG4gICAqIH1cbiAgICogYGBgXG4gICAqL1xuICBhc3NlcnQoXG4gICAgY29uZGl0aW9uOiB1bmtub3duLFxuICAgIGVycm9yU3RhdHVzOiBFcnJvclN0YXR1cyA9IDUwMCxcbiAgICBtZXNzYWdlPzogc3RyaW5nLFxuICAgIHByb3BzPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gJiBPbWl0PEh0dHBFcnJvck9wdGlvbnMsIFwic3RhdHVzXCI+LFxuICApOiBhc3NlcnRzIGNvbmRpdGlvbiB7XG4gICAgaWYgKGNvbmRpdGlvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBodHRwRXJyb3JPcHRpb25zOiBIdHRwRXJyb3JPcHRpb25zID0ge307XG4gICAgaWYgKHR5cGVvZiBwcm9wcyA9PT0gXCJvYmplY3RcIikge1xuICAgICAgaWYgKFwiaGVhZGVyc1wiIGluIHByb3BzKSB7XG4gICAgICAgIGh0dHBFcnJvck9wdGlvbnMuaGVhZGVycyA9IHByb3BzLmhlYWRlcnM7XG4gICAgICAgIGRlbGV0ZSBwcm9wcy5oZWFkZXJzO1xuICAgICAgfVxuICAgICAgaWYgKFwiZXhwb3NlXCIgaW4gcHJvcHMpIHtcbiAgICAgICAgaHR0cEVycm9yT3B0aW9ucy5leHBvc2UgPSBwcm9wcy5leHBvc2U7XG4gICAgICAgIGRlbGV0ZSBwcm9wcy5leHBvc2U7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGVyciA9IGNyZWF0ZUh0dHBFcnJvcihlcnJvclN0YXR1cywgbWVzc2FnZSwgaHR0cEVycm9yT3B0aW9ucyk7XG4gICAgaWYgKHByb3BzKSB7XG4gICAgICBPYmplY3QuYXNzaWduKGVyciwgcHJvcHMpO1xuICAgIH1cbiAgICB0aHJvdyBlcnI7XG4gIH1cblxuICAvKiogQXN5bmNocm9ub3VzbHkgZnVsZmlsbCBhIHJlc3BvbnNlIHdpdGggYSBmaWxlIGZyb20gdGhlIGxvY2FsIGZpbGVcbiAgICogc3lzdGVtLlxuICAgKlxuICAgKiBJZiB0aGUgYG9wdGlvbnMucGF0aGAgaXMgbm90IHN1cHBsaWVkLCB0aGUgZmlsZSB0byBiZSBzZW50IHdpbGwgZGVmYXVsdFxuICAgKiB0byB0aGlzIGAucmVxdWVzdC51cmwucGF0aG5hbWVgLlxuICAgKlxuICAgKiBSZXF1aXJlcyBEZW5vIHJlYWQgcGVybWlzc2lvbi4gKi9cbiAgc2VuZChvcHRpb25zOiBDb250ZXh0U2VuZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xuICAgIGNvbnN0IHsgcGF0aCA9IHRoaXMucmVxdWVzdC51cmwucGF0aG5hbWUsIC4uLnNlbmRPcHRpb25zIH0gPSBvcHRpb25zO1xuICAgIHJldHVybiBzZW5kKHRoaXMsIHBhdGgsIHNlbmRPcHRpb25zKTtcbiAgfVxuXG4gIC8qKiBDb252ZXJ0IHRoZSBjb25uZWN0aW9uIHRvIHN0cmVhbSBldmVudHMsIHJlc29sdmluZyB3aXRoIGFuIGV2ZW50IHRhcmdldFxuICAgKiBmb3Igc2VuZGluZyBzZXJ2ZXIgc2VudCBldmVudHMuICBFdmVudHMgZGlzcGF0Y2hlZCBvbiB0aGUgcmV0dXJuZWQgdGFyZ2V0XG4gICAqIHdpbGwgYmUgc2VudCB0byB0aGUgY2xpZW50IGFuZCBiZSBhdmFpbGFibGUgaW4gdGhlIGNsaWVudCdzIGBFdmVudFNvdXJjZWBcbiAgICogdGhhdCBpbml0aWF0ZWQgdGhlIGNvbm5lY3Rpb24uXG4gICAqXG4gICAqIEludm9raW5nIHRoaXMgd2lsbCBjYXVzZSB0aGUgYSByZXNwb25zZSB0byBiZSBzZW50IHRvIHRoZSBjbGllbnRcbiAgICogaW1tZWRpYXRlbHkgdG8gaW5pdGlhbGl6ZSB0aGUgc3RyZWFtIG9mIGV2ZW50cywgYW5kIHRoZXJlZm9yZSBhbnkgZnVydGhlclxuICAgKiBjaGFuZ2VzIHRvIHRoZSByZXNwb25zZSwgbGlrZSBoZWFkZXJzIHdpbGwgbm90IHJlYWNoIHRoZSBjbGllbnQuXG4gICAqL1xuICBhc3luYyBzZW5kRXZlbnRzKFxuICAgIG9wdGlvbnM/OiBTZXJ2ZXJTZW50RXZlbnRUYXJnZXRPcHRpb25zLFxuICApOiBQcm9taXNlPFNlcnZlclNlbnRFdmVudFRhcmdldD4ge1xuICAgIGlmICghdGhpcy4jc3NlKSB7XG4gICAgICBjb25zdCBzc2UgPSB0aGlzLiNzc2UgPSBhd2FpdCB0aGlzLnJlcXVlc3Quc2VuZEV2ZW50cyhvcHRpb25zLCB7XG4gICAgICAgIGhlYWRlcnM6IHRoaXMucmVzcG9uc2UuaGVhZGVycyxcbiAgICAgIH0pO1xuICAgICAgdGhpcy5hcHAuYWRkRXZlbnRMaXN0ZW5lcihcImNsb3NlXCIsICgpID0+IHNzZS5jbG9zZSgpKTtcbiAgICAgIHRoaXMucmVzcG9uZCA9IGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy4jc3NlO1xuICB9XG5cbiAgLyoqIENyZWF0ZSBhbmQgdGhyb3cgYW4gSFRUUCBFcnJvciwgd2hpY2ggY2FuIGJlIHVzZWQgdG8gcGFzcyBzdGF0dXNcbiAgICogaW5mb3JtYXRpb24gd2hpY2ggY2FuIGJlIGNhdWdodCBieSBvdGhlciBtaWRkbGV3YXJlIHRvIHNlbmQgbW9yZVxuICAgKiBtZWFuaW5nZnVsIGVycm9yIG1lc3NhZ2VzIGJhY2sgdG8gdGhlIGNsaWVudC4gIFRoZSBwYXNzZWQgZXJyb3Igc3RhdHVzIHdpbGxcbiAgICogYmUgc2V0IG9uIHRoZSBgLnJlc3BvbnNlLnN0YXR1c2AgYnkgZGVmYXVsdCBhcyB3ZWxsLlxuICAgKi9cbiAgdGhyb3coXG4gICAgZXJyb3JTdGF0dXM6IEVycm9yU3RhdHVzLFxuICAgIG1lc3NhZ2U/OiBzdHJpbmcsXG4gICAgcHJvcHM/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgKTogbmV2ZXIge1xuICAgIGNvbnN0IGVyciA9IGNyZWF0ZUh0dHBFcnJvcihlcnJvclN0YXR1cywgbWVzc2FnZSk7XG4gICAgaWYgKHByb3BzKSB7XG4gICAgICBPYmplY3QuYXNzaWduKGVyciwgcHJvcHMpO1xuICAgIH1cbiAgICB0aHJvdyBlcnI7XG4gIH1cblxuICAvKiogVGFrZSB0aGUgY3VycmVudCByZXF1ZXN0IGFuZCB1cGdyYWRlIGl0IHRvIGEgd2ViIHNvY2tldCwgcmVzb2x2aW5nIHdpdGhcbiAgICogdGhlIGEgd2ViIHN0YW5kYXJkIGBXZWJTb2NrZXRgIG9iamVjdC4gVGhpcyB3aWxsIHNldCBgLnJlc3BvbmRgIHRvXG4gICAqIGBmYWxzZWAuICBJZiB0aGUgc29ja2V0IGNhbm5vdCBiZSB1cGdyYWRlZCwgdGhpcyBtZXRob2Qgd2lsbCB0aHJvdy4gKi9cbiAgdXBncmFkZShvcHRpb25zPzogVXBncmFkZVdlYlNvY2tldE9wdGlvbnMpOiBXZWJTb2NrZXQge1xuICAgIGlmICghdGhpcy4jc29ja2V0KSB7XG4gICAgICBjb25zdCBzb2NrZXQgPSB0aGlzLiNzb2NrZXQgPSB0aGlzLnJlcXVlc3QudXBncmFkZShvcHRpb25zKTtcbiAgICAgIHRoaXMuYXBwLmFkZEV2ZW50TGlzdGVuZXIoXCJjbG9zZVwiLCAoKSA9PiBzb2NrZXQuY2xvc2UoKSk7XG4gICAgICB0aGlzLnJlc3BvbmQgPSBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuI3NvY2tldDtcbiAgfVxuXG4gIFtTeW1ib2wuZm9yKFwiRGVuby5jdXN0b21JbnNwZWN0XCIpXShcbiAgICBpbnNwZWN0OiAodmFsdWU6IHVua25vd24pID0+IHN0cmluZyxcbiAgKTogc3RyaW5nIHtcbiAgICBjb25zdCB7XG4gICAgICBhcHAsXG4gICAgICBjb29raWVzLFxuICAgICAgaXNVcGdyYWRhYmxlLFxuICAgICAgcmVzcG9uZCxcbiAgICAgIHJlcXVlc3QsXG4gICAgICByZXNwb25zZSxcbiAgICAgIHNvY2tldCxcbiAgICAgIHN0YXRlLFxuICAgIH0gPSB0aGlzO1xuICAgIHJldHVybiBgJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9ICR7XG4gICAgICBpbnNwZWN0KHtcbiAgICAgICAgYXBwLFxuICAgICAgICBjb29raWVzLFxuICAgICAgICBpc1VwZ3JhZGFibGUsXG4gICAgICAgIHJlc3BvbmQsXG4gICAgICAgIHJlcXVlc3QsXG4gICAgICAgIHJlc3BvbnNlLFxuICAgICAgICBzb2NrZXQsXG4gICAgICAgIHN0YXRlLFxuICAgICAgfSlcbiAgICB9YDtcbiAgfVxuXG4gIFtTeW1ib2wuZm9yKFwibm9kZWpzLnV0aWwuaW5zcGVjdC5jdXN0b21cIildKFxuICAgIGRlcHRoOiBudW1iZXIsXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICBvcHRpb25zOiBhbnksXG4gICAgaW5zcGVjdDogKHZhbHVlOiB1bmtub3duLCBvcHRpb25zPzogdW5rbm93bikgPT4gc3RyaW5nLFxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICk6IGFueSB7XG4gICAgaWYgKGRlcHRoIDwgMCkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShgWyR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfV1gLCBcInNwZWNpYWxcIik7XG4gICAgfVxuXG4gICAgY29uc3QgbmV3T3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHtcbiAgICAgIGRlcHRoOiBvcHRpb25zLmRlcHRoID09PSBudWxsID8gbnVsbCA6IG9wdGlvbnMuZGVwdGggLSAxLFxuICAgIH0pO1xuICAgIGNvbnN0IHtcbiAgICAgIGFwcCxcbiAgICAgIGNvb2tpZXMsXG4gICAgICBpc1VwZ3JhZGFibGUsXG4gICAgICByZXNwb25kLFxuICAgICAgcmVxdWVzdCxcbiAgICAgIHJlc3BvbnNlLFxuICAgICAgc29ja2V0LFxuICAgICAgc3RhdGUsXG4gICAgfSA9IHRoaXM7XG4gICAgcmV0dXJuIGAke29wdGlvbnMuc3R5bGl6ZSh0aGlzLmNvbnN0cnVjdG9yLm5hbWUsIFwic3BlY2lhbFwiKX0gJHtcbiAgICAgIGluc3BlY3Qoe1xuICAgICAgICBhcHAsXG4gICAgICAgIGNvb2tpZXMsXG4gICAgICAgIGlzVXBncmFkYWJsZSxcbiAgICAgICAgcmVzcG9uZCxcbiAgICAgICAgcmVxdWVzdCxcbiAgICAgICAgcmVzcG9uc2UsXG4gICAgICAgIHNvY2tldCxcbiAgICAgICAgc3RhdGUsXG4gICAg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