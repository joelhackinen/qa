// Copyright 2018-2024 the oak authors. All rights reserved. MIT license.
/**
 * A middleware framework for handling HTTP with [Deno CLI](https://deno.land),
 * [Deno Deploy](https://deno.com/deploy),
 * [Cloudflare Workers](https://workers.cloudflare.com/),
 * [Node.js](https://nodejs.org/), and [Bun](https://bun.sh/).
 *
 * oak is inspired by [koa](https://koajs.com/).
 *
 * ## Example server
 *
 * A minimal router server which responds with content on `/`.
 *
 * ### Deno CLI and Deno Deploy
 *
 * ```ts
 * import { Application } from "jsr:@oak/oak/application";
 * import { Router } from "jsr:@oak/oak/router";
 *
 * const router = new Router();
 * router.get("/", (ctx) => {
 *   ctx.response.body = `<!DOCTYPE html>
 *     <html>
 *       <head><title>Hello oak!</title><head>
 *       <body>
 *         <h1>Hello oak!</h1>
 *       </body>
 *     </html>
 *   `;
 * });
 *
 * const app = new Application();
 * app.use(router.routes());
 * app.use(router.allowedMethods());
 *
 * app.listen({ port: 8080 });
 * ```
 *
 * ### Node.js and Bun
 *
 * You will have to install the package and then:
 *
 * ```ts
 * import { Application } from "@oak/oak/application";
 * import { Router } from "@oak/oak/router";
 *
 * const router = new Router();
 * router.get("/", (ctx) => {
 *   ctx.response.body = `<!DOCTYPE html>
 *     <html>
 *       <head><title>Hello oak!</title><head>
 *       <body>
 *         <h1>Hello oak!</h1>
 *       </body>
 *     </html>
 *   `;
 * });
 *
 * const app = new Application();
 * app.use(router.routes());
 * app.use(router.allowedMethods());
 *
 * app.listen({ port: 8080 });
 * ```
 *
 * ### Cloudflare Workers
 *
 * You will have to install the package and then:
 *
 * ```ts
 * import { Application } from "@oak/oak/application";
 * import { Router } from "@oak/oak/router";
 *
 * const router = new Router();
 * router.get("/", (ctx) => {
 *   ctx.response.body = `<!DOCTYPE html>
 *     <html>
 *       <head><title>Hello oak!</title><head>
 *       <body>
 *         <h1>Hello oak!</h1>
 *       </body>
 *     </html>
 *   `;
 * });
 *
 * const app = new Application();
 * app.use(router.routes());
 * app.use(router.allowedMethods());
 *
 * export default { fetch: app.fetch };
 * ```
 *
 * @module
 */ export { Application } from "./application.ts";
