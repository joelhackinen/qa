// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import { isWindows } from "./_os.ts";
import { toNamespacedPath as posixToNamespacedPath } from "./posix/to_namespaced_path.ts";
import { toNamespacedPath as windowsToNamespacedPath } from "./windows/to_namespaced_path.ts";
/**
 * Resolves path to a namespace path
 * @param path to resolve to namespace
 */ export function toNamespacedPath(path) {
  return isWindows ? windowsToNamespacedPath(path) : posixToNamespacedPath(path);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvcGF0aC8wLjIyMy4wL3RvX25hbWVzcGFjZWRfcGF0aC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI0IHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG5pbXBvcnQgeyBpc1dpbmRvd3MgfSBmcm9tIFwiLi9fb3MudHNcIjtcbmltcG9ydCB7IHRvTmFtZXNwYWNlZFBhdGggYXMgcG9zaXhUb05hbWVzcGFjZWRQYXRoIH0gZnJvbSBcIi4vcG9zaXgvdG9fbmFtZXNwYWNlZF9wYXRoLnRzXCI7XG5pbXBvcnQgeyB0b05hbWVzcGFjZWRQYXRoIGFzIHdpbmRvd3NUb05hbWVzcGFjZWRQYXRoIH0gZnJvbSBcIi4vd2luZG93cy90b19uYW1lc3BhY2VkX3BhdGgudHNcIjtcblxuLyoqXG4gKiBSZXNvbHZlcyBwYXRoIHRvIGEgbmFtZXNwYWNlIHBhdGhcbiAqIEBwYXJhbSBwYXRoIHRvIHJlc29sdmUgdG8gbmFtZXNwYWNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b05hbWVzcGFjZWRQYXRoKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBpc1dpbmRvd3NcbiAgICA/IHdpbmRvd3NUb05hbWVzcGFjZWRQYXRoKHBhdGgpXG4gICAgOiBwb3NpeFRvTmFtZXNwYWNlZFBhdGgocGF0aCk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFLHFDQUFxQztBQUVyQyxTQUFTLFNBQVMsUUFBUSxXQUFXO0FBQ3JDLFNBQVMsb0JBQW9CLHFCQUFxQixRQUFRLGdDQUFnQztBQUMxRixTQUFTLG9CQUFvQix1QkFBdUIsUUFBUSxrQ0FBa0M7QUFFOUY7OztDQUdDLEdBQ0QsT0FBTyxTQUFTLGlCQUFpQixJQUFZO0VBQzNDLE9BQU8sWUFDSCx3QkFBd0IsUUFDeEIsc0JBQXNCO0FBQzVCIn0=