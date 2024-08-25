// Copyright 2018-2024 the oak authors. All rights reserved. MIT license.
/** Middleware for oak that allows back-to-back proxies of requests to be
 * used.
 *
 * @module
 */ import { parseForwarded } from "../deps.ts";
import { isRouterContext } from "../utils/type_guards.ts";
function createMatcher({ match }) {
  return function matches(ctx) {
    if (!match) {
      return true;
    }
    if (typeof match === "string") {
      return ctx.request.url.pathname.startsWith(match);
    }
    if (match instanceof RegExp) {
      return match.test(ctx.request.url.pathname);
    }
    return match(ctx);
  };
}
async function createRequest(target, ctx, { headers: optHeaders, map, proxyHeaders = true, request: reqFn }) {
  let path = ctx.request.url.pathname;
  let params;
  if (isRouterContext(ctx)) {
    params = ctx.params;
  }
  if (map && typeof map === "function") {
    path = map(path, params);
  } else if (map) {
    path = map[path] ?? path;
  }
  const url = new URL(String(target));
  if (url.pathname.endsWith("/") && path.startsWith("/")) {
    url.pathname = `${url.pathname}${path.slice(1)}`;
  } else if (!url.pathname.endsWith("/") && !path.startsWith("/")) {
    url.pathname = `${url.pathname}/${path}`;
  } else {
    url.pathname = `${url.pathname}${path}`;
  }
  url.search = ctx.request.url.search;
  const body = getBodyInit(ctx);
  const headers = new Headers(ctx.request.headers);
  if (optHeaders) {
    if (typeof optHeaders === "function") {
      optHeaders = await optHeaders(ctx);
    }
    for (const [key, value] of iterableHeaders(optHeaders)){
      headers.set(key, value);
    }
  }
  if (proxyHeaders) {
    const maybeForwarded = headers.get("forwarded");
    const ip = ctx.request.ip.startsWith("[") ? `"${ctx.request.ip}"` : ctx.request.ip;
    const host = headers.get("host");
    if (maybeForwarded && parseForwarded(maybeForwarded)) {
      let value = `for=${ip}`;
      if (host) {
        value += `;host=${host}`;
      }
      headers.append("forwarded", value);
    } else {
      headers.append("x-forwarded-for", ip);
      if (host) {
        headers.append("x-forwarded-host", host);
      }
    }
  }
  const init = {
    body,
    headers,
    method: ctx.request.method,
    redirect: "follow"
  };
  let request = new Request(url.toString(), init);
  if (reqFn) {
    request = await reqFn(request);
  }
  return request;
}
function getBodyInit(ctx) {
  if (!ctx.request.hasBody) {
    return null;
  }
  return ctx.request.body.stream;
}
function iterableHeaders(headers) {
  if (headers instanceof Headers) {
    return headers.entries();
  } else if (Array.isArray(headers)) {
    return headers.values();
  } else {
    return Object.entries(headers).values();
  }
}
async function processResponse(response, ctx, { contentType: contentTypeFn, response: resFn }) {
  if (resFn) {
    response = await resFn(response);
  }
  if (response.body) {
    ctx.response.body = response.body;
  } else {
    ctx.response.body = null;
  }
  ctx.response.status = response.status;
  for (const [key, value] of response.headers){
    ctx.response.headers.append(key, value);
  }
  if (contentTypeFn) {
    const value = await contentTypeFn(response.url, ctx.response.headers.get("content-type") ?? undefined);
    if (value != null) {
      ctx.response.headers.set("content-type", value);
    }
  }
}
export function proxy(target, options = {}) {
  const matches = createMatcher(options);
  return async function proxy(context, next) {
    if (!matches(context)) {
      return next();
    }
    const request = await createRequest(target, context, options);
    const { fetch = globalThis.fetch } = options;
    const response = await fetch(request, {
      context
    });
    await processResponse(response, context, options);
    return next();
  };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvb2FrLzE2LjEuMC9taWRkbGV3YXJlL3Byb3h5LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjQgdGhlIG9hayBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuLyoqIE1pZGRsZXdhcmUgZm9yIG9hayB0aGF0IGFsbG93cyBiYWNrLXRvLWJhY2sgcHJveGllcyBvZiByZXF1ZXN0cyB0byBiZVxuICogdXNlZC5cbiAqXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBTdGF0ZSB9IGZyb20gXCIuLi9hcHBsaWNhdGlvbi50c1wiO1xuaW1wb3J0IHR5cGUgeyBDb250ZXh0IH0gZnJvbSBcIi4uL2NvbnRleHQudHNcIjtcbmltcG9ydCB7IHBhcnNlRm9yd2FyZGVkIH0gZnJvbSBcIi4uL2RlcHMudHNcIjtcbmltcG9ydCB0eXBlIHsgTWlkZGxld2FyZSB9IGZyb20gXCIuLi9taWRkbGV3YXJlLnRzXCI7XG5pbXBvcnQgdHlwZSB7XG4gIFJvdXRlUGFyYW1zLFxuICBSb3V0ZXJDb250ZXh0LFxuICBSb3V0ZXJNaWRkbGV3YXJlLFxufSBmcm9tIFwiLi4vcm91dGVyLnRzXCI7XG5pbXBvcnQgeyBpc1JvdXRlckNvbnRleHQgfSBmcm9tIFwiLi4vdXRpbHMvdHlwZV9ndWFyZHMudHNcIjtcblxudHlwZSBGZXRjaCA9IChcbiAgaW5wdXQ6IFJlcXVlc3QsXG4gIGluaXQ6IHsgY29udGV4dDogQ29udGV4dCB9LFxuKSA9PiBQcm9taXNlPFJlc3BvbnNlPjtcblxudHlwZSBQcm94eU1hdGNoRnVuY3Rpb248XG4gIFIgZXh0ZW5kcyBzdHJpbmcsXG4gIFAgZXh0ZW5kcyBSb3V0ZVBhcmFtczxSPiA9IFJvdXRlUGFyYW1zPFI+LFxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBTIGV4dGVuZHMgU3RhdGUgPSBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxuPiA9IChjdHg6IENvbnRleHQ8Uz4gfCBSb3V0ZXJDb250ZXh0PFIsIFAsIFM+KSA9PiBib29sZWFuO1xuXG50eXBlIFByb3h5TWFwRnVuY3Rpb248UiBleHRlbmRzIHN0cmluZywgUCBleHRlbmRzIFJvdXRlUGFyYW1zPFI+PiA9IChcbiAgcGF0aDogUixcbiAgcGFyYW1zPzogUCxcbikgPT4gUjtcblxudHlwZSBQcm94eUhlYWRlcnNGdW5jdGlvbjxTIGV4dGVuZHMgU3RhdGU+ID0gKFxuICBjdHg6IENvbnRleHQ8Uz4sXG4pID0+IEhlYWRlcnNJbml0IHwgUHJvbWlzZTxIZWFkZXJzSW5pdD47XG5cbnR5cGUgUHJveHlSb3V0ZXJIZWFkZXJzRnVuY3Rpb248XG4gIFIgZXh0ZW5kcyBzdHJpbmcsXG4gIFAgZXh0ZW5kcyBSb3V0ZVBhcmFtczxSPixcbiAgUyBleHRlbmRzIFN0YXRlLFxuPiA9IChjdHg6IFJvdXRlckNvbnRleHQ8UiwgUCwgUz4pID0+IEhlYWRlcnNJbml0IHwgUHJvbWlzZTxIZWFkZXJzSW5pdD47XG5cbi8qKiBPcHRpb25zIHdoaWNoIGNhbiBiZSBzcGVjaWZpZWQgb24gdGhlIHtAbGlua2NvZGUgcHJveHl9IG1pZGRsZXdhcmUuICovXG5leHBvcnQgaW50ZXJmYWNlIFByb3h5T3B0aW9uczxcbiAgUiBleHRlbmRzIHN0cmluZyxcbiAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPFI+ID0gUm91dGVQYXJhbXM8Uj4sXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIFMgZXh0ZW5kcyBTdGF0ZSA9IFJlY29yZDxzdHJpbmcsIGFueT4sXG4+IHtcbiAgLyoqIEEgY2FsbGJhY2sgaG9vayB0aGF0IGlzIGNhbGxlZCBhZnRlciB0aGUgcmVzcG9uc2UgaXMgcmVjZWl2ZWQgd2hpY2ggYWxsb3dzXG4gICAqIHRoZSByZXNwb25zZSBjb250ZW50IHR5cGUgdG8gYmUgYWRqdXN0ZWQuIFRoaXMgaXMgZm9yIHNpdHVhdGlvbnMgd2hlcmUgdGhlXG4gICAqIGNvbnRlbnQgdHlwZSBwcm92aWRlZCBieSB0aGUgcHJveHkgc2VydmVyIG1pZ2h0IG5vdCBiZSBzdWl0YWJsZSBmb3JcbiAgICogcmVzcG9uZGluZyB3aXRoLiAqL1xuICBjb250ZW50VHlwZT8oXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgY29udGVudFR5cGU/OiBzdHJpbmcsXG4gICk6IFByb21pc2U8c3RyaW5nIHwgdW5kZWZpbmVkPiB8IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgLyoqIFRoZSBmZXRjaCBmdW5jdGlvbiB0byB1c2UgdG8gcHJveHkgdGhlIHJlcXVlc3QuIFRoaXMgZGVmYXVsdHMgdG8gdGhlXG4gICAqIGdsb2JhbCB7QGxpbmtjb2RlIGZldGNofSBmdW5jdGlvbi4gSXQgd2lsbCBhbHdheXMgYmUgY2FsbGVkIHdpdGggYVxuICAgKiBzZWNvbmQgYXJndW1lbnQgd2hpY2ggY29udGFpbnMgYW4gb2JqZWN0IG9mIGB7IGNvbnRleHQgfWAgd2hpY2ggdGhlXG4gICAqIGBjb250ZXh0YCBwcm9wZXJ0eSB3aWxsIGJlIGFuIGluc3RhbmNlIG9mIHtAbGlua2NvZGUgUm91dGVyQ29udGV4dH0uXG4gICAqXG4gICAqIFRoaXMgaXMgZGVzaWduZWQgZm9yIG1vY2tpbmcgcHVycG9zZXMgb3IgaW1wbGVtZW50aW5nIGEgYGZldGNoKClgXG4gICAqIGNhbGxiYWNrIHRoYXQgbmVlZHMgYWNjZXNzIHRoZSBjdXJyZW50IGNvbnRleHQgd2hlbiBpdCBpcyBjYWxsZWQuICovXG4gIGZldGNoPzogRmV0Y2g7XG4gIC8qKiBBZGRpdGlvbmFsIGhlYWRlcnMgdGhhdCBzaG91bGQgYmUgc2V0IGluIHRoZSByZXNwb25zZS4gVGhlIHZhbHVlIGNhblxuICAgKiBiZSBhIGhlYWRlcnMgaW5pdCB2YWx1ZSBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBvciByZXNvbHZlcyB3aXRoIGFcbiAgICogaGVhZGVycyBpbml0IHZhbHVlLiAqL1xuICBoZWFkZXJzPzpcbiAgICB8IEhlYWRlcnNJbml0XG4gICAgfCBQcm94eUhlYWRlcnNGdW5jdGlvbjxTPlxuICAgIHwgUHJveHlSb3V0ZXJIZWFkZXJzRnVuY3Rpb248UiwgUCwgUz47XG4gIC8qKiBFaXRoZXIgYSByZWNvcmQgb3IgYSBwcm94eSBtYXAgZnVuY3Rpb24gdGhhdCB3aWxsIGFsbG93IHByb3hpZWQgcmVxdWVzdHNcbiAgICogYmVpbmcgaGFuZGxlZCBieSB0aGUgbWlkZGxld2FyZSB0byBiZSByZW1hcHBlZCB0byBhIGRpZmZlcmVudCByZW1vdGVcbiAgICogcGF0aC4gKi9cbiAgbWFwPzogUmVjb3JkPHN0cmluZywgUj4gfCBQcm94eU1hcEZ1bmN0aW9uPFIsIFA+O1xuICAvKiogQSBzdHJpbmcsIHJlZ3VsYXIgZXhwcmVzc2lvbiBvciBwcm94eSBtYXRjaCBmdW5jdGlvbiB3aGF0IGRldGVybWluZXMgaWZcbiAgICogdGhlIHByb3h5IG1pZGRsZXdhcmUgc2hvdWxkIHByb3h5IHRoZSByZXF1ZXN0LlxuICAgKlxuICAgKiBJZiB0aGUgdmFsdWUgaXMgYSBzdHJpbmcgdGhlIG1hdGNoIHdpbGwgYmUgdHJ1ZSBpZiB0aGUgcmVxdWVzdHMgcGF0aG5hbWVcbiAgICogc3RhcnRzIHdpdGggdGhlIHN0cmluZy4gSW4gdGhlIGNhc2Ugb2YgYSByZWd1bGFyIGV4cHJlc3Npb24sIGlmIHRoZVxuICAgKiBwYXRobmFtZVxuICAgKi9cbiAgbWF0Y2g/OlxuICAgIHwgc3RyaW5nXG4gICAgfCBSZWdFeHBcbiAgICB8IFByb3h5TWF0Y2hGdW5jdGlvbjxSLCBQLCBTPjtcbiAgLyoqIEEgZmxhZyB0aGF0IGluZGljYXRlcyBpZiB0cmFkaXRpb25hbCBwcm94eSBoZWFkZXJzIHNob3VsZCBiZSBzZXQgaW4gdGhlXG4gICAqIHJlc3BvbnNlLiBUaGlzIGRlZmF1bHRzIHRvIGB0cnVlYC5cbiAgICovXG4gIHByb3h5SGVhZGVycz86IGJvb2xlYW47XG4gIC8qKiBBIGNhbGxiYWNrIGhvb2sgd2hpY2ggd2lsbCBiZSBjYWxsZWQgYmVmb3JlIGVhY2ggcHJveGllZCBmZXRjaCByZXF1ZXN0XG4gICAqIHRvIGFsbG93IHRoZSBuYXRpdmUgYFJlcXVlc3RgIHRvIGJlIG1vZGlmaWVkIG9yIHJlcGxhY2VkLiAqL1xuICByZXF1ZXN0PyhyZXE6IFJlcXVlc3QpOiBSZXF1ZXN0IHwgUHJvbWlzZTxSZXF1ZXN0PjtcbiAgLyoqIEEgY2FsbGJhY2sgaG9vayB3aGljaCB3aWxsIGJlIGNhbGxlZCBhZnRlciBlYWNoIHByb3hpZWQgZmV0Y2ggcmVzcG9uc2VcbiAgICogaXMgcmVjZWl2ZWQgdG8gYWxsb3cgdGhlIG5hdGl2ZSBgUmVzcG9uc2VgIHRvIGJlIG1vZGlmaWVkIG9yIHJlcGxhY2VkLiAqL1xuICByZXNwb25zZT8ocmVzOiBSZXNwb25zZSk6IFJlc3BvbnNlIHwgUHJvbWlzZTxSZXNwb25zZT47XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU1hdGNoZXI8XG4gIFIgZXh0ZW5kcyBzdHJpbmcsXG4gIFAgZXh0ZW5kcyBSb3V0ZVBhcmFtczxSPixcbiAgUyBleHRlbmRzIFN0YXRlLFxuPihcbiAgeyBtYXRjaCB9OiBQcm94eU9wdGlvbnM8UiwgUCwgUz4sXG4pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIG1hdGNoZXMoY3R4OiBSb3V0ZXJDb250ZXh0PFIsIFAsIFM+KTogYm9vbGVhbiB7XG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgbWF0Y2ggPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIHJldHVybiBjdHgucmVxdWVzdC51cmwucGF0aG5hbWUuc3RhcnRzV2l0aChtYXRjaCk7XG4gICAgfVxuICAgIGlmIChtYXRjaCBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgcmV0dXJuIG1hdGNoLnRlc3QoY3R4LnJlcXVlc3QudXJsLnBhdGhuYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIG1hdGNoKGN0eCk7XG4gIH07XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVJlcXVlc3Q8XG4gIFIgZXh0ZW5kcyBzdHJpbmcsXG4gIFAgZXh0ZW5kcyBSb3V0ZVBhcmFtczxSPixcbiAgUyBleHRlbmRzIFN0YXRlLFxuPihcbiAgdGFyZ2V0OiBzdHJpbmcgfCBVUkwsXG4gIGN0eDogQ29udGV4dDxTPiB8IFJvdXRlckNvbnRleHQ8UiwgUCwgUz4sXG4gIHsgaGVhZGVyczogb3B0SGVhZGVycywgbWFwLCBwcm94eUhlYWRlcnMgPSB0cnVlLCByZXF1ZXN0OiByZXFGbiB9OlxuICAgIFByb3h5T3B0aW9uczxSLCBQLCBTPixcbik6IFByb21pc2U8UmVxdWVzdD4ge1xuICBsZXQgcGF0aCA9IGN0eC5yZXF1ZXN0LnVybC5wYXRobmFtZSBhcyBSO1xuICBsZXQgcGFyYW1zOiBQIHwgdW5kZWZpbmVkO1xuICBpZiAoaXNSb3V0ZXJDb250ZXh0PFIsIFAsIFM+KGN0eCkpIHtcbiAgICBwYXJhbXMgPSBjdHgucGFyYW1zO1xuICB9XG4gIGlmIChtYXAgJiYgdHlwZW9mIG1hcCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgcGF0aCA9IG1hcChwYXRoLCBwYXJhbXMpO1xuICB9IGVsc2UgaWYgKG1hcCkge1xuICAgIHBhdGggPSBtYXBbcGF0aF0gPz8gcGF0aDtcbiAgfVxuICBjb25zdCB1cmwgPSBuZXcgVVJMKFN0cmluZyh0YXJnZXQpKTtcbiAgaWYgKHVybC5wYXRobmFtZS5lbmRzV2l0aChcIi9cIikgJiYgcGF0aC5zdGFydHNXaXRoKFwiL1wiKSkge1xuICAgIHVybC5wYXRobmFtZSA9IGAke3VybC5wYXRobmFtZX0ke3BhdGguc2xpY2UoMSl9YDtcbiAgfSBlbHNlIGlmICghdXJsLnBhdGhuYW1lLmVuZHNXaXRoKFwiL1wiKSAmJiAhcGF0aC5zdGFydHNXaXRoKFwiL1wiKSkge1xuICAgIHVybC5wYXRobmFtZSA9IGAke3VybC5wYXRobmFtZX0vJHtwYXRofWA7XG4gIH0gZWxzZSB7XG4gICAgdXJsLnBhdGhuYW1lID0gYCR7dXJsLnBhdGhuYW1lfSR7cGF0aH1gO1xuICB9XG4gIHVybC5zZWFyY2ggPSBjdHgucmVxdWVzdC51cmwuc2VhcmNoO1xuXG4gIGNvbnN0IGJvZHkgPSBnZXRCb2R5SW5pdChjdHgpO1xuICBjb25zdCBoZWFkZXJzID0gbmV3IEhlYWRlcnMoY3R4LnJlcXVlc3QuaGVhZGVycyk7XG4gIGlmIChvcHRIZWFkZXJzKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRIZWFkZXJzID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIG9wdEhlYWRlcnMgPSBhd2FpdCBvcHRIZWFkZXJzKGN0eCBhcyBSb3V0ZXJDb250ZXh0PFIsIFAsIFM+KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgaXRlcmFibGVIZWFkZXJzKG9wdEhlYWRlcnMpKSB7XG4gICAgICBoZWFkZXJzLnNldChrZXksIHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgaWYgKHByb3h5SGVhZGVycykge1xuICAgIGNvbnN0IG1heWJlRm9yd2FyZGVkID0gaGVhZGVycy5nZXQoXCJmb3J3YXJkZWRcIik7XG4gICAgY29uc3QgaXAgPSBjdHgucmVxdWVzdC5pcC5zdGFydHNXaXRoKFwiW1wiKVxuICAgICAgPyBgXCIke2N0eC5yZXF1ZXN0LmlwfVwiYFxuICAgICAgOiBjdHgucmVxdWVzdC5pcDtcbiAgICBjb25zdCBob3N0ID0gaGVhZGVycy5nZXQoXCJob3N0XCIpO1xuICAgIGlmIChtYXliZUZvcndhcmRlZCAmJiBwYXJzZUZvcndhcmRlZChtYXliZUZvcndhcmRlZCkpIHtcbiAgICAgIGxldCB2YWx1ZSA9IGBmb3I9JHtpcH1gO1xuICAgICAgaWYgKGhvc3QpIHtcbiAgICAgICAgdmFsdWUgKz0gYDtob3N0PSR7aG9zdH1gO1xuICAgICAgfVxuICAgICAgaGVhZGVycy5hcHBlbmQoXCJmb3J3YXJkZWRcIiwgdmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBoZWFkZXJzLmFwcGVuZChcIngtZm9yd2FyZGVkLWZvclwiLCBpcCk7XG4gICAgICBpZiAoaG9zdCkge1xuICAgICAgICBoZWFkZXJzLmFwcGVuZChcIngtZm9yd2FyZGVkLWhvc3RcIiwgaG9zdCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3QgaW5pdDogUmVxdWVzdEluaXQgPSB7XG4gICAgYm9keSxcbiAgICBoZWFkZXJzLFxuICAgIG1ldGhvZDogY3R4LnJlcXVlc3QubWV0aG9kLFxuICAgIHJlZGlyZWN0OiBcImZvbGxvd1wiLFxuICB9O1xuICBsZXQgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KHVybC50b1N0cmluZygpLCBpbml0KTtcbiAgaWYgKHJlcUZuKSB7XG4gICAgcmVxdWVzdCA9IGF3YWl0IHJlcUZuKHJlcXVlc3QpO1xuICB9XG4gIHJldHVybiByZXF1ZXN0O1xufVxuXG5mdW5jdGlvbiBnZXRCb2R5SW5pdDxcbiAgUiBleHRlbmRzIHN0cmluZyxcbiAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPFI+LFxuICBTIGV4dGVuZHMgU3RhdGUsXG4+KFxuICBjdHg6IENvbnRleHQ8Uz4gfCBSb3V0ZXJDb250ZXh0PFIsIFAsIFM+LFxuKTogQm9keUluaXQgfCBudWxsIHtcbiAgaWYgKCFjdHgucmVxdWVzdC5oYXNCb2R5KSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIGN0eC5yZXF1ZXN0LmJvZHkuc3RyZWFtO1xufVxuXG5mdW5jdGlvbiBpdGVyYWJsZUhlYWRlcnMoXG4gIGhlYWRlcnM6IEhlYWRlcnNJbml0LFxuKTogSXRlcmFibGVJdGVyYXRvcjxbc3RyaW5nLCBzdHJpbmddPiB7XG4gIGlmIChoZWFkZXJzIGluc3RhbmNlb2YgSGVhZGVycykge1xuICAgIHJldHVybiBoZWFkZXJzLmVudHJpZXMoKTtcbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGhlYWRlcnMpKSB7XG4gICAgcmV0dXJuIGhlYWRlcnMudmFsdWVzKCkgYXMgSXRlcmFibGVJdGVyYXRvcjxbc3RyaW5nLCBzdHJpbmddPjtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gT2JqZWN0LmVudHJpZXMoaGVhZGVycykudmFsdWVzKCkgYXMgSXRlcmFibGVJdGVyYXRvcjxcbiAgICAgIFtzdHJpbmcsIHN0cmluZ11cbiAgICA+O1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NSZXNwb25zZTxcbiAgUiBleHRlbmRzIHN0cmluZyxcbiAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPFI+LFxuICBTIGV4dGVuZHMgU3RhdGUsXG4+KFxuICByZXNwb25zZTogUmVzcG9uc2UsXG4gIGN0eDogQ29udGV4dDxTPiB8IFJvdXRlckNvbnRleHQ8UiwgUCwgUz4sXG4gIHsgY29udGVudFR5cGU6IGNvbnRlbnRUeXBlRm4sIHJlc3BvbnNlOiByZXNGbiB9OiBQcm94eU9wdGlvbnM8UiwgUCwgUz4sXG4pIHtcbiAgaWYgKHJlc0ZuKSB7XG4gICAgcmVzcG9uc2UgPSBhd2FpdCByZXNGbihyZXNwb25zZSk7XG4gIH1cbiAgaWYgKHJlc3BvbnNlLmJvZHkpIHtcbiAgICBjdHgucmVzcG9uc2UuYm9keSA9IHJlc3BvbnNlLmJvZHk7XG4gIH0gZWxzZSB7XG4gICAgY3R4LnJlc3BvbnNlLmJvZHkgPSBudWxsO1xuICB9XG4gIGN0eC5yZXNwb25zZS5zdGF0dXMgPSByZXNwb25zZS5zdGF0dXM7XG4gIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIHJlc3BvbnNlLmhlYWRlcnMpIHtcbiAgICBjdHgucmVzcG9uc2UuaGVhZGVycy5hcHBlbmQoa2V5LCB2YWx1ZSk7XG4gIH1cbiAgaWYgKGNvbnRlbnRUeXBlRm4pIHtcbiAgICBjb25zdCB2YWx1ZSA9IGF3YWl0IGNvbnRlbnRUeXBlRm4oXG4gICAgICByZXNwb25zZS51cmwsXG4gICAgICBjdHgucmVzcG9uc2UuaGVhZGVycy5nZXQoXCJjb250ZW50LXR5cGVcIikgPz8gdW5kZWZpbmVkLFxuICAgICk7XG4gICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgIGN0eC5yZXNwb25zZS5oZWFkZXJzLnNldChcImNvbnRlbnQtdHlwZVwiLCB2YWx1ZSk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogTWlkZGxld2FyZSB0aGF0IHByb3ZpZGVzIGEgYmFjay10by1iYWNrIHByb3h5IGZvciByZXF1ZXN0cy5cbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcHJveHk8UyBleHRlbmRzIFN0YXRlPihcbiAgdGFyZ2V0OiBzdHJpbmcgfCBVUkwsXG4gIG9wdGlvbnM/OiBQcm94eU9wdGlvbnM8c3RyaW5nLCBSb3V0ZVBhcmFtczxzdHJpbmc+LCBTPixcbik6IE1pZGRsZXdhcmU8Uz47XG5leHBvcnQgZnVuY3Rpb24gcHJveHk8XG4gIFIgZXh0ZW5kcyBzdHJpbmcsXG4gIFAgZXh0ZW5kcyBSb3V0ZVBhcmFtczxSPixcbiAgUyBleHRlbmRzIFN0YXRlLFxuPihcbiAgdGFyZ2V0OiBzdHJpbmcgfCBVUkwsXG4gIG9wdGlvbnM6IFByb3h5T3B0aW9uczxSLCBQLCBTPiA9IHt9LFxuKTogUm91dGVyTWlkZGxld2FyZTxSLCBQLCBTPiB7XG4gIGNvbnN0IG1hdGNoZXMgPSBjcmVhdGVNYXRjaGVyKG9wdGlvbnMpO1xuICByZXR1cm4gYXN5bmMgZnVuY3Rpb24gcHJveHkoY29udGV4dCwgbmV4dCkge1xuICAgIGlmICghbWF0Y2hlcyhjb250ZXh0KSkge1xuICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICB9XG4gICAgY29uc3QgcmVxdWVzdCA9IGF3YWl0IGNyZWF0ZVJlcXVlc3QodGFyZ2V0LCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICBjb25zdCB7IGZldGNoID0gZ2xvYmFsVGhpcy5mZXRjaCB9ID0gb3B0aW9ucztcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHJlcXVlc3QsIHsgY29udGV4dCB9KTtcbiAgICBhd2FpdCBwcm9jZXNzUmVzcG9uc2UocmVzcG9uc2UsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIHJldHVybiBuZXh0KCk7XG4gIH07XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEseUVBQXlFO0FBRXpFOzs7O0NBSUMsR0FJRCxTQUFTLGNBQWMsUUFB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