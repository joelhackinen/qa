// Copyright 2018-2024 the oak authors. All rights reserved. MIT license.
/**
 * A collection of oak specific APIs for management of ETags.
 *
 * @module
 */ import { calculate } from "../deps.ts";
import { BODY_TYPES } from "../utils/consts.ts";
import { isAsyncIterable, isReader } from "../utils/type_guards.ts";
// This is to work around issue introduced in Deno 1.40
// See: https://github.com/denoland/deno/issues/22115
function isFsFile(value) {
  return !!(value && typeof value === "object" && "stat" in value && typeof value.stat === "function");
}
/** For a given Context, try to determine the response body entity that an ETag
 * can be calculated from. */ // deno-lint-ignore no-explicit-any
export function getEntity(context) {
  const { body } = context.response;
  if (isFsFile(body)) {
    return body.stat();
  }
  if (body instanceof Uint8Array) {
    return Promise.resolve(body);
  }
  if (BODY_TYPES.includes(typeof body)) {
    return Promise.resolve(String(body));
  }
  if (isAsyncIterable(body) || isReader(body)) {
    return Promise.resolve(undefined);
  }
  if (typeof body === "object" && body !== null) {
    try {
      const bodyText = JSON.stringify(body);
      return Promise.resolve(bodyText);
    } catch  {
    // We don't really care about errors here
    }
  }
  return Promise.resolve(undefined);
}
/**
 * Create middleware that will attempt to decode the response.body into
 * something that can be used to generate an `ETag` and add the `ETag` header to
 * the response.
 */ // deno-lint-ignore no-explicit-any
