// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import { types } from "./_db.ts";
/**
 * Returns the media type associated with the file extension. Values are
 * normalized to lower case and matched irrespective of a leading `.`.
 *
 * When `extension` has no associated type, the function returns `undefined`.
 *
 * @example
 * ```ts
 * import { typeByExtension } from "@std/media-types/type-by-extension";
 *
 * typeByExtension("js"); // "application/json"
 * typeByExtension(".HTML"); // "text/html"
 * typeByExtension("foo"); // undefined
 * typeByExtension("file.json"); // undefined
 * ```
 */ export function typeByExtension(extension) {
  extension = extension.startsWith(".") ? extension.slice(1) : extension;
  // @ts-ignore workaround around denoland/dnt#148
  return types.get(extension.toLowerCase());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvbWVkaWEtdHlwZXMvMC4yMjMuMC90eXBlX2J5X2V4dGVuc2lvbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI0IHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG5pbXBvcnQgeyB0eXBlcyB9IGZyb20gXCIuL19kYi50c1wiO1xuXG4vKipcbiAqIFJldHVybnMgdGhlIG1lZGlhIHR5cGUgYXNzb2NpYXRlZCB3aXRoIHRoZSBmaWxlIGV4dGVuc2lvbi4gVmFsdWVzIGFyZVxuICogbm9ybWFsaXplZCB0byBsb3dlciBjYXNlIGFuZCBtYXRjaGVkIGlycmVzcGVjdGl2ZSBvZiBhIGxlYWRpbmcgYC5gLlxuICpcbiAqIFdoZW4gYGV4dGVuc2lvbmAgaGFzIG5vIGFzc29jaWF0ZWQgdHlwZSwgdGhlIGZ1bmN0aW9uIHJldHVybnMgYHVuZGVmaW5lZGAuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyB0eXBlQnlFeHRlbnNpb24gfSBmcm9tIFwiQHN0ZC9tZWRpYS10eXBlcy90eXBlLWJ5LWV4dGVuc2lvblwiO1xuICpcbiAqIHR5cGVCeUV4dGVuc2lvbihcImpzXCIpOyAvLyBcImFwcGxpY2F0aW9uL2pzb25cIlxuICogdHlwZUJ5RXh0ZW5zaW9uKFwiLkhUTUxcIik7IC8vIFwidGV4dC9odG1sXCJcbiAqIHR5cGVCeUV4dGVuc2lvbihcImZvb1wiKTsgLy8gdW5kZWZpbmVkXG4gKiB0eXBlQnlFeHRlbnNpb24oXCJmaWxlLmpzb25cIik7IC8vIHVuZGVmaW5lZFxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0eXBlQnlFeHRlbnNpb24oZXh0ZW5zaW9uOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBleHRlbnNpb24gPSBleHRlbnNpb24uc3RhcnRzV2l0aChcIi5cIikgPyBleHRlbnNpb24uc2xpY2UoMSkgOiBleHRlbnNpb247XG4gIC8vIEB0cy1pZ25vcmUgd29ya2Fyb3VuZCBhcm91bmQgZGVub2xhbmQvZG50IzE0OFxuICByZXR1cm4gdHlwZXMuZ2V0KGV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUscUNBQXFDO0FBRXJDLFNBQVMsS0FBSyxRQUFRLFdBQVc7QUFFakM7Ozs7Ozs7Ozs7Ozs7OztDQWVDLEdBQ0QsT0FBTyxTQUFTLGdCQUFnQixTQUFpQjtFQUMvQyxZQUFZLFVBQVUsVUFBVSxDQUFDLE9BQU8sVUFBVSxLQUFLLENBQUMsS0FBSztFQUM3RCxnREFBZ0Q7RUFDaEQsT0FBTyxNQUFNLEdBQUcsQ0FBQyxVQUFVLFdBQVc7QUFDeEMifQ==