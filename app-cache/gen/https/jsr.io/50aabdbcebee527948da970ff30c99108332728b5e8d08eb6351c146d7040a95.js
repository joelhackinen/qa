// Copyright 2018-2024 the oak authors. All rights reserved. MIT license.
/** Middleware that converts the oak specific context to a Fetch API standard
 * {@linkcode Request} and {@linkcode Response} along with a modified context
 * providing some of the oak functionality. This is intended to make it easier
 * to adapt code to work with oak.
 *
 * There are two functions which will "wrap" a handler that operates off a
 * Fetch API request and response and return an oak middleware. The
 * {@linkcode serve} is designed for using with the {@linkcode Application}
 * `.use()` method, while {@linkcode route} is designed for using with the
 * {@linkcode Router}.
 *
 * > [!IMPORTANT]
 * > This is not intended for advanced use cases that are supported by oak,
 * > like integrated cookie management, web sockets and server sent events.
 * >
 * > Also, these are designed to be very deterministic request/response handlers
 * > versus a more nuanced middleware stack which allows advanced control.
 * > Therefore there is no `next()`.
 * >
 * > For these advanced use cases, create middleware without the wrapper.
 *
 * @module
 */ var _computedKey, _computedKey1, _computedKey2, _computedKey3;
_computedKey = Symbol.for("Deno.customInspect"), _computedKey1 = Symbol.for("nodejs.util.inspect.custom");
/** The context associated when dealing with serve middleware requests on an
 * application. */ export class ServeContext {
  #context;
  /** A reference to the current application. */ get app() {
    return this.#context.app;
  }
  /** Request remote address. When the application's `.proxy` is true, the
   * `X-Forwarded-For` will be used to determine the requesting remote address.
   */ get ip() {
    return this.#context.request.ip;
  }
  /** When the application's `.proxy` is `true`, this will be set to an array of
   * IPs, ordered from upstream to downstream, based on the value of the header
   * `X-Forwarded-For`.  When `false` an empty array is returned. */ get ips() {
    return this.#context.request.ips;
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
   */ get state() {
    return this.#context.state;
  }
  constructor(context){
    this.#context = context;
  }
  /** Asserts the condition and if the condition fails, creates an HTTP error
   * with the provided status (which defaults to `500`).  The error status by
   * default will be set on the `.response.status`.
   *
   * Because of limitation of TypeScript, any assertion type function requires
   * specific type annotations, so the {@linkcode ServeContext} type should be
   * used even if it can be inferred from the context.
   */ assert(condition, status, message, props) {
    this.#context.assert(condition, status, message, props);
  }
  /** Create and throw an HTTP Error, which can be used to pass status
   * information which can be caught by other middleware to send more
   * meaningful error messages back to the client.  The passed error status will
   * be set on the `.response.status` by default as well.
   */ throw(errorStatus, message, props) {
    this.#context.throw(errorStatus, message, props);
  }
  [_computedKey](inspect) {
    const { app, ip, ips, state } = this;
    return `${this.constructor.name} ${inspect({
      app,
      ip,
      ips,
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
    const { app, ip, ips, state } = this;
    return `${options.stylize(this.constructor.name, "special")} ${inspect({
      app,
      ip,
      ips,
      state
    }, newOptions)}`;
  }
}
_computedKey2 = Symbol.for("Deno.customInspect"), _computedKey3 = Symbol.for("nodejs.util.inspect.custom");
/** The context associated with serve middleware requests on a router. */ export class RouteContext extends ServeContext {
  #captures;
  #matched;
  #params;
  #router;
  #routeName;
  #routerPath;
  /** When matching the route, an array of the capturing groups from the regular
   * expression. */ get captures() {
    return this.#captures;
  }
  /** The routes that were matched for this request. */ get matched() {
    return this.#matched;
  }
  /** Any parameters parsed from the route when matched. */ get params() {
    return this.#params;
  }
  /** A reference to the router instance. */ get router() {
    return this.#router;
  }
  /** If the matched route has a `name`, the matched route name is provided
   * here. */ get routeName() {
    return this.#routeName;
  }
  /** Overrides the matched path for future route middleware, when a
   * `routerPath` option is not defined on the `Router` options. */ get routerPath() {
    return this.#routerPath;
  }
  constructor(context){
    super(context);
    const { captures, matched, params, router, routeName, routerPath } = context;
    this.#captures = captures;
    this.#matched = matched;
    this.#params = params;
    this.#router = router;
    this.#routeName = routeName;
    this.#routerPath = routerPath;
  }
  [_computedKey2](inspect) {
    const { app, captures, matched, ip, ips, params, router, routeName, routerPath, state } = this;
    return `${this.constructor.name} ${inspect({
      app,
      captures,
      matched,
      ip,
      ips,
      params,
      router,
      routeName,
      routerPath,
      state
    })}`;
  }
  [_computedKey3](depth, // deno-lint-ignore no-explicit-any
  options, inspect) {
    if (depth < 0) {
      return options.stylize(`[${this.constructor.name}]`, "special");
    }
    const newOptions = Object.assign({}, options, {
      depth: options.depth === null ? null : options.depth - 1
    });
    const { app, captures, matched, ip, ips, params, router, routeName, routerPath, state } = this;
    return `${options.stylize(this.constructor.name, "special")} ${inspect({
      app,
      captures,
      matched,
      ip,
      ips,
      params,
      router,
      routeName,
      routerPath,
      state
    }, newOptions)}`;
  }
}
/** Wrap a handler function to generate middleware that can be used with an oak
 * {@linkcode Application}. This allows the handler to deal with a Fetch API
 * standard {@linkcode Request} and return a standard {@linkcode Response}.
 */ export function serve(middleware) {
  return async (ctx, next)=>{
    const request = ctx.request.source ?? new Request(ctx.request.url, {
      ...ctx.request,
      body: ctx.request.body.stream
    });
    const context = new ServeContext(ctx);
    const response = await middleware(request, context);
    ctx.response.with(response);
    return next();
  };
}
/** Wrap a handler function to generate middleware that can be used with an oak
 * {@linkcode Router}. This allows the handler to deal with a Fetch API standard
 * {@linkcode Request} and return a standard {@linkcode Response}.
 */ export function route(middleware) {
  return async (ctx, next)=>{
    const request = ctx.request.source ?? new Request(ctx.request.url, {
      ...ctx.request,
      body: ctx.request.body.stream
    });
    const context = new RouteContext(ctx);
    const response = await middleware(request, context);
    ctx.response.with(response);
    return next();
  };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvb2FrLzE2LjEuMC9taWRkbGV3YXJlL3NlcnZlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjQgdGhlIG9hayBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuLyoqIE1pZGRsZXdhcmUgdGhhdCBjb252ZXJ0cyB0aGUgb2FrIHNwZWNpZmljIGNvbnRleHQgdG8gYSBGZXRjaCBBUEkgc3RhbmRhcmRcbiAqIHtAbGlua2NvZGUgUmVxdWVzdH0gYW5kIHtAbGlua2NvZGUgUmVzcG9uc2V9IGFsb25nIHdpdGggYSBtb2RpZmllZCBjb250ZXh0XG4gKiBwcm92aWRpbmcgc29tZSBvZiB0aGUgb2FrIGZ1bmN0aW9uYWxpdHkuIFRoaXMgaXMgaW50ZW5kZWQgdG8gbWFrZSBpdCBlYXNpZXJcbiAqIHRvIGFkYXB0IGNvZGUgdG8gd29yayB3aXRoIG9hay5cbiAqXG4gKiBUaGVyZSBhcmUgdHdvIGZ1bmN0aW9ucyB3aGljaCB3aWxsIFwid3JhcFwiIGEgaGFuZGxlciB0aGF0IG9wZXJhdGVzIG9mZiBhXG4gKiBGZXRjaCBBUEkgcmVxdWVzdCBhbmQgcmVzcG9uc2UgYW5kIHJldHVybiBhbiBvYWsgbWlkZGxld2FyZS4gVGhlXG4gKiB7QGxpbmtjb2RlIHNlcnZlfSBpcyBkZXNpZ25lZCBmb3IgdXNpbmcgd2l0aCB0aGUge0BsaW5rY29kZSBBcHBsaWNhdGlvbn1cbiAqIGAudXNlKClgIG1ldGhvZCwgd2hpbGUge0BsaW5rY29kZSByb3V0ZX0gaXMgZGVzaWduZWQgZm9yIHVzaW5nIHdpdGggdGhlXG4gKiB7QGxpbmtjb2RlIFJvdXRlcn0uXG4gKlxuICogPiBbIUlNUE9SVEFOVF1cbiAqID4gVGhpcyBpcyBub3QgaW50ZW5kZWQgZm9yIGFkdmFuY2VkIHVzZSBjYXNlcyB0aGF0IGFyZSBzdXBwb3J0ZWQgYnkgb2FrLFxuICogPiBsaWtlIGludGVncmF0ZWQgY29va2llIG1hbmFnZW1lbnQsIHdlYiBzb2NrZXRzIGFuZCBzZXJ2ZXIgc2VudCBldmVudHMuXG4gKiA+XG4gKiA+IEFsc28sIHRoZXNlIGFyZSBkZXNpZ25lZCB0byBiZSB2ZXJ5IGRldGVybWluaXN0aWMgcmVxdWVzdC9yZXNwb25zZSBoYW5kbGVyc1xuICogPiB2ZXJzdXMgYSBtb3JlIG51YW5jZWQgbWlkZGxld2FyZSBzdGFjayB3aGljaCBhbGxvd3MgYWR2YW5jZWQgY29udHJvbC5cbiAqID4gVGhlcmVmb3JlIHRoZXJlIGlzIG5vIGBuZXh0KClgLlxuICogPlxuICogPiBGb3IgdGhlc2UgYWR2YW5jZWQgdXNlIGNhc2VzLCBjcmVhdGUgbWlkZGxld2FyZSB3aXRob3V0IHRoZSB3cmFwcGVyLlxuICpcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IEFwcGxpY2F0aW9uLCBTdGF0ZSB9IGZyb20gXCIuLi9hcHBsaWNhdGlvbi50c1wiO1xuaW1wb3J0IHR5cGUgeyBDb250ZXh0IH0gZnJvbSBcIi4uL2NvbnRleHQudHNcIjtcbmltcG9ydCB0eXBlIHsgRXJyb3JTdGF0dXMsIEh0dHBFcnJvck9wdGlvbnMgfSBmcm9tIFwiLi4vZGVwcy50c1wiO1xuaW1wb3J0IHR5cGUgeyBNaWRkbGV3YXJlIH0gZnJvbSBcIi4uL21pZGRsZXdhcmUudHNcIjtcbmltcG9ydCB0eXBlIHtcbiAgTGF5ZXIsXG4gIFJvdXRlUGFyYW1zLFxuICBSb3V0ZXIsXG4gIFJvdXRlckNvbnRleHQsXG4gIFJvdXRlck1pZGRsZXdhcmUsXG59IGZyb20gXCIuLi9yb3V0ZXIudHNcIjtcblxuLyoqIFRoZSBjb250ZXh0IGFzc29jaWF0ZWQgd2hlbiBkZWFsaW5nIHdpdGggc2VydmUgbWlkZGxld2FyZSByZXF1ZXN0cyBvbiBhblxuICogYXBwbGljYXRpb24uICovXG5leHBvcnQgY2xhc3MgU2VydmVDb250ZXh0PFMgZXh0ZW5kcyBTdGF0ZSA9IFN0YXRlPiB7XG4gICNjb250ZXh0OiBDb250ZXh0PFM+O1xuXG4gIC8qKiBBIHJlZmVyZW5jZSB0byB0aGUgY3VycmVudCBhcHBsaWNhdGlvbi4gKi9cbiAgZ2V0IGFwcCgpOiBBcHBsaWNhdGlvbjxTPiB7XG4gICAgcmV0dXJuIHRoaXMuI2NvbnRleHQuYXBwIGFzIEFwcGxpY2F0aW9uPFM+O1xuICB9XG5cbiAgLyoqIFJlcXVlc3QgcmVtb3RlIGFkZHJlc3MuIFdoZW4gdGhlIGFwcGxpY2F0aW9uJ3MgYC5wcm94eWAgaXMgdHJ1ZSwgdGhlXG4gICAqIGBYLUZvcndhcmRlZC1Gb3JgIHdpbGwgYmUgdXNlZCB0byBkZXRlcm1pbmUgdGhlIHJlcXVlc3RpbmcgcmVtb3RlIGFkZHJlc3MuXG4gICAqL1xuICBnZXQgaXAoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy4jY29udGV4dC5yZXF1ZXN0LmlwO1xuICB9XG5cbiAgLyoqIFdoZW4gdGhlIGFwcGxpY2F0aW9uJ3MgYC5wcm94eWAgaXMgYHRydWVgLCB0aGlzIHdpbGwgYmUgc2V0IHRvIGFuIGFycmF5IG9mXG4gICAqIElQcywgb3JkZXJlZCBmcm9tIHVwc3RyZWFtIHRvIGRvd25zdHJlYW0sIGJhc2VkIG9uIHRoZSB2YWx1ZSBvZiB0aGUgaGVhZGVyXG4gICAqIGBYLUZvcndhcmRlZC1Gb3JgLiAgV2hlbiBgZmFsc2VgIGFuIGVtcHR5IGFycmF5IGlzIHJldHVybmVkLiAqL1xuICBnZXQgaXBzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gdGhpcy4jY29udGV4dC5yZXF1ZXN0LmlwcztcbiAgfVxuXG4gIC8qKiBUaGUgb2JqZWN0IHRvIHBhc3Mgc3RhdGUgdG8gZnJvbnQtZW5kIHZpZXdzLiAgVGhpcyBjYW4gYmUgdHlwZWQgYnlcbiAgICogc3VwcGx5aW5nIHRoZSBnZW5lcmljIHN0YXRlIGFyZ3VtZW50IHdoZW4gY3JlYXRpbmcgYSBuZXcgYXBwLiAgRm9yXG4gICAqIGV4YW1wbGU6XG4gICAqXG4gICAqIGBgYHRzXG4gICAqIGNvbnN0IGFwcCA9IG5ldyBBcHBsaWNhdGlvbjx7IGZvbzogc3RyaW5nIH0+KCk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBPciBjYW4gYmUgY29udGV4dHVhbGx5IGluZmVycmVkIGJhc2VkIG9uIHNldHRpbmcgYW4gaW5pdGlhbCBzdGF0ZSBvYmplY3Q6XG4gICAqXG4gICAqIGBgYHRzXG4gICAqIGNvbnN0IGFwcCA9IG5ldyBBcHBsaWNhdGlvbih7IHN0YXRlOiB7IGZvbzogXCJiYXJcIiB9IH0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogT24gZWFjaCByZXF1ZXN0L3Jlc3BvbnNlIGN5Y2xlLCB0aGUgY29udGV4dCdzIHN0YXRlIGlzIGNsb25lZCBmcm9tIHRoZVxuICAgKiBhcHBsaWNhdGlvbiBzdGF0ZS4gVGhpcyBtZWFucyBjaGFuZ2VzIHRvIHRoZSBjb250ZXh0J3MgYC5zdGF0ZWAgd2lsbCBiZVxuICAgKiBkcm9wcGVkIHdoZW4gdGhlIHJlcXVlc3QgZHJvcHMsIGJ1dCBcImRlZmF1bHRzXCIgY2FuIGJlIGFwcGxpZWQgdG8gdGhlXG4gICAqIGFwcGxpY2F0aW9uJ3Mgc3RhdGUuICBDaGFuZ2VzIHRvIHRoZSBhcHBsaWNhdGlvbidzIHN0YXRlIHRob3VnaCB3b24ndCBiZVxuICAgKiByZWZsZWN0ZWQgdW50aWwgdGhlIG5leHQgcmVxdWVzdCBpbiB0aGUgY29udGV4dCdzIHN0YXRlLlxuICAgKi9cbiAgZ2V0IHN0YXRlKCk6IFMge1xuICAgIHJldHVybiB0aGlzLiNjb250ZXh0LnN0YXRlO1xuICB9XG5cbiAgY29uc3RydWN0b3IoY29udGV4dDogQ29udGV4dDxTPikge1xuICAgIHRoaXMuI2NvbnRleHQgPSBjb250ZXh0O1xuICB9XG5cbiAgLyoqIEFzc2VydHMgdGhlIGNvbmRpdGlvbiBhbmQgaWYgdGhlIGNvbmRpdGlvbiBmYWlscywgY3JlYXRlcyBhbiBIVFRQIGVycm9yXG4gICAqIHdpdGggdGhlIHByb3ZpZGVkIHN0YXR1cyAod2hpY2ggZGVmYXVsdHMgdG8gYDUwMGApLiAgVGhlIGVycm9yIHN0YXR1cyBieVxuICAgKiBkZWZhdWx0IHdpbGwgYmUgc2V0IG9uIHRoZSBgLnJlc3BvbnNlLnN0YXR1c2AuXG4gICAqXG4gICAqIEJlY2F1c2Ugb2YgbGltaXRhdGlvbiBvZiBUeXBlU2NyaXB0LCBhbnkgYXNzZXJ0aW9uIHR5cGUgZnVuY3Rpb24gcmVxdWlyZXNcbiAgICogc3BlY2lmaWMgdHlwZSBhbm5vdGF0aW9ucywgc28gdGhlIHtAbGlua2NvZGUgU2VydmVDb250ZXh0fSB0eXBlIHNob3VsZCBiZVxuICAgKiB1c2VkIGV2ZW4gaWYgaXQgY2FuIGJlIGluZmVycmVkIGZyb20gdGhlIGNvbnRleHQuXG4gICAqL1xuICBhc3NlcnQoXG4gICAgY29uZGl0aW9uOiB1bmtub3duLFxuICAgIHN0YXR1cz86IEVycm9yU3RhdHVzLFxuICAgIG1lc3NhZ2U/OiBzdHJpbmcsXG4gICAgcHJvcHM/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiAmIE9taXQ8SHR0cEVycm9yT3B0aW9ucywgXCJzdGF0dXNcIj4sXG4gICk6IGFzc2VydHMgY29uZGl0aW9uIHtcbiAgICB0aGlzLiNjb250ZXh0LmFzc2VydChjb25kaXRpb24sIHN0YXR1cywgbWVzc2FnZSwgcHJvcHMpO1xuICB9XG5cbiAgLyoqIENyZWF0ZSBhbmQgdGhyb3cgYW4gSFRUUCBFcnJvciwgd2hpY2ggY2FuIGJlIHVzZWQgdG8gcGFzcyBzdGF0dXNcbiAgICogaW5mb3JtYXRpb24gd2hpY2ggY2FuIGJlIGNhdWdodCBieSBvdGhlciBtaWRkbGV3YXJlIHRvIHNlbmQgbW9yZVxuICAgKiBtZWFuaW5nZnVsIGVycm9yIG1lc3NhZ2VzIGJhY2sgdG8gdGhlIGNsaWVudC4gIFRoZSBwYXNzZWQgZXJyb3Igc3RhdHVzIHdpbGxcbiAgICogYmUgc2V0IG9uIHRoZSBgLnJlc3BvbnNlLnN0YXR1c2AgYnkgZGVmYXVsdCBhcyB3ZWxsLlxuICAgKi9cbiAgdGhyb3coXG4gICAgZXJyb3JTdGF0dXM6IEVycm9yU3RhdHVzLFxuICAgIG1lc3NhZ2U/OiBzdHJpbmcsXG4gICAgcHJvcHM/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgKTogbmV2ZXIge1xuICAgIHRoaXMuI2NvbnRleHQudGhyb3coZXJyb3JTdGF0dXMsIG1lc3NhZ2UsIHByb3BzKTtcbiAgfVxuXG4gIFtTeW1ib2wuZm9yKFwiRGVuby5jdXN0b21JbnNwZWN0XCIpXShcbiAgICBpbnNwZWN0OiAodmFsdWU6IHVua25vd24pID0+IHN0cmluZyxcbiAgKTogc3RyaW5nIHtcbiAgICBjb25zdCB7IGFwcCwgaXAsIGlwcywgc3RhdGUgfSA9IHRoaXM7XG4gICAgcmV0dXJuIGAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gJHtpbnNwZWN0KHsgYXBwLCBpcCwgaXBzLCBzdGF0ZSB9KX1gO1xuICB9XG5cbiAgW1N5bWJvbC5mb3IoXCJub2RlanMudXRpbC5pbnNwZWN0LmN1c3RvbVwiKV0oXG4gICAgZGVwdGg6IG51bWJlcixcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIG9wdGlvbnM6IGFueSxcbiAgICBpbnNwZWN0OiAodmFsdWU6IHVua25vd24sIG9wdGlvbnM/OiB1bmtub3duKSA9PiBzdHJpbmcsXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgKTogYW55IHtcbiAgICBpZiAoZGVwdGggPCAwKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKGBbJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9XWAsIFwic3BlY2lhbFwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBuZXdPcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywge1xuICAgICAgZGVwdGg6IG9wdGlvbnMuZGVwdGggPT09IG51bGwgPyBudWxsIDogb3B0aW9ucy5kZXB0aCAtIDEsXG4gICAgfSk7XG4gICAgY29uc3QgeyBhcHAsIGlwLCBpcHMsIHN0YXRlIH0gPSB0aGlzO1xuICAgIHJldHVybiBgJHtvcHRpb25zLnN0eWxpemUodGhpcy5jb25zdHJ1Y3Rvci5uYW1lLCBcInNwZWNpYWxcIil9ICR7XG4gICAgICBpbnNwZWN0KHsgYXBwLCBpcCwgaXBzLCBzdGF0ZSB9LCBuZXdPcHRpb25zKVxuICAgIH1gO1xuICB9XG59XG5cbi8qKiBUaGUgY29udGV4dCBhc3NvY2lhdGVkIHdpdGggc2VydmUgbWlkZGxld2FyZSByZXF1ZXN0cyBvbiBhIHJvdXRlci4gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZUNvbnRleHQ8XG4gIFIgZXh0ZW5kcyBzdHJpbmcsXG4gIFAgZXh0ZW5kcyBSb3V0ZVBhcmFtczxSPiA9IFJvdXRlUGFyYW1zPFI+LFxuICBTIGV4dGVuZHMgU3RhdGUgPSBTdGF0ZSxcbj4gZXh0ZW5kcyBTZXJ2ZUNvbnRleHQ8Uz4ge1xuICAjY2FwdHVyZXM6IHN0cmluZ1tdO1xuICAjbWF0Y2hlZD86IExheWVyPFIsIFAsIFM+W107XG4gICNwYXJhbXM6IFA7XG4gICNyb3V0ZXI6IFJvdXRlcjxTPjtcbiAgI3JvdXRlTmFtZT86IHN0cmluZztcbiAgI3JvdXRlclBhdGg/OiBzdHJpbmc7XG5cbiAgLyoqIFdoZW4gbWF0Y2hpbmcgdGhlIHJvdXRlLCBhbiBhcnJheSBvZiB0aGUgY2FwdHVyaW5nIGdyb3VwcyBmcm9tIHRoZSByZWd1bGFyXG4gICAqIGV4cHJlc3Npb24uICovXG4gIGdldCBjYXB0dXJlcygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIHRoaXMuI2NhcHR1cmVzO1xuICB9XG5cbiAgLyoqIFRoZSByb3V0ZXMgdGhhdCB3ZXJlIG1hdGNoZWQgZm9yIHRoaXMgcmVxdWVzdC4gKi9cbiAgZ2V0IG1hdGNoZWQoKTogTGF5ZXI8UiwgUCwgUz5bXSB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuI21hdGNoZWQ7XG4gIH1cblxuICAvKiogQW55IHBhcmFtZXRlcnMgcGFyc2VkIGZyb20gdGhlIHJvdXRlIHdoZW4gbWF0Y2hlZC4gKi9cbiAgZ2V0IHBhcmFtcygpOiBQIHtcbiAgICByZXR1cm4gdGhpcy4jcGFyYW1zO1xuICB9XG5cbiAgLyoqIEEgcmVmZXJlbmNlIHRvIHRoZSByb3V0ZXIgaW5zdGFuY2UuICovXG4gIGdldCByb3V0ZXIoKTogUm91dGVyPFM+IHtcbiAgICByZXR1cm4gdGhpcy4jcm91dGVyO1xuICB9XG5cbiAgLyoqIElmIHRoZSBtYXRjaGVkIHJvdXRlIGhhcyBhIGBuYW1lYCwgdGhlIG1hdGNoZWQgcm91dGUgbmFtZSBpcyBwcm92aWRlZFxuICAgKiBoZXJlLiAqL1xuICBnZXQgcm91dGVOYW1lKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuI3JvdXRlTmFtZTtcbiAgfVxuXG4gIC8qKiBPdmVycmlkZXMgdGhlIG1hdGNoZWQgcGF0aCBmb3IgZnV0dXJlIHJvdXRlIG1pZGRsZXdhcmUsIHdoZW4gYVxuICAgKiBgcm91dGVyUGF0aGAgb3B0aW9uIGlzIG5vdCBkZWZpbmVkIG9uIHRoZSBgUm91dGVyYCBvcHRpb25zLiAqL1xuICBnZXQgcm91dGVyUGF0aCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLiNyb3V0ZXJQYXRoO1xuICB9XG5cbiAgY29uc3RydWN0b3IoY29udGV4dDogUm91dGVyQ29udGV4dDxSLCBQLCBTPikge1xuICAgIHN1cGVyKGNvbnRleHQpO1xuICAgIGNvbnN0IHsgY2FwdHVyZXMsIG1hdGNoZWQsIHBhcmFtcywgcm91dGVyLCByb3V0ZU5hbWUsIHJvdXRlclBhdGggfSA9XG4gICAgICBjb250ZXh0O1xuICAgIHRoaXMuI2NhcHR1cmVzID0gY2FwdHVyZXM7XG4gICAgdGhpcy4jbWF0Y2hlZCA9IG1hdGNoZWQ7XG4gICAgdGhpcy4jcGFyYW1zID0gcGFyYW1zO1xuICAgIHRoaXMuI3JvdXRlciA9IHJvdXRlcjtcbiAgICB0aGlzLiNyb3V0ZU5hbWUgPSByb3V0ZU5hbWU7XG4gICAgdGhpcy4jcm91dGVyUGF0aCA9IHJvdXRlclBhdGg7XG4gIH1cblxuICBbU3ltYm9sLmZvcihcIkRlbm8uY3VzdG9tSW5zcGVjdFwiKV0oXG4gICAgaW5zcGVjdDogKHZhbHVlOiB1bmtub3duKSA9PiBzdHJpbmcsXG4gICk6IHN0cmluZyB7XG4gICAgY29uc3Qge1xuICAgICAgYXBwLFxuICAgICAgY2FwdHVyZXMsXG4gICAgICBtYXRjaGVkLFxuICAgICAgaXAsXG4gICAgICBpcHMsXG4gICAgICBwYXJhbXMsXG4gICAgICByb3V0ZXIsXG4gICAgICByb3V0ZU5hbWUsXG4gICAgICByb3V0ZXJQYXRoLFxuICAgICAgc3RhdGUsXG4gICAgfSA9IHRoaXM7XG4gICAgcmV0dXJuIGAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gJHtcbiAgICAgIGluc3BlY3Qoe1xuICAgICAgICBhcHAsXG4gICAgICAgIGNhcHR1cmVzLFxuICAgICAgICBtYXRjaGVkLFxuICAgICAgICBpcCxcbiAgICAgICAgaXBzLFxuICAgICAgICBwYXJhbXMsXG4gICAgICAgIHJvdXRlcixcbiAgICAgICAgcm91dGVOYW1lLFxuICAgICAgICByb3V0ZXJQYXRoLFxuICAgICAgICBzdGF0ZSxcbiAgICAgIH0pXG4gICAgfWA7XG4gIH1cblxuICBbU3ltYm9sLmZvcihcIm5vZGVqcy51dGlsLmluc3BlY3QuY3VzdG9tXCIpXShcbiAgICBkZXB0aDogbnVtYmVyLFxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgb3B0aW9uczogYW55LFxuICAgIGluc3BlY3Q6ICh2YWx1ZTogdW5rbm93biwgb3B0aW9ucz86IHVua25vd24pID0+IHN0cmluZyxcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICApOiBhbnkge1xuICAgIGlmIChkZXB0aCA8IDApIHtcbiAgICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUoYFske3RoaXMuY29uc3RydWN0b3IubmFtZX1dYCwgXCJzcGVjaWFsXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IG5ld09wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7XG4gICAgICBkZXB0aDogb3B0aW9ucy5kZXB0aCA9PT0gbnVsbCA/IG51bGwgOiBvcHRpb25zLmRlcHRoIC0gMSxcbiAgICB9KTtcbiAgICBjb25zdCB7XG4gICAgICBhcHAsXG4gICAgICBjYXB0dXJlcyxcbiAgICAgIG1hdGNoZWQsXG4gICAgICBpcCxcbiAgICAgIGlwcyxcbiAgICAgIHBhcmFtcyxcbiAgICAgIHJvdXRlcixcbiAgICAgIHJvdXRlTmFtZSxcbiAgICAgIHJvdXRlclBhdGgsXG4gICAgICBzdGF0ZSxcbiAgICB9ID0gdGhpcztcbiAgICByZXR1cm4gYCR7b3B0aW9ucy5zdHlsaXplKHRoaXMuY29uc3RydWN0b3IubmFtZSwgXCJzcGVjaWFsXCIpfSAke1xuICAgICAgaW5zcGVjdCh7XG4gICAgICAgIGFwcCxcbiAgICAgICAgY2FwdHVyZXMsXG4gICAgICAgIG1hdGNoZWQsXG4gICAgICAgIGlwLFxuICAgICAgICBpcHMsXG4gICAgICAgIHBhcmFtcyxcbiAgICAgICAgcm91dGVyLFxuICAgICAgICByb3V0ZU5hbWUsXG4gICAgICAgIHJvdXRlclBhdGgsXG4gICAgICAgIHN0YXRlLFxuICAgICAgfSwgbmV3T3B0aW9ucylcbiAgICB9YDtcbiAgfVxufVxuXG50eXBlIFNlcnZlTWlkZGxld2FyZTxTIGV4dGVuZHMgU3RhdGU+ID0gKFxuICByZXF1ZXN0OiBSZXF1ZXN0LFxuICBjb250ZXh0OiBTZXJ2ZUNvbnRleHQ8Uz4sXG4pID0+IFJlc3BvbnNlIHwgUHJvbWlzZTxSZXNwb25zZT47XG5cbnR5cGUgU2VydmVSb3V0ZXJNaWRkbGV3YXJlPFxuICBSIGV4dGVuZHMgc3RyaW5nLFxuICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8Uj4sXG4gIFMgZXh0ZW5kcyBTdGF0ZSxcbj4gPSAoXG4gIHJlcXVlc3Q6IFJlcXVlc3QsXG4gIGNvbnRleHQ6IFJvdXRlQ29udGV4dDxSLCBQLCBTPixcbikgPT4gUmVzcG9uc2UgfCBQcm9taXNlPFJlc3BvbnNlPjtcblxuLyoqIFdyYXAgYSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGdlbmVyYXRlIG1pZGRsZXdhcmUgdGhhdCBjYW4gYmUgdXNlZCB3aXRoIGFuIG9ha1xuICoge0BsaW5rY29kZSBBcHBsaWNhdGlvbn0uIFRoaXMgYWxsb3dzIHRoZSBoYW5kbGVyIHRvIGRlYWwgd2l0aCBhIEZldGNoIEFQSVxuICogc3RhbmRhcmQge0BsaW5rY29kZSBSZXF1ZXN0fSBhbmQgcmV0dXJuIGEgc3RhbmRhcmQge0BsaW5rY29kZSBSZXNwb25zZX0uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXJ2ZTxTIGV4dGVuZHMgU3RhdGU+KFxuICBtaWRkbGV3YXJlOiBTZXJ2ZU1pZGRsZXdhcmU8Uz4sXG4pOiBNaWRkbGV3YXJlPFM+IHtcbiAgcmV0dXJuIGFzeW5jIChjdHgsIG5leHQpID0+IHtcbiAgICBjb25zdCByZXF1ZXN0ID0gY3R4LnJlcXVlc3Quc291cmNlID8/IG5ldyBSZXF1ZXN0KGN0eC5yZXF1ZXN0LnVybCwge1xuICAgICAgLi4uY3R4LnJlcXVlc3QsXG4gICAgICBib2R5OiBjdHgucmVxdWVzdC5ib2R5LnN0cmVhbSxcbiAgICB9KTtcbiAgICBjb25zdCBjb250ZXh0ID0gbmV3IFNlcnZlQ29udGV4dChjdHgpO1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgbWlkZGxld2FyZShyZXF1ZXN0LCBjb250ZXh0KTtcbiAgICBjdHgucmVzcG9uc2Uud2l0aChyZXNwb25zZSk7XG4gICAgcmV0dXJuIG5leHQoKTtcbiAgfTtcbn1cblxuLyoqIFdyYXAgYSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGdlbmVyYXRlIG1pZGRsZXdhcmUgdGhhdCBjYW4gYmUgdXNlZCB3aXRoIGFuIG9ha1xuICoge0BsaW5rY29kZSBSb3V0ZXJ9LiBUaGlzIGFsbG93cyB0aGUgaGFuZGxlciB0byBkZWFsIHdpdGggYSBGZXRjaCBBUEkgc3RhbmRhcmRcbiAqIHtAbGlua2NvZGUgUmVxdWVzdH0gYW5kIHJldHVybiBhIHN0YW5kYXJkIHtAbGlua2NvZGUgUmVzcG9uc2V9LlxuICovXG5leHBvcnQgZnVuY3Rpb24gcm91dGU8XG4gIFIgZXh0ZW5kcyBzdHJpbmcsXG4gIFAgZXh0ZW5kcyBSb3V0ZVBhcmFtczxSPixcbiAgUyBleHRlbmRzIFN0YXRlLFxuPihtaWRkbGV3YXJlOiBTZXJ2ZVJvdXRlck1pZGRsZXdhcmU8UiwgUCwgUz4pOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+IHtcbiAgcmV0dXJuIGFzeW5jIChjdHgsIG5leHQpID0+IHtcbiAgICBjb25zdCByZXF1ZXN0ID0gY3R4LnJlcXVlc3Quc291cmNlID8/IG5ldyBSZXF1ZXN0KGN0eC5yZXF1ZXN0LnVybCwge1xuICAgICAgLi4uY3R4LnJlcXVlc3QsXG4gICAgICBib2R5OiBjdHgucmVxdWVzdC5ib2R5LnN0cmVhbSxcbiAgICB9KTtcbiAgICBjb25zdCBjb250ZXh0ID0gbmV3IFJvdXRlQ29udGV4dChjdHgpO1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgbWlkZGxld2FyZShyZXF1ZXN0LCBjb250ZXh0KTtcbiAgICBjdHgucmVzcG9uc2Uud2l0aChyZXNwb25zZSk7XG4gICAgcmV0dXJuIG5leHQoKTtcbiAgfTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSx5RUFBeUU7QUFFekU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FzQkM7ZUFnR0UsT0FBTyxHQUFHLENBQUMsdUNBT1gsT0FBTyxHQUFHLENBQUM7QUF6RmQ7Z0JBQ2dCLEdBQ2hCLE9BQU8sTUFBTTtFQUNYLENBQUMsT0FBTyxDQUFhO0VBRXJCLDRDQUE0QyxHQUM1QyxJQUFJLE1BQXNCO0lBQ3hCLE9BQU8sSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUc7RUFDMUI7RUFFQTs7R0FFQyxHQUNELElBQUksS0FBYTtJQUNmLE9BQU8sSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO0VBQ2pDO0VBRUE7O2tFQUVnRSxHQUNoRSxJQUFJLE1BQWdCO0lBQ2xCLE9BQU8sSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHO0VBQ2xDO0VBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FtQkMsR0FDRCxJQUFJLFFBQVc7SUFDYixP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