export function factory(options) {
  return async function etag(context, next) {
    await next();
    if (!context.response.headers.has("ETag")) {
      const entity = await getEntity(context);
      if (entity) {
        const etag = await calculate(entity, options);
        if (etag) {
          context.response.headers.set("ETag", etag);
        }
      }
    }
  };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvb2FrLzE2LjEuMC9taWRkbGV3YXJlL2V0YWcudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNCB0aGUgb2FrIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuXG4vKipcbiAqIEEgY29sbGVjdGlvbiBvZiBvYWsgc3BlY2lmaWMgQVBJcyBmb3IgbWFuYWdlbWVudCBvZiBFVGFncy5cbiAqXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBTdGF0ZSB9IGZyb20gXCIuLi9hcHBsaWNhdGlvbi50c1wiO1xuaW1wb3J0IHR5cGUgeyBDb250ZXh0IH0gZnJvbSBcIi4uL2NvbnRleHQudHNcIjtcbmltcG9ydCB7IGNhbGN1bGF0ZSwgdHlwZSBFVGFnT3B0aW9ucyB9IGZyb20gXCIuLi9kZXBzLnRzXCI7XG5pbXBvcnQgdHlwZSB7IE1pZGRsZXdhcmUgfSBmcm9tIFwiLi4vbWlkZGxld2FyZS50c1wiO1xuaW1wb3J0IHsgQk9EWV9UWVBFUyB9IGZyb20gXCIuLi91dGlscy9jb25zdHMudHNcIjtcbmltcG9ydCB7IGlzQXN5bmNJdGVyYWJsZSwgaXNSZWFkZXIgfSBmcm9tIFwiLi4vdXRpbHMvdHlwZV9ndWFyZHMudHNcIjtcblxuLy8gVGhpcyBpcyB0byB3b3JrIGFyb3VuZCBpc3N1ZSBpbnRyb2R1Y2VkIGluIERlbm8gMS40MFxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZGVub2xhbmQvZGVuby9pc3N1ZXMvMjIxMTVcbmZ1bmN0aW9uIGlzRnNGaWxlKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgRGVuby5Gc0ZpbGUge1xuICByZXR1cm4gISEodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIFwic3RhdFwiIGluIHZhbHVlICYmXG4gICAgdHlwZW9mIHZhbHVlLnN0YXQgPT09IFwiZnVuY3Rpb25cIik7XG59XG5cbi8qKiBGb3IgYSBnaXZlbiBDb250ZXh0LCB0cnkgdG8gZGV0ZXJtaW5lIHRoZSByZXNwb25zZSBib2R5IGVudGl0eSB0aGF0IGFuIEVUYWdcbiAqIGNhbiBiZSBjYWxjdWxhdGVkIGZyb20uICovXG4vLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuZXhwb3J0IGZ1bmN0aW9uIGdldEVudGl0eTxTIGV4dGVuZHMgU3RhdGUgPSBSZWNvcmQ8c3RyaW5nLCBhbnk+PihcbiAgY29udGV4dDogQ29udGV4dDxTPixcbik6IFByb21pc2U8c3RyaW5nIHwgVWludDhBcnJheSB8IERlbm8uRmlsZUluZm8gfCB1bmRlZmluZWQ+IHtcbiAgY29uc3QgeyBib2R5IH0gPSBjb250ZXh0LnJlc3BvbnNlO1xuICBpZiAoaXNGc0ZpbGUoYm9keSkpIHtcbiAgICByZXR1cm4gYm9keS5zdGF0KCk7XG4gIH1cbiAgaWYgKGJvZHkgaW5zdGFuY2VvZiBVaW50OEFycmF5KSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShib2R5KTtcbiAgfVxuICBpZiAoQk9EWV9UWVBFUy5pbmNsdWRlcyh0eXBlb2YgYm9keSkpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKFN0cmluZyhib2R5KSk7XG4gIH1cbiAgaWYgKGlzQXN5bmNJdGVyYWJsZShib2R5KSB8fCBpc1JlYWRlcihib2R5KSkge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodW5kZWZpbmVkKTtcbiAgfVxuICBpZiAodHlwZW9mIGJvZHkgPT09IFwib2JqZWN0XCIgJiYgYm9keSAhPT0gbnVsbCkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBib2R5VGV4dCA9IEpTT04uc3RyaW5naWZ5KGJvZHkpO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShib2R5VGV4dCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBXZSBkb24ndCByZWFsbHkgY2FyZSBhYm91dCBlcnJvcnMgaGVyZVxuICAgIH1cbiAgfVxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHVuZGVmaW5lZCk7XG59XG5cbi8qKlxuICogQ3JlYXRlIG1pZGRsZXdhcmUgdGhhdCB3aWxsIGF0dGVtcHQgdG8gZGVjb2RlIHRoZSByZXNwb25zZS5ib2R5IGludG9cbiAqIHNvbWV0aGluZyB0aGF0IGNhbiBiZSB1c2VkIHRvIGdlbmVyYXRlIGFuIGBFVGFnYCBhbmQgYWRkIHRoZSBgRVRhZ2AgaGVhZGVyIHRvXG4gKiB0aGUgcmVzcG9uc2UuXG4gKi9cbi8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG5leHBvcnQgZnVuY3Rpb24gZmFjdG9yeTxTIGV4dGVuZHMgU3RhdGUgPSBSZWNvcmQ8c3RyaW5nLCBhbnk+PihcbiAgb3B0aW9ucz86IEVUYWdPcHRpb25zLFxuKTogTWlkZGxld2FyZTxTPiB7XG4gIHJldHVybiBhc3luYyBmdW5jdGlvbiBldGFnKGNvbnRleHQ6IENvbnRleHQ8Uz4sIG5leHQpIHtcbiAgICBhd2FpdCBuZXh0KCk7XG4gICAgaWYgKCFjb250ZXh0LnJlc3BvbnNlLmhlYWRlcnMuaGFzKFwiRVRhZ1wiKSkge1xuICAgICAgY29uc3QgZW50aXR5ID0gYXdhaXQgZ2V0RW50aXR5KGNvbnRleHQpO1xuICAgICAgaWYgKGVudGl0eSkge1xuICAgICAgICBjb25zdCBldGFnID0gYXdhaXQgY2FsY3VsYXRlKGVudGl0eSwgb3B0aW9ucyk7XG4gICAgICAgIGlmIChldGFnKSB7XG4gICAgICAgICAgY29udGV4dC5yZXNwb25zZS5oZWFkZXJzLnNldChcIkVUYWdcIiwgZXRhZyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEseUVBQXlFO0FBRXpFOzs7O0NBSUMsR0FJRCxTQUFTLFNBQVMsUUFBMEIsYUFBYTtBQUV6RCxTQUFTLFVBQVUsUUFBUSxxQkFBcUI7QUFDaEQsU0FBUyxlQUFlLEVBQUUsUUFBUSxRQUFRLDBCQUEwQjtBQUVwRSx1REFBdUQ7QUFDdkQscURBQXFEO0FBQ3JELFNBQVMsU0FBUyxLQUFjO0VBQzlCLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxPQUFPLFVBQVUsWUFBWSxVQUFVLFNBQ3hELE9BQU8sTUFBTSxJQUFJLEtBQUssVUFBVTtBQUNwQztBQUVBOzJCQUMyQixHQUMzQixtQ0FBbUM7QUFDbkMsT0FBTyxTQUFTLFVBQ2QsT0FBbUI7RUFFbkIsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLFFBQVEsUUFBUTtFQUNqQyxJQUFJLFNBQVMsT0FBTztJQUNsQixPQUFPLEtBQUssSUFBSTtFQUNsQjtFQUNBLElBQUksZ0JBQWdCLFlBQVk7SUFDOUIsT0FBTyxRQUFRLE9BQU8sQ0FBQztFQUN6QjtFQUNBLElBQUksV0FBVyxRQUFRLENBQUMsT0FBTyxPQUFPO0lBQ3BDLE9BQU8sUUFBUSxPQUFPLENBQUMsT0FBTztFQUNoQztFQUNBLElBQUksZ0JBQWdCLFNBQVMsU0FBUyxPQUFPO0lBQzNDLE9BQU8sUUFBUSxPQUFPLENBQUM7RUFDekI7RUFDQSxJQUFJLE9BQU8sU0FBUyxZQUFZLFNBQVMsTUFBTTtJQUM3QyxJQUFJO01BQ0YsTUFBTSxXQUFXLEtBQUssU0FBUyxDQUFDO01BQ2hDLE9BQU8sUUFBUSxPQUFPLENBQUM7SUFDekIsRUFBRSxPQUFNO0lBQ04seUNBQXlDO0lBQzNDO0VBQ0Y7RUFDQSxPQUFPLFFBQVEsT0FBTyxDQUFDO0FBQ3pCO0FBRUE7Ozs7Q0FJQyxHQUNELG1DQUFtQztBQUNuQyxPQUFPLFNBQVMsUUFDZCxPQUFxQjtFQUVyQixPQUFPLGVBQWUsS0FBSyxPQUFtQixFQUFFLElBQUk7SUFDbEQsTUFBTTtJQUNOLElBQUksQ0FBQyxRQUFRLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVM7TUFDekMsTUFBTSxTQUFTLE1BQU0sVUFBVTtNQUMvQixJQUFJLFFBQVE7UUFDVixNQUFNLE9BQU8sTUFBTSxVQUFVLFFBQVE7UUFDckMsSUFBSSxNQUFNO1VBQ1IsUUFBUSxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRO1FBQ3ZDO01BQ0Y7SUFDRjtFQUNGO0FBQ0YifQ==