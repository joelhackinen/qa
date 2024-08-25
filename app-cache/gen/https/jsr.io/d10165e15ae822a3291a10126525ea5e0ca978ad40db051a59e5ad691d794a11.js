// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import { parseMediaType } from "./parse_media_type.ts";
import { db } from "./_db.ts";
/**
 * Given a media type or header value, identify the encoding charset. If the
 * charset cannot be determined, the function returns `undefined`.
 *
 * @example
 * ```ts
 * import { getCharset } from "@std/media-types/get-charset";
 *
 * getCharset("text/plain"); // "UTF-8"
 * getCharset("application/foo"); // undefined
 * getCharset("application/news-checkgroups"); // "US-ASCII"
 * getCharset("application/news-checkgroups; charset=UTF-8"); // "UTF-8"
 * ```
 */ export function getCharset(type) {
  try {
    const [mediaType, params] = parseMediaType(type);
    if (params && params["charset"]) {
      return params["charset"];
    }
    const entry = db[mediaType];
    if (entry && entry.charset) {
      return entry.charset;
    }
    if (mediaType.startsWith("text/")) {
      return "UTF-8";
    }
  } catch  {
  // just swallow errors, returning undefined
  }
  return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvbWVkaWEtdHlwZXMvMC4yMjMuMC9nZXRfY2hhcnNldC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI0IHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG5pbXBvcnQgeyBwYXJzZU1lZGlhVHlwZSB9IGZyb20gXCIuL3BhcnNlX21lZGlhX3R5cGUudHNcIjtcbmltcG9ydCB0eXBlIHsgREJFbnRyeSB9IGZyb20gXCIuL191dGlsLnRzXCI7XG5pbXBvcnQgeyBkYiwgdHlwZSBLZXlPZkRiIH0gZnJvbSBcIi4vX2RiLnRzXCI7XG5cbi8qKlxuICogR2l2ZW4gYSBtZWRpYSB0eXBlIG9yIGhlYWRlciB2YWx1ZSwgaWRlbnRpZnkgdGhlIGVuY29kaW5nIGNoYXJzZXQuIElmIHRoZVxuICogY2hhcnNldCBjYW5ub3QgYmUgZGV0ZXJtaW5lZCwgdGhlIGZ1bmN0aW9uIHJldHVybnMgYHVuZGVmaW5lZGAuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBnZXRDaGFyc2V0IH0gZnJvbSBcIkBzdGQvbWVkaWEtdHlwZXMvZ2V0LWNoYXJzZXRcIjtcbiAqXG4gKiBnZXRDaGFyc2V0KFwidGV4dC9wbGFpblwiKTsgLy8gXCJVVEYtOFwiXG4gKiBnZXRDaGFyc2V0KFwiYXBwbGljYXRpb24vZm9vXCIpOyAvLyB1bmRlZmluZWRcbiAqIGdldENoYXJzZXQoXCJhcHBsaWNhdGlvbi9uZXdzLWNoZWNrZ3JvdXBzXCIpOyAvLyBcIlVTLUFTQ0lJXCJcbiAqIGdldENoYXJzZXQoXCJhcHBsaWNhdGlvbi9uZXdzLWNoZWNrZ3JvdXBzOyBjaGFyc2V0PVVURi04XCIpOyAvLyBcIlVURi04XCJcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2hhcnNldCh0eXBlOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICB0cnkge1xuICAgIGNvbnN0IFttZWRpYVR5cGUsIHBhcmFtc10gPSBwYXJzZU1lZGlhVHlwZSh0eXBlKTtcbiAgICBpZiAocGFyYW1zICYmIHBhcmFtc1tcImNoYXJzZXRcIl0pIHtcbiAgICAgIHJldHVybiBwYXJhbXNbXCJjaGFyc2V0XCJdO1xuICAgIH1cbiAgICBjb25zdCBlbnRyeSA9IGRiW21lZGlhVHlwZSBhcyBLZXlPZkRiXSBhcyBEQkVudHJ5O1xuICAgIGlmIChlbnRyeSAmJiBlbnRyeS5jaGFyc2V0KSB7XG4gICAgICByZXR1cm4gZW50cnkuY2hhcnNldDtcbiAgICB9XG4gICAgaWYgKG1lZGlhVHlwZS5zdGFydHNXaXRoKFwidGV4dC9cIikpIHtcbiAgICAgIHJldHVybiBcIlVURi04XCI7XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyBqdXN0IHN3YWxsb3cgZXJyb3JzLCByZXR1cm5pbmcgdW5kZWZpbmVkXG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUscUNBQXFDO0FBRXJDLFNBQVMsY0FBYyxRQUFRLHdCQUF3QjtBQUV2RCxTQUFTLEVBQUUsUUFBc0IsV0FBVztBQUU1Qzs7Ozs7Ozs7Ozs7OztDQWFDLEdBQ0QsT0FBTyxTQUFTLFdBQVcsSUFBWTtFQUNyQyxJQUFJO0lBQ0YsTUFBTSxDQUFDLFdBQVcsT0FBTyxHQUFHLGVBQWU7SUFDM0MsSUFBSSxVQUFVLE1BQU0sQ0FBQyxVQUFVLEVBQUU7TUFDL0IsT0FBTyxNQUFNLENBQUMsVUFBVTtJQUMxQjtJQUNBLE1BQU0sUUFBUSxFQUFFLENBQUMsVUFBcUI7SUFDdEMsSUFBSSxTQUFTLE1BQU0sT0FBTyxFQUFFO01BQzFCLE9BQU8sTUFBTSxPQUFPO0lBQ3RCO0lBQ0EsSUFBSSxVQUFVLFVBQVUsQ0FBQyxVQUFVO01BQ2pDLE9BQU87SUFDVDtFQUNGLEVBQUUsT0FBTTtFQUNOLDJDQUEyQztFQUM3QztFQUNBLE9BQU87QUFDVCJ9