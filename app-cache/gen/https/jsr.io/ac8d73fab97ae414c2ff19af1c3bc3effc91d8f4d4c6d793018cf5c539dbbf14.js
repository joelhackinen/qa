// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
/**
 * Concatenate an array of {@linkcode Uint8Array}s.
 *
 * @example
 * ```ts
 * import { concat } from "@std/bytes/concat";
 *
 * const a = new Uint8Array([0, 1, 2]);
 * const b = new Uint8Array([3, 4, 5]);
 * concat([a, b]); // Uint8Array(6) [ 0, 1, 2, 3, 4, 5 ]
 * ```
 */ export function concat(buf) {
  let length = 0;
  for (const b of buf){
    length += b.length;
  }
  const output = new Uint8Array(length);
  let index = 0;
  for (const b of buf){
    output.set(b, index);
    index += b.length;
  }
  return output;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvYnl0ZXMvMC4yMjMuMC9jb25jYXQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNCB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cblxuLyoqXG4gKiBDb25jYXRlbmF0ZSBhbiBhcnJheSBvZiB7QGxpbmtjb2RlIFVpbnQ4QXJyYXl9cy5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IGNvbmNhdCB9IGZyb20gXCJAc3RkL2J5dGVzL2NvbmNhdFwiO1xuICpcbiAqIGNvbnN0IGEgPSBuZXcgVWludDhBcnJheShbMCwgMSwgMl0pO1xuICogY29uc3QgYiA9IG5ldyBVaW50OEFycmF5KFszLCA0LCA1XSk7XG4gKiBjb25jYXQoW2EsIGJdKTsgLy8gVWludDhBcnJheSg2KSBbIDAsIDEsIDIsIDMsIDQsIDUgXVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb25jYXQoYnVmOiBVaW50OEFycmF5W10pOiBVaW50OEFycmF5IHtcbiAgbGV0IGxlbmd0aCA9IDA7XG4gIGZvciAoY29uc3QgYiBvZiBidWYpIHtcbiAgICBsZW5ndGggKz0gYi5sZW5ndGg7XG4gIH1cbiAgY29uc3Qgb3V0cHV0ID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKTtcbiAgbGV0IGluZGV4ID0gMDtcbiAgZm9yIChjb25zdCBiIG9mIGJ1Zikge1xuICAgIG91dHB1dC5zZXQoYiwgaW5kZXgpO1xuICAgIGluZGV4ICs9IGIubGVuZ3RoO1xuICB9XG5cbiAgcmV0dXJuIG91dHB1dDtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUscUNBQXFDO0FBRXJDOzs7Ozs7Ozs7OztDQVdDLEdBQ0QsT0FBTyxTQUFTLE9BQU8sR0FBaUI7RUFDdEMsSUFBSSxTQUFTO0VBQ2IsS0FBSyxNQUFNLEtBQUssSUFBSztJQUNuQixVQUFVLEVBQUUsTUFBTTtFQUNwQjtFQUNBLE1BQU0sU0FBUyxJQUFJLFdBQVc7RUFDOUIsSUFBSSxRQUFRO0VBQ1osS0FBSyxNQUFNLEtBQUssSUFBSztJQUNuQixPQUFPLEdBQUcsQ0FBQyxHQUFHO0lBQ2QsU0FBUyxFQUFFLE1BQU07RUFDbkI7RUFFQSxPQUFPO0FBQ1QifQ==