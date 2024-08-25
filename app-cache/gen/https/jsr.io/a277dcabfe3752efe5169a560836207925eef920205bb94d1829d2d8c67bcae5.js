// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
/** Copy bytes from the `src` array to the `dst` array. Returns the number of
 * bytes copied.
 *
 * If the `src` array is larger than what the `dst` array can hold, only the
 * amount of bytes that fit in the `dst` array are copied.
 *
 * An offset can be specified as the third argument that begins the copy at
 * that given index in the `dst` array. The offset defaults to the beginning of
 * the array.
 *
 * ```ts
 * import { copy } from "@std/bytes/copy";
 * const src = new Uint8Array([9, 8, 7]);
 * const dst = new Uint8Array([0, 1, 2, 3, 4, 5]);
 * console.log(copy(src, dst)); // 3
 * console.log(dst); // [9, 8, 7, 3, 4, 5]
 * ```
 *
 * ```ts
 * import { copy } from "@std/bytes/copy";
 * const src = new Uint8Array([1, 1, 1, 1]);
 * const dst = new Uint8Array([0, 0, 0, 0]);
 * console.log(copy(src, dst, 1)); // 3
 * console.log(dst); // [0, 1, 1, 1]
 * ```
 */ export function copy(src, dst, off = 0) {
  off = Math.max(0, Math.min(off, dst.byteLength));
  const dstBytesAvailable = dst.byteLength - off;
  if (src.byteLength > dstBytesAvailable) {
    src = src.subarray(0, dstBytesAvailable);
  }
  dst.set(src, off);
  return src.byteLength;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvYnl0ZXMvMC4yMjMuMC9jb3B5LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjQgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG4vLyBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG5cbi8qKiBDb3B5IGJ5dGVzIGZyb20gdGhlIGBzcmNgIGFycmF5IHRvIHRoZSBgZHN0YCBhcnJheS4gUmV0dXJucyB0aGUgbnVtYmVyIG9mXG4gKiBieXRlcyBjb3BpZWQuXG4gKlxuICogSWYgdGhlIGBzcmNgIGFycmF5IGlzIGxhcmdlciB0aGFuIHdoYXQgdGhlIGBkc3RgIGFycmF5IGNhbiBob2xkLCBvbmx5IHRoZVxuICogYW1vdW50IG9mIGJ5dGVzIHRoYXQgZml0IGluIHRoZSBgZHN0YCBhcnJheSBhcmUgY29waWVkLlxuICpcbiAqIEFuIG9mZnNldCBjYW4gYmUgc3BlY2lmaWVkIGFzIHRoZSB0aGlyZCBhcmd1bWVudCB0aGF0IGJlZ2lucyB0aGUgY29weSBhdFxuICogdGhhdCBnaXZlbiBpbmRleCBpbiB0aGUgYGRzdGAgYXJyYXkuIFRoZSBvZmZzZXQgZGVmYXVsdHMgdG8gdGhlIGJlZ2lubmluZyBvZlxuICogdGhlIGFycmF5LlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBjb3B5IH0gZnJvbSBcIkBzdGQvYnl0ZXMvY29weVwiO1xuICogY29uc3Qgc3JjID0gbmV3IFVpbnQ4QXJyYXkoWzksIDgsIDddKTtcbiAqIGNvbnN0IGRzdCA9IG5ldyBVaW50OEFycmF5KFswLCAxLCAyLCAzLCA0LCA1XSk7XG4gKiBjb25zb2xlLmxvZyhjb3B5KHNyYywgZHN0KSk7IC8vIDNcbiAqIGNvbnNvbGUubG9nKGRzdCk7IC8vIFs5LCA4LCA3LCAzLCA0LCA1XVxuICogYGBgXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IGNvcHkgfSBmcm9tIFwiQHN0ZC9ieXRlcy9jb3B5XCI7XG4gKiBjb25zdCBzcmMgPSBuZXcgVWludDhBcnJheShbMSwgMSwgMSwgMV0pO1xuICogY29uc3QgZHN0ID0gbmV3IFVpbnQ4QXJyYXkoWzAsIDAsIDAsIDBdKTtcbiAqIGNvbnNvbGUubG9nKGNvcHkoc3JjLCBkc3QsIDEpKTsgLy8gM1xuICogY29uc29sZS5sb2coZHN0KTsgLy8gWzAsIDEsIDEsIDFdXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvcHkoc3JjOiBVaW50OEFycmF5LCBkc3Q6IFVpbnQ4QXJyYXksIG9mZiA9IDApOiBudW1iZXIge1xuICBvZmYgPSBNYXRoLm1heCgwLCBNYXRoLm1pbihvZmYsIGRzdC5ieXRlTGVuZ3RoKSk7XG4gIGNvbnN0IGRzdEJ5dGVzQXZhaWxhYmxlID0gZHN0LmJ5dGVMZW5ndGggLSBvZmY7XG4gIGlmIChzcmMuYnl0ZUxlbmd0aCA+IGRzdEJ5dGVzQXZhaWxhYmxlKSB7XG4gICAgc3JjID0gc3JjLnN1YmFycmF5KDAsIGRzdEJ5dGVzQXZhaWxhYmxlKTtcbiAgfVxuICBkc3Quc2V0KHNyYywgb2ZmKTtcbiAgcmV0dXJuIHNyYy5ieXRlTGVuZ3RoO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUMxRSxxQ0FBcUM7QUFFckM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0F5QkMsR0FDRCxPQUFPLFNBQVMsS0FBSyxHQUFlLEVBQUUsR0FBZSxFQUFFLE1BQU0sQ0FBQztFQUM1RCxNQUFNLEtBQUssR0FBRyxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsS0FBSyxJQUFJLFVBQVU7RUFDOUMsTUFBTSxvQkFBb0IsSUFBSSxVQUFVLEdBQUc7RUFDM0MsSUFBSSxJQUFJLFVBQVUsR0FBRyxtQkFBbUI7SUFDdEMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxHQUFHO0VBQ3hCO0VBQ0EsSUFBSSxHQUFHLENBQUMsS0FBSztFQUNiLE9BQU8sSUFBSSxVQUFVO0FBQ3ZCIn0=