export { Context } from "./context.ts";
export { Server as HttpServerNative } from "./http_server_native.ts";
export * as etag from "./middleware/etag.ts";
export { proxy } from "./middleware/proxy.ts";
export { route, RouteContext, serve, ServeContext } from "./middleware/serve.ts";
export { compose as composeMiddleware } from "./middleware.ts";
export { Request } from "./request.ts";
export { REDIRECT_BACK, Response } from "./response.ts";
export { Router } from "./router.ts";
export { send } from "./send.ts";
/** Utilities for making testing oak servers easier. */ export * as testing from "./testing.ts";
// Re-exported from `std/http`
export { createHttpError, errors as httpErrors, HttpError, isErrorStatus, isHttpError, isRedirectStatus, SecureCookieMap as Cookies, ServerSentEvent, Status, STATUS_TEXT } from "./deps.ts";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvb2FrLzE2LjEuMC9tb2QudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNCB0aGUgb2FrIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuXG4vKipcbiAqIEEgbWlkZGxld2FyZSBmcmFtZXdvcmsgZm9yIGhhbmRsaW5nIEhUVFAgd2l0aCBbRGVubyBDTEldKGh0dHBzOi8vZGVuby5sYW5kKSxcbiAqIFtEZW5vIERlcGxveV0oaHR0cHM6Ly9kZW5vLmNvbS9kZXBsb3kpLFxuICogW0Nsb3VkZmxhcmUgV29ya2Vyc10oaHR0cHM6Ly93b3JrZXJzLmNsb3VkZmxhcmUuY29tLyksXG4gKiBbTm9kZS5qc10oaHR0cHM6Ly9ub2RlanMub3JnLyksIGFuZCBbQnVuXShodHRwczovL2J1bi5zaC8pLlxuICpcbiAqIG9hayBpcyBpbnNwaXJlZCBieSBba29hXShodHRwczovL2tvYWpzLmNvbS8pLlxuICpcbiAqICMjIEV4YW1wbGUgc2VydmVyXG4gKlxuICogQSBtaW5pbWFsIHJvdXRlciBzZXJ2ZXIgd2hpY2ggcmVzcG9uZHMgd2l0aCBjb250ZW50IG9uIGAvYC5cbiAqXG4gKiAjIyMgRGVubyBDTEkgYW5kIERlbm8gRGVwbG95XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEFwcGxpY2F0aW9uIH0gZnJvbSBcImpzcjpAb2FrL29hay9hcHBsaWNhdGlvblwiO1xuICogaW1wb3J0IHsgUm91dGVyIH0gZnJvbSBcImpzcjpAb2FrL29hay9yb3V0ZXJcIjtcbiAqXG4gKiBjb25zdCByb3V0ZXIgPSBuZXcgUm91dGVyKCk7XG4gKiByb3V0ZXIuZ2V0KFwiL1wiLCAoY3R4KSA9PiB7XG4gKiAgIGN0eC5yZXNwb25zZS5ib2R5ID0gYDwhRE9DVFlQRSBodG1sPlxuICogICAgIDxodG1sPlxuICogICAgICAgPGhlYWQ+PHRpdGxlPkhlbGxvIG9hayE8L3RpdGxlPjxoZWFkPlxuICogICAgICAgPGJvZHk+XG4gKiAgICAgICAgIDxoMT5IZWxsbyBvYWshPC9oMT5cbiAqICAgICAgIDwvYm9keT5cbiAqICAgICA8L2h0bWw+XG4gKiAgIGA7XG4gKiB9KTtcbiAqXG4gKiBjb25zdCBhcHAgPSBuZXcgQXBwbGljYXRpb24oKTtcbiAqIGFwcC51c2Uocm91dGVyLnJvdXRlcygpKTtcbiAqIGFwcC51c2Uocm91dGVyLmFsbG93ZWRNZXRob2RzKCkpO1xuICpcbiAqIGFwcC5saXN0ZW4oeyBwb3J0OiA4MDgwIH0pO1xuICogYGBgXG4gKlxuICogIyMjIE5vZGUuanMgYW5kIEJ1blxuICpcbiAqIFlvdSB3aWxsIGhhdmUgdG8gaW5zdGFsbCB0aGUgcGFja2FnZSBhbmQgdGhlbjpcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgQXBwbGljYXRpb24gfSBmcm9tIFwiQG9hay9vYWsvYXBwbGljYXRpb25cIjtcbiAqIGltcG9ydCB7IFJvdXRlciB9IGZyb20gXCJAb2FrL29hay9yb3V0ZXJcIjtcbiAqXG4gKiBjb25zdCByb3V0ZXIgPSBuZXcgUm91dGVyKCk7XG4gKiByb3V0ZXIuZ2V0KFwiL1wiLCAoY3R4KSA9PiB7XG4gKiAgIGN0eC5yZXNwb25zZS5ib2R5ID0gYDwhRE9DVFlQRSBodG1sPlxuICogICAgIDxodG1sPlxuICogICAgICAgPGhlYWQ+PHRpdGxlPkhlbGxvIG9hayE8L3RpdGxlPjxoZWFkPlxuICogICAgICAgPGJvZHk+XG4gKiAgICAgICAgIDxoMT5IZWxsbyBvYWshPC9oMT5cbiAqICAgICAgIDwvYm9keT5cbiAqICAgICA8L2h0bWw+XG4gKiAgIGA7XG4gKiB9KTtcbiAqXG4gKiBjb25zdCBhcHAgPSBuZXcgQXBwbGljYXRpb24oKTtcbiAqIGFwcC51c2Uocm91dGVyLnJvdXRlcygpKTtcbiAqIGFwcC51c2Uocm91dGVyLmFsbG93ZWRNZXRob2RzKCkpO1xuICpcbiAqIGFwcC5saXN0ZW4oeyBwb3J0OiA4MDgwIH0pO1xuICogYGBgXG4gKlxuICogIyMjIENsb3VkZmxhcmUgV29ya2Vyc1xuICpcbiAqIFlvdSB3aWxsIGhhdmUgdG8gaW5zdGFsbCB0aGUgcGFja2FnZSBhbmQgdGhlbjpcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgQXBwbGljYXRpb24gfSBmcm9tIFwiQG9hay9vYWsvYXBwbGljYXRpb25cIjtcbiAqIGltcG9ydCB7IFJvdXRlciB9IGZyb20gXCJAb2FrL29hay9yb3V0ZXJcIjtcbiAqXG4gKiBjb25zdCByb3V0ZXIgPSBuZXcgUm91dGVyKCk7XG4gKiByb3V0ZXIuZ2V0KFwiL1wiLCAoY3R4KSA9PiB7XG4gKiAgIGN0eC5yZXNwb25zZS5ib2R5ID0gYDwhRE9DVFlQRSBodG1sPlxuICogICAgIDxodG1sPlxuICogICAgICAgPGhlYWQ+PHRpdGxlPkhlbGxvIG9hayE8L3RpdGxlPjxoZWFkPlxuICogICAgICAgPGJvZHk+XG4gKiAgICAgICAgIDxoMT5IZWxsbyBvYWshPC9oMT5cbiAqICAgICAgIDwvYm9keT5cbiAqICAgICA8L2h0bWw+XG4gKiAgIGA7XG4gKiB9KTtcbiAqXG4gKiBjb25zdCBhcHAgPSBuZXcgQXBwbGljYXRpb24oKTtcbiAqIGFwcC51c2Uocm91dGVyLnJvdXRlcygpKTtcbiAqIGFwcC51c2Uocm91dGVyLmFsbG93ZWRNZXRob2RzKCkpO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHsgZmV0Y2g6IGFwcC5mZXRjaCB9O1xuICogYGBgXG4gKlxuICogQG1vZHVsZVxuICovXG5cbmV4cG9ydCB7XG4gIEFwcGxpY2F0aW9uLFxuICB0eXBlIEFwcGxpY2F0aW9uT3B0aW9ucyxcbiAgdHlwZSBMaXN0ZW5PcHRpb25zLFxuICB0eXBlIExpc3Rlbk9wdGlvbnNCYXNlLFxuICB0eXBlIExpc3Rlbk9wdGlvbnNUbHMsXG4gIHR5cGUgU3RhdGUsXG59IGZyb20gXCIuL2FwcGxpY2F0aW9uLnRzXCI7XG5leHBvcnQgdHlwZSB7IEJvZHlUeXBlIH0gZnJvbSBcIi4vYm9keS50c1wiO1xuZXhwb3J0IHsgQ29udGV4dCwgdHlwZSBDb250ZXh0U2VuZE9wdGlvbnMgfSBmcm9tIFwiLi9jb250ZXh0LnRzXCI7XG5leHBvcnQgeyBTZXJ2ZXIgYXMgSHR0cFNlcnZlck5hdGl2ZSB9IGZyb20gXCIuL2h0dHBfc2VydmVyX25hdGl2ZS50c1wiO1xuZXhwb3J0IHsgdHlwZSBOYXRpdmVSZXF1ZXN0IH0gZnJvbSBcIi4vaHR0cF9zZXJ2ZXJfbmF0aXZlX3JlcXVlc3QudHNcIjtcbmV4cG9ydCAqIGFzIGV0YWcgZnJvbSBcIi4vbWlkZGxld2FyZS9ldGFnLnRzXCI7XG5leHBvcnQgeyBwcm94eSwgdHlwZSBQcm94eU9wdGlvbnMgfSBmcm9tIFwiLi9taWRkbGV3YXJlL3Byb3h5LnRzXCI7XG5leHBvcnQge1xuICByb3V0ZSxcbiAgUm91dGVDb250ZXh0LFxuICBzZXJ2ZSxcbiAgU2VydmVDb250ZXh0LFxufSBmcm9tIFwiLi9taWRkbGV3YXJlL3NlcnZlLnRzXCI7XG5leHBvcnQge1xuICBjb21wb3NlIGFzIGNvbXBvc2VNaWRkbGV3YXJlLFxuICB0eXBlIE1pZGRsZXdhcmUsXG4gIHR5cGUgTWlkZGxld2FyZU9iamVjdCxcbiAgdHlwZSBNaWRkbGV3YXJlT3JNaWRkbGV3YXJlT2JqZWN0LFxuICB0eXBlIE5leHQsXG59IGZyb20gXCIuL21pZGRsZXdhcmUudHNcIjtcbmV4cG9ydCB7IFJlcXVlc3QgfSBmcm9tIFwiLi9yZXF1ZXN0LnRzXCI7XG5leHBvcnQgeyBSRURJUkVDVF9CQUNLLCBSZXNwb25zZSB9IGZyb20gXCIuL3Jlc3BvbnNlLnRzXCI7XG5leHBvcnQge1xuICB0eXBlIFJvdXRlLFxuICB0eXBlIFJvdXRlUGFyYW1zLFxuICBSb3V0ZXIsXG4gIHR5cGUgUm91dGVyQWxsb3dlZE1ldGhvZHNPcHRpb25zLFxuICB0eXBlIFJvdXRlckNvbnRleHQsXG4gIHR5cGUgUm91dGVyTWlkZGxld2FyZSxcbiAgdHlwZSBSb3V0ZXJPcHRpb25zLFxuICB0eXBlIFJvdXRlclBhcmFtTWlkZGxld2FyZSxcbn0gZnJvbSBcIi4vcm91dGVyLnRzXCI7XG5leHBvcnQgeyBzZW5kLCB0eXBlIFNlbmRPcHRpb25zIH0gZnJvbSBcIi4vc2VuZC50c1wiO1xuLyoqIFV0aWxpdGllcyBmb3IgbWFraW5nIHRlc3Rpbmcgb2FrIHNlcnZlcnMgZWFzaWVyLiAqL1xuZXhwb3J0ICogYXMgdGVzdGluZyBmcm9tIFwiLi90ZXN0aW5nLnRzXCI7XG5leHBvcnQgeyB0eXBlIFNlcnZlckNvbnN0cnVjdG9yIH0gZnJvbSBcIi4vdHlwZXMudHNcIjtcblxuLy8gUmUtZXhwb3J0ZWQgZnJvbSBgc3RkL2h0dHBgXG5leHBvcnQge1xuICBjcmVhdGVIdHRwRXJyb3IsXG4gIGVycm9ycyBhcyBodHRwRXJyb3JzLFxuICB0eXBlIEVycm9yU3RhdHVzLFxuICBIdHRwRXJyb3IsXG4gIHR5cGUgSFRUUE1ldGhvZHMsXG4gIGlzRXJyb3JTdGF0dXMsXG4gIGlzSHR0cEVycm9yLFxuICBpc1JlZGlyZWN0U3RhdHVzLFxuICB0eXBlIFJlZGlyZWN0U3RhdHVzLFxuICBTZWN1cmVDb29raWVNYXAgYXMgQ29va2llcyxcbiAgdHlwZSBTZWN1cmVDb29raWVNYXBHZXRPcHRpb25zIGFzIENvb2tpZXNHZXRPcHRpb25zLFxuICB0eXBlIFNlY3VyZUNvb2tpZU1hcFNldERlbGV0ZU9wdGlvbnMgYXMgQ29va2llc1NldERlbGV0ZU9wdGlvbnMsXG4gIFNlcnZlclNlbnRFdmVudCxcbiAgdHlwZSBTZXJ2ZXJTZW50RXZlbnRJbml0LFxuICB0eXBlIFNlcnZlclNlbnRFdmVudFRhcmdldCxcbiAgU3RhdHVzLFxuICBTVEFUVVNfVEVYVCxcbn0gZnJvbSBcIi4vZGVwcy50c1wiO1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHlFQUF5RTtBQUV6RTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0E0RkMsR0FFRCxTQUNFLFdBQVcsUUFNTixtQkFBbUI7QUFFMUIsU0FBUyxPQUFPLFFBQWlDLGVBQWU7QUFDaEUsU0FBUyxVQUFVLGdCQUFnQixRQUFRLDBCQUEwQjtBQUVyRSxPQUFPLEtBQUssSUFBSSxNQUFNLHVCQUF1QjtBQUM3QyxTQUFTLEtBQUssUUFBMkIsd0JBQXdCO0FBQ2pFLFNBQ0UsS0FBSyxFQUNMLFlBQVksRUFDWixLQUFLLEVBQ0wsWUFBWSxRQUNQLHdCQUF3QjtBQUMvQixTQUNFLFdBQVcsaUJBQWlCLFFBS3ZCLGtCQUFrQjtBQUN6QixTQUFTLE9BQU8sUUFBUSxlQUFlO0FBQ3ZDLFNBQVMsYUFBYSxFQUFFLFFBQVEsUUFBUSxnQkFBZ0I7QUFDeEQsU0FHRSxNQUFNLFFBTUQsY0FBYztBQUNyQixTQUFTLElBQUksUUFBMEIsWUFBWTtBQUNuRCxxREFBcUQsR0FDckQsT0FBTyxLQUFLLE9BQU8sTUFBTSxlQUFlO0FBR3hDLDhCQUE4QjtBQUM5QixTQUNFLGVBQWUsRUFDZixVQUFVLFVBQVUsRUFFcEIsU0FBUyxFQUVULGFBQWEsRUFDYixXQUFXLEVBQ1gsZ0JBQWdCLEVBRWhCLG1CQUFtQixPQUFPLEVBRzFCLGVBQWUsRUFHZixNQUFNLEVBQ04sV0FBVyxRQUNOLFlBQVkifQ==