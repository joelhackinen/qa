// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// Copyright the Browserify authors. MIT License.
// Ported mostly from https://github.com/browserify/path-browserify/
// This module is browser compatible.
/**
 * Utilities for working with OS-specific file paths.
 *
 * Functions from this module will automatically switch to support the path style
 * of the current OS, either `windows` for Microsoft Windows, or `posix` for
 * every other operating system, eg. Linux, MacOS, BSD etc.
 *
 * To use functions for a specific path style regardless of the current OS
 * import the modules from the platform sub directory instead.
 *
 * Example, for `posix`:
 *
 * ```ts
 * import { fromFileUrl } from "@std/path/posix/from-file-url";
 * const p = fromFileUrl("file:///home/foo");
 * console.log(p); // "/home/foo"
 * ```
 *
 * or, for `windows`:
 *
 * ```ts
 * import { fromFileUrl } from "@std/path/windows/from-file-url";
 * const p = fromFileUrl("file:///home/foo");
 * console.log(p); // "\\home\\foo"
 * ```
 *
 * This module is browser compatible.
 *
 * @module
 */ import * as _windows from "./windows/mod.ts";
import * as _posix from "./posix/mod.ts";
/** @deprecated (will be removed after 1.0.0) Import from {@link https://deno.land/std/path/windows/mod.ts} instead. */ export const win32 = _windows;
/** @deprecated (will be removed after 1.0.0) Import from {@link https://deno.land/std/path/posix/mod.ts} instead. */ export const posix = _posix;
export * from "./basename.ts";
export * from "./constants.ts";
export * from "./dirname.ts";
export * from "./extname.ts";
export * from "./format.ts";
export * from "./from_file_url.ts";
export * from "./is_absolute.ts";
export * from "./join.ts";
export * from "./normalize.ts";
export * from "./parse.ts";
export * from "./relative.ts";
export * from "./resolve.ts";
export * from "./to_file_url.ts";
export * from "./to_namespaced_path.ts";
export * from "./common.ts";
export * from "./_interface.ts";
export * from "./glob_to_regexp.ts";
export * from "./is_glob.ts";
export * from "./join_globs.ts";
export * from "./normalize_glob.ts";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvcGF0aC8wLjIyMy4wL21vZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI0IHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gQ29weXJpZ2h0IHRoZSBCcm93c2VyaWZ5IGF1dGhvcnMuIE1JVCBMaWNlbnNlLlxuLy8gUG9ydGVkIG1vc3RseSBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9icm93c2VyaWZ5L3BhdGgtYnJvd3NlcmlmeS9cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cblxuLyoqXG4gKiBVdGlsaXRpZXMgZm9yIHdvcmtpbmcgd2l0aCBPUy1zcGVjaWZpYyBmaWxlIHBhdGhzLlxuICpcbiAqIEZ1bmN0aW9ucyBmcm9tIHRoaXMgbW9kdWxlIHdpbGwgYXV0b21hdGljYWxseSBzd2l0Y2ggdG8gc3VwcG9ydCB0aGUgcGF0aCBzdHlsZVxuICogb2YgdGhlIGN1cnJlbnQgT1MsIGVpdGhlciBgd2luZG93c2AgZm9yIE1pY3Jvc29mdCBXaW5kb3dzLCBvciBgcG9zaXhgIGZvclxuICogZXZlcnkgb3RoZXIgb3BlcmF0aW5nIHN5c3RlbSwgZWcuIExpbnV4LCBNYWNPUywgQlNEIGV0Yy5cbiAqXG4gKiBUbyB1c2UgZnVuY3Rpb25zIGZvciBhIHNwZWNpZmljIHBhdGggc3R5bGUgcmVnYXJkbGVzcyBvZiB0aGUgY3VycmVudCBPU1xuICogaW1wb3J0IHRoZSBtb2R1bGVzIGZyb20gdGhlIHBsYXRmb3JtIHN1YiBkaXJlY3RvcnkgaW5zdGVhZC5cbiAqXG4gKiBFeGFtcGxlLCBmb3IgYHBvc2l4YDpcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgZnJvbUZpbGVVcmwgfSBmcm9tIFwiQHN0ZC9wYXRoL3Bvc2l4L2Zyb20tZmlsZS11cmxcIjtcbiAqIGNvbnN0IHAgPSBmcm9tRmlsZVVybChcImZpbGU6Ly8vaG9tZS9mb29cIik7XG4gKiBjb25zb2xlLmxvZyhwKTsgLy8gXCIvaG9tZS9mb29cIlxuICogYGBgXG4gKlxuICogb3IsIGZvciBgd2luZG93c2A6XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IGZyb21GaWxlVXJsIH0gZnJvbSBcIkBzdGQvcGF0aC93aW5kb3dzL2Zyb20tZmlsZS11cmxcIjtcbiAqIGNvbnN0IHAgPSBmcm9tRmlsZVVybChcImZpbGU6Ly8vaG9tZS9mb29cIik7XG4gKiBjb25zb2xlLmxvZyhwKTsgLy8gXCJcXFxcaG9tZVxcXFxmb29cIlxuICogYGBgXG4gKlxuICogVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuICpcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgKiBhcyBfd2luZG93cyBmcm9tIFwiLi93aW5kb3dzL21vZC50c1wiO1xuaW1wb3J0ICogYXMgX3Bvc2l4IGZyb20gXCIuL3Bvc2l4L21vZC50c1wiO1xuXG4vKiogQGRlcHJlY2F0ZWQgKHdpbGwgYmUgcmVtb3ZlZCBhZnRlciAxLjAuMCkgSW1wb3J0IGZyb20ge0BsaW5rIGh0dHBzOi8vZGVuby5sYW5kL3N0ZC9wYXRoL3dpbmRvd3MvbW9kLnRzfSBpbnN0ZWFkLiAqL1xuZXhwb3J0IGNvbnN0IHdpbjMyOiB0eXBlb2YgX3dpbmRvd3MgPSBfd2luZG93cztcblxuLyoqIEBkZXByZWNhdGVkICh3aWxsIGJlIHJlbW92ZWQgYWZ0ZXIgMS4wLjApIEltcG9ydCBmcm9tIHtAbGluayBodHRwczovL2Rlbm8ubGFuZC9zdGQvcGF0aC9wb3NpeC9tb2QudHN9IGluc3RlYWQuICovXG5leHBvcnQgY29uc3QgcG9zaXg6IHR5cGVvZiBfcG9zaXggPSBfcG9zaXg7XG5cbmV4cG9ydCAqIGZyb20gXCIuL2Jhc2VuYW1lLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9jb25zdGFudHMudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2Rpcm5hbWUudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2V4dG5hbWUudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2Zvcm1hdC50c1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vZnJvbV9maWxlX3VybC50c1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vaXNfYWJzb2x1dGUudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2pvaW4udHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL25vcm1hbGl6ZS50c1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vcGFyc2UudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL3JlbGF0aXZlLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9yZXNvbHZlLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi90b19maWxlX3VybC50c1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vdG9fbmFtZXNwYWNlZF9wYXRoLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9jb21tb24udHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL19pbnRlcmZhY2UudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2dsb2JfdG9fcmVnZXhwLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9pc19nbG9iLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9qb2luX2dsb2JzLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9ub3JtYWxpemVfZ2xvYi50c1wiO1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUMxRSxpREFBaUQ7QUFDakQsb0VBQW9FO0FBQ3BFLHFDQUFxQztBQUVyQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0E2QkMsR0FFRCxZQUFZLGNBQWMsbUJBQW1CO0FBQzdDLFlBQVksWUFBWSxpQkFBaUI7QUFFekMscUhBQXFILEdBQ3JILE9BQU8sTUFBTSxRQUF5QixTQUFTO0FBRS9DLG1IQUFtSCxHQUNuSCxPQUFPLE1BQU0sUUFBdUIsT0FBTztBQUUzQyxjQUFjLGdCQUFnQjtBQUM5QixjQUFjLGlCQUFpQjtBQUMvQixjQUFjLGVBQWU7QUFDN0IsY0FBYyxlQUFlO0FBQzdCLGNBQWMsY0FBYztBQUM1QixjQUFjLHFCQUFxQjtBQUNuQyxjQUFjLG1CQUFtQjtBQUNqQyxjQUFjLFlBQVk7QUFDMUIsY0FBYyxpQkFBaUI7QUFDL0IsY0FBYyxhQUFhO0FBQzNCLGNBQWMsZ0JBQWdCO0FBQzlCLGNBQWMsZUFBZTtBQUM3QixjQUFjLG1CQUFtQjtBQUNqQyxjQUFjLDBCQUEwQjtBQUN4QyxjQUFjLGNBQWM7QUFDNUIsY0FBYyxrQkFBa0I7QUFDaEMsY0FBYyxzQkFBc0I7QUFDcEMsY0FBYyxlQUFlO0FBQzdCLGNBQWMsa0JBQWtCO0FBQ2hDLGNBQWMsc0JBQXNCIn0=