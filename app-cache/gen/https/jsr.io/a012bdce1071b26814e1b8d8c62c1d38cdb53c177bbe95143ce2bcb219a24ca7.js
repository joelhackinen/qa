// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import { consumeMediaParam, decode2331Encoding } from "./_util.ts";
/**
 * Parses the media type and any optional parameters, per
 * {@link https://datatracker.ietf.org/doc/html/rfc1521 | RFC 1521}. Media
 * types are the values in `Content-Type` and `Content-Disposition` headers. On
 * success the function returns a tuple where the first element is the media
 * type and the second element is the optional parameters or `undefined` if
 * there are none.
 *
 * The function will throw if the parsed value is invalid.
 *
 * The returned media type will be normalized to be lower case, and returned
 * params keys will be normalized to lower case, but preserves the casing of
 * the value.
 *
 * @example
 * ```ts
 * import { parseMediaType } from "@std/media-types/parse-media-type";
 *
 * parseMediaType("application/JSON"); // ["application/json", undefined]
 * parseMediaType("text/html; charset=UTF-8"); // ["text/html", { charset: "UTF-8" }]
 * ```
 */ export function parseMediaType(v) {
  const [base] = v.split(";");
  const mediaType = base.toLowerCase().trim();
  const params = {};
  // Map of base parameter name -> parameter name -> value
  // for parameters containing a '*' character.
  const continuation = new Map();
  v = v.slice(base.length);
  while(v.length){
    v = v.trimStart();
    if (v.length === 0) {
      break;
    }
    const [key, value, rest] = consumeMediaParam(v);
    if (!key) {
      if (rest.trim() === ";") {
        break;
      }
      throw new TypeError("Invalid media parameter.");
    }
    let pmap = params;
    const [baseName, rest2] = key.split("*");
    if (baseName && rest2 !== undefined) {
      if (!continuation.has(baseName)) {
        continuation.set(baseName, {});
      }
      pmap = continuation.get(baseName);
    }
    if (key in pmap) {
      throw new TypeError("Duplicate key parsed.");
    }
    pmap[key] = value;
    v = rest;
  }
  // Stitch together any continuations or things with stars
  // (i.e. RFC 2231 things with stars: "foo*0" or "foo*")
  let str = "";
  for (const [key, pieceMap] of continuation){
    const singlePartKey = `${key}*`;
    const v = pieceMap[singlePartKey];
    if (v) {
      const decv = decode2331Encoding(v);
      if (decv) {
        params[key] = decv;
      }
      continue;
    }
    str = "";
    let valid = false;
    for(let n = 0;; n++){
      const simplePart = `${key}*${n}`;
      let v = pieceMap[simplePart];
      if (v) {
        valid = true;
        str += v;
        continue;
      }
      const encodedPart = `${simplePart}*`;
      v = pieceMap[encodedPart];
      if (!v) {
        break;
      }
      valid = true;
      if (n === 0) {
        const decv = decode2331Encoding(v);
        if (decv) {
          str += decv;
        }
      } else {
        const decv = decodeURI(v);
        str += decv;
      }
    }
    if (valid) {
      params[key] = str;
    }
  }
  return Object.keys(params).length ? [
    mediaType,
    params
  ] : [
    mediaType,
    undefined
  ];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvbWVkaWEtdHlwZXMvMC4yMjMuMC9wYXJzZV9tZWRpYV90eXBlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjQgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG4vLyBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG5cbmltcG9ydCB7IGNvbnN1bWVNZWRpYVBhcmFtLCBkZWNvZGUyMzMxRW5jb2RpbmcgfSBmcm9tIFwiLi9fdXRpbC50c1wiO1xuXG4vKipcbiAqIFBhcnNlcyB0aGUgbWVkaWEgdHlwZSBhbmQgYW55IG9wdGlvbmFsIHBhcmFtZXRlcnMsIHBlclxuICoge0BsaW5rIGh0dHBzOi8vZGF0YXRyYWNrZXIuaWV0Zi5vcmcvZG9jL2h0bWwvcmZjMTUyMSB8IFJGQyAxNTIxfS4gTWVkaWFcbiAqIHR5cGVzIGFyZSB0aGUgdmFsdWVzIGluIGBDb250ZW50LVR5cGVgIGFuZCBgQ29udGVudC1EaXNwb3NpdGlvbmAgaGVhZGVycy4gT25cbiAqIHN1Y2Nlc3MgdGhlIGZ1bmN0aW9uIHJldHVybnMgYSB0dXBsZSB3aGVyZSB0aGUgZmlyc3QgZWxlbWVudCBpcyB0aGUgbWVkaWFcbiAqIHR5cGUgYW5kIHRoZSBzZWNvbmQgZWxlbWVudCBpcyB0aGUgb3B0aW9uYWwgcGFyYW1ldGVycyBvciBgdW5kZWZpbmVkYCBpZlxuICogdGhlcmUgYXJlIG5vbmUuXG4gKlxuICogVGhlIGZ1bmN0aW9uIHdpbGwgdGhyb3cgaWYgdGhlIHBhcnNlZCB2YWx1ZSBpcyBpbnZhbGlkLlxuICpcbiAqIFRoZSByZXR1cm5lZCBtZWRpYSB0eXBlIHdpbGwgYmUgbm9ybWFsaXplZCB0byBiZSBsb3dlciBjYXNlLCBhbmQgcmV0dXJuZWRcbiAqIHBhcmFtcyBrZXlzIHdpbGwgYmUgbm9ybWFsaXplZCB0byBsb3dlciBjYXNlLCBidXQgcHJlc2VydmVzIHRoZSBjYXNpbmcgb2ZcbiAqIHRoZSB2YWx1ZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IHBhcnNlTWVkaWFUeXBlIH0gZnJvbSBcIkBzdGQvbWVkaWEtdHlwZXMvcGFyc2UtbWVkaWEtdHlwZVwiO1xuICpcbiAqIHBhcnNlTWVkaWFUeXBlKFwiYXBwbGljYXRpb24vSlNPTlwiKTsgLy8gW1wiYXBwbGljYXRpb24vanNvblwiLCB1bmRlZmluZWRdXG4gKiBwYXJzZU1lZGlhVHlwZShcInRleHQvaHRtbDsgY2hhcnNldD1VVEYtOFwiKTsgLy8gW1widGV4dC9odG1sXCIsIHsgY2hhcnNldDogXCJVVEYtOFwiIH1dXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTWVkaWFUeXBlKFxuICB2OiBzdHJpbmcsXG4pOiBbbWVkaWFUeXBlOiBzdHJpbmcsIHBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiB8IHVuZGVmaW5lZF0ge1xuICBjb25zdCBbYmFzZV0gPSB2LnNwbGl0KFwiO1wiKSBhcyBbc3RyaW5nXTtcbiAgY29uc3QgbWVkaWFUeXBlID0gYmFzZS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcblxuICBjb25zdCBwYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgLy8gTWFwIG9mIGJhc2UgcGFyYW1ldGVyIG5hbWUgLT4gcGFyYW1ldGVyIG5hbWUgLT4gdmFsdWVcbiAgLy8gZm9yIHBhcmFtZXRlcnMgY29udGFpbmluZyBhICcqJyBjaGFyYWN0ZXIuXG4gIGNvbnN0IGNvbnRpbnVhdGlvbiA9IG5ldyBNYXA8c3RyaW5nLCBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PigpO1xuXG4gIHYgPSB2LnNsaWNlKGJhc2UubGVuZ3RoKTtcbiAgd2hpbGUgKHYubGVuZ3RoKSB7XG4gICAgdiA9IHYudHJpbVN0YXJ0KCk7XG4gICAgaWYgKHYubGVuZ3RoID09PSAwKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY29uc3QgW2tleSwgdmFsdWUsIHJlc3RdID0gY29uc3VtZU1lZGlhUGFyYW0odik7XG4gICAgaWYgKCFrZXkpIHtcbiAgICAgIGlmIChyZXN0LnRyaW0oKSA9PT0gXCI7XCIpIHtcbiAgICAgICAgLy8gaWdub3JlIHRyYWlsaW5nIHNlbWljb2xvbnNcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBtZWRpYSBwYXJhbWV0ZXIuXCIpO1xuICAgIH1cblxuICAgIGxldCBwbWFwID0gcGFyYW1zO1xuICAgIGNvbnN0IFtiYXNlTmFtZSwgcmVzdDJdID0ga2V5LnNwbGl0KFwiKlwiKTtcbiAgICBpZiAoYmFzZU5hbWUgJiYgcmVzdDIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKCFjb250aW51YXRpb24uaGFzKGJhc2VOYW1lKSkge1xuICAgICAgICBjb250aW51YXRpb24uc2V0KGJhc2VOYW1lLCB7fSk7XG4gICAgICB9XG4gICAgICBwbWFwID0gY29udGludWF0aW9uLmdldChiYXNlTmFtZSkhO1xuICAgIH1cbiAgICBpZiAoa2V5IGluIHBtYXApIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJEdXBsaWNhdGUga2V5IHBhcnNlZC5cIik7XG4gICAgfVxuICAgIHBtYXBba2V5XSA9IHZhbHVlO1xuICAgIHYgPSByZXN0O1xuICB9XG5cbiAgLy8gU3RpdGNoIHRvZ2V0aGVyIGFueSBjb250aW51YXRpb25zIG9yIHRoaW5ncyB3aXRoIHN0YXJzXG4gIC8vIChpLmUuIFJGQyAyMjMxIHRoaW5ncyB3aXRoIHN0YXJzOiBcImZvbyowXCIgb3IgXCJmb28qXCIpXG4gIGxldCBzdHIgPSBcIlwiO1xuICBmb3IgKGNvbnN0IFtrZXksIHBpZWNlTWFwXSBvZiBjb250aW51YXRpb24pIHtcbiAgICBjb25zdCBzaW5nbGVQYXJ0S2V5ID0gYCR7a2V5fSpgO1xuICAgIGNvbnN0IHYgPSBwaWVjZU1hcFtzaW5nbGVQYXJ0S2V5XTtcbiAgICBpZiAodikge1xuICAgICAgY29uc3QgZGVjdiA9IGRlY29kZTIzMzFFbmNvZGluZyh2KTtcbiAgICAgIGlmIChkZWN2KSB7XG4gICAgICAgIHBhcmFtc1trZXldID0gZGVjdjtcbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHN0ciA9IFwiXCI7XG4gICAgbGV0IHZhbGlkID0gZmFsc2U7XG4gICAgZm9yIChsZXQgbiA9IDA7OyBuKyspIHtcbiAgICAgIGNvbnN0IHNpbXBsZVBhcnQgPSBgJHtrZXl9KiR7bn1gO1xuICAgICAgbGV0IHYgPSBwaWVjZU1hcFtzaW1wbGVQYXJ0XTtcbiAgICAgIGlmICh2KSB7XG4gICAgICAgIHZhbGlkID0gdHJ1ZTtcbiAgICAgICAgc3RyICs9IHY7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgZW5jb2RlZFBhcnQgPSBgJHtzaW1wbGVQYXJ0fSpgO1xuICAgICAgdiA9IHBpZWNlTWFwW2VuY29kZWRQYXJ0XTtcbiAgICAgIGlmICghdikge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHZhbGlkID0gdHJ1ZTtcbiAgICAgIGlmIChuID09PSAwKSB7XG4gICAgICAgIGNvbnN0IGRlY3YgPSBkZWNvZGUyMzMxRW5jb2Rpbmcodik7XG4gICAgICAgIGlmIChkZWN2KSB7XG4gICAgICAgICAgc3RyICs9IGRlY3Y7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGRlY3YgPSBkZWNvZGVVUkkodik7XG4gICAgICAgIHN0ciArPSBkZWN2O1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodmFsaWQpIHtcbiAgICAgIHBhcmFtc1trZXldID0gc3RyO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBPYmplY3Qua2V5cyhwYXJhbXMpLmxlbmd0aFxuICAgID8gW21lZGlhVHlwZSwgcGFyYW1zXVxuICAgIDogW21lZGlhVHlwZSwgdW5kZWZpbmVkXTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFB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