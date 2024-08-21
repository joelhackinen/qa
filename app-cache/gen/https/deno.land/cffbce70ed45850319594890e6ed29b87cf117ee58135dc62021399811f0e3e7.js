// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
function _format(sep, pathObject) {
  const dir = pathObject.dir || pathObject.root;
  const base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
  if (!dir) return base;
  if (base === sep) return dir;
  if (dir === pathObject.root) return dir + base;
  return dir + sep + base;
}
function assertArg(pathObject) {
  if (pathObject === null || typeof pathObject !== "object") {
    throw new TypeError(`The "pathObject" argument must be of type Object. Received type ${typeof pathObject}`);
  }
}
/**
 * Generate a path from `FormatInputPathObject` object.
 * @param pathObject with path
 */ export function posixFormat(pathObject) {
  assertArg(pathObject);
  return _format("/", pathObject);
}
/**
 * Generate a path from `FormatInputPathObject` object.
 * @param pathObject with path
 */ export function windowsFormat(pathObject) {
  assertArg(pathObject);
  return _format("\\", pathObject);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjIwMC4wL3BhdGgvX2Zvcm1hdC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDIzIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG5pbXBvcnQgdHlwZSB7IEZvcm1hdElucHV0UGF0aE9iamVjdCB9IGZyb20gXCIuL19pbnRlcmZhY2UudHNcIjtcblxuZnVuY3Rpb24gX2Zvcm1hdChcbiAgc2VwOiBzdHJpbmcsXG4gIHBhdGhPYmplY3Q6IEZvcm1hdElucHV0UGF0aE9iamVjdCxcbik6IHN0cmluZyB7XG4gIGNvbnN0IGRpcjogc3RyaW5nIHwgdW5kZWZpbmVkID0gcGF0aE9iamVjdC5kaXIgfHwgcGF0aE9iamVjdC5yb290O1xuICBjb25zdCBiYXNlOiBzdHJpbmcgPSBwYXRoT2JqZWN0LmJhc2UgfHxcbiAgICAocGF0aE9iamVjdC5uYW1lIHx8IFwiXCIpICsgKHBhdGhPYmplY3QuZXh0IHx8IFwiXCIpO1xuICBpZiAoIWRpcikgcmV0dXJuIGJhc2U7XG4gIGlmIChiYXNlID09PSBzZXApIHJldHVybiBkaXI7XG4gIGlmIChkaXIgPT09IHBhdGhPYmplY3Qucm9vdCkgcmV0dXJuIGRpciArIGJhc2U7XG4gIHJldHVybiBkaXIgKyBzZXAgKyBiYXNlO1xufVxuXG5mdW5jdGlvbiBhc3NlcnRBcmcocGF0aE9iamVjdDogRm9ybWF0SW5wdXRQYXRoT2JqZWN0KSB7XG4gIGlmIChwYXRoT2JqZWN0ID09PSBudWxsIHx8IHR5cGVvZiBwYXRoT2JqZWN0ICE9PSBcIm9iamVjdFwiKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgIGBUaGUgXCJwYXRoT2JqZWN0XCIgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIE9iamVjdC4gUmVjZWl2ZWQgdHlwZSAke3R5cGVvZiBwYXRoT2JqZWN0fWAsXG4gICAgKTtcbiAgfVxufVxuXG4vKipcbiAqIEdlbmVyYXRlIGEgcGF0aCBmcm9tIGBGb3JtYXRJbnB1dFBhdGhPYmplY3RgIG9iamVjdC5cbiAqIEBwYXJhbSBwYXRoT2JqZWN0IHdpdGggcGF0aFxuICovXG5leHBvcnQgZnVuY3Rpb24gcG9zaXhGb3JtYXQocGF0aE9iamVjdDogRm9ybWF0SW5wdXRQYXRoT2JqZWN0KTogc3RyaW5nIHtcbiAgYXNzZXJ0QXJnKHBhdGhPYmplY3QpO1xuICByZXR1cm4gX2Zvcm1hdChcIi9cIiwgcGF0aE9iamVjdCk7XG59XG5cbi8qKlxuICogR2VuZXJhdGUgYSBwYXRoIGZyb20gYEZvcm1hdElucHV0UGF0aE9iamVjdGAgb2JqZWN0LlxuICogQHBhcmFtIHBhdGhPYmplY3Qgd2l0aCBwYXRoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aW5kb3dzRm9ybWF0KHBhdGhPYmplY3Q6IEZvcm1hdElucHV0UGF0aE9iamVjdCk6IHN0cmluZyB7XG4gIGFzc2VydEFyZyhwYXRoT2JqZWN0KTtcbiAgcmV0dXJuIF9mb3JtYXQoXCJcXFxcXCIsIHBhdGhPYmplY3QpO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUMxRSxxQ0FBcUM7QUFJckMsU0FBUyxRQUNQLEdBQVcsRUFDWCxVQUFpQztFQUVqQyxNQUFNLE1BQTBCLFdBQVcsR0FBRyxJQUFJLFdBQVcsSUFBSTtFQUNqRSxNQUFNLE9BQWUsV0FBVyxJQUFJLElBQ2xDLENBQUMsV0FBVyxJQUFJLElBQUksRUFBRSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksRUFBRTtFQUNqRCxJQUFJLENBQUMsS0FBSyxPQUFPO0VBQ2pCLElBQUksU0FBUyxLQUFLLE9BQU87RUFDekIsSUFBSSxRQUFRLFdBQVcsSUFBSSxFQUFFLE9BQU8sTUFBTTtFQUMxQyxPQUFPLE1BQU0sTUFBTTtBQUNyQjtBQUVBLFNBQVMsVUFBVSxVQUFpQztFQUNsRCxJQUFJLGVBQWUsUUFBUSxPQUFPLGVBQWUsVUFBVTtJQUN6RCxNQUFNLElBQUksVUFDUixDQUFDLGdFQUFnRSxFQUFFLE9BQU8sV0FBVyxDQUFDO0VBRTFGO0FBQ0Y7QUFFQTs7O0NBR0MsR0FDRCxPQUFPLFNBQVMsWUFBWSxVQUFpQztFQUMzRCxVQUFVO0VBQ1YsT0FBTyxRQUFRLEtBQUs7QUFDdEI7QUFFQTs7O0NBR0MsR0FDRCxPQUFPLFNBQVMsY0FBYyxVQUFpQztFQUM3RCxVQUFVO0VBQ1YsT0FBTyxRQUFRLE1BQU07QUFDdkIifQ==