/**
 * Contains the router of oak. Typical usage is the creation of an application
 * instance, the creation of a router instance, registration of route
 * middleware, registration of router with the application, and then starting to
 * listen for requests.
 *
 * # Example
 *
 * ```ts
 * import { Application } from "jsr:@oak/oak@14/application";
 * import { Router } from "jsr:@oak/oak@14/router";
 *
 * const app = new Application();
 * const router = new Router();
 * router.get("/", (ctx) => {
 *   ctx.response.body = "hello world!";
 * });
 * app.use(router.routes());
 * app.use(router.allowedMethods());
 *
 * app.listen();
 * ```
 *
 * @module
 */ /**
 * Adapted directly from @koa/router at
 * https://github.com/koajs/router/ which is licensed as:
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Alexander C. Mingoia
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */ var _computedKey, _computedKey1, _computedKey2, _computedKey3, _computedKey4;
import { assert, compile, errors, pathParse, pathToRegexp, Status } from "./deps.ts";
import { compose } from "./middleware.ts";
import { decodeComponent } from "./utils/decode_component.ts";
/** Generate a URL from a string, potentially replace route params with
 * values. */ function toUrl(url, params = {}, options) {
  const tokens = pathParse(url);
  let replace = {};
  if (tokens.some((token)=>typeof token === "object")) {
    replace = params;
  } else {
    options = params;
  }
  const toPath = compile(url, options);
  const replaced = toPath(replace);
  if (options && options.query) {
    const url = new URL(replaced, "http://oak");
    if (typeof options.query === "string") {
      url.search = options.query;
    } else {
      url.search = String(options.query instanceof URLSearchParams ? options.query : new URLSearchParams(options.query));
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }
  return replaced;
}
_computedKey = Symbol.for("Deno.customInspect"), _computedKey1 = Symbol.for("nodejs.util.inspect.custom");
/** An internal class used to group together middleware when using multiple
 * middlewares with a router. */ export class Layer {
  #opts;
  #paramNames = [];
  #regexp;
  methods;
  name;
  path;
  stack;
  constructor(path, methods, middleware, { name, ...opts } = {}){
    this.#opts = opts;
    this.name = name;
    this.methods = [
      ...methods
    ];
    if (this.methods.includes("GET")) {
      this.methods.unshift("HEAD");
    }
    this.stack = Array.isArray(middleware) ? middleware.slice() : [
      middleware
    ];
    this.path = path;
    this.#regexp = pathToRegexp(path, this.#paramNames, this.#opts);
  }
  clone() {
    return new Layer(this.path, this.methods, this.stack, {
      name: this.name,
      ...this.#opts
    });
  }
  match(path) {
    return this.#regexp.test(path);
  }
  params(captures, existingParams = {}) {
    const params = existingParams;
    for(let i = 0; i < captures.length; i++){
      if (this.#paramNames[i]) {
        const c = captures[i];
        params[this.#paramNames[i].name] = c ? decodeComponent(c) : c;
      }
    }
    return params;
  }
  captures(path) {
    if (this.#opts.ignoreCaptures) {
      return [];
    }
    return path.match(this.#regexp)?.slice(1) ?? [];
  }
  url(params = {}, options) {
    const url = this.path.replace(/\(\.\*\)/g, "");
    return toUrl(url, params, options);
  }
  param(param, // deno-lint-ignore no-explicit-any
  fn) {
    const stack = this.stack;
    const params = this.#paramNames;
    const middleware = function(ctx, next) {
      const p = ctx.params[param];
      assert(p);
      return fn.call(this, p, ctx, next);
    };
    middleware.param = param;
    const names = params.map((p)=>p.name);
    const x = names.indexOf(param);
    if (x >= 0) {
      for(let i = 0; i < stack.length; i++){
        const fn = stack[i];
        if (!fn.param || names.indexOf(fn.param) > x) {
          stack.splice(i, 0, middleware);
          break;
        }
      }
    }
    return this;
  }
  setPrefix(prefix) {
    if (this.path) {
      this.path = this.path !== "/" || this.#opts.strict === true ? `${prefix}${this.path}` : prefix;
      this.#paramNames = [];
      this.#regexp = pathToRegexp(this.path, this.#paramNames, this.#opts);
    }
    return this;
  }
  // deno-lint-ignore no-explicit-any
  toJSON() {
    return {
      methods: [
        ...this.methods
      ],
      middleware: [
        ...this.stack
      ],
      paramNames: this.#paramNames.map((key)=>key.name),
      path: this.path,
      regexp: this.#regexp,
      options: {
        ...this.#opts
      }
    };
  }
  [_computedKey](inspect) {
    return `${this.constructor.name} ${inspect({
      methods: this.methods,
      middleware: this.stack,
      options: this.#opts,
      paramNames: this.#paramNames.map((key)=>key.name),
      path: this.path,
      regexp: this.#regexp
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
    return `${options.stylize(this.constructor.name, "special")} ${inspect({
      methods: this.methods,
      middleware: this.stack,
      options: this.#opts,
      paramNames: this.#paramNames.map((key)=>key.name),
      path: this.path,
      regexp: this.#regexp
    }, newOptions)}`;
  }
}
_computedKey2 = Symbol.iterator, _computedKey3 = Symbol.for("Deno.customInspect"), _computedKey4 = Symbol.for("nodejs.util.inspect.custom");
/** An interface for registering middleware that will run when certain HTTP
 * methods and paths are requested, as well as provides a way to parameterize
 * parts of the requested path.
 *
 * ### Basic example
 *
 * ```ts
 * import { Application, Router } from "jsr:@oak/oak/";
 *
 * const router = new Router();
 * router.get("/", (ctx, next) => {
 *   // handle the GET endpoint here
 * });
 * router.all("/item/:item", (ctx, next) => {
 *   // called for all HTTP verbs/requests
 *   ctx.params.item; // contains the value of `:item` from the parsed URL
 * });
 *
 * const app = new Application();
 * app.use(router.routes());
 * app.use(router.allowedMethods());
 *
 * app.listen({ port: 8080 });
 * ```
 */ export class Router {
  #opts;
  #methods;
  // deno-lint-ignore no-explicit-any
  #params = {};
  #stack = [];
  #match(path, method) {
    const matches = {
      path: [],
      pathAndMethod: [],
      route: false
    };
    for (const route of this.#stack){
      if (route.match(path)) {
        matches.path.push(route);
        if (route.methods.length === 0 || route.methods.includes(method)) {
          matches.pathAndMethod.push(route);
          if (route.methods.length) {
            matches.route = true;
            matches.name = route.name;
          }
        }
      }
    }
    return matches;
  }
  #register(path, middlewares, methods, options = {}) {
    if (Array.isArray(path)) {
      for (const p of path){
        this.#register(p, middlewares, methods, options);
      }
      return;
    }
    let layerMiddlewares = [];
    for (const middleware of middlewares){
      if (!middleware.router) {
        layerMiddlewares.push(middleware);
        continue;
      }
      if (layerMiddlewares.length) {
        this.#addLayer(path, layerMiddlewares, methods, options);
        layerMiddlewares = [];
      }
      const router = middleware.router.#clone();
      for (const layer of router.#stack){
        if (!options.ignorePrefix) {
          layer.setPrefix(path);
        }
        if (this.#opts.prefix) {
          layer.setPrefix(this.#opts.prefix);
        }
        this.#stack.push(layer);
      }
      for (const [param, mw] of Object.entries(this.#params)){
        router.param(param, mw);
      }
    }
    if (layerMiddlewares.length) {
      this.#addLayer(path, layerMiddlewares, methods, options);
    }
  }
  #addLayer(path, middlewares, methods, options = {}) {
    const { end, name, sensitive = this.#opts.sensitive, strict = this.#opts.strict, ignoreCaptures } = options;
    const route = new Layer(path, methods, middlewares, {
      end,
      name,
      sensitive,
      strict,
      ignoreCaptures
    });
    if (this.#opts.prefix) {
      route.setPrefix(this.#opts.prefix);
    }
    for (const [param, mw] of Object.entries(this.#params)){
      route.param(param, mw);
    }
    this.#stack.push(route);
  }
  #route(name) {
    for (const route of this.#stack){
      if (route.name === name) {
        return route;
      }
    }
  }
  #useVerb(nameOrPath, pathOrMiddleware, middleware, methods) {
    let name = undefined;
    let path;
    if (typeof pathOrMiddleware === "string") {
      name = nameOrPath;
      path = pathOrMiddleware;
    } else {
      path = nameOrPath;
      middleware.unshift(pathOrMiddleware);
    }
    this.#register(path, middleware, methods, {
      name
    });
  }
  #clone() {
    const router = new Router(this.#opts);
    router.#methods = router.#methods.slice();
    router.#params = {
      ...this.#params
    };
    router.#stack = this.#stack.map((layer)=>layer.clone());
    return router;
  }
  constructor(opts = {}){
    this.#opts = opts;
    this.#methods = opts.methods ?? [
      "DELETE",
      "GET",
      "HEAD",
      "OPTIONS",
      "PATCH",
      "POST",
      "PUT"
    ];
  }
  add(methods, nameOrPath, pathOrMiddleware, ...middleware) {
    this.#useVerb(nameOrPath, pathOrMiddleware, middleware, typeof methods === "string" ? [
      methods
    ] : methods);
    return this;
  }
  all(nameOrPath, pathOrMiddleware, ...middleware) {
    this.#useVerb(nameOrPath, pathOrMiddleware, middleware, this.#methods.filter((method)=>method !== "OPTIONS"));
    return this;
  }
  /** Middleware that handles requests for HTTP methods registered with the
   * router.  If none of the routes handle a method, then "not allowed" logic
   * will be used.  If a method is supported by some routes, but not the
   * particular matched router, then "not implemented" will be returned.
   *
   * The middleware will also automatically handle the `OPTIONS` method,
   * responding with a `200 OK` when the `Allowed` header sent to the allowed
   * methods for a given route.
   *
   * By default, a "not allowed" request will respond with a `405 Not Allowed`
   * and a "not implemented" will respond with a `501 Not Implemented`. Setting
   * the option `.throw` to `true` will cause the middleware to throw an
   * `HTTPError` instead of setting the response status.  The error can be
   * overridden by providing a `.notImplemented` or `.notAllowed` method in the
   * options, of which the value will be returned will be thrown instead of the
   * HTTP error. */ allowedMethods(options = {}) {
    const implemented = this.#methods;
    const allowedMethods = async (context, next)=>{
      const ctx = context;
      await next();
      if (!ctx.response.status || ctx.response.status === Status.NotFound) {
        assert(ctx.matched);
        const allowed = new Set();
        for (const route of ctx.matched){
          for (const method of route.methods){
            allowed.add(method);
          }
        }
        const allowedStr = [
          ...allowed
        ].join(", ");
        if (!implemented.includes(ctx.request.method)) {
          if (options.throw) {
            throw options.notImplemented ? options.notImplemented() : new errors.NotImplemented();
          } else {
            ctx.response.status = Status.NotImplemented;
            ctx.response.headers.set("Allow", allowedStr);
          }
        } else if (allowed.size) {
          if (ctx.request.method === "OPTIONS") {
            ctx.response.status = Status.OK;
            ctx.response.headers.set("Allow", allowedStr);
          } else if (!allowed.has(ctx.request.method)) {
            if (options.throw) {
              throw options.methodNotAllowed ? options.methodNotAllowed() : new errors.MethodNotAllowed();
            } else {
              ctx.response.status = Status.MethodNotAllowed;
              ctx.response.headers.set("Allow", allowedStr);
            }
          }
        }
      }
    };
    return allowedMethods;
  }
  delete(nameOrPath, pathOrMiddleware, ...middleware) {
    this.#useVerb(nameOrPath, pathOrMiddleware, middleware, [
      "DELETE"
    ]);
    return this;
  }
  /** Iterate over the routes currently added to the router.  To be compatible
   * with the iterable interfaces, both the key and value are set to the value
   * of the route. */ *entries() {
    for (const route of this.#stack){
      const value = route.toJSON();
      yield [
        value,
        value
      ];
    }
  }
  /** Iterate over the routes currently added to the router, calling the
   * `callback` function for each value. */ forEach(callback, // deno-lint-ignore no-explicit-any
  thisArg = null) {
    for (const route of this.#stack){
      const value = route.toJSON();
      callback.call(thisArg, value, value, this);
    }
  }
  get(nameOrPath, pathOrMiddleware, ...middleware) {
    this.#useVerb(nameOrPath, pathOrMiddleware, middleware, [
      "GET"
    ]);
    return this;
  }
  head(nameOrPath, pathOrMiddleware, ...middleware) {
    this.#useVerb(nameOrPath, pathOrMiddleware, middleware, [
      "HEAD"
    ]);
    return this;
  }
  /** Iterate over the routes currently added to the router.  To be compatible
   * with the iterable interfaces, the key is set to the value of the route. */ *keys() {
    for (const route of this.#stack){
      yield route.toJSON();
    }
  }
  options(nameOrPath, pathOrMiddleware, ...middleware) {
    this.#useVerb(nameOrPath, pathOrMiddleware, middleware, [
      "OPTIONS"
    ]);
    return this;
  }
  /** Register param middleware, which will be called when the particular param
   * is parsed from the route. */ param(param, middleware) {
    this.#params[param] = middleware;
    for (const route of this.#stack){
      route.param(param, middleware);
    }
    return this;
  }
  patch(nameOrPath, pathOrMiddleware, ...middleware) {
    this.#useVerb(nameOrPath, pathOrMiddleware, middleware, [
      "PATCH"
    ]);
    return this;
  }
  post(nameOrPath, pathOrMiddleware, ...middleware) {
    this.#useVerb(nameOrPath, pathOrMiddleware, middleware, [
      "POST"
    ]);
    return this;
  }
  /** Set the router prefix for this router. */ prefix(prefix) {
    prefix = prefix.replace(/\/$/, "");
    this.#opts.prefix = prefix;
    for (const route of this.#stack){
      route.setPrefix(prefix);
    }
    return this;
  }
  put(nameOrPath, pathOrMiddleware, ...middleware) {
    this.#useVerb(nameOrPath, pathOrMiddleware, middleware, [
      "PUT"
    ]);
    return this;
  }
  /** Register a direction middleware, where when the `source` path is matched
   * the router will redirect the request to the `destination` path.  A `status`
   * of `302 Found` will be set by default.
   *
   * The `source` and `destination` can be named routes. */ redirect(source, destination, status = Status.Found) {
    if (source[0] !== "/") {
      const s = this.url(source);
      if (!s) {
        throw new RangeError(`Could not resolve named route: "${source}"`);
      }
      source = s;
    }
    if (typeof destination === "string") {
      if (destination[0] !== "/") {
        const d = this.url(destination);
        if (!d) {
          try {
            const url = new URL(destination);
            destination = url;
          } catch  {
            throw new RangeError(`Could not resolve named route: "${source}"`);
          }
        } else {
          destination = d;
        }
      }
    }
    this.all(source, async (ctx, next)=>{
      await next();
      ctx.response.redirect(destination);
      ctx.response.status = status;
    });
    return this;
  }
  /** Return middleware that will do all the route processing that the router
   * has been configured to handle.  Typical usage would be something like this:
   *
   * ```ts
   * import { Application, Router } from "jsr:@oak/oak/";
   *
   * const app = new Application();
   * const router = new Router();
   *
   * // register routes
   *
   * app.use(router.routes());
   * app.use(router.allowedMethods());
   * await app.listen({ port: 80 });
   * ```
   */ routes() {
    const dispatch = (context, next)=>{
      const ctx = context;
      let pathname;
      let method;
      try {
        const { url: { pathname: p }, method: m } = ctx.request;
        pathname = p;
        method = m;
      } catch (e) {
        return Promise.reject(e);
      }
      const path = this.#opts.routerPath ?? ctx.routerPath ?? decodeURI(pathname);
      const matches = this.#match(path, method);
      if (ctx.matched) {
        ctx.matched.push(...matches.path);
      } else {
        ctx.matched = [
          ...matches.path
        ];
      }
      // deno-lint-ignore no-explicit-any
      ctx.router = this;
      if (!matches.route) return next();
      ctx.routeName = matches.name;
      const { pathAndMethod: matchedRoutes } = matches;
      const chain = matchedRoutes.reduce((prev, route)=>[
          ...prev,
          (ctx, next)=>{
            ctx.captures = route.captures(path);
            ctx.params = route.params(ctx.captures, ctx.params);
            return next();
          },
          ...route.stack
        ], []);
      return compose(chain)(ctx, next);
    };
    dispatch.router = this;
    return dispatch;
  }
  /** Generate a URL pathname for a named route, interpolating the optional
   * params provided.  Also accepts an optional set of options. */ url(name, params, options) {
    const route = this.#route(name);
    if (route) {
      return route.url(params, options);
    }
  }
  use(pathOrMiddleware, ...middleware) {
    let path;
    if (typeof pathOrMiddleware === "string" || Array.isArray(pathOrMiddleware)) {
      path = pathOrMiddleware;
    } else {
      middleware.unshift(pathOrMiddleware);
    }
    this.#register(path ?? "(.*)", middleware, [], {
      end: false,
      ignoreCaptures: !path,
      ignorePrefix: !path
    });
    return this;
  }
  /** Iterate over the routes currently added to the router. */ *values() {
    for (const route of this.#stack){
      yield route.toJSON();
    }
  }
  /** Provide an iterator interface that iterates over the routes registered
   * with the router. */ *[_computedKey2]() {
    for (const route of this.#stack){
      yield route.toJSON();
    }
  }
  /** Generate a URL pathname based on the provided path, interpolating the
   * optional params provided.  Also accepts an optional set of options. */ static url(path, params, options) {
    return toUrl(path, params, options);
  }
  [_computedKey3](inspect) {
    return `${this.constructor.name} ${inspect({
      "#params": this.#params,
      "#stack": this.#stack
    })}`;
  }
  [_computedKey4](depth, // deno-lint-ignore no-explicit-any
  options, inspect) {
    if (depth < 0) {
      return options.stylize(`[${this.constructor.name}]`, "special");
    }
    const newOptions = Object.assign({}, options, {
      depth: options.depth === null ? null : options.depth - 1
    });
    return `${options.stylize(this.constructor.name, "special")} ${inspect({
      "#params": this.#params,
      "#stack": this.#stack
    }, newOptions)}`;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvb2FrLzE2LjEuMC9yb3V0ZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDb250YWlucyB0aGUgcm91dGVyIG9mIG9hay4gVHlwaWNhbCB1c2FnZSBpcyB0aGUgY3JlYXRpb24gb2YgYW4gYXBwbGljYXRpb25cbiAqIGluc3RhbmNlLCB0aGUgY3JlYXRpb24gb2YgYSByb3V0ZXIgaW5zdGFuY2UsIHJlZ2lzdHJhdGlvbiBvZiByb3V0ZVxuICogbWlkZGxld2FyZSwgcmVnaXN0cmF0aW9uIG9mIHJvdXRlciB3aXRoIHRoZSBhcHBsaWNhdGlvbiwgYW5kIHRoZW4gc3RhcnRpbmcgdG9cbiAqIGxpc3RlbiBmb3IgcmVxdWVzdHMuXG4gKlxuICogIyBFeGFtcGxlXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEFwcGxpY2F0aW9uIH0gZnJvbSBcImpzcjpAb2FrL29ha0AxNC9hcHBsaWNhdGlvblwiO1xuICogaW1wb3J0IHsgUm91dGVyIH0gZnJvbSBcImpzcjpAb2FrL29ha0AxNC9yb3V0ZXJcIjtcbiAqXG4gKiBjb25zdCBhcHAgPSBuZXcgQXBwbGljYXRpb24oKTtcbiAqIGNvbnN0IHJvdXRlciA9IG5ldyBSb3V0ZXIoKTtcbiAqIHJvdXRlci5nZXQoXCIvXCIsIChjdHgpID0+IHtcbiAqICAgY3R4LnJlc3BvbnNlLmJvZHkgPSBcImhlbGxvIHdvcmxkIVwiO1xuICogfSk7XG4gKiBhcHAudXNlKHJvdXRlci5yb3V0ZXMoKSk7XG4gKiBhcHAudXNlKHJvdXRlci5hbGxvd2VkTWV0aG9kcygpKTtcbiAqXG4gKiBhcHAubGlzdGVuKCk7XG4gKiBgYGBcbiAqXG4gKiBAbW9kdWxlXG4gKi9cblxuLyoqXG4gKiBBZGFwdGVkIGRpcmVjdGx5IGZyb20gQGtvYS9yb3V0ZXIgYXRcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9rb2Fqcy9yb3V0ZXIvIHdoaWNoIGlzIGxpY2Vuc2VkIGFzOlxuICpcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBBbGV4YW5kZXIgQy4gTWluZ29pYVxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBTdGF0ZSB9IGZyb20gXCIuL2FwcGxpY2F0aW9uLnRzXCI7XG5pbXBvcnQgdHlwZSB7IENvbnRleHQgfSBmcm9tIFwiLi9jb250ZXh0LnRzXCI7XG5pbXBvcnQge1xuICBhc3NlcnQsXG4gIGNvbXBpbGUsXG4gIGVycm9ycyxcbiAgdHlwZSBIVFRQTWV0aG9kcyxcbiAgdHlwZSBLZXksXG4gIHR5cGUgUGFyc2VPcHRpb25zLFxuICBwYXRoUGFyc2UsXG4gIHBhdGhUb1JlZ2V4cCxcbiAgdHlwZSBSZWRpcmVjdFN0YXR1cyxcbiAgU3RhdHVzLFxuICB0eXBlIFRva2Vuc1RvUmVnZXhwT3B0aW9ucyxcbn0gZnJvbSBcIi4vZGVwcy50c1wiO1xuaW1wb3J0IHsgY29tcG9zZSwgdHlwZSBNaWRkbGV3YXJlIH0gZnJvbSBcIi4vbWlkZGxld2FyZS50c1wiO1xuaW1wb3J0IHsgZGVjb2RlQ29tcG9uZW50IH0gZnJvbSBcIi4vdXRpbHMvZGVjb2RlX2NvbXBvbmVudC50c1wiO1xuXG5pbnRlcmZhY2UgTWF0Y2hlczxSIGV4dGVuZHMgc3RyaW5nPiB7XG4gIHBhdGg6IExheWVyPFI+W107XG4gIHBhdGhBbmRNZXRob2Q6IExheWVyPFI+W107XG4gIHJvdXRlOiBib29sZWFuO1xuICBuYW1lPzogc3RyaW5nO1xufVxuXG4vKiogT3B0aW9ucyB3aGljaCBjYW4gYmUgc3BlY2lmaWVkIHdoZW4gY2FsbGluZyB0aGUgYC5hbGxvd2VkTWV0aG9kcygpYCBtZXRob2RcbiAqIG9uIGEge0BsaW5rY29kZSBSb3V0ZXJ9IGluc3RhbmNlLiAqL1xuZXhwb3J0IGludGVyZmFjZSBSb3V0ZXJBbGxvd2VkTWV0aG9kc09wdGlvbnMge1xuICAvKiogVXNlIHRoZSB2YWx1ZSByZXR1cm5lZCBmcm9tIHRoaXMgZnVuY3Rpb24gaW5zdGVhZCBvZiBhbiBIVFRQIGVycm9yXG4gICAqIGBNZXRob2ROb3RBbGxvd2VkYC4gKi9cbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgbWV0aG9kTm90QWxsb3dlZD8oKTogYW55O1xuXG4gIC8qKiBVc2UgdGhlIHZhbHVlIHJldHVybmVkIGZyb20gdGhpcyBmdW5jdGlvbiBpbnN0ZWFkIG9mIGFuIEhUVFAgZXJyb3JcbiAgICogYE5vdEltcGxlbWVudGVkYC4gKi9cbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgbm90SW1wbGVtZW50ZWQ/KCk6IGFueTtcblxuICAvKiogV2hlbiBkZWFsaW5nIHdpdGggYSBub24taW1wbGVtZW50ZWQgbWV0aG9kIG9yIGEgbWV0aG9kIG5vdCBhbGxvd2VkLCB0aHJvd1xuICAgKiBhbiBlcnJvciBpbnN0ZWFkIG9mIHNldHRpbmcgdGhlIHN0YXR1cyBhbmQgaGVhZGVyIGZvciB0aGUgcmVzcG9uc2UuICovXG4gIHRocm93PzogYm9vbGVhbjtcbn1cblxuLyoqIFRoZSBpbnRlcm5hbCBhYnN0cmFjdGlvbiBvZiBhIHJvdXRlIHVzZWQgYnkgdGhlIG9hayB7QGxpbmtjb2RlIFJvdXRlcn0uICovXG5leHBvcnQgaW50ZXJmYWNlIFJvdXRlPFxuICBSIGV4dGVuZHMgc3RyaW5nLFxuICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8Uj4gPSBSb3V0ZVBhcmFtczxSPixcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgUyBleHRlbmRzIFN0YXRlID0gUmVjb3JkPHN0cmluZywgYW55Pixcbj4ge1xuICAvKiogVGhlIEhUVFAgbWV0aG9kcyB0aGF0IHRoaXMgcm91dGUgaGFuZGxlcy4gKi9cbiAgbWV0aG9kczogSFRUUE1ldGhvZHNbXTtcblxuICAvKiogVGhlIG1pZGRsZXdhcmUgdGhhdCB3aWxsIGJlIGFwcGxpZWQgdG8gdGhpcyByb3V0ZS4gKi9cbiAgbWlkZGxld2FyZTogUm91dGVyTWlkZGxld2FyZTxSLCBQLCBTPltdO1xuXG4gIC8qKiBBbiBvcHRpb25hbCBuYW1lIGZvciB0aGUgcm91dGUuICovXG4gIG5hbWU/OiBzdHJpbmc7XG5cbiAgLyoqIE9wdGlvbnMgdGhhdCB3ZXJlIHVzZWQgdG8gY3JlYXRlIHRoZSByb3V0ZS4gKi9cbiAgb3B0aW9uczogTGF5ZXJPcHRpb25zO1xuXG4gIC8qKiBUaGUgcGFyYW1ldGVycyB0aGF0IGFyZSBpZGVudGlmaWVkIGluIHRoZSByb3V0ZSB0aGF0IHdpbGwgYmUgcGFyc2VkIG91dFxuICAgKiBvbiBtYXRjaGVkIHJlcXVlc3RzLiAqL1xuICBwYXJhbU5hbWVzOiAoa2V5b2YgUClbXTtcblxuICAvKiogVGhlIHBhdGggdGhhdCB0aGlzIHJvdXRlIG1hbmFnZXMuICovXG4gIHBhdGg6IHN0cmluZztcblxuICAvKiogVGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB1c2VkIGZvciBtYXRjaGluZyBhbmQgcGFyc2luZyBwYXJhbWV0ZXJzIGZvciB0aGVcbiAgICogcm91dGUuICovXG4gIHJlZ2V4cDogUmVnRXhwO1xufVxuXG4vKiogVGhlIGNvbnRleHQgcGFzc2VkIHJvdXRlciBtaWRkbGV3YXJlLiAgKi9cbmV4cG9ydCBpbnRlcmZhY2UgUm91dGVyQ29udGV4dDxcbiAgUiBleHRlbmRzIHN0cmluZyxcbiAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPFI+ID0gUm91dGVQYXJhbXM8Uj4sXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIFMgZXh0ZW5kcyBTdGF0ZSA9IFJlY29yZDxzdHJpbmcsIGFueT4sXG4+IGV4dGVuZHMgQ29udGV4dDxTPiB7XG4gIC8qKiBXaGVuIG1hdGNoaW5nIHRoZSByb3V0ZSwgYW4gYXJyYXkgb2YgdGhlIGNhcHR1cmluZyBncm91cHMgZnJvbSB0aGUgcmVndWxhclxuICAgKiBleHByZXNzaW9uLiAqL1xuICBjYXB0dXJlczogc3RyaW5nW107XG5cbiAgLyoqIFRoZSByb3V0ZXMgdGhhdCB3ZXJlIG1hdGNoZWQgZm9yIHRoaXMgcmVxdWVzdC4gKi9cbiAgbWF0Y2hlZD86IExheWVyPFIsIFAsIFM+W107XG5cbiAgLyoqIEFueSBwYXJhbWV0ZXJzIHBhcnNlZCBmcm9tIHRoZSByb3V0ZSB3aGVuIG1hdGNoZWQuICovXG4gIHBhcmFtczogUDtcblxuICAvKiogQSByZWZlcmVuY2UgdG8gdGhlIHJvdXRlciBpbnN0YW5jZS4gKi9cbiAgcm91dGVyOiBSb3V0ZXI7XG5cbiAgLyoqIElmIHRoZSBtYXRjaGVkIHJvdXRlIGhhcyBhIGBuYW1lYCwgdGhlIG1hdGNoZWQgcm91dGUgbmFtZSBpcyBwcm92aWRlZFxuICAgKiBoZXJlLiAqL1xuICByb3V0ZU5hbWU/OiBzdHJpbmc7XG5cbiAgLyoqIE92ZXJyaWRlcyB0aGUgbWF0Y2hlZCBwYXRoIGZvciBmdXR1cmUgcm91dGUgbWlkZGxld2FyZSwgd2hlbiBhXG4gICAqIGByb3V0ZXJQYXRoYCBvcHRpb24gaXMgbm90IGRlZmluZWQgb24gdGhlIGBSb3V0ZXJgIG9wdGlvbnMuICovXG4gIHJvdXRlclBhdGg/OiBzdHJpbmc7XG59XG5cbi8qKiBUaGUgaW50ZXJmYWNlIHRoYXQge0BsaW5rY29kZSBSb3V0ZXJ9IG1pZGRsZXdhcmUgc2hvdWxkIGFkaGVyZSB0by4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUm91dGVyTWlkZGxld2FyZTxcbiAgUiBleHRlbmRzIHN0cmluZyxcbiAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPFI+ID0gUm91dGVQYXJhbXM8Uj4sXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIFMgZXh0ZW5kcyBTdGF0ZSA9IFJlY29yZDxzdHJpbmcsIGFueT4sXG4+IHtcbiAgKGNvbnRleHQ6IFJvdXRlckNvbnRleHQ8UiwgUCwgUz4sIG5leHQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pOlxuICAgIHwgUHJvbWlzZTx1bmtub3duPlxuICAgIHwgdW5rbm93bjtcbiAgLyoqIEZvciByb3V0ZSBwYXJhbWV0ZXIgbWlkZGxld2FyZSwgdGhlIGBwYXJhbWAga2V5IGZvciB0aGlzIHBhcmFtZXRlciB3aWxsXG4gICAqIGJlIHNldC4gKi9cbiAgcGFyYW0/OiBrZXlvZiBQO1xuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICByb3V0ZXI/OiBSb3V0ZXI8YW55Pjtcbn1cblxuLyoqIE9wdGlvbnMgd2hpY2ggY2FuIGJlIHNwZWNpZmllZCB3aGVuIGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlIG9mIGFcbiAqIHtAbGlua2NvZGUgUm91dGVyfS4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUm91dGVyT3B0aW9ucyB7XG4gIC8qKiBPdmVycmlkZSB0aGUgZGVmYXVsdCBzZXQgb2YgbWV0aG9kcyBzdXBwb3J0ZWQgYnkgdGhlIHJvdXRlci4gKi9cbiAgbWV0aG9kcz86IEhUVFBNZXRob2RzW107XG5cbiAgLyoqIE9ubHkgaGFuZGxlIHJvdXRlcyB3aGVyZSB0aGUgcmVxdWVzdGVkIHBhdGggc3RhcnRzIHdpdGggdGhlIHByZWZpeC4gKi9cbiAgcHJlZml4Pzogc3RyaW5nO1xuXG4gIC8qKiBPdmVycmlkZSB0aGUgYHJlcXVlc3QudXJsLnBhdGhuYW1lYCB3aGVuIG1hdGNoaW5nIG1pZGRsZXdhcmUgdG8gcnVuLiAqL1xuICByb3V0ZXJQYXRoPzogc3RyaW5nO1xuXG4gIC8qKiBEZXRlcm1pbmVzIGlmIHJvdXRlcyBhcmUgbWF0Y2hlZCBpbiBhIGNhc2Ugc2Vuc2l0aXZlIHdheS4gIERlZmF1bHRzIHRvXG4gICAqIGBmYWxzZWAuICovXG4gIHNlbnNpdGl2ZT86IGJvb2xlYW47XG5cbiAgLyoqIERldGVybWluZXMgaWYgcm91dGVzIGFyZSBtYXRjaGVkIHN0cmljdGx5LCB3aGVyZSB0aGUgdHJhaWxpbmcgYC9gIGlzIG5vdFxuICAgKiBvcHRpb25hbC4gIERlZmF1bHRzIHRvIGBmYWxzZWAuICovXG4gIHN0cmljdD86IGJvb2xlYW47XG59XG5cbi8qKiBNaWRkbGV3YXJlIHRoYXQgd2lsbCBiZSBjYWxsZWQgYnkgdGhlIHJvdXRlciB3aGVuIGhhbmRsaW5nIGEgc3BlY2lmaWNcbiAqIHBhcmFtZXRlciwgd2hpY2ggdGhlIG1pZGRsZXdhcmUgd2lsbCBiZSBjYWxsZWQgd2hlbiBhIHJlcXVlc3QgbWF0Y2hlcyB0aGVcbiAqIHJvdXRlIHBhcmFtZXRlci4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUm91dGVyUGFyYW1NaWRkbGV3YXJlPFxuICBSIGV4dGVuZHMgc3RyaW5nLFxuICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8Uj4gPSBSb3V0ZVBhcmFtczxSPixcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgUyBleHRlbmRzIFN0YXRlID0gUmVjb3JkPHN0cmluZywgYW55Pixcbj4ge1xuICAoXG4gICAgcGFyYW06IHN0cmluZyxcbiAgICBjb250ZXh0OiBSb3V0ZXJDb250ZXh0PFIsIFAsIFM+LFxuICAgIG5leHQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4sXG4gICk6IFByb21pc2U8dW5rbm93bj4gfCB1bmtub3duO1xuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICByb3V0ZXI/OiBSb3V0ZXI8YW55Pjtcbn1cblxuaW50ZXJmYWNlIFBhcmFtc0RpY3Rpb25hcnkge1xuICBba2V5OiBzdHJpbmddOiBzdHJpbmc7XG59XG5cbnR5cGUgUmVtb3ZlVGFpbDxTIGV4dGVuZHMgc3RyaW5nLCBUYWlsIGV4dGVuZHMgc3RyaW5nPiA9IFMgZXh0ZW5kc1xuICBgJHtpbmZlciBQfSR7VGFpbH1gID8gUCA6IFM7XG5cbnR5cGUgR2V0Um91dGVQYXJhbXM8UyBleHRlbmRzIHN0cmluZz4gPSBSZW1vdmVUYWlsPFxuICBSZW1vdmVUYWlsPFJlbW92ZVRhaWw8UywgYC8ke3N0cmluZ31gPiwgYC0ke3N0cmluZ31gPixcbiAgYC4ke3N0cmluZ31gXG4+O1xuXG4vKiogQSBkeW5hbWljIHR5cGUgd2hpY2ggYXR0ZW1wdHMgdG8gZGV0ZXJtaW5lIHRoZSByb3V0ZSBwYXJhbXMgYmFzZWQgb25cbiAqIG1hdGNoaW5nIHRoZSByb3V0ZSBzdHJpbmcuICovXG5leHBvcnQgdHlwZSBSb3V0ZVBhcmFtczxSb3V0ZSBleHRlbmRzIHN0cmluZz4gPSBzdHJpbmcgZXh0ZW5kcyBSb3V0ZVxuICA/IFBhcmFtc0RpY3Rpb25hcnlcbiAgOiBSb3V0ZSBleHRlbmRzIGAke3N0cmluZ30oJHtzdHJpbmd9YCA/IFBhcmFtc0RpY3Rpb25hcnlcbiAgOiBSb3V0ZSBleHRlbmRzIGAke3N0cmluZ306JHtpbmZlciBSZXN0fWAgP1xuICAgICAgJiAoXG4gICAgICAgIEdldFJvdXRlUGFyYW1zPFJlc3Q+IGV4dGVuZHMgbmV2ZXIgPyBQYXJhbXNEaWN0aW9uYXJ5XG4gICAgICAgICAgOiBHZXRSb3V0ZVBhcmFtczxSZXN0PiBleHRlbmRzIGAke2luZmVyIFBhcmFtTmFtZX0/YFxuICAgICAgICAgICAgPyB7IFtQIGluIFBhcmFtTmFtZV0/OiBzdHJpbmcgfVxuICAgICAgICAgIDogeyBbUCBpbiBHZXRSb3V0ZVBhcmFtczxSZXN0Pl06IHN0cmluZyB9XG4gICAgICApXG4gICAgICAmIChSZXN0IGV4dGVuZHMgYCR7R2V0Um91dGVQYXJhbXM8UmVzdD59JHtpbmZlciBOZXh0fWAgPyBSb3V0ZVBhcmFtczxOZXh0PlxuICAgICAgICA6IHVua25vd24pXG4gIDogUmVjb3JkPHN0cmluZyB8IG51bWJlciwgc3RyaW5nIHwgdW5kZWZpbmVkPjtcblxudHlwZSBMYXllck9wdGlvbnMgPSBUb2tlbnNUb1JlZ2V4cE9wdGlvbnMgJiBQYXJzZU9wdGlvbnMgJiB7XG4gIGlnbm9yZUNhcHR1cmVzPzogYm9vbGVhbjtcbiAgbmFtZT86IHN0cmluZztcbn07XG5cbnR5cGUgUmVnaXN0ZXJPcHRpb25zID0gTGF5ZXJPcHRpb25zICYge1xuICBpZ25vcmVQcmVmaXg/OiBib29sZWFuO1xufTtcblxudHlwZSBVcmxPcHRpb25zID0gVG9rZW5zVG9SZWdleHBPcHRpb25zICYgUGFyc2VPcHRpb25zICYge1xuICAvKiogV2hlbiBnZW5lcmF0aW5nIGEgVVJMIGZyb20gYSByb3V0ZSwgYWRkIHRoZSBxdWVyeSB0byB0aGUgVVJMLiAgSWYgYW5cbiAgICogb2JqZWN0ICovXG4gIHF1ZXJ5PzogVVJMU2VhcmNoUGFyYW1zIHwgUmVjb3JkPHN0cmluZywgc3RyaW5nPiB8IHN0cmluZztcbn07XG5cbi8qKiBHZW5lcmF0ZSBhIFVSTCBmcm9tIGEgc3RyaW5nLCBwb3RlbnRpYWxseSByZXBsYWNlIHJvdXRlIHBhcmFtcyB3aXRoXG4gKiB2YWx1ZXMuICovXG5mdW5jdGlvbiB0b1VybDxSIGV4dGVuZHMgc3RyaW5nPihcbiAgdXJsOiBzdHJpbmcsXG4gIHBhcmFtcyA9IHt9IGFzIFJvdXRlUGFyYW1zPFI+LFxuICBvcHRpb25zPzogVXJsT3B0aW9ucyxcbikge1xuICBjb25zdCB0b2tlbnMgPSBwYXRoUGFyc2UodXJsKTtcbiAgbGV0IHJlcGxhY2UgPSB7fSBhcyBSb3V0ZVBhcmFtczxSPjtcblxuICBpZiAodG9rZW5zLnNvbWUoKHRva2VuKSA9PiB0eXBlb2YgdG9rZW4gPT09IFwib2JqZWN0XCIpKSB7XG4gICAgcmVwbGFjZSA9IHBhcmFtcztcbiAgfSBlbHNlIHtcbiAgICBvcHRpb25zID0gcGFyYW1zO1xuICB9XG5cbiAgY29uc3QgdG9QYXRoID0gY29tcGlsZSh1cmwsIG9wdGlvbnMpO1xuICBjb25zdCByZXBsYWNlZCA9IHRvUGF0aChyZXBsYWNlKTtcblxuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLnF1ZXJ5KSB7XG4gICAgY29uc3QgdXJsID0gbmV3IFVSTChyZXBsYWNlZCwgXCJodHRwOi8vb2FrXCIpO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5xdWVyeSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgdXJsLnNlYXJjaCA9IG9wdGlvbnMucXVlcnk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHVybC5zZWFyY2ggPSBTdHJpbmcoXG4gICAgICAgIG9wdGlvbnMucXVlcnkgaW5zdGFuY2VvZiBVUkxTZWFyY2hQYXJhbXNcbiAgICAgICAgICA/IG9wdGlvbnMucXVlcnlcbiAgICAgICAgICA6IG5ldyBVUkxTZWFyY2hQYXJhbXMob3B0aW9ucy5xdWVyeSksXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gYCR7dXJsLnBhdGhuYW1lfSR7dXJsLnNlYXJjaH0ke3VybC5oYXNofWA7XG4gIH1cbiAgcmV0dXJuIHJlcGxhY2VkO1xufVxuXG4vKiogQW4gaW50ZXJuYWwgY2xhc3MgdXNlZCB0byBncm91cCB0b2dldGhlciBtaWRkbGV3YXJlIHdoZW4gdXNpbmcgbXVsdGlwbGVcbiAqIG1pZGRsZXdhcmVzIHdpdGggYSByb3V0ZXIuICovXG5leHBvcnQgY2xhc3MgTGF5ZXI8XG4gIFIgZXh0ZW5kcyBzdHJpbmcsXG4gIFAgZXh0ZW5kcyBSb3V0ZVBhcmFtczxSPiA9IFJvdXRlUGFyYW1zPFI+LFxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBTIGV4dGVuZHMgU3RhdGUgPSBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxuPiB7XG4gICNvcHRzOiBMYXllck9wdGlvbnM7XG4gICNwYXJhbU5hbWVzOiBLZXlbXSA9IFtdO1xuICAjcmVnZXhwOiBSZWdFeHA7XG5cbiAgbWV0aG9kczogSFRUUE1ldGhvZHNbXTtcbiAgbmFtZT86IHN0cmluZztcbiAgcGF0aDogc3RyaW5nO1xuICBzdGFjazogUm91dGVyTWlkZGxld2FyZTxSLCBQLCBTPltdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHBhdGg6IHN0cmluZyxcbiAgICBtZXRob2RzOiBIVFRQTWV0aG9kc1tdLFxuICAgIG1pZGRsZXdhcmU6IFJvdXRlck1pZGRsZXdhcmU8UiwgUCwgUz4gfCBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+W10sXG4gICAgeyBuYW1lLCAuLi5vcHRzIH06IExheWVyT3B0aW9ucyA9IHt9LFxuICApIHtcbiAgICB0aGlzLiNvcHRzID0gb3B0cztcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMubWV0aG9kcyA9IFsuLi5tZXRob2RzXTtcbiAgICBpZiAodGhpcy5tZXRob2RzLmluY2x1ZGVzKFwiR0VUXCIpKSB7XG4gICAgICB0aGlzLm1ldGhvZHMudW5zaGlmdChcIkhFQURcIik7XG4gICAgfVxuICAgIHRoaXMuc3RhY2sgPSBBcnJheS5pc0FycmF5KG1pZGRsZXdhcmUpID8gbWlkZGxld2FyZS5zbGljZSgpIDogW21pZGRsZXdhcmVdO1xuICAgIHRoaXMucGF0aCA9IHBhdGg7XG4gICAgdGhpcy4jcmVnZXhwID0gcGF0aFRvUmVnZXhwKHBhdGgsIHRoaXMuI3BhcmFtTmFtZXMsIHRoaXMuI29wdHMpO1xuICB9XG5cbiAgY2xvbmUoKTogTGF5ZXI8UiwgUCwgUz4ge1xuICAgIHJldHVybiBuZXcgTGF5ZXIoXG4gICAgICB0aGlzLnBhdGgsXG4gICAgICB0aGlzLm1ldGhvZHMsXG4gICAgICB0aGlzLnN0YWNrLFxuICAgICAgeyBuYW1lOiB0aGlzLm5hbWUsIC4uLnRoaXMuI29wdHMgfSxcbiAgICApO1xuICB9XG5cbiAgbWF0Y2gocGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuI3JlZ2V4cC50ZXN0KHBhdGgpO1xuICB9XG5cbiAgcGFyYW1zKFxuICAgIGNhcHR1cmVzOiBzdHJpbmdbXSxcbiAgICBleGlzdGluZ1BhcmFtczogUm91dGVQYXJhbXM8Uj4gPSB7fSBhcyBSb3V0ZVBhcmFtczxSPixcbiAgKTogUm91dGVQYXJhbXM8Uj4ge1xuICAgIGNvbnN0IHBhcmFtcyA9IGV4aXN0aW5nUGFyYW1zO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY2FwdHVyZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLiNwYXJhbU5hbWVzW2ldKSB7XG4gICAgICAgIGNvbnN0IGMgPSBjYXB0dXJlc1tpXTtcbiAgICAgICAgcGFyYW1zW3RoaXMuI3BhcmFtTmFtZXNbaV0ubmFtZV0gPSBjID8gZGVjb2RlQ29tcG9uZW50KGMpIDogYztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcztcbiAgfVxuXG4gIGNhcHR1cmVzKHBhdGg6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICBpZiAodGhpcy4jb3B0cy5pZ25vcmVDYXB0dXJlcykge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aC5tYXRjaCh0aGlzLiNyZWdleHApPy5zbGljZSgxKSA/PyBbXTtcbiAgfVxuXG4gIHVybChcbiAgICBwYXJhbXM6IFJvdXRlUGFyYW1zPFI+ID0ge30gYXMgUm91dGVQYXJhbXM8Uj4sXG4gICAgb3B0aW9ucz86IFVybE9wdGlvbnMsXG4gICk6IHN0cmluZyB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5wYXRoLnJlcGxhY2UoL1xcKFxcLlxcKlxcKS9nLCBcIlwiKTtcbiAgICByZXR1cm4gdG9VcmwodXJsLCBwYXJhbXMsIG9wdGlvbnMpO1xuICB9XG5cbiAgcGFyYW0oXG4gICAgcGFyYW06IHN0cmluZyxcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIGZuOiBSb3V0ZXJQYXJhbU1pZGRsZXdhcmU8YW55LCBhbnksIGFueT4sXG4gICk6IHRoaXMge1xuICAgIGNvbnN0IHN0YWNrID0gdGhpcy5zdGFjaztcbiAgICBjb25zdCBwYXJhbXMgPSB0aGlzLiNwYXJhbU5hbWVzO1xuICAgIGNvbnN0IG1pZGRsZXdhcmU6IFJvdXRlck1pZGRsZXdhcmU8Uj4gPSBmdW5jdGlvbiAoXG4gICAgICB0aGlzOiBSb3V0ZXIsXG4gICAgICBjdHgsXG4gICAgICBuZXh0LFxuICAgICk6IFByb21pc2U8dW5rbm93bj4gfCB1bmtub3duIHtcbiAgICAgIGNvbnN0IHAgPSBjdHgucGFyYW1zW3BhcmFtXTtcbiAgICAgIGFzc2VydChwKTtcbiAgICAgIHJldHVybiBmbi5jYWxsKHRoaXMsIHAsIGN0eCwgbmV4dCk7XG4gICAgfTtcbiAgICBtaWRkbGV3YXJlLnBhcmFtID0gcGFyYW07XG5cbiAgICBjb25zdCBuYW1lcyA9IHBhcmFtcy5tYXAoKHApID0+IHAubmFtZSk7XG5cbiAgICBjb25zdCB4ID0gbmFtZXMuaW5kZXhPZihwYXJhbSk7XG4gICAgaWYgKHggPj0gMCkge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdGFjay5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBmbiA9IHN0YWNrW2ldO1xuICAgICAgICBpZiAoIWZuLnBhcmFtIHx8IG5hbWVzLmluZGV4T2YoZm4ucGFyYW0gYXMgKHN0cmluZyB8IG51bWJlcikpID4geCkge1xuICAgICAgICAgIHN0YWNrLnNwbGljZShpLCAwLCBtaWRkbGV3YXJlKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHNldFByZWZpeChwcmVmaXg6IHN0cmluZyk6IHRoaXMge1xuICAgIGlmICh0aGlzLnBhdGgpIHtcbiAgICAgIHRoaXMucGF0aCA9IHRoaXMucGF0aCAhPT0gXCIvXCIgfHwgdGhpcy4jb3B0cy5zdHJpY3QgPT09IHRydWVcbiAgICAgICAgPyBgJHtwcmVmaXh9JHt0aGlzLnBhdGh9YFxuICAgICAgICA6IHByZWZpeDtcbiAgICAgIHRoaXMuI3BhcmFtTmFtZXMgPSBbXTtcbiAgICAgIHRoaXMuI3JlZ2V4cCA9IHBhdGhUb1JlZ2V4cCh0aGlzLnBhdGgsIHRoaXMuI3BhcmFtTmFtZXMsIHRoaXMuI29wdHMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIHRvSlNPTigpOiBSb3V0ZTxhbnksIGFueSwgYW55PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG1ldGhvZHM6IFsuLi50aGlzLm1ldGhvZHNdLFxuICAgICAgbWlkZGxld2FyZTogWy4uLnRoaXMuc3RhY2tdLFxuICAgICAgcGFyYW1OYW1lczogdGhpcy4jcGFyYW1OYW1lcy5tYXAoKGtleSkgPT4ga2V5Lm5hbWUpLFxuICAgICAgcGF0aDogdGhpcy5wYXRoLFxuICAgICAgcmVnZXhwOiB0aGlzLiNyZWdleHAsXG4gICAgICBvcHRpb25zOiB7IC4uLnRoaXMuI29wdHMgfSxcbiAgICB9O1xuICB9XG5cbiAgW1N5bWJvbC5mb3IoXCJEZW5vLmN1c3RvbUluc3BlY3RcIildKFxuICAgIGluc3BlY3Q6ICh2YWx1ZTogdW5rbm93bikgPT4gc3RyaW5nLFxuICApOiBzdHJpbmcge1xuICAgIHJldHVybiBgJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9ICR7XG4gICAgICBpbnNwZWN0KHtcbiAgICAgICAgbWV0aG9kczogdGhpcy5tZXRob2RzLFxuICAgICAgICBtaWRkbGV3YXJlOiB0aGlzLnN0YWNrLFxuICAgICAgICBvcHRpb25zOiB0aGlzLiNvcHRzLFxuICAgICAgICBwYXJhbU5hbWVzOiB0aGlzLiNwYXJhbU5hbWVzLm1hcCgoa2V5KSA9PiBrZXkubmFtZSksXG4gICAgICAgIHBhdGg6IHRoaXMucGF0aCxcbiAgICAgICAgcmVnZXhwOiB0aGlzLiNyZWdleHAsXG4gICAgICB9KVxuICAgIH1gO1xuICB9XG5cbiAgW1N5bWJvbC5mb3IoXCJub2RlanMudXRpbC5pbnNwZWN0LmN1c3RvbVwiKV0oXG4gICAgZGVwdGg6IG51bWJlcixcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIG9wdGlvbnM6IGFueSxcbiAgICBpbnNwZWN0OiAodmFsdWU6IHVua25vd24sIG9wdGlvbnM/OiB1bmtub3duKSA9PiBzdHJpbmcsXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgKTogYW55IHtcbiAgICBpZiAoZGVwdGggPCAwKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKGBbJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9XWAsIFwic3BlY2lhbFwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBuZXdPcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywge1xuICAgICAgZGVwdGg6IG9wdGlvbnMuZGVwdGggPT09IG51bGwgPyBudWxsIDogb3B0aW9ucy5kZXB0aCAtIDEsXG4gICAgfSk7XG4gICAgcmV0dXJuIGAke29wdGlvbnMuc3R5bGl6ZSh0aGlzLmNvbnN0cnVjdG9yLm5hbWUsIFwic3BlY2lhbFwiKX0gJHtcbiAgICAgIGluc3BlY3QoXG4gICAgICAgIHtcbiAgICAgICAgICBtZXRob2RzOiB0aGlzLm1ldGhvZHMsXG4gICAgICAgICAgbWlkZGxld2FyZTogdGhpcy5zdGFjayxcbiAgICAgICAgICBvcHRpb25zOiB0aGlzLiNvcHRzLFxuICAgICAgICAgIHBhcmFtTmFtZXM6IHRoaXMuI3BhcmFtTmFtZXMubWFwKChrZXkpID0+IGtleS5uYW1lKSxcbiAgICAgICAgICBwYXRoOiB0aGlzLnBhdGgsXG4gICAgICAgICAgcmVnZXhwOiB0aGlzLiNyZWdleHAsXG4gICAgICAgIH0sXG4gICAgICAgIG5ld09wdGlvbnMsXG4gICAgICApXG4gICAgfWA7XG4gIH1cbn1cblxuLyoqIEFuIGludGVyZmFjZSBmb3IgcmVnaXN0ZXJpbmcgbWlkZGxld2FyZSB0aGF0IHdpbGwgcnVuIHdoZW4gY2VydGFpbiBIVFRQXG4gKiBtZXRob2RzIGFuZCBwYXRocyBhcmUgcmVxdWVzdGVkLCBhcyB3ZWxsIGFzIHByb3ZpZGVzIGEgd2F5IHRvIHBhcmFtZXRlcml6ZVxuICogcGFydHMgb2YgdGhlIHJlcXVlc3RlZCBwYXRoLlxuICpcbiAqICMjIyBCYXNpYyBleGFtcGxlXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEFwcGxpY2F0aW9uLCBSb3V0ZXIgfSBmcm9tIFwianNyOkBvYWsvb2FrL1wiO1xuICpcbiAqIGNvbnN0IHJvdXRlciA9IG5ldyBSb3V0ZXIoKTtcbiAqIHJvdXRlci5nZXQoXCIvXCIsIChjdHgsIG5leHQpID0+IHtcbiAqICAgLy8gaGFuZGxlIHRoZSBHRVQgZW5kcG9pbnQgaGVyZVxuICogfSk7XG4gKiByb3V0ZXIuYWxsKFwiL2l0ZW0vOml0ZW1cIiwgKGN0eCwgbmV4dCkgPT4ge1xuICogICAvLyBjYWxsZWQgZm9yIGFsbCBIVFRQIHZlcmJzL3JlcXVlc3RzXG4gKiAgIGN0eC5wYXJhbXMuaXRlbTsgLy8gY29udGFpbnMgdGhlIHZhbHVlIG9mIGA6aXRlbWAgZnJvbSB0aGUgcGFyc2VkIFVSTFxuICogfSk7XG4gKlxuICogY29uc3QgYXBwID0gbmV3IEFwcGxpY2F0aW9uKCk7XG4gKiBhcHAudXNlKHJvdXRlci5yb3V0ZXMoKSk7XG4gKiBhcHAudXNlKHJvdXRlci5hbGxvd2VkTWV0aG9kcygpKTtcbiAqXG4gKiBhcHAubGlzdGVuKHsgcG9ydDogODA4MCB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgUm91dGVyPFxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBSUyBleHRlbmRzIFN0YXRlID0gUmVjb3JkPHN0cmluZywgYW55Pixcbj4ge1xuICAjb3B0czogUm91dGVyT3B0aW9ucztcbiAgI21ldGhvZHM6IEhUVFBNZXRob2RzW107XG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICNwYXJhbXM6IFJlY29yZDxzdHJpbmcsIFJvdXRlclBhcmFtTWlkZGxld2FyZTxhbnksIGFueSwgYW55Pj4gPSB7fTtcbiAgI3N0YWNrOiBMYXllcjxzdHJpbmc+W10gPSBbXTtcblxuICAjbWF0Y2gocGF0aDogc3RyaW5nLCBtZXRob2Q6IEhUVFBNZXRob2RzKTogTWF0Y2hlczxzdHJpbmc+IHtcbiAgICBjb25zdCBtYXRjaGVzOiBNYXRjaGVzPHN0cmluZz4gPSB7XG4gICAgICBwYXRoOiBbXSxcbiAgICAgIHBhdGhBbmRNZXRob2Q6IFtdLFxuICAgICAgcm91dGU6IGZhbHNlLFxuICAgIH07XG5cbiAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHRoaXMuI3N0YWNrKSB7XG4gICAgICBpZiAocm91dGUubWF0Y2gocGF0aCkpIHtcbiAgICAgICAgbWF0Y2hlcy5wYXRoLnB1c2gocm91dGUpO1xuICAgICAgICBpZiAocm91dGUubWV0aG9kcy5sZW5ndGggPT09IDAgfHwgcm91dGUubWV0aG9kcy5pbmNsdWRlcyhtZXRob2QpKSB7XG4gICAgICAgICAgbWF0Y2hlcy5wYXRoQW5kTWV0aG9kLnB1c2gocm91dGUpO1xuICAgICAgICAgIGlmIChyb3V0ZS5tZXRob2RzLmxlbmd0aCkge1xuICAgICAgICAgICAgbWF0Y2hlcy5yb3V0ZSA9IHRydWU7XG4gICAgICAgICAgICBtYXRjaGVzLm5hbWUgPSByb3V0ZS5uYW1lO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBtYXRjaGVzO1xuICB9XG5cbiAgI3JlZ2lzdGVyKFxuICAgIHBhdGg6IHN0cmluZyB8IHN0cmluZ1tdLFxuICAgIG1pZGRsZXdhcmVzOiBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZz5bXSxcbiAgICBtZXRob2RzOiBIVFRQTWV0aG9kc1tdLFxuICAgIG9wdGlvbnM6IFJlZ2lzdGVyT3B0aW9ucyA9IHt9LFxuICApOiB2b2lkIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShwYXRoKSkge1xuICAgICAgZm9yIChjb25zdCBwIG9mIHBhdGgpIHtcbiAgICAgICAgdGhpcy4jcmVnaXN0ZXIocCwgbWlkZGxld2FyZXMsIG1ldGhvZHMsIG9wdGlvbnMpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBsYXllck1pZGRsZXdhcmVzOiBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZz5bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgbWlkZGxld2FyZSBvZiBtaWRkbGV3YXJlcykge1xuICAgICAgaWYgKCFtaWRkbGV3YXJlLnJvdXRlcikge1xuICAgICAgICBsYXllck1pZGRsZXdhcmVzLnB1c2gobWlkZGxld2FyZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAobGF5ZXJNaWRkbGV3YXJlcy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy4jYWRkTGF5ZXIocGF0aCwgbGF5ZXJNaWRkbGV3YXJlcywgbWV0aG9kcywgb3B0aW9ucyk7XG4gICAgICAgIGxheWVyTWlkZGxld2FyZXMgPSBbXTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgcm91dGVyID0gbWlkZGxld2FyZS5yb3V0ZXIuI2Nsb25lKCk7XG5cbiAgICAgIGZvciAoY29uc3QgbGF5ZXIgb2Ygcm91dGVyLiNzdGFjaykge1xuICAgICAgICBpZiAoIW9wdGlvbnMuaWdub3JlUHJlZml4KSB7XG4gICAgICAgICAgbGF5ZXIuc2V0UHJlZml4KHBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLiNvcHRzLnByZWZpeCkge1xuICAgICAgICAgIGxheWVyLnNldFByZWZpeCh0aGlzLiNvcHRzLnByZWZpeCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy4jc3RhY2sucHVzaChsYXllcik7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgW3BhcmFtLCBtd10gb2YgT2JqZWN0LmVudHJpZXModGhpcy4jcGFyYW1zKSkge1xuICAgICAgICByb3V0ZXIucGFyYW0ocGFyYW0sIG13KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobGF5ZXJNaWRkbGV3YXJlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuI2FkZExheWVyKHBhdGgsIGxheWVyTWlkZGxld2FyZXMsIG1ldGhvZHMsIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gICNhZGRMYXllcihcbiAgICBwYXRoOiBzdHJpbmcsXG4gICAgbWlkZGxld2FyZXM6IFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nPltdLFxuICAgIG1ldGhvZHM6IEhUVFBNZXRob2RzW10sXG4gICAgb3B0aW9uczogTGF5ZXJPcHRpb25zID0ge30sXG4gICkge1xuICAgIGNvbnN0IHtcbiAgICAgIGVuZCxcbiAgICAgIG5hbWUsXG4gICAgICBzZW5zaXRpdmUgPSB0aGlzLiNvcHRzLnNlbnNpdGl2ZSxcbiAgICAgIHN0cmljdCA9IHRoaXMuI29wdHMuc3RyaWN0LFxuICAgICAgaWdub3JlQ2FwdHVyZXMsXG4gICAgfSA9IG9wdGlvbnM7XG4gICAgY29uc3Qgcm91dGUgPSBuZXcgTGF5ZXIocGF0aCwgbWV0aG9kcywgbWlkZGxld2FyZXMsIHtcbiAgICAgIGVuZCxcbiAgICAgIG5hbWUsXG4gICAgICBzZW5zaXRpdmUsXG4gICAgICBzdHJpY3QsXG4gICAgICBpZ25vcmVDYXB0dXJlcyxcbiAgICB9KTtcblxuICAgIGlmICh0aGlzLiNvcHRzLnByZWZpeCkge1xuICAgICAgcm91dGUuc2V0UHJlZml4KHRoaXMuI29wdHMucHJlZml4KTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IFtwYXJhbSwgbXddIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMuI3BhcmFtcykpIHtcbiAgICAgIHJvdXRlLnBhcmFtKHBhcmFtLCBtdyk7XG4gICAgfVxuXG4gICAgdGhpcy4jc3RhY2sucHVzaChyb3V0ZSk7XG4gIH1cblxuICAjcm91dGUobmFtZTogc3RyaW5nKTogTGF5ZXI8c3RyaW5nPiB8IHVuZGVmaW5lZCB7XG4gICAgZm9yIChjb25zdCByb3V0ZSBvZiB0aGlzLiNzdGFjaykge1xuICAgICAgaWYgKHJvdXRlLm5hbWUgPT09IG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHJvdXRlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gICN1c2VWZXJiKFxuICAgIG5hbWVPclBhdGg6IHN0cmluZyxcbiAgICBwYXRoT3JNaWRkbGV3YXJlOiBzdHJpbmcgfCBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZz4sXG4gICAgbWlkZGxld2FyZTogUm91dGVyTWlkZGxld2FyZTxzdHJpbmc+W10sXG4gICAgbWV0aG9kczogSFRUUE1ldGhvZHNbXSxcbiAgKTogdm9pZCB7XG4gICAgbGV0IG5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBsZXQgcGF0aDogc3RyaW5nO1xuICAgIGlmICh0eXBlb2YgcGF0aE9yTWlkZGxld2FyZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgbmFtZSA9IG5hbWVPclBhdGg7XG4gICAgICBwYXRoID0gcGF0aE9yTWlkZGxld2FyZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGF0aCA9IG5hbWVPclBhdGg7XG4gICAgICBtaWRkbGV3YXJlLnVuc2hpZnQocGF0aE9yTWlkZGxld2FyZSk7XG4gICAgfVxuXG4gICAgdGhpcy4jcmVnaXN0ZXIocGF0aCwgbWlkZGxld2FyZSwgbWV0aG9kcywgeyBuYW1lIH0pO1xuICB9XG5cbiAgI2Nsb25lKCk6IFJvdXRlcjxSUz4ge1xuICAgIGNvbnN0IHJvdXRlciA9IG5ldyBSb3V0ZXI8UlM+KHRoaXMuI29wdHMpO1xuICAgIHJvdXRlci4jbWV0aG9kcyA9IHJvdXRlci4jbWV0aG9kcy5zbGljZSgpO1xuICAgIHJvdXRlci4jcGFyYW1zID0geyAuLi50aGlzLiNwYXJhbXMgfTtcbiAgICByb3V0ZXIuI3N0YWNrID0gdGhpcy4jc3RhY2subWFwKChsYXllcikgPT4gbGF5ZXIuY2xvbmUoKSk7XG4gICAgcmV0dXJuIHJvdXRlcjtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKG9wdHM6IFJvdXRlck9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMuI29wdHMgPSBvcHRzO1xuICAgIHRoaXMuI21ldGhvZHMgPSBvcHRzLm1ldGhvZHMgPz8gW1xuICAgICAgXCJERUxFVEVcIixcbiAgICAgIFwiR0VUXCIsXG4gICAgICBcIkhFQURcIixcbiAgICAgIFwiT1BUSU9OU1wiLFxuICAgICAgXCJQQVRDSFwiLFxuICAgICAgXCJQT1NUXCIsXG4gICAgICBcIlBVVFwiLFxuICAgIF07XG4gIH1cblxuICAvKiogUmVnaXN0ZXIgbmFtZWQgbWlkZGxld2FyZSBmb3IgdGhlIHNwZWNpZmllZCByb3V0ZXMgd2hlbiBzcGVjaWZpZWQgbWV0aG9kc1xuICAgKiBhcmUgcmVxdWVzdGVkLiAqL1xuICBhZGQ8XG4gICAgUiBleHRlbmRzIHN0cmluZyxcbiAgICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8Uj4gPSBSb3V0ZVBhcmFtczxSPixcbiAgICBTIGV4dGVuZHMgU3RhdGUgPSBSUyxcbiAgPihcbiAgICBtZXRob2RzOiBIVFRQTWV0aG9kc1tdIHwgSFRUUE1ldGhvZHMsXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIHBhdGg6IFIsXG4gICAgbWlkZGxld2FyZTogUm91dGVyTWlkZGxld2FyZTxSLCBQLCBTPixcbiAgICAuLi5taWRkbGV3YXJlczogUm91dGVyTWlkZGxld2FyZTxSLCBQLCBTPltdXG4gICk6IFJvdXRlcjxTIGV4dGVuZHMgUlMgPyBTIDogKFMgJiBSUyk+O1xuICAvKiogUmVnaXN0ZXIgbWlkZGxld2FyZSBmb3IgdGhlIHNwZWNpZmllZCByb3V0ZXMgd2hlbiB0aGUgc3BlY2lmaWVkIG1ldGhvZHMgaXNcbiAgICogcmVxdWVzdGVkLiAqL1xuICBhZGQ8XG4gICAgUiBleHRlbmRzIHN0cmluZyxcbiAgICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8Uj4gPSBSb3V0ZVBhcmFtczxSPixcbiAgICBTIGV4dGVuZHMgU3RhdGUgPSBSUyxcbiAgPihcbiAgICBtZXRob2RzOiBIVFRQTWV0aG9kc1tdIHwgSFRUUE1ldGhvZHMsXG4gICAgcGF0aDogUixcbiAgICBtaWRkbGV3YXJlOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+LFxuICAgIC4uLm1pZGRsZXdhcmVzOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+W11cbiAgKTogUm91dGVyPFMgZXh0ZW5kcyBSUyA/IFMgOiAoUyAmIFJTKT47XG4gIC8qKiBSZWdpc3RlciBtaWRkbGV3YXJlIGZvciB0aGUgc3BlY2lmaWVkIHJvdXRlcyB3aGVuIHRoZSBzcGVjaWZpZWQgbWV0aG9kc1xuICAgKiBhcmUgcmVxdWVzdGVkIHdpdGggZXhwbGljaXQgcGF0aCBwYXJhbWV0ZXJzLiAqL1xuICBhZGQ8XG4gICAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPHN0cmluZz4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgbWV0aG9kczogSFRUUE1ldGhvZHNbXSB8IEhUVFBNZXRob2RzLFxuICAgIG5hbWVPclBhdGg6IHN0cmluZyxcbiAgICBwYXRoT3JNaWRkbGV3YXJlOiBzdHJpbmcgfCBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZywgUCwgUz4sXG4gICAgLi4ubWlkZGxld2FyZTogUm91dGVyTWlkZGxld2FyZTxzdHJpbmcsIFAsIFM+W11cbiAgKTogUm91dGVyPFMgZXh0ZW5kcyBSUyA/IFMgOiAoUyAmIFJTKT47XG4gIGFkZDxcbiAgICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8c3RyaW5nPiA9IFJvdXRlUGFyYW1zPHN0cmluZz4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgbWV0aG9kczogSFRUUE1ldGhvZHNbXSB8IEhUVFBNZXRob2RzLFxuICAgIG5hbWVPclBhdGg6IHN0cmluZyxcbiAgICBwYXRoT3JNaWRkbGV3YXJlOiBzdHJpbmcgfCBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZywgUCwgUz4sXG4gICAgLi4ubWlkZGxld2FyZTogUm91dGVyTWlkZGxld2FyZTxzdHJpbmcsIFAsIFM+W11cbiAgKTogUm91dGVyPFMgZXh0ZW5kcyBSUyA/IFMgOiAoUyAmIFJTKT4ge1xuICAgIHRoaXMuI3VzZVZlcmIoXG4gICAgICBuYW1lT3JQYXRoLFxuICAgICAgcGF0aE9yTWlkZGxld2FyZSBhcyAoc3RyaW5nIHwgUm91dGVyTWlkZGxld2FyZTxzdHJpbmc+KSxcbiAgICAgIG1pZGRsZXdhcmUgYXMgUm91dGVyTWlkZGxld2FyZTxzdHJpbmc+W10sXG4gICAgICB0eXBlb2YgbWV0aG9kcyA9PT0gXCJzdHJpbmdcIiA/IFttZXRob2RzXSA6IG1ldGhvZHMsXG4gICAgKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKiBSZWdpc3RlciBuYW1lZCBtaWRkbGV3YXJlIGZvciB0aGUgc3BlY2lmaWVkIHJvdXRlcyB3aGVuIHRoZSBgREVMRVRFYCxcbiAgICogYEdFVGAsIGBQT1NUYCwgb3IgYFBVVGAgbWV0aG9kIGlzIHJlcXVlc3RlZC4gKi9cbiAgYWxsPFxuICAgIFIgZXh0ZW5kcyBzdHJpbmcsXG4gICAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPFI+ID0gUm91dGVQYXJhbXM8Uj4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIHBhdGg6IFIsXG4gICAgbWlkZGxld2FyZTogUm91dGVyTWlkZGxld2FyZTxSLCBQLCBTPixcbiAgICAuLi5taWRkbGV3YXJlczogUm91dGVyTWlkZGxld2FyZTxSLCBQLCBTPltdXG4gICk6IFJvdXRlcjxTIGV4dGVuZHMgUlMgPyBTIDogKFMgJiBSUyk+O1xuICAvKiogUmVnaXN0ZXIgbWlkZGxld2FyZSBmb3IgdGhlIHNwZWNpZmllZCByb3V0ZXMgd2hlbiB0aGUgYERFTEVURWAsXG4gICAqIGBHRVRgLCBgUE9TVGAsIG9yIGBQVVRgIG1ldGhvZCBpcyByZXF1ZXN0ZWQuICovXG4gIGFsbDxcbiAgICBSIGV4dGVuZHMgc3RyaW5nLFxuICAgIFAgZXh0ZW5kcyBSb3V0ZVBhcmFtczxSPiA9IFJvdXRlUGFyYW1zPFI+LFxuICAgIFMgZXh0ZW5kcyBTdGF0ZSA9IFJTLFxuICA+KFxuICAgIHBhdGg6IFIsXG4gICAgbWlkZGxld2FyZTogUm91dGVyTWlkZGxld2FyZTxSLCBQLCBTPixcbiAgICAuLi5taWRkbGV3YXJlczogUm91dGVyTWlkZGxld2FyZTxSLCBQLCBTPltdXG4gICk6IFJvdXRlcjxTIGV4dGVuZHMgUlMgPyBTIDogKFMgJiBSUyk+O1xuICAvKiogUmVnaXN0ZXIgbWlkZGxld2FyZSBmb3IgdGhlIHNwZWNpZmllZCByb3V0ZXMgd2hlbiB0aGUgYERFTEVURWAsXG4gICAqIGBHRVRgLCBgUE9TVGAsIG9yIGBQVVRgIG1ldGhvZCBpcyByZXF1ZXN0ZWQgd2l0aCBleHBsaWNpdCBwYXRoIHBhcmFtZXRlcnMuXG4gICAqL1xuICBhbGw8XG4gICAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPHN0cmluZz4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgbmFtZU9yUGF0aDogc3RyaW5nLFxuICAgIHBhdGhPck1pZGRsZXdhcmU6IHN0cmluZyB8IFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nLCBQLCBTPixcbiAgICAuLi5taWRkbGV3YXJlOiBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZywgUCwgUz5bXVxuICApOiBSb3V0ZXI8UyBleHRlbmRzIFJTID8gUyA6IChTICYgUlMpPjtcbiAgYWxsPFxuICAgIFAgZXh0ZW5kcyBSb3V0ZVBhcmFtczxzdHJpbmc+ID0gUm91dGVQYXJhbXM8c3RyaW5nPixcbiAgICBTIGV4dGVuZHMgU3RhdGUgPSBSUyxcbiAgPihcbiAgICBuYW1lT3JQYXRoOiBzdHJpbmcsXG4gICAgcGF0aE9yTWlkZGxld2FyZTogc3RyaW5nIHwgUm91dGVyTWlkZGxld2FyZTxzdHJpbmcsIFAsIFM+LFxuICAgIC4uLm1pZGRsZXdhcmU6IFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nLCBQLCBTPltdXG4gICk6IFJvdXRlcjxTIGV4dGVuZHMgUlMgPyBTIDogKFMgJiBSUyk+IHtcbiAgICB0aGlzLiN1c2VWZXJiKFxuICAgICAgbmFtZU9yUGF0aCxcbiAgICAgIHBhdGhPck1pZGRsZXdhcmUgYXMgKHN0cmluZyB8IFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nPiksXG4gICAgICBtaWRkbGV3YXJlIGFzIFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nPltdLFxuICAgICAgdGhpcy4jbWV0aG9kcy5maWx0ZXIoKG1ldGhvZCkgPT4gbWV0aG9kICE9PSBcIk9QVElPTlNcIiksXG4gICAgKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKiBNaWRkbGV3YXJlIHRoYXQgaGFuZGxlcyByZXF1ZXN0cyBmb3IgSFRUUCBtZXRob2RzIHJlZ2lzdGVyZWQgd2l0aCB0aGVcbiAgICogcm91dGVyLiAgSWYgbm9uZSBvZiB0aGUgcm91dGVzIGhhbmRsZSBhIG1ldGhvZCwgdGhlbiBcIm5vdCBhbGxvd2VkXCIgbG9naWNcbiAgICogd2lsbCBiZSB1c2VkLiAgSWYgYSBtZXRob2QgaXMgc3VwcG9ydGVkIGJ5IHNvbWUgcm91dGVzLCBidXQgbm90IHRoZVxuICAgKiBwYXJ0aWN1bGFyIG1hdGNoZWQgcm91dGVyLCB0aGVuIFwibm90IGltcGxlbWVudGVkXCIgd2lsbCBiZSByZXR1cm5lZC5cbiAgICpcbiAgICogVGhlIG1pZGRsZXdhcmUgd2lsbCBhbHNvIGF1dG9tYXRpY2FsbHkgaGFuZGxlIHRoZSBgT1BUSU9OU2AgbWV0aG9kLFxuICAgKiByZXNwb25kaW5nIHdpdGggYSBgMjAwIE9LYCB3aGVuIHRoZSBgQWxsb3dlZGAgaGVhZGVyIHNlbnQgdG8gdGhlIGFsbG93ZWRcbiAgICogbWV0aG9kcyBmb3IgYSBnaXZlbiByb3V0ZS5cbiAgICpcbiAgICogQnkgZGVmYXVsdCwgYSBcIm5vdCBhbGxvd2VkXCIgcmVxdWVzdCB3aWxsIHJlc3BvbmQgd2l0aCBhIGA0MDUgTm90IEFsbG93ZWRgXG4gICAqIGFuZCBhIFwibm90IGltcGxlbWVudGVkXCIgd2lsbCByZXNwb25kIHdpdGggYSBgNTAxIE5vdCBJbXBsZW1lbnRlZGAuIFNldHRpbmdcbiAgICogdGhlIG9wdGlvbiBgLnRocm93YCB0byBgdHJ1ZWAgd2lsbCBjYXVzZSB0aGUgbWlkZGxld2FyZSB0byB0aHJvdyBhblxuICAgKiBgSFRUUEVycm9yYCBpbnN0ZWFkIG9mIHNldHRpbmcgdGhlIHJlc3BvbnNlIHN0YXR1cy4gIFRoZSBlcnJvciBjYW4gYmVcbiAgICogb3ZlcnJpZGRlbiBieSBwcm92aWRpbmcgYSBgLm5vdEltcGxlbWVudGVkYCBvciBgLm5vdEFsbG93ZWRgIG1ldGhvZCBpbiB0aGVcbiAgICogb3B0aW9ucywgb2Ygd2hpY2ggdGhlIHZhbHVlIHdpbGwgYmUgcmV0dXJuZWQgd2lsbCBiZSB0aHJvd24gaW5zdGVhZCBvZiB0aGVcbiAgICogSFRUUCBlcnJvci4gKi9cbiAgYWxsb3dlZE1ldGhvZHMoXG4gICAgb3B0aW9uczogUm91dGVyQWxsb3dlZE1ldGhvZHNPcHRpb25zID0ge30sXG4gICk6IE1pZGRsZXdhcmUge1xuICAgIGNvbnN0IGltcGxlbWVudGVkID0gdGhpcy4jbWV0aG9kcztcblxuICAgIGNvbnN0IGFsbG93ZWRNZXRob2RzOiBNaWRkbGV3YXJlID0gYXN5bmMgKGNvbnRleHQsIG5leHQpID0+IHtcbiAgICAgIGNvbnN0IGN0eCA9IGNvbnRleHQgYXMgUm91dGVyQ29udGV4dDxzdHJpbmc+O1xuICAgICAgYXdhaXQgbmV4dCgpO1xuICAgICAgaWYgKCFjdHgucmVzcG9uc2Uuc3RhdHVzIHx8IGN0eC5yZXNwb25zZS5zdGF0dXMgPT09IFN0YXR1cy5Ob3RGb3VuZCkge1xuICAgICAgICBhc3NlcnQoY3R4Lm1hdGNoZWQpO1xuICAgICAgICBjb25zdCBhbGxvd2VkID0gbmV3IFNldDxIVFRQTWV0aG9kcz4oKTtcbiAgICAgICAgZm9yIChjb25zdCByb3V0ZSBvZiBjdHgubWF0Y2hlZCkge1xuICAgICAgICAgIGZvciAoY29uc3QgbWV0aG9kIG9mIHJvdXRlLm1ldGhvZHMpIHtcbiAgICAgICAgICAgIGFsbG93ZWQuYWRkKG1ldGhvZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYWxsb3dlZFN0ciA9IFsuLi5hbGxvd2VkXS5qb2luKFwiLCBcIik7XG4gICAgICAgIGlmICghaW1wbGVtZW50ZWQuaW5jbHVkZXMoY3R4LnJlcXVlc3QubWV0aG9kKSkge1xuICAgICAgICAgIGlmIChvcHRpb25zLnRocm93KSB7XG4gICAgICAgICAgICB0aHJvdyBvcHRpb25zLm5vdEltcGxlbWVudGVkXG4gICAgICAgICAgICAgID8gb3B0aW9ucy5ub3RJbXBsZW1lbnRlZCgpXG4gICAgICAgICAgICAgIDogbmV3IGVycm9ycy5Ob3RJbXBsZW1lbnRlZCgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjdHgucmVzcG9uc2Uuc3RhdHVzID0gU3RhdHVzLk5vdEltcGxlbWVudGVkO1xuICAgICAgICAgICAgY3R4LnJlc3BvbnNlLmhlYWRlcnMuc2V0KFwiQWxsb3dcIiwgYWxsb3dlZFN0cik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGFsbG93ZWQuc2l6ZSkge1xuICAgICAgICAgIGlmIChjdHgucmVxdWVzdC5tZXRob2QgPT09IFwiT1BUSU9OU1wiKSB7XG4gICAgICAgICAgICBjdHgucmVzcG9uc2Uuc3RhdHVzID0gU3RhdHVzLk9LO1xuICAgICAgICAgICAgY3R4LnJlc3BvbnNlLmhlYWRlcnMuc2V0KFwiQWxsb3dcIiwgYWxsb3dlZFN0cik7XG4gICAgICAgICAgfSBlbHNlIGlmICghYWxsb3dlZC5oYXMoY3R4LnJlcXVlc3QubWV0aG9kKSkge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMudGhyb3cpIHtcbiAgICAgICAgICAgICAgdGhyb3cgb3B0aW9ucy5tZXRob2ROb3RBbGxvd2VkXG4gICAgICAgICAgICAgICAgPyBvcHRpb25zLm1ldGhvZE5vdEFsbG93ZWQoKVxuICAgICAgICAgICAgICAgIDogbmV3IGVycm9ycy5NZXRob2ROb3RBbGxvd2VkKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjdHgucmVzcG9uc2Uuc3RhdHVzID0gU3RhdHVzLk1ldGhvZE5vdEFsbG93ZWQ7XG4gICAgICAgICAgICAgIGN0eC5yZXNwb25zZS5oZWFkZXJzLnNldChcIkFsbG93XCIsIGFsbG93ZWRTdHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gYWxsb3dlZE1ldGhvZHM7XG4gIH1cblxuICAvKiogUmVnaXN0ZXIgbmFtZWQgbWlkZGxld2FyZSBmb3IgdGhlIHNwZWNpZmllZCByb3V0ZXMgd2hlbiB0aGUgYERFTEVURWAsXG4gICAqICBtZXRob2QgaXMgcmVxdWVzdGVkLiAqL1xuICBkZWxldGU8XG4gICAgUiBleHRlbmRzIHN0cmluZyxcbiAgICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8Uj4gPSBSb3V0ZVBhcmFtczxSPixcbiAgICBTIGV4dGVuZHMgU3RhdGUgPSBSUyxcbiAgPihcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgcGF0aDogUixcbiAgICBtaWRkbGV3YXJlOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+LFxuICAgIC4uLm1pZGRsZXdhcmVzOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+W11cbiAgKTogUm91dGVyPFMgZXh0ZW5kcyBSUyA/IFMgOiAoUyAmIFJTKT47XG4gIC8qKiBSZWdpc3RlciBtaWRkbGV3YXJlIGZvciB0aGUgc3BlY2lmaWVkIHJvdXRlcyB3aGVuIHRoZSBgREVMRVRFYCxcbiAgICogbWV0aG9kIGlzIHJlcXVlc3RlZC4gKi9cbiAgZGVsZXRlPFxuICAgIFIgZXh0ZW5kcyBzdHJpbmcsXG4gICAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPFI+ID0gUm91dGVQYXJhbXM8Uj4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgcGF0aDogUixcbiAgICBtaWRkbGV3YXJlOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+LFxuICAgIC4uLm1pZGRsZXdhcmVzOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+W11cbiAgKTogUm91dGVyPFMgZXh0ZW5kcyBSUyA/IFMgOiAoUyAmIFJTKT47XG4gIC8qKiBSZWdpc3RlciBtaWRkbGV3YXJlIGZvciB0aGUgc3BlY2lmaWVkIHJvdXRlcyB3aGVuIHRoZSBgREVMRVRFYCxcbiAgICogbWV0aG9kIGlzIHJlcXVlc3RlZCB3aXRoIGV4cGxpY2l0IHBhdGggcGFyYW1ldGVycy4gKi9cbiAgZGVsZXRlPFxuICAgIFAgZXh0ZW5kcyBSb3V0ZVBhcmFtczxzdHJpbmc+LFxuICAgIFMgZXh0ZW5kcyBTdGF0ZSA9IFJTLFxuICA+KFxuICAgIG5hbWVPclBhdGg6IHN0cmluZyxcbiAgICBwYXRoT3JNaWRkbGV3YXJlOiBzdHJpbmcgfCBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZywgUCwgUz4sXG4gICAgLi4ubWlkZGxld2FyZTogUm91dGVyTWlkZGxld2FyZTxzdHJpbmcsIFAsIFM+W11cbiAgKTogUm91dGVyPFMgZXh0ZW5kcyBSUyA/IFMgOiAoUyAmIFJTKT47XG4gIGRlbGV0ZTxcbiAgICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8c3RyaW5nPiA9IFJvdXRlUGFyYW1zPHN0cmluZz4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgbmFtZU9yUGF0aDogc3RyaW5nLFxuICAgIHBhdGhPck1pZGRsZXdhcmU6IHN0cmluZyB8IFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nLCBQLCBTPixcbiAgICAuLi5taWRkbGV3YXJlOiBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZywgUCwgUz5bXVxuICApOiBSb3V0ZXI8UyBleHRlbmRzIFJTID8gUyA6IChTICYgUlMpPiB7XG4gICAgdGhpcy4jdXNlVmVyYihcbiAgICAgIG5hbWVPclBhdGgsXG4gICAgICBwYXRoT3JNaWRkbGV3YXJlIGFzIChzdHJpbmcgfCBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZz4pLFxuICAgICAgbWlkZGxld2FyZSBhcyBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZz5bXSxcbiAgICAgIFtcIkRFTEVURVwiXSxcbiAgICApO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqIEl0ZXJhdGUgb3ZlciB0aGUgcm91dGVzIGN1cnJlbnRseSBhZGRlZCB0byB0aGUgcm91dGVyLiAgVG8gYmUgY29tcGF0aWJsZVxuICAgKiB3aXRoIHRoZSBpdGVyYWJsZSBpbnRlcmZhY2VzLCBib3RoIHRoZSBrZXkgYW5kIHZhbHVlIGFyZSBzZXQgdG8gdGhlIHZhbHVlXG4gICAqIG9mIHRoZSByb3V0ZS4gKi9cbiAgKmVudHJpZXMoKTogSXRlcmFibGVJdGVyYXRvcjxbUm91dGU8c3RyaW5nPiwgUm91dGU8c3RyaW5nPl0+IHtcbiAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHRoaXMuI3N0YWNrKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHJvdXRlLnRvSlNPTigpO1xuICAgICAgeWllbGQgW3ZhbHVlLCB2YWx1ZV07XG4gICAgfVxuICB9XG5cbiAgLyoqIEl0ZXJhdGUgb3ZlciB0aGUgcm91dGVzIGN1cnJlbnRseSBhZGRlZCB0byB0aGUgcm91dGVyLCBjYWxsaW5nIHRoZVxuICAgKiBgY2FsbGJhY2tgIGZ1bmN0aW9uIGZvciBlYWNoIHZhbHVlLiAqL1xuICBmb3JFYWNoKFxuICAgIGNhbGxiYWNrOiAoXG4gICAgICB2YWx1ZTE6IFJvdXRlPHN0cmluZz4sXG4gICAgICB2YWx1ZTI6IFJvdXRlPHN0cmluZz4sXG4gICAgICByb3V0ZXI6IHRoaXMsXG4gICAgKSA9PiB2b2lkLFxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgdGhpc0FyZzogYW55ID0gbnVsbCxcbiAgKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCByb3V0ZSBvZiB0aGlzLiNzdGFjaykge1xuICAgICAgY29uc3QgdmFsdWUgPSByb3V0ZS50b0pTT04oKTtcbiAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgdmFsdWUsIHZhbHVlLCB0aGlzKTtcbiAgICB9XG4gIH1cblxuICAvKiogUmVnaXN0ZXIgbmFtZWQgbWlkZGxld2FyZSBmb3IgdGhlIHNwZWNpZmllZCByb3V0ZXMgd2hlbiB0aGUgYEdFVGAsXG4gICAqICBtZXRob2QgaXMgcmVxdWVzdGVkLiAqL1xuICBnZXQ8XG4gICAgUiBleHRlbmRzIHN0cmluZyxcbiAgICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8Uj4gPSBSb3V0ZVBhcmFtczxSPixcbiAgICBTIGV4dGVuZHMgU3RhdGUgPSBSUyxcbiAgPihcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgcGF0aDogUixcbiAgICBtaWRkbGV3YXJlOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+LFxuICAgIC4uLm1pZGRsZXdhcmVzOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+W11cbiAgKTogUm91dGVyPFMgZXh0ZW5kcyBSUyA/IFMgOiAoUyAmIFJTKT47XG4gIC8qKiBSZWdpc3RlciBtaWRkbGV3YXJlIGZvciB0aGUgc3BlY2lmaWVkIHJvdXRlcyB3aGVuIHRoZSBgR0VUYCxcbiAgICogbWV0aG9kIGlzIHJlcXVlc3RlZC4gKi9cbiAgZ2V0PFxuICAgIFIgZXh0ZW5kcyBzdHJpbmcsXG4gICAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPFI+ID0gUm91dGVQYXJhbXM8Uj4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgcGF0aDogUixcbiAgICBtaWRkbGV3YXJlOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+LFxuICAgIC4uLm1pZGRsZXdhcmVzOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+W11cbiAgKTogUm91dGVyPFMgZXh0ZW5kcyBSUyA/IFMgOiAoUyAmIFJTKT47XG4gIC8qKiBSZWdpc3RlciBtaWRkbGV3YXJlIGZvciB0aGUgc3BlY2lmaWVkIHJvdXRlcyB3aGVuIHRoZSBgR0VUYCxcbiAgICogbWV0aG9kIGlzIHJlcXVlc3RlZCB3aXRoIGV4cGxpY2l0IHBhdGggcGFyYW1ldGVycy4gKi9cbiAgZ2V0PFxuICAgIFAgZXh0ZW5kcyBSb3V0ZVBhcmFtczxzdHJpbmc+LFxuICAgIFMgZXh0ZW5kcyBTdGF0ZSA9IFJTLFxuICA+KFxuICAgIG5hbWVPclBhdGg6IHN0cmluZyxcbiAgICBwYXRoT3JNaWRkbGV3YXJlOiBzdHJpbmcgfCBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZywgUCwgUz4sXG4gICAgLi4ubWlkZGxld2FyZTogUm91dGVyTWlkZGxld2FyZTxzdHJpbmcsIFAsIFM+W11cbiAgKTogUm91dGVyPFMgZXh0ZW5kcyBSUyA/IFMgOiAoUyAmIFJTKT47XG4gIGdldDxcbiAgICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8c3RyaW5nPiA9IFJvdXRlUGFyYW1zPHN0cmluZz4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgbmFtZU9yUGF0aDogc3RyaW5nLFxuICAgIHBhdGhPck1pZGRsZXdhcmU6IHN0cmluZyB8IFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nLCBQLCBTPixcbiAgICAuLi5taWRkbGV3YXJlOiBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZywgUCwgUz5bXVxuICApOiBSb3V0ZXI8UyBleHRlbmRzIFJTID8gUyA6IChTICYgUlMpPiB7XG4gICAgdGhpcy4jdXNlVmVyYihcbiAgICAgIG5hbWVPclBhdGgsXG4gICAgICBwYXRoT3JNaWRkbGV3YXJlIGFzIChzdHJpbmcgfCBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZz4pLFxuICAgICAgbWlkZGxld2FyZSBhcyBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZz5bXSxcbiAgICAgIFtcIkdFVFwiXSxcbiAgICApO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqIFJlZ2lzdGVyIG5hbWVkIG1pZGRsZXdhcmUgZm9yIHRoZSBzcGVjaWZpZWQgcm91dGVzIHdoZW4gdGhlIGBIRUFEYCxcbiAgICogIG1ldGhvZCBpcyByZXF1ZXN0ZWQuICovXG4gIGhlYWQ8XG4gICAgUiBleHRlbmRzIHN0cmluZyxcbiAgICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8Uj4gPSBSb3V0ZVBhcmFtczxSPixcbiAgICBTIGV4dGVuZHMgU3RhdGUgPSBSUyxcbiAgPihcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgcGF0aDogUixcbiAgICBtaWRkbGV3YXJlOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+LFxuICAgIC4uLm1pZGRsZXdhcmVzOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+W11cbiAgKTogUm91dGVyPFMgZXh0ZW5kcyBSUyA/IFMgOiAoUyAmIFJTKT47XG4gIC8qKiBSZWdpc3RlciBtaWRkbGV3YXJlIGZvciB0aGUgc3BlY2lmaWVkIHJvdXRlcyB3aGVuIHRoZSBgSEVBRGAsXG4gICAqIG1ldGhvZCBpcyByZXF1ZXN0ZWQuICovXG4gIGhlYWQ8XG4gICAgUiBleHRlbmRzIHN0cmluZyxcbiAgICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8Uj4gPSBSb3V0ZVBhcmFtczxSPixcbiAgICBTIGV4dGVuZHMgU3RhdGUgPSBSUyxcbiAgPihcbiAgICBwYXRoOiBSLFxuICAgIG1pZGRsZXdhcmU6IFJvdXRlck1pZGRsZXdhcmU8UiwgUCwgUz4sXG4gICAgLi4ubWlkZGxld2FyZXM6IFJvdXRlck1pZGRsZXdhcmU8UiwgUCwgUz5bXVxuICApOiBSb3V0ZXI8UyBleHRlbmRzIFJTID8gUyA6IChTICYgUlMpPjtcbiAgLyoqIFJlZ2lzdGVyIG1pZGRsZXdhcmUgZm9yIHRoZSBzcGVjaWZpZWQgcm91dGVzIHdoZW4gdGhlIGBIRUFEYCxcbiAgICogbWV0aG9kIGlzIHJlcXVlc3RlZCB3aXRoIGV4cGxpY2l0IHBhdGggcGFyYW1ldGVycy4gKi9cbiAgaGVhZDxcbiAgICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8c3RyaW5nPixcbiAgICBTIGV4dGVuZHMgU3RhdGUgPSBSUyxcbiAgPihcbiAgICBuYW1lT3JQYXRoOiBzdHJpbmcsXG4gICAgcGF0aE9yTWlkZGxld2FyZTogc3RyaW5nIHwgUm91dGVyTWlkZGxld2FyZTxzdHJpbmcsIFAsIFM+LFxuICAgIC4uLm1pZGRsZXdhcmU6IFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nLCBQLCBTPltdXG4gICk6IFJvdXRlcjxTIGV4dGVuZHMgUlMgPyBTIDogKFMgJiBSUyk+O1xuICBoZWFkPFxuICAgIFAgZXh0ZW5kcyBSb3V0ZVBhcmFtczxzdHJpbmc+ID0gUm91dGVQYXJhbXM8c3RyaW5nPixcbiAgICBTIGV4dGVuZHMgU3RhdGUgPSBSUyxcbiAgPihcbiAgICBuYW1lT3JQYXRoOiBzdHJpbmcsXG4gICAgcGF0aE9yTWlkZGxld2FyZTogc3RyaW5nIHwgUm91dGVyTWlkZGxld2FyZTxzdHJpbmcsIFAsIFM+LFxuICAgIC4uLm1pZGRsZXdhcmU6IFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nLCBQLCBTPltdXG4gICk6IFJvdXRlcjxTIGV4dGVuZHMgUlMgPyBTIDogKFMgJiBSUyk+IHtcbiAgICB0aGlzLiN1c2VWZXJiKFxuICAgICAgbmFtZU9yUGF0aCxcbiAgICAgIHBhdGhPck1pZGRsZXdhcmUgYXMgKHN0cmluZyB8IFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nPiksXG4gICAgICBtaWRkbGV3YXJlIGFzIFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nPltdLFxuICAgICAgW1wiSEVBRFwiXSxcbiAgICApO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqIEl0ZXJhdGUgb3ZlciB0aGUgcm91dGVzIGN1cnJlbnRseSBhZGRlZCB0byB0aGUgcm91dGVyLiAgVG8gYmUgY29tcGF0aWJsZVxuICAgKiB3aXRoIHRoZSBpdGVyYWJsZSBpbnRlcmZhY2VzLCB0aGUga2V5IGlzIHNldCB0byB0aGUgdmFsdWUgb2YgdGhlIHJvdXRlLiAqL1xuICAqa2V5cygpOiBJdGVyYWJsZUl0ZXJhdG9yPFJvdXRlPHN0cmluZz4+IHtcbiAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHRoaXMuI3N0YWNrKSB7XG4gICAgICB5aWVsZCByb3V0ZS50b0pTT04oKTtcbiAgICB9XG4gIH1cblxuICAvKiogUmVnaXN0ZXIgbmFtZWQgbWlkZGxld2FyZSBmb3IgdGhlIHNwZWNpZmllZCByb3V0ZXMgd2hlbiB0aGUgYE9QVElPTlNgLFxuICAgKiBtZXRob2QgaXMgcmVxdWVzdGVkLiAqL1xuICBvcHRpb25zPFxuICAgIFIgZXh0ZW5kcyBzdHJpbmcsXG4gICAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPFI+ID0gUm91dGVQYXJhbXM8Uj4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIHBhdGg6IFIsXG4gICAgbWlkZGxld2FyZTogUm91dGVyTWlkZGxld2FyZTxSLCBQLCBTPixcbiAgICAuLi5taWRkbGV3YXJlczogUm91dGVyTWlkZGxld2FyZTxSLCBQLCBTPltdXG4gICk6IFJvdXRlcjxTIGV4dGVuZHMgUlMgPyBTIDogKFMgJiBSUyk+O1xuICAvKiogUmVnaXN0ZXIgbWlkZGxld2FyZSBmb3IgdGhlIHNwZWNpZmllZCByb3V0ZXMgd2hlbiB0aGUgYE9QVElPTlNgLFxuICAgKiBtZXRob2QgaXMgcmVxdWVzdGVkLiAqL1xuICBvcHRpb25zPFxuICAgIFIgZXh0ZW5kcyBzdHJpbmcsXG4gICAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPFI+ID0gUm91dGVQYXJhbXM8Uj4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgcGF0aDogUixcbiAgICBtaWRkbGV3YXJlOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+LFxuICAgIC4uLm1pZGRsZXdhcmVzOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+W11cbiAgKTogUm91dGVyPFMgZXh0ZW5kcyBSUyA/IFMgOiAoUyAmIFJTKT47XG4gIC8qKiBSZWdpc3RlciBtaWRkbGV3YXJlIGZvciB0aGUgc3BlY2lmaWVkIHJvdXRlcyB3aGVuIHRoZSBgT1BUSU9OU2AsXG4gICAqIG1ldGhvZCBpcyByZXF1ZXN0ZWQgd2l0aCBleHBsaWNpdCBwYXRoIHBhcmFtZXRlcnMuICovXG4gIG9wdGlvbnM8XG4gICAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPHN0cmluZz4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgbmFtZU9yUGF0aDogc3RyaW5nLFxuICAgIHBhdGhPck1pZGRsZXdhcmU6IHN0cmluZyB8IFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nLCBQLCBTPixcbiAgICAuLi5taWRkbGV3YXJlOiBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZywgUCwgUz5bXVxuICApOiBSb3V0ZXI8UyBleHRlbmRzIFJTID8gUyA6IChTICYgUlMpPjtcbiAgb3B0aW9uczxcbiAgICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8c3RyaW5nPiA9IFJvdXRlUGFyYW1zPHN0cmluZz4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgbmFtZU9yUGF0aDogc3RyaW5nLFxuICAgIHBhdGhPck1pZGRsZXdhcmU6IHN0cmluZyB8IFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nLCBQLCBTPixcbiAgICAuLi5taWRkbGV3YXJlOiBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZywgUCwgUz5bXVxuICApOiBSb3V0ZXI8UyBleHRlbmRzIFJTID8gUyA6IChTICYgUlMpPiB7XG4gICAgdGhpcy4jdXNlVmVyYihcbiAgICAgIG5hbWVPclBhdGgsXG4gICAgICBwYXRoT3JNaWRkbGV3YXJlIGFzIChzdHJpbmcgfCBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZz4pLFxuICAgICAgbWlkZGxld2FyZSBhcyBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZz5bXSxcbiAgICAgIFtcIk9QVElPTlNcIl0sXG4gICAgKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKiBSZWdpc3RlciBwYXJhbSBtaWRkbGV3YXJlLCB3aGljaCB3aWxsIGJlIGNhbGxlZCB3aGVuIHRoZSBwYXJ0aWN1bGFyIHBhcmFtXG4gICAqIGlzIHBhcnNlZCBmcm9tIHRoZSByb3V0ZS4gKi9cbiAgcGFyYW08UiBleHRlbmRzIHN0cmluZywgUyBleHRlbmRzIFN0YXRlID0gUlM+KFxuICAgIHBhcmFtOiBrZXlvZiBSb3V0ZVBhcmFtczxSPixcbiAgICBtaWRkbGV3YXJlOiBSb3V0ZXJQYXJhbU1pZGRsZXdhcmU8UiwgUm91dGVQYXJhbXM8Uj4sIFM+LFxuICApOiBSb3V0ZXI8Uz4ge1xuICAgIHRoaXMuI3BhcmFtc1twYXJhbSBhcyBzdHJpbmddID0gbWlkZGxld2FyZTtcbiAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHRoaXMuI3N0YWNrKSB7XG4gICAgICByb3V0ZS5wYXJhbShwYXJhbSBhcyBzdHJpbmcsIG1pZGRsZXdhcmUpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKiBSZWdpc3RlciBuYW1lZCBtaWRkbGV3YXJlIGZvciB0aGUgc3BlY2lmaWVkIHJvdXRlcyB3aGVuIHRoZSBgUEFUQ0hgLFxuICAgKiBtZXRob2QgaXMgcmVxdWVzdGVkLiAqL1xuICBwYXRjaDxcbiAgICBSIGV4dGVuZHMgc3RyaW5nLFxuICAgIFAgZXh0ZW5kcyBSb3V0ZVBhcmFtczxSPiA9IFJvdXRlUGFyYW1zPFI+LFxuICAgIFMgZXh0ZW5kcyBTdGF0ZSA9IFJTLFxuICA+KFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBwYXRoOiBSLFxuICAgIG1pZGRsZXdhcmU6IFJvdXRlck1pZGRsZXdhcmU8UiwgUCwgUz4sXG4gICAgLi4ubWlkZGxld2FyZXM6IFJvdXRlck1pZGRsZXdhcmU8UiwgUCwgUz5bXVxuICApOiBSb3V0ZXI8UyBleHRlbmRzIFJTID8gUyA6IChTICYgUlMpPjtcbiAgLyoqIFJlZ2lzdGVyIG1pZGRsZXdhcmUgZm9yIHRoZSBzcGVjaWZpZWQgcm91dGVzIHdoZW4gdGhlIGBQQVRDSGAsXG4gICAqIG1ldGhvZCBpcyByZXF1ZXN0ZWQuICovXG4gIHBhdGNoPFxuICAgIFIgZXh0ZW5kcyBzdHJpbmcsXG4gICAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPFI+ID0gUm91dGVQYXJhbXM8Uj4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgcGF0aDogUixcbiAgICBtaWRkbGV3YXJlOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+LFxuICAgIC4uLm1pZGRsZXdhcmVzOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+W11cbiAgKTogUm91dGVyPFMgZXh0ZW5kcyBSUyA/IFMgOiAoUyAmIFJTKT47XG4gIC8qKiBSZWdpc3RlciBtaWRkbGV3YXJlIGZvciB0aGUgc3BlY2lmaWVkIHJvdXRlcyB3aGVuIHRoZSBgUEFUQ0hgLFxuICAgKiBtZXRob2QgaXMgcmVxdWVzdGVkIHdpdGggZXhwbGljaXQgcGF0aCBwYXJhbWV0ZXJzLiAqL1xuICBwYXRjaDxcbiAgICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8c3RyaW5nPixcbiAgICBTIGV4dGVuZHMgU3RhdGUgPSBSUyxcbiAgPihcbiAgICBuYW1lT3JQYXRoOiBzdHJpbmcsXG4gICAgcGF0aE9yTWlkZGxld2FyZTogc3RyaW5nIHwgUm91dGVyTWlkZGxld2FyZTxzdHJpbmcsIFAsIFM+LFxuICAgIC4uLm1pZGRsZXdhcmU6IFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nLCBQLCBTPltdXG4gICk6IFJvdXRlcjxTIGV4dGVuZHMgUlMgPyBTIDogKFMgJiBSUyk+O1xuICBwYXRjaDxcbiAgICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8c3RyaW5nPiA9IFJvdXRlUGFyYW1zPHN0cmluZz4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgbmFtZU9yUGF0aDogc3RyaW5nLFxuICAgIHBhdGhPck1pZGRsZXdhcmU6IHN0cmluZyB8IFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nLCBQLCBTPixcbiAgICAuLi5taWRkbGV3YXJlOiBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZywgUCwgUz5bXVxuICApOiBSb3V0ZXI8UyBleHRlbmRzIFJTID8gUyA6IChTICYgUlMpPiB7XG4gICAgdGhpcy4jdXNlVmVyYihcbiAgICAgIG5hbWVPclBhdGgsXG4gICAgICBwYXRoT3JNaWRkbGV3YXJlIGFzIChzdHJpbmcgfCBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZz4pLFxuICAgICAgbWlkZGxld2FyZSBhcyBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZz5bXSxcbiAgICAgIFtcIlBBVENIXCJdLFxuICAgICk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKiogUmVnaXN0ZXIgbmFtZWQgbWlkZGxld2FyZSBmb3IgdGhlIHNwZWNpZmllZCByb3V0ZXMgd2hlbiB0aGUgYFBPU1RgLFxuICAgKiBtZXRob2QgaXMgcmVxdWVzdGVkLiAqL1xuICBwb3N0PFxuICAgIFIgZXh0ZW5kcyBzdHJpbmcsXG4gICAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPFI+ID0gUm91dGVQYXJhbXM8Uj4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIHBhdGg6IFIsXG4gICAgbWlkZGxld2FyZTogUm91dGVyTWlkZGxld2FyZTxSLCBQLCBTPixcbiAgICAuLi5taWRkbGV3YXJlczogUm91dGVyTWlkZGxld2FyZTxSLCBQLCBTPltdXG4gICk6IFJvdXRlcjxTIGV4dGVuZHMgUlMgPyBTIDogKFMgJiBSUyk+O1xuICAvKiogUmVnaXN0ZXIgbWlkZGxld2FyZSBmb3IgdGhlIHNwZWNpZmllZCByb3V0ZXMgd2hlbiB0aGUgYFBPU1RgLFxuICAgKiBtZXRob2QgaXMgcmVxdWVzdGVkLiAqL1xuICBwb3N0PFxuICAgIFIgZXh0ZW5kcyBzdHJpbmcsXG4gICAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPFI+ID0gUm91dGVQYXJhbXM8Uj4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgcGF0aDogUixcbiAgICBtaWRkbGV3YXJlOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+LFxuICAgIC4uLm1pZGRsZXdhcmVzOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+W11cbiAgKTogUm91dGVyPFMgZXh0ZW5kcyBSUyA/IFMgOiAoUyAmIFJTKT47XG4gIC8qKiBSZWdpc3RlciBtaWRkbGV3YXJlIGZvciB0aGUgc3BlY2lmaWVkIHJvdXRlcyB3aGVuIHRoZSBgUE9TVGAsXG4gICAqIG1ldGhvZCBpcyByZXF1ZXN0ZWQgd2l0aCBleHBsaWNpdCBwYXRoIHBhcmFtZXRlcnMuICovXG4gIHBvc3Q8XG4gICAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPHN0cmluZz4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgbmFtZU9yUGF0aDogc3RyaW5nLFxuICAgIHBhdGhPck1pZGRsZXdhcmU6IHN0cmluZyB8IFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nLCBQLCBTPixcbiAgICAuLi5taWRkbGV3YXJlOiBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZywgUCwgUz5bXVxuICApOiBSb3V0ZXI8UyBleHRlbmRzIFJTID8gUyA6IChTICYgUlMpPjtcbiAgcG9zdDxcbiAgICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8c3RyaW5nPiA9IFJvdXRlUGFyYW1zPHN0cmluZz4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgbmFtZU9yUGF0aDogc3RyaW5nLFxuICAgIHBhdGhPck1pZGRsZXdhcmU6IHN0cmluZyB8IFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nLCBQLCBTPixcbiAgICAuLi5taWRkbGV3YXJlOiBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZywgUCwgUz5bXVxuICApOiBSb3V0ZXI8UyBleHRlbmRzIFJTID8gUyA6IChTICYgUlMpPiB7XG4gICAgdGhpcy4jdXNlVmVyYihcbiAgICAgIG5hbWVPclBhdGgsXG4gICAgICBwYXRoT3JNaWRkbGV3YXJlIGFzIChzdHJpbmcgfCBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZz4pLFxuICAgICAgbWlkZGxld2FyZSBhcyBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZz5bXSxcbiAgICAgIFtcIlBPU1RcIl0sXG4gICAgKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKiBTZXQgdGhlIHJvdXRlciBwcmVmaXggZm9yIHRoaXMgcm91dGVyLiAqL1xuICBwcmVmaXgocHJlZml4OiBzdHJpbmcpOiB0aGlzIHtcbiAgICBwcmVmaXggPSBwcmVmaXgucmVwbGFjZSgvXFwvJC8sIFwiXCIpO1xuICAgIHRoaXMuI29wdHMucHJlZml4ID0gcHJlZml4O1xuICAgIGZvciAoY29uc3Qgcm91dGUgb2YgdGhpcy4jc3RhY2spIHtcbiAgICAgIHJvdXRlLnNldFByZWZpeChwcmVmaXgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKiBSZWdpc3RlciBuYW1lZCBtaWRkbGV3YXJlIGZvciB0aGUgc3BlY2lmaWVkIHJvdXRlcyB3aGVuIHRoZSBgUFVUYFxuICAgKiBtZXRob2QgaXMgcmVxdWVzdGVkLiAqL1xuICBwdXQ8XG4gICAgUiBleHRlbmRzIHN0cmluZyxcbiAgICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8Uj4gPSBSb3V0ZVBhcmFtczxSPixcbiAgICBTIGV4dGVuZHMgU3RhdGUgPSBSUyxcbiAgPihcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgcGF0aDogUixcbiAgICBtaWRkbGV3YXJlOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+LFxuICAgIC4uLm1pZGRsZXdhcmVzOiBSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+W11cbiAgKTogUm91dGVyPFMgZXh0ZW5kcyBSUyA/IFMgOiAoUyAmIFJTKT47XG4gIC8qKiBSZWdpc3RlciBtaWRkbGV3YXJlIGZvciB0aGUgc3BlY2lmaWVkIHJvdXRlcyB3aGVuIHRoZSBgUFVUYFxuICAgKiBtZXRob2QgaXMgcmVxdWVzdGVkLiAqL1xuICBwdXQ8XG4gICAgUiBleHRlbmRzIHN0cmluZyxcbiAgICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8Uj4gPSBSb3V0ZVBhcmFtczxSPixcbiAgICBTIGV4dGVuZHMgU3RhdGUgPSBSUyxcbiAgPihcbiAgICBwYXRoOiBSLFxuICAgIG1pZGRsZXdhcmU6IFJvdXRlck1pZGRsZXdhcmU8UiwgUCwgUz4sXG4gICAgLi4ubWlkZGxld2FyZXM6IFJvdXRlck1pZGRsZXdhcmU8UiwgUCwgUz5bXVxuICApOiBSb3V0ZXI8UyBleHRlbmRzIFJTID8gUyA6IChTICYgUlMpPjtcbiAgLyoqIFJlZ2lzdGVyIG1pZGRsZXdhcmUgZm9yIHRoZSBzcGVjaWZpZWQgcm91dGVzIHdoZW4gdGhlIGBQVVRgXG4gICAqIG1ldGhvZCBpcyByZXF1ZXN0ZWQgd2l0aCBleHBsaWNpdCBwYXRoIHBhcmFtZXRlcnMuICovXG4gIHB1dDxcbiAgICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8c3RyaW5nPixcbiAgICBTIGV4dGVuZHMgU3RhdGUgPSBSUyxcbiAgPihcbiAgICBuYW1lT3JQYXRoOiBzdHJpbmcsXG4gICAgcGF0aE9yTWlkZGxld2FyZTogc3RyaW5nIHwgUm91dGVyTWlkZGxld2FyZTxzdHJpbmcsIFAsIFM+LFxuICAgIC4uLm1pZGRsZXdhcmU6IFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nLCBQLCBTPltdXG4gICk6IFJvdXRlcjxTIGV4dGVuZHMgUlMgPyBTIDogKFMgJiBSUyk+O1xuICBwdXQ8XG4gICAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPHN0cmluZz4gPSBSb3V0ZVBhcmFtczxzdHJpbmc+LFxuICAgIFMgZXh0ZW5kcyBTdGF0ZSA9IFJTLFxuICA+KFxuICAgIG5hbWVPclBhdGg6IHN0cmluZyxcbiAgICBwYXRoT3JNaWRkbGV3YXJlOiBzdHJpbmcgfCBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZywgUCwgUz4sXG4gICAgLi4ubWlkZGxld2FyZTogUm91dGVyTWlkZGxld2FyZTxzdHJpbmcsIFAsIFM+W11cbiAgKTogUm91dGVyPFMgZXh0ZW5kcyBSUyA/IFMgOiAoUyAmIFJTKT4ge1xuICAgIHRoaXMuI3VzZVZlcmIoXG4gICAgICBuYW1lT3JQYXRoLFxuICAgICAgcGF0aE9yTWlkZGxld2FyZSBhcyAoc3RyaW5nIHwgUm91dGVyTWlkZGxld2FyZTxzdHJpbmc+KSxcbiAgICAgIG1pZGRsZXdhcmUgYXMgUm91dGVyTWlkZGxld2FyZTxzdHJpbmc+W10sXG4gICAgICBbXCJQVVRcIl0sXG4gICAgKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKiBSZWdpc3RlciBhIGRpcmVjdGlvbiBtaWRkbGV3YXJlLCB3aGVyZSB3aGVuIHRoZSBgc291cmNlYCBwYXRoIGlzIG1hdGNoZWRcbiAgICogdGhlIHJvdXRlciB3aWxsIHJlZGlyZWN0IHRoZSByZXF1ZXN0IHRvIHRoZSBgZGVzdGluYXRpb25gIHBhdGguICBBIGBzdGF0dXNgXG4gICAqIG9mIGAzMDIgRm91bmRgIHdpbGwgYmUgc2V0IGJ5IGRlZmF1bHQuXG4gICAqXG4gICAqIFRoZSBgc291cmNlYCBhbmQgYGRlc3RpbmF0aW9uYCBjYW4gYmUgbmFtZWQgcm91dGVzLiAqL1xuICByZWRpcmVjdChcbiAgICBzb3VyY2U6IHN0cmluZyxcbiAgICBkZXN0aW5hdGlvbjogc3RyaW5nIHwgVVJMLFxuICAgIHN0YXR1czogUmVkaXJlY3RTdGF0dXMgPSBTdGF0dXMuRm91bmQsXG4gICk6IHRoaXMge1xuICAgIGlmIChzb3VyY2VbMF0gIT09IFwiL1wiKSB7XG4gICAgICBjb25zdCBzID0gdGhpcy51cmwoc291cmNlKTtcbiAgICAgIGlmICghcykge1xuICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgQ291bGQgbm90IHJlc29sdmUgbmFtZWQgcm91dGU6IFwiJHtzb3VyY2V9XCJgKTtcbiAgICAgIH1cbiAgICAgIHNvdXJjZSA9IHM7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZGVzdGluYXRpb24gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIGlmIChkZXN0aW5hdGlvblswXSAhPT0gXCIvXCIpIHtcbiAgICAgICAgY29uc3QgZCA9IHRoaXMudXJsKGRlc3RpbmF0aW9uKTtcbiAgICAgICAgaWYgKCFkKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwoZGVzdGluYXRpb24pO1xuICAgICAgICAgICAgZGVzdGluYXRpb24gPSB1cmw7XG4gICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgQ291bGQgbm90IHJlc29sdmUgbmFtZWQgcm91dGU6IFwiJHtzb3VyY2V9XCJgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVzdGluYXRpb24gPSBkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5hbGwoc291cmNlLCBhc3luYyAoY3R4LCBuZXh0KSA9PiB7XG4gICAgICBhd2FpdCBuZXh0KCk7XG4gICAgICBjdHgucmVzcG9uc2UucmVkaXJlY3QoZGVzdGluYXRpb24pO1xuICAgICAgY3R4LnJlc3BvbnNlLnN0YXR1cyA9IHN0YXR1cztcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKiBSZXR1cm4gbWlkZGxld2FyZSB0aGF0IHdpbGwgZG8gYWxsIHRoZSByb3V0ZSBwcm9jZXNzaW5nIHRoYXQgdGhlIHJvdXRlclxuICAgKiBoYXMgYmVlbiBjb25maWd1cmVkIHRvIGhhbmRsZS4gIFR5cGljYWwgdXNhZ2Ugd291bGQgYmUgc29tZXRoaW5nIGxpa2UgdGhpczpcbiAgICpcbiAgICogYGBgdHNcbiAgICogaW1wb3J0IHsgQXBwbGljYXRpb24sIFJvdXRlciB9IGZyb20gXCJqc3I6QG9hay9vYWsvXCI7XG4gICAqXG4gICAqIGNvbnN0IGFwcCA9IG5ldyBBcHBsaWNhdGlvbigpO1xuICAgKiBjb25zdCByb3V0ZXIgPSBuZXcgUm91dGVyKCk7XG4gICAqXG4gICAqIC8vIHJlZ2lzdGVyIHJvdXRlc1xuICAgKlxuICAgKiBhcHAudXNlKHJvdXRlci5yb3V0ZXMoKSk7XG4gICAqIGFwcC51c2Uocm91dGVyLmFsbG93ZWRNZXRob2RzKCkpO1xuICAgKiBhd2FpdCBhcHAubGlzdGVuKHsgcG9ydDogODAgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcm91dGVzKCk6IE1pZGRsZXdhcmUge1xuICAgIGNvbnN0IGRpc3BhdGNoID0gKFxuICAgICAgY29udGV4dDogQ29udGV4dCxcbiAgICAgIG5leHQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4sXG4gICAgKTogUHJvbWlzZTx1bmtub3duPiA9PiB7XG4gICAgICBjb25zdCBjdHggPSBjb250ZXh0IGFzIFJvdXRlckNvbnRleHQ8c3RyaW5nPjtcbiAgICAgIGxldCBwYXRobmFtZTogc3RyaW5nO1xuICAgICAgbGV0IG1ldGhvZDogSFRUUE1ldGhvZHM7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCB7IHVybDogeyBwYXRobmFtZTogcCB9LCBtZXRob2Q6IG0gfSA9IGN0eC5yZXF1ZXN0O1xuICAgICAgICBwYXRobmFtZSA9IHA7XG4gICAgICAgIG1ldGhvZCA9IG07XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBhdGggPSB0aGlzLiNvcHRzLnJvdXRlclBhdGggPz8gY3R4LnJvdXRlclBhdGggPz9cbiAgICAgICAgZGVjb2RlVVJJKHBhdGhuYW1lKTtcbiAgICAgIGNvbnN0IG1hdGNoZXMgPSB0aGlzLiNtYXRjaChwYXRoLCBtZXRob2QpO1xuXG4gICAgICBpZiAoY3R4Lm1hdGNoZWQpIHtcbiAgICAgICAgY3R4Lm1hdGNoZWQucHVzaCguLi5tYXRjaGVzLnBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3R4Lm1hdGNoZWQgPSBbLi4ubWF0Y2hlcy5wYXRoXTtcbiAgICAgIH1cblxuICAgICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICAgIGN0eC5yb3V0ZXIgPSB0aGlzIGFzIFJvdXRlcjxhbnk+O1xuXG4gICAgICBpZiAoIW1hdGNoZXMucm91dGUpIHJldHVybiBuZXh0KCk7XG5cbiAgICAgIGN0eC5yb3V0ZU5hbWUgPSBtYXRjaGVzLm5hbWU7XG5cbiAgICAgIGNvbnN0IHsgcGF0aEFuZE1ldGhvZDogbWF0Y2hlZFJvdXRlcyB9ID0gbWF0Y2hlcztcblxuICAgICAgY29uc3QgY2hhaW4gPSBtYXRjaGVkUm91dGVzLnJlZHVjZShcbiAgICAgICAgKHByZXYsIHJvdXRlKSA9PiBbXG4gICAgICAgICAgLi4ucHJldixcbiAgICAgICAgICAoY3R4LCBuZXh0KSA9PiB7XG4gICAgICAgICAgICBjdHguY2FwdHVyZXMgPSByb3V0ZS5jYXB0dXJlcyhwYXRoKTtcbiAgICAgICAgICAgIGN0eC5wYXJhbXMgPSByb3V0ZS5wYXJhbXMoY3R4LmNhcHR1cmVzLCBjdHgucGFyYW1zKTtcbiAgICAgICAgICAgIHJldHVybiBuZXh0KCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAuLi5yb3V0ZS5zdGFjayxcbiAgICAgICAgXSxcbiAgICAgICAgW10gYXMgUm91dGVyTWlkZGxld2FyZTxzdHJpbmc+W10sXG4gICAgICApO1xuICAgICAgcmV0dXJuIGNvbXBvc2UoY2hhaW4pKGN0eCwgbmV4dCk7XG4gICAgfTtcbiAgICBkaXNwYXRjaC5yb3V0ZXIgPSB0aGlzO1xuICAgIHJldHVybiBkaXNwYXRjaDtcbiAgfVxuXG4gIC8qKiBHZW5lcmF0ZSBhIFVSTCBwYXRobmFtZSBmb3IgYSBuYW1lZCByb3V0ZSwgaW50ZXJwb2xhdGluZyB0aGUgb3B0aW9uYWxcbiAgICogcGFyYW1zIHByb3ZpZGVkLiAgQWxzbyBhY2NlcHRzIGFuIG9wdGlvbmFsIHNldCBvZiBvcHRpb25zLiAqL1xuICB1cmw8UCBleHRlbmRzIFJvdXRlUGFyYW1zPHN0cmluZz4gPSBSb3V0ZVBhcmFtczxzdHJpbmc+PihcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgcGFyYW1zPzogUCxcbiAgICBvcHRpb25zPzogVXJsT3B0aW9ucyxcbiAgKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCByb3V0ZSA9IHRoaXMuI3JvdXRlKG5hbWUpO1xuXG4gICAgaWYgKHJvdXRlKSB7XG4gICAgICByZXR1cm4gcm91dGUudXJsKHBhcmFtcywgb3B0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgLyoqIFJlZ2lzdGVyIG1pZGRsZXdhcmUgdG8gYmUgdXNlZCBvbiBldmVyeSBtYXRjaGVkIHJvdXRlLiAqL1xuICB1c2U8XG4gICAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPHN0cmluZz4gPSBSb3V0ZVBhcmFtczxzdHJpbmc+LFxuICAgIFMgZXh0ZW5kcyBTdGF0ZSA9IFJTLFxuICA+KFxuICAgIG1pZGRsZXdhcmU6IFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nLCBQLCBTPixcbiAgICAuLi5taWRkbGV3YXJlczogUm91dGVyTWlkZGxld2FyZTxzdHJpbmcsIFAsIFM+W11cbiAgKTogUm91dGVyPFMgZXh0ZW5kcyBSUyA/IFMgOiAoUyAmIFJTKT47XG4gIC8qKiBSZWdpc3RlciBtaWRkbGV3YXJlIHRvIGJlIHVzZWQgb24gZXZlcnkgcm91dGUgdGhhdCBtYXRjaGVzIHRoZSBzdXBwbGllZFxuICAgKiBgcGF0aGAuICovXG4gIHVzZTxcbiAgICBSIGV4dGVuZHMgc3RyaW5nLFxuICAgIFAgZXh0ZW5kcyBSb3V0ZVBhcmFtczxSPiA9IFJvdXRlUGFyYW1zPFI+LFxuICAgIFMgZXh0ZW5kcyBTdGF0ZSA9IFJTLFxuICA+KFxuICAgIHBhdGg6IFIsXG4gICAgbWlkZGxld2FyZTogUm91dGVyTWlkZGxld2FyZTxSLCBQLCBTPixcbiAgICAuLi5taWRkbGV3YXJlczogUm91dGVyTWlkZGxld2FyZTxSLCBQLCBTPltdXG4gICk6IFJvdXRlcjxTIGV4dGVuZHMgUlMgPyBTIDogKFMgJiBSUyk+O1xuICAvKiogUmVnaXN0ZXIgbWlkZGxld2FyZSB0byBiZSB1c2VkIG9uIGV2ZXJ5IHJvdXRlIHRoYXQgbWF0Y2hlcyB0aGUgc3VwcGxpZWRcbiAgICogYHBhdGhgIHdpdGggZXhwbGljaXQgcGF0aCBwYXJhbWV0ZXJzLiAqL1xuICB1c2U8XG4gICAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPHN0cmluZz4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgcGF0aDogc3RyaW5nLFxuICAgIG1pZGRsZXdhcmU6IFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nLCBQLCBTPixcbiAgICAuLi5taWRkbGV3YXJlczogUm91dGVyTWlkZGxld2FyZTxzdHJpbmcsIFAsIFM+W11cbiAgKTogUm91dGVyPFMgZXh0ZW5kcyBSUyA/IFMgOiAoUyAmIFJTKT47XG4gIHVzZTxcbiAgICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8c3RyaW5nPiA9IFJvdXRlUGFyYW1zPHN0cmluZz4sXG4gICAgUyBleHRlbmRzIFN0YXRlID0gUlMsXG4gID4oXG4gICAgcGF0aDogc3RyaW5nW10sXG4gICAgbWlkZGxld2FyZTogUm91dGVyTWlkZGxld2FyZTxzdHJpbmcsIFAsIFM+LFxuICAgIC4uLm1pZGRsZXdhcmVzOiBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZywgUCwgUz5bXVxuICApOiBSb3V0ZXI8UyBleHRlbmRzIFJTID8gUyA6IChTICYgUlMpPjtcbiAgdXNlPFxuICAgIFAgZXh0ZW5kcyBSb3V0ZVBhcmFtczxzdHJpbmc+ID0gUm91dGVQYXJhbXM8c3RyaW5nPixcbiAgICBTIGV4dGVuZHMgU3RhdGUgPSBSUyxcbiAgPihcbiAgICBwYXRoT3JNaWRkbGV3YXJlOiBzdHJpbmcgfCBzdHJpbmdbXSB8IFJvdXRlck1pZGRsZXdhcmU8c3RyaW5nLCBQLCBTPixcbiAgICAuLi5taWRkbGV3YXJlOiBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZywgUCwgUz5bXVxuICApOiBSb3V0ZXI8UyBleHRlbmRzIFJTID8gUyA6IChTICYgUlMpPiB7XG4gICAgbGV0IHBhdGg6IHN0cmluZyB8IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuICAgIGlmIChcbiAgICAgIHR5cGVvZiBwYXRoT3JNaWRkbGV3YXJlID09PSBcInN0cmluZ1wiIHx8IEFycmF5LmlzQXJyYXkocGF0aE9yTWlkZGxld2FyZSlcbiAgICApIHtcbiAgICAgIHBhdGggPSBwYXRoT3JNaWRkbGV3YXJlO1xuICAgIH0gZWxzZSB7XG4gICAgICBtaWRkbGV3YXJlLnVuc2hpZnQocGF0aE9yTWlkZGxld2FyZSk7XG4gICAgfVxuXG4gICAgdGhpcy4jcmVnaXN0ZXIoXG4gICAgICBwYXRoID8/IFwiKC4qKVwiLFxuICAgICAgbWlkZGxld2FyZSBhcyBSb3V0ZXJNaWRkbGV3YXJlPHN0cmluZz5bXSxcbiAgICAgIFtdLFxuICAgICAgeyBlbmQ6IGZhbHNlLCBpZ25vcmVDYXB0dXJlczogIXBhdGgsIGlnbm9yZVByZWZpeDogIXBhdGggfSxcbiAgICApO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKiogSXRlcmF0ZSBvdmVyIHRoZSByb3V0ZXMgY3VycmVudGx5IGFkZGVkIHRvIHRoZSByb3V0ZXIuICovXG4gICp2YWx1ZXMoKTogSXRlcmFibGVJdGVyYXRvcjxSb3V0ZTxzdHJpbmcsIFJvdXRlUGFyYW1zPHN0cmluZz4sIFJTPj4ge1xuICAgIGZvciAoY29uc3Qgcm91dGUgb2YgdGhpcy4jc3RhY2spIHtcbiAgICAgIHlpZWxkIHJvdXRlLnRvSlNPTigpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBQcm92aWRlIGFuIGl0ZXJhdG9yIGludGVyZmFjZSB0aGF0IGl0ZXJhdGVzIG92ZXIgdGhlIHJvdXRlcyByZWdpc3RlcmVkXG4gICAqIHdpdGggdGhlIHJvdXRlci4gKi9cbiAgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8XG4gICAgUm91dGU8c3RyaW5nLCBSb3V0ZVBhcmFtczxzdHJpbmc+LCBSUz5cbiAgPiB7XG4gICAgZm9yIChjb25zdCByb3V0ZSBvZiB0aGlzLiNzdGFjaykge1xuICAgICAgeWllbGQgcm91dGUudG9KU09OKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEdlbmVyYXRlIGEgVVJMIHBhdGhuYW1lIGJhc2VkIG9uIHRoZSBwcm92aWRlZCBwYXRoLCBpbnRlcnBvbGF0aW5nIHRoZVxuICAgKiBvcHRpb25hbCBwYXJhbXMgcHJvdmlkZWQuICBBbHNvIGFjY2VwdHMgYW4gb3B0aW9uYWwgc2V0IG9mIG9wdGlvbnMuICovXG4gIHN0YXRpYyB1cmw8UiBleHRlbmRzIHN0cmluZz4oXG4gICAgcGF0aDogUixcbiAgICBwYXJhbXM/OiBSb3V0ZVBhcmFtczxSPixcbiAgICBvcHRpb25zPzogVXJsT3B0aW9ucyxcbiAgKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdG9VcmwocGF0aCwgcGFyYW1zLCBvcHRpb25zKTtcbiAgfVxuXG4gIFtTeW1ib2wuZm9yKFwiRGVuby5jdXN0b21JbnNwZWN0XCIpXShcbiAgICBpbnNwZWN0OiAodmFsdWU6IHVua25vd24pID0+IHN0cmluZyxcbiAgKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfSAke1xuICAgICAgaW5zcGVjdCh7IFwiI3BhcmFtc1wiOiB0aGlzLiNwYXJhbXMsIFwiI3N0YWNrXCI6IHRoaXMuI3N0YWNrIH0pXG4gICAgfWA7XG4gIH1cblxuICBbU3ltYm9sLmZvcihcIm5vZGVqcy51dGlsLmluc3BlY3QuY3VzdG9tXCIpXShcbiAgICBkZXB0aDogbnVtYmVyLFxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgb3B0aW9uczogYW55LFxuICAgIGluc3BlY3Q6ICh2YWx1ZTogdW5rbm93biwgb3B0aW9ucz86IHVua25vd24pID0+IHN0cmluZyxcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICApOiBhbnkge1xuICAgIGlmIChkZXB0aCA8IDApIHtcbiAgICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUoYFske3RoaXMuY29uc3RydWN0b3IubmFtZX1dYCwgXCJzcGVjaWFsXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IG5ld09wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7XG4gICAgICBkZXB0aDogb3B0aW9ucy5kZXB0aCA9PT0gbnVsbCA/IG51bGwgOiBvcHRpb25zLmRlcHRoIC0gMSxcbiAgICB9KTtcbiAgICByZXR1cm4gYCR7b3B0aW9ucy5zdHlsaXplKHRoaXMuY29uc3RydWN0b3IubmFtZSwgXCJzcGVjaWFsXCIpfSAke1xuICAgICAgaW5zcGVjdChcbiAgICAgICAgeyBcIiNwYXJhbXNcIjogdGhpcy4jcGFyYW1zLCBcIiNzdGFja1wiOiB0aGlzLiNzdGFjayB9LFxuICAgICAgICBuZXdPcHRpb25zLFxuICAgICAgKVxuICAgIH1gO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQXdCQyxHQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBeUJDO0FBSUQsU0FDRSxNQUFNLEVBQ04sT0FBTyxFQUNQLE1BQU0sRUFJTixTQUFTLEVBQ1QsWUFBWSxFQUVaLE1BQU0sUUFFRCxZQUFZO0FBQ25CLFNBQVMsT0FBTyxRQUF5QixrQkFBa0I7QUFDM0QsU0FBUyxlQUFlLFFBQVEsOEJB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