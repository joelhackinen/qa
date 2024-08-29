// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import { assertArg } from "../_common/normalize.ts";
import { normalizeString } from "../_common/normalize_string.ts";
import { isPosixPathSeparator } from "./_util.ts";
/**
 * Normalize the `path`, resolving `'..'` and `'.'` segments.
 * Note that resolving these segments does not necessarily mean that all will be eliminated.
 * A `'..'` at the top-level will be preserved, and an empty path is canonically `'.'`.
 * @param path to be normalized
 */ export function normalize(path) {
  assertArg(path);
  const isAbsolute = isPosixPathSeparator(path.charCodeAt(0));
  const trailingSeparator = isPosixPathSeparator(path.charCodeAt(path.length - 1));
  // Normalize the path
  path = normalizeString(path, !isAbsolute, "/", isPosixPathSeparator);
  if (path.length === 0 && !isAbsolute) path = ".";
  if (path.length > 0 && trailingSeparator) path += "/";
  if (isAbsolute) return `/${path}`;
  return path;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvcGF0aC8wLjIyMy4wL3Bvc2l4L25vcm1hbGl6ZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI0IHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG5pbXBvcnQgeyBhc3NlcnRBcmcgfSBmcm9tIFwiLi4vX2NvbW1vbi9ub3JtYWxpemUudHNcIjtcbmltcG9ydCB7IG5vcm1hbGl6ZVN0cmluZyB9IGZyb20gXCIuLi9fY29tbW9uL25vcm1hbGl6ZV9zdHJpbmcudHNcIjtcbmltcG9ydCB7IGlzUG9zaXhQYXRoU2VwYXJhdG9yIH0gZnJvbSBcIi4vX3V0aWwudHNcIjtcblxuLyoqXG4gKiBOb3JtYWxpemUgdGhlIGBwYXRoYCwgcmVzb2x2aW5nIGAnLi4nYCBhbmQgYCcuJ2Agc2VnbWVudHMuXG4gKiBOb3RlIHRoYXQgcmVzb2x2aW5nIHRoZXNlIHNlZ21lbnRzIGRvZXMgbm90IG5lY2Vzc2FyaWx5IG1lYW4gdGhhdCBhbGwgd2lsbCBiZSBlbGltaW5hdGVkLlxuICogQSBgJy4uJ2AgYXQgdGhlIHRvcC1sZXZlbCB3aWxsIGJlIHByZXNlcnZlZCwgYW5kIGFuIGVtcHR5IHBhdGggaXMgY2Fub25pY2FsbHkgYCcuJ2AuXG4gKiBAcGFyYW0gcGF0aCB0byBiZSBub3JtYWxpemVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemUocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgYXNzZXJ0QXJnKHBhdGgpO1xuXG4gIGNvbnN0IGlzQWJzb2x1dGUgPSBpc1Bvc2l4UGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoMCkpO1xuICBjb25zdCB0cmFpbGluZ1NlcGFyYXRvciA9IGlzUG9zaXhQYXRoU2VwYXJhdG9yKFxuICAgIHBhdGguY2hhckNvZGVBdChwYXRoLmxlbmd0aCAtIDEpLFxuICApO1xuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICBwYXRoID0gbm9ybWFsaXplU3RyaW5nKHBhdGgsICFpc0Fic29sdXRlLCBcIi9cIiwgaXNQb3NpeFBhdGhTZXBhcmF0b3IpO1xuXG4gIGlmIChwYXRoLmxlbmd0aCA9PT0gMCAmJiAhaXNBYnNvbHV0ZSkgcGF0aCA9IFwiLlwiO1xuICBpZiAocGF0aC5sZW5ndGggPiAwICYmIHRyYWlsaW5nU2VwYXJhdG9yKSBwYXRoICs9IFwiL1wiO1xuXG4gIGlmIChpc0Fic29sdXRlKSByZXR1cm4gYC8ke3BhdGh9YDtcbiAgcmV0dXJuIHBhdGg7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFLHFDQUFxQztBQUVyQyxTQUFTLFNBQVMsUUFBUSwwQkFBMEI7QUFDcEQsU0FBUyxlQUFlLFFBQVEsaUNBQWlDO0FBQ2pFLFNBQVMsb0JBQW9CLFFBQVEsYUFBYTtBQUVsRDs7Ozs7Q0FLQyxHQUNELE9BQU8sU0FBUyxVQUFVLElBQVk7RUFDcEMsVUFBVTtFQUVWLE1BQU0sYUFBYSxxQkFBcUIsS0FBSyxVQUFVLENBQUM7RUFDeEQsTUFBTSxvQkFBb0IscUJBQ3hCLEtBQUssVUFBVSxDQUFDLEtBQUssTUFBTSxHQUFHO0VBR2hDLHFCQUFxQjtFQUNyQixPQUFPLGdCQUFnQixNQUFNLENBQUMsWUFBWSxLQUFLO0VBRS9DLElBQUksS0FBSyxNQUFNLEtBQUssS0FBSyxDQUFDLFlBQVksT0FBTztFQUM3QyxJQUFJLEtBQUssTUFBTSxHQUFHLEtBQUssbUJBQW1CLFFBQVE7RUFFbEQsSUFBSSxZQUFZLE9BQU8sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDO0VBQ2pDLE9BQU87QUFDVCJ9