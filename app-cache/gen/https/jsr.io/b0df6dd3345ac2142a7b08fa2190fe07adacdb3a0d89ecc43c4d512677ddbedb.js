// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
/**
 * Provides functions for dealing with and matching ETags, including
 * {@linkcode calculate} to calculate an etag for a given entity,
 * {@linkcode ifMatch} for validating if an ETag matches against a `If-Match`
 * header and {@linkcode ifNoneMatch} for validating an Etag against an
 * `If-None-Match` header.
 *
 * See further information on the `ETag` header on
 * {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag | MDN}.
 *
 * @module
 */ import { encodeBase64 as base64Encode } from "jsr:/@std/encoding@^0.223.0/base64";
const encoder = new TextEncoder();
const DEFAULT_ALGORITHM = "SHA-256";
function isFileInfo(value) {
  return Boolean(value && typeof value === "object" && "mtime" in value && "size" in value);
}
async function calcEntity(entity, { algorithm = DEFAULT_ALGORITHM }) {
  // a short circuit for zero length entities
  if (entity.length === 0) {
    return `0-47DEQpj8HBSa+/TImW+5JCeuQeR`;
  }
  if (typeof entity === "string") {
    entity = encoder.encode(entity);
  }
  const hash = base64Encode(await crypto.subtle.digest(algorithm, entity)).substring(0, 27);
  return `${entity.length.toString(16)}-${hash}`;
}
async function calcFileInfo(fileInfo, { algorithm = DEFAULT_ALGORITHM }) {
  if (fileInfo.mtime) {
    const hash = base64Encode(await crypto.subtle.digest(algorithm, encoder.encode(fileInfo.mtime.toJSON()))).substring(0, 27);
    return `${fileInfo.size.toString(16)}-${hash}`;
  }
}
/**
 * Calculate an ETag for an entity. When the entity is a specific set of data
 * it will be fingerprinted as a "strong" tag, otherwise if it is just file
 * information, it will be calculated as a weak tag.
 *
 * ```ts
 * import { calculate } from "@std/http/etag";
 * import { assert } from "@std/assert/assert"
 *
 * const body = "hello deno!";
 *
 * const etag = await calculate(body);
 * assert(etag);
 *
 * const res = new Response(body, { headers: { etag } });
 * ```
 */ export async function calculate(entity, options = {}) {
  const weak = options.weak ?? isFileInfo(entity);
  const tag = await (isFileInfo(entity) ? calcFileInfo(entity, options) : calcEntity(entity, options));
  return tag ? weak ? `W/"${tag}"` : `"${tag}"` : undefined;
}
/** A helper function that takes the value from the `If-Match` header and a
 * calculated etag for the target. By using strong comparison, return `true` if
 * the values match, otherwise `false`.
 *
 * See MDN's [`If-Match`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-Match)
 * article for more information on how to use this function.
 *
 * ```ts
 * import {
 *   calculate,
 *   ifMatch,
 * } from "@std/http/etag";
 * import { assert } from "@std/assert/assert"
 *
 * const body = "hello deno!";
 *
 * Deno.serve(async (req) => {
 *   const ifMatchValue = req.headers.get("if-match");
 *   const etag = await calculate(body);
 *   assert(etag);
 *   if (!ifMatchValue || ifMatch(ifMatchValue, etag)) {
 *     return new Response(body, { status: 200, headers: { etag } });
 *   } else {
 *     return new Response(null, { status: 412, statusText: "Precondition Failed"});
 *   }
 * });
 * ```
 */ export function ifMatch(value, etag) {
  // Weak tags cannot be matched and return false.
  if (!value || !etag || etag.startsWith("W/")) {
    return false;
  }
  if (value.trim() === "*") {
    return true;
  }
  const tags = value.split(/\s*,\s*/);
  return tags.includes(etag);
}
/** A helper function that takes the value from the `If-None-Match` header and
 * a calculated etag for the target entity and returns `false` if the etag for
 * the entity matches the supplied value, otherwise `true`.
 *
 * See MDN's [`If-None-Match`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-None-Match)
 * article for more information on how to use this function.
 *
 * ```ts
 * import {
 *   calculate,
 *   ifNoneMatch,
 * } from "@std/http/etag";
 * import { assert } from "@std/assert/assert"
 *
 * const body = "hello deno!";
 *
 * Deno.serve(async (req) => {
 *   const ifNoneMatchValue = req.headers.get("if-none-match");
 *   const etag = await calculate(body);
 *   assert(etag);
 *   if (!ifNoneMatch(ifNoneMatchValue, etag)) {
 *     return new Response(null, { status: 304, headers: { etag } });
 *   } else {
 *     return new Response(body, { status: 200, headers: { etag } });
 *   }
 * });
 * ```
 */ export function ifNoneMatch(value, etag) {
  if (!value || !etag) {
    return true;
  }
  if (value.trim() === "*") {
    return false;
  }
  etag = etag.startsWith("W/") ? etag.slice(2) : etag;
  const tags = value.split(/\s*,\s*/).map((tag)=>tag.startsWith("W/") ? tag.slice(2) : tag);
  return !tags.includes(etag);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvaHR0cC8wLjIyMy4wL2V0YWcudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNCB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cblxuLyoqXG4gKiBQcm92aWRlcyBmdW5jdGlvbnMgZm9yIGRlYWxpbmcgd2l0aCBhbmQgbWF0Y2hpbmcgRVRhZ3MsIGluY2x1ZGluZ1xuICoge0BsaW5rY29kZSBjYWxjdWxhdGV9IHRvIGNhbGN1bGF0ZSBhbiBldGFnIGZvciBhIGdpdmVuIGVudGl0eSxcbiAqIHtAbGlua2NvZGUgaWZNYXRjaH0gZm9yIHZhbGlkYXRpbmcgaWYgYW4gRVRhZyBtYXRjaGVzIGFnYWluc3QgYSBgSWYtTWF0Y2hgXG4gKiBoZWFkZXIgYW5kIHtAbGlua2NvZGUgaWZOb25lTWF0Y2h9IGZvciB2YWxpZGF0aW5nIGFuIEV0YWcgYWdhaW5zdCBhblxuICogYElmLU5vbmUtTWF0Y2hgIGhlYWRlci5cbiAqXG4gKiBTZWUgZnVydGhlciBpbmZvcm1hdGlvbiBvbiB0aGUgYEVUYWdgIGhlYWRlciBvblxuICoge0BsaW5rIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0hUVFAvSGVhZGVycy9FVGFnIHwgTUROfS5cbiAqXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgZW5jb2RlQmFzZTY0IGFzIGJhc2U2NEVuY29kZSB9IGZyb20gXCJqc3I6L0BzdGQvZW5jb2RpbmdAXjAuMjIzLjAvYmFzZTY0XCI7XG5cbi8qKlxuICogSnVzdCB0aGUgcGFydCBvZiB7QGxpbmtjb2RlIERlbm8uRmlsZUluZm99IHRoYXQgaXMgcmVxdWlyZWQgdG8gY2FsY3VsYXRlIGFuIGBFVGFnYCxcbiAqIHNvIHBhcnRpYWwgb3IgdXNlciBnZW5lcmF0ZWQgZmlsZSBpbmZvcm1hdGlvbiBjYW4gYmUgcGFzc2VkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVJbmZvIHtcbiAgLyoqIFRoZSBsYXN0IG1vZGlmaWNhdGlvbiB0aW1lIG9mIHRoZSBmaWxlLiBUaGlzIGNvcnJlc3BvbmRzIHRvIHRoZSBgbXRpbWVgXG4gICAqIGZpZWxkIGZyb20gYHN0YXRgIG9uIExpbnV4L01hYyBPUyBhbmQgYGZ0TGFzdFdyaXRlVGltZWAgb24gV2luZG93cy4gVGhpc1xuICAgKiBtYXkgbm90IGJlIGF2YWlsYWJsZSBvbiBhbGwgcGxhdGZvcm1zLiAqL1xuICBtdGltZTogRGF0ZSB8IG51bGw7XG4gIC8qKiBUaGUgc2l6ZSBvZiB0aGUgZmlsZSwgaW4gYnl0ZXMuICovXG4gIHNpemU6IG51bWJlcjtcbn1cblxuLyoqIFJlcHJlc2VudHMgYW4gZW50aXR5IHRoYXQgY2FuIGJlIHVzZWQgZm9yIGdlbmVyYXRpbmcgYW4gRVRhZy4gKi9cbmV4cG9ydCB0eXBlIEVudGl0eSA9IHN0cmluZyB8IFVpbnQ4QXJyYXkgfCBGaWxlSW5mbztcblxuY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuXG5jb25zdCBERUZBVUxUX0FMR09SSVRITTogQWxnb3JpdGhtSWRlbnRpZmllciA9IFwiU0hBLTI1NlwiO1xuXG4vKiogT3B0aW9ucyBmb3Ige0BsaW5rY29kZSBjYWxjdWxhdGV9LiAqL1xuZXhwb3J0IGludGVyZmFjZSBFVGFnT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBBIGRpZ2VzdCBhbGdvcml0aG0gdG8gdXNlIHRvIGNhbGN1bGF0ZSB0aGUgZXRhZy5cbiAgICpcbiAgICogQGRlZmF1bHQge1wiU0hBLTI1NlwifVxuICAgKi9cbiAgYWxnb3JpdGhtPzogQWxnb3JpdGhtSWRlbnRpZmllcjtcblxuICAvKiogT3ZlcnJpZGUgdGhlIGRlZmF1bHQgYmVoYXZpb3Igb2YgY2FsY3VsYXRpbmcgdGhlIGBFVGFnYCwgZWl0aGVyIGZvcmNpbmdcbiAgICogYSB0YWcgdG8gYmUgbGFiZWxsZWQgd2VhayBvciBub3QuICovXG4gIHdlYWs/OiBib29sZWFuO1xufVxuXG5mdW5jdGlvbiBpc0ZpbGVJbmZvKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgRmlsZUluZm8ge1xuICByZXR1cm4gQm9vbGVhbihcbiAgICB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiYgXCJtdGltZVwiIGluIHZhbHVlICYmIFwic2l6ZVwiIGluIHZhbHVlLFxuICApO1xufVxuXG5hc3luYyBmdW5jdGlvbiBjYWxjRW50aXR5KFxuICBlbnRpdHk6IHN0cmluZyB8IFVpbnQ4QXJyYXksXG4gIHsgYWxnb3JpdGhtID0gREVGQVVMVF9BTEdPUklUSE0gfTogRVRhZ09wdGlvbnMsXG4pIHtcbiAgLy8gYSBzaG9ydCBjaXJjdWl0IGZvciB6ZXJvIGxlbmd0aCBlbnRpdGllc1xuICBpZiAoZW50aXR5Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBgMC00N0RFUXBqOEhCU2ErL1RJbVcrNUpDZXVRZVJgO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBlbnRpdHkgPT09IFwic3RyaW5nXCIpIHtcbiAgICBlbnRpdHkgPSBlbmNvZGVyLmVuY29kZShlbnRpdHkpO1xuICB9XG5cbiAgY29uc3QgaGFzaCA9IGJhc2U2NEVuY29kZShhd2FpdCBjcnlwdG8uc3VidGxlLmRpZ2VzdChhbGdvcml0aG0sIGVudGl0eSkpXG4gICAgLnN1YnN0cmluZygwLCAyNyk7XG5cbiAgcmV0dXJuIGAke2VudGl0eS5sZW5ndGgudG9TdHJpbmcoMTYpfS0ke2hhc2h9YDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY2FsY0ZpbGVJbmZvKFxuICBmaWxlSW5mbzogRmlsZUluZm8sXG4gIHsgYWxnb3JpdGhtID0gREVGQVVMVF9BTEdPUklUSE0gfTogRVRhZ09wdGlvbnMsXG4pIHtcbiAgaWYgKGZpbGVJbmZvLm10aW1lKSB7XG4gICAgY29uc3QgaGFzaCA9IGJhc2U2NEVuY29kZShcbiAgICAgIGF3YWl0IGNyeXB0by5zdWJ0bGUuZGlnZXN0KFxuICAgICAgICBhbGdvcml0aG0sXG4gICAgICAgIGVuY29kZXIuZW5jb2RlKGZpbGVJbmZvLm10aW1lLnRvSlNPTigpKSxcbiAgICAgICksXG4gICAgKS5zdWJzdHJpbmcoMCwgMjcpO1xuICAgIHJldHVybiBgJHtmaWxlSW5mby5zaXplLnRvU3RyaW5nKDE2KX0tJHtoYXNofWA7XG4gIH1cbn1cblxuLyoqXG4gKiBDYWxjdWxhdGUgYW4gRVRhZyBmb3IgYW4gZW50aXR5LiBXaGVuIHRoZSBlbnRpdHkgaXMgYSBzcGVjaWZpYyBzZXQgb2YgZGF0YVxuICogaXQgd2lsbCBiZSBmaW5nZXJwcmludGVkIGFzIGEgXCJzdHJvbmdcIiB0YWcsIG90aGVyd2lzZSBpZiBpdCBpcyBqdXN0IGZpbGVcbiAqIGluZm9ybWF0aW9uLCBpdCB3aWxsIGJlIGNhbGN1bGF0ZWQgYXMgYSB3ZWFrIHRhZy5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgY2FsY3VsYXRlIH0gZnJvbSBcIkBzdGQvaHR0cC9ldGFnXCI7XG4gKiBpbXBvcnQgeyBhc3NlcnQgfSBmcm9tIFwiQHN0ZC9hc3NlcnQvYXNzZXJ0XCJcbiAqXG4gKiBjb25zdCBib2R5ID0gXCJoZWxsbyBkZW5vIVwiO1xuICpcbiAqIGNvbnN0IGV0YWcgPSBhd2FpdCBjYWxjdWxhdGUoYm9keSk7XG4gKiBhc3NlcnQoZXRhZyk7XG4gKlxuICogY29uc3QgcmVzID0gbmV3IFJlc3BvbnNlKGJvZHksIHsgaGVhZGVyczogeyBldGFnIH0gfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNhbGN1bGF0ZShcbiAgZW50aXR5OiBFbnRpdHksXG4gIG9wdGlvbnM6IEVUYWdPcHRpb25zID0ge30sXG4pOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xuICBjb25zdCB3ZWFrID0gb3B0aW9ucy53ZWFrID8/IGlzRmlsZUluZm8oZW50aXR5KTtcbiAgY29uc3QgdGFnID1cbiAgICBhd2FpdCAoaXNGaWxlSW5mbyhlbnRpdHkpXG4gICAgICA/IGNhbGNGaWxlSW5mbyhlbnRpdHksIG9wdGlvbnMpXG4gICAgICA6IGNhbGNFbnRpdHkoZW50aXR5LCBvcHRpb25zKSk7XG5cbiAgcmV0dXJuIHRhZyA/IHdlYWsgPyBgVy9cIiR7dGFnfVwiYCA6IGBcIiR7dGFnfVwiYCA6IHVuZGVmaW5lZDtcbn1cblxuLyoqIEEgaGVscGVyIGZ1bmN0aW9uIHRoYXQgdGFrZXMgdGhlIHZhbHVlIGZyb20gdGhlIGBJZi1NYXRjaGAgaGVhZGVyIGFuZCBhXG4gKiBjYWxjdWxhdGVkIGV0YWcgZm9yIHRoZSB0YXJnZXQuIEJ5IHVzaW5nIHN0cm9uZyBjb21wYXJpc29uLCByZXR1cm4gYHRydWVgIGlmXG4gKiB0aGUgdmFsdWVzIG1hdGNoLCBvdGhlcndpc2UgYGZhbHNlYC5cbiAqXG4gKiBTZWUgTUROJ3MgW2BJZi1NYXRjaGBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0hUVFAvSGVhZGVycy9JZi1NYXRjaClcbiAqIGFydGljbGUgZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gaG93IHRvIHVzZSB0aGlzIGZ1bmN0aW9uLlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQge1xuICogICBjYWxjdWxhdGUsXG4gKiAgIGlmTWF0Y2gsXG4gKiB9IGZyb20gXCJAc3RkL2h0dHAvZXRhZ1wiO1xuICogaW1wb3J0IHsgYXNzZXJ0IH0gZnJvbSBcIkBzdGQvYXNzZXJ0L2Fzc2VydFwiXG4gKlxuICogY29uc3QgYm9keSA9IFwiaGVsbG8gZGVubyFcIjtcbiAqXG4gKiBEZW5vLnNlcnZlKGFzeW5jIChyZXEpID0+IHtcbiAqICAgY29uc3QgaWZNYXRjaFZhbHVlID0gcmVxLmhlYWRlcnMuZ2V0KFwiaWYtbWF0Y2hcIik7XG4gKiAgIGNvbnN0IGV0YWcgPSBhd2FpdCBjYWxjdWxhdGUoYm9keSk7XG4gKiAgIGFzc2VydChldGFnKTtcbiAqICAgaWYgKCFpZk1hdGNoVmFsdWUgfHwgaWZNYXRjaChpZk1hdGNoVmFsdWUsIGV0YWcpKSB7XG4gKiAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShib2R5LCB7IHN0YXR1czogMjAwLCBoZWFkZXJzOiB7IGV0YWcgfSB9KTtcbiAqICAgfSBlbHNlIHtcbiAqICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHsgc3RhdHVzOiA0MTIsIHN0YXR1c1RleHQ6IFwiUHJlY29uZGl0aW9uIEZhaWxlZFwifSk7XG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpZk1hdGNoKFxuICB2YWx1ZTogc3RyaW5nIHwgbnVsbCxcbiAgZXRhZzogc3RyaW5nIHwgdW5kZWZpbmVkLFxuKTogYm9vbGVhbiB7XG4gIC8vIFdlYWsgdGFncyBjYW5ub3QgYmUgbWF0Y2hlZCBhbmQgcmV0dXJuIGZhbHNlLlxuICBpZiAoIXZhbHVlIHx8ICFldGFnIHx8IGV0YWcuc3RhcnRzV2l0aChcIlcvXCIpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICh2YWx1ZS50cmltKCkgPT09IFwiKlwiKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgY29uc3QgdGFncyA9IHZhbHVlLnNwbGl0KC9cXHMqLFxccyovKTtcbiAgcmV0dXJuIHRhZ3MuaW5jbHVkZXMoZXRhZyk7XG59XG5cbi8qKiBBIGhlbHBlciBmdW5jdGlvbiB0aGF0IHRha2VzIHRoZSB2YWx1ZSBmcm9tIHRoZSBgSWYtTm9uZS1NYXRjaGAgaGVhZGVyIGFuZFxuICogYSBjYWxjdWxhdGVkIGV0YWcgZm9yIHRoZSB0YXJnZXQgZW50aXR5IGFuZCByZXR1cm5zIGBmYWxzZWAgaWYgdGhlIGV0YWcgZm9yXG4gKiB0aGUgZW50aXR5IG1hdGNoZXMgdGhlIHN1cHBsaWVkIHZhbHVlLCBvdGhlcndpc2UgYHRydWVgLlxuICpcbiAqIFNlZSBNRE4ncyBbYElmLU5vbmUtTWF0Y2hgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9IVFRQL0hlYWRlcnMvSWYtTm9uZS1NYXRjaClcbiAqIGFydGljbGUgZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gaG93IHRvIHVzZSB0aGlzIGZ1bmN0aW9uLlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQge1xuICogICBjYWxjdWxhdGUsXG4gKiAgIGlmTm9uZU1hdGNoLFxuICogfSBmcm9tIFwiQHN0ZC9odHRwL2V0YWdcIjtcbiAqIGltcG9ydCB7IGFzc2VydCB9IGZyb20gXCJAc3RkL2Fzc2VydC9hc3NlcnRcIlxuICpcbiAqIGNvbnN0IGJvZHkgPSBcImhlbGxvIGRlbm8hXCI7XG4gKlxuICogRGVuby5zZXJ2ZShhc3luYyAocmVxKSA9PiB7XG4gKiAgIGNvbnN0IGlmTm9uZU1hdGNoVmFsdWUgPSByZXEuaGVhZGVycy5nZXQoXCJpZi1ub25lLW1hdGNoXCIpO1xuICogICBjb25zdCBldGFnID0gYXdhaXQgY2FsY3VsYXRlKGJvZHkpO1xuICogICBhc3NlcnQoZXRhZyk7XG4gKiAgIGlmICghaWZOb25lTWF0Y2goaWZOb25lTWF0Y2hWYWx1ZSwgZXRhZykpIHtcbiAqICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHsgc3RhdHVzOiAzMDQsIGhlYWRlcnM6IHsgZXRhZyB9IH0pO1xuICogICB9IGVsc2Uge1xuICogICAgIHJldHVybiBuZXcgUmVzcG9uc2UoYm9keSwgeyBzdGF0dXM6IDIwMCwgaGVhZGVyczogeyBldGFnIH0gfSk7XG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpZk5vbmVNYXRjaChcbiAgdmFsdWU6IHN0cmluZyB8IG51bGwsXG4gIGV0YWc6IHN0cmluZyB8IHVuZGVmaW5lZCxcbik6IGJvb2xlYW4ge1xuICBpZiAoIXZhbHVlIHx8ICFldGFnKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgaWYgKHZhbHVlLnRyaW0oKSA9PT0gXCIqXCIpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgZXRhZyA9IGV0YWcuc3RhcnRzV2l0aChcIlcvXCIpID8gZXRhZy5zbGljZSgyKSA6IGV0YWc7XG4gIGNvbnN0IHRhZ3MgPSB2YWx1ZS5zcGxpdCgvXFxzKixcXHMqLykubWFwKCh0YWcpID0+XG4gICAgdGFnLnN0YXJ0c1dpdGgoXCJXL1wiKSA/IHRhZy5zbGljZSgyKSA6IHRhZ1xuICApO1xuICByZXR1cm4gIXRhZ3MuaW5jbHVkZXMoZXRhZyk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFLHFDQUFxQztBQUVyQzs7Ozs7Ozs7Ozs7Q0FXQyxHQUVELFNBQVMsZ0JBQWdCLFlBQVksUUFBUSxxQ0FBcUM7QUFrQmxGLE1BQU0sVUFBVSxJQUFJO0FBRXBCLE1BQU0sb0JBQXlDO0FBZ0IvQyxTQUFTLFdBQVcsS0FBYztFQUNoQyxPQUFPLFFBQ0wsU0FBUyxPQUFPLFVBQVUsWUFBWSxXQUFXLFNBQVMsVUFBVTtBQUV4RTtBQUVBLGVBQWUsV0FDYixNQUEyQixFQUMzQixFQUFFLFlBQVksaUJBQWlCLEVBQWU7RUFFOUMsMkNBQTJDO0VBQzNDLElBQUksT0FBTyxNQUFNLEtBQUssR0FBRztJQUN2QixPQUFPLENBQUMsNkJBQTZCLENBQUM7RUFDeEM7RUFFQSxJQUFJLE9BQU8sV0FBVyxVQUFVO0lBQzlCLFNBQVMsUUFBUSxNQUFNLENBQUM7RUFDMUI7RUFFQSxNQUFNLE9BQU8sYUFBYSxNQUFNLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLFNBQzdELFNBQVMsQ0FBQyxHQUFHO0VBRWhCLE9BQU8sQ0FBQyxFQUFFLE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUM7QUFDaEQ7QUFFQSxlQUFlLGFBQ2IsUUFBa0IsRUFDbEIsRUFBRSxZQUFZLGlCQUFpQixFQUFlO0VBRTlDLElBQUksU0FBUyxLQUFLLEVBQUU7SUFDbEIsTUFBTSxPQUFPLGFBQ1gsTUFBTSxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQ3hCLFdBQ0EsUUFBUSxNQUFNLENBQUMsU0FBUyxLQUFLLENBQUMsTUFBTSxNQUV0QyxTQUFTLENBQUMsR0FBRztJQUNmLE9BQU8sQ0FBQyxFQUFFLFNBQVMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUM7RUFDaEQ7QUFDRjtBQUVBOzs7Ozs7Ozs7Ozs7Ozs7O0NBZ0JDLEdBQ0QsT0FBTyxlQUFlLFVBQ3BCLE1BQWMsRUFDZCxVQUF1QixDQUFDLENBQUM7RUFFekIsTUFBTSxPQUFPLFFBQVEsSUFBSSxJQUFJLFdBQVc7RUFDeEMsTUFBTSxNQUNKLE1BQU0sQ0FBQyxXQUFXLFVBQ2QsYUFBYSxRQUFRLFdBQ3JCLFdBQVcsUUFBUSxRQUFRO0VBRWpDLE9BQU8sTUFBTSxPQUFPLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRztBQUNsRDtBQUVBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0EyQkMsR0FDRCxPQUFPLFNBQVMsUUFDZCxLQUFvQixFQUNwQixJQUF3QjtFQUV4QixnREFBZ0Q7RUFDaEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEtBQUssVUFBVSxDQUFDLE9BQU87SUFDNUMsT0FBTztFQUNUO0VBQ0EsSUFBSSxNQUFNLElBQUksT0FBTyxLQUFLO0lBQ3hCLE9BQU87RUFDVDtFQUNBLE1BQU0sT0FBTyxNQUFNLEtBQUssQ0FBQztFQUN6QixPQUFPLEtBQUssUUFBUSxDQUFDO0FBQ3ZCO0FBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQTJCQyxHQUNELE9BQU8sU0FBUyxZQUNkLEtBQW9CLEVBQ3BCLElBQXdCO0VBRXhCLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTTtJQUNuQixPQUFPO0VBQ1Q7RUFDQSxJQUFJLE1BQU0sSUFBSSxPQUFPLEtBQUs7SUFDeEIsT0FBTztFQUNUO0VBQ0EsT0FBTyxLQUFLLFVBQVUsQ0FBQyxRQUFRLEtBQUssS0FBSyxDQUFDLEtBQUs7RUFDL0MsTUFBTSxPQUFPLE1BQU0sS0FBSyxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsTUFDdkMsSUFBSSxVQUFVLENBQUMsUUFBUSxJQUFJLEtBQUssQ0FBQyxLQUFLO0VBRXhDLE9BQU8sQ0FBQyxLQUFLLFFBQVEsQ0FBQztBQUN4QiJ9