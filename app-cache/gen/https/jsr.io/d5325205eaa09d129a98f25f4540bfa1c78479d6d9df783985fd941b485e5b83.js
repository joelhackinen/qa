// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import { isIterator, isToken, needsEncoding } from "./_util.ts";
/** Serializes the media type and the optional parameters as a media type
 * conforming to RFC 2045 and RFC 2616.
 *
 * The type and parameter names are written in lower-case.
 *
 * When any of the arguments results in a standard violation then the return
 * value will be an empty string (`""`).
 *
 * @example
 * ```ts
 * import { formatMediaType } from "@std/media-types/format-media-type";
 *
 * formatMediaType("text/plain", { charset: "UTF-8" }); // "text/plain; charset=UTF-8"
 * ```
 */ export function formatMediaType(type, param) {
  let b = "";
  const [major = "", sub] = type.split("/");
  if (!sub) {
    if (!isToken(type)) {
      return "";
    }
    b += type.toLowerCase();
  } else {
    if (!isToken(major) || !isToken(sub)) {
      return "";
    }
    b += `${major.toLowerCase()}/${sub.toLowerCase()}`;
  }
  if (param) {
    param = isIterator(param) ? Object.fromEntries(param) : param;
    const attrs = Object.keys(param);
    attrs.sort();
    for (const attribute of attrs){
      if (!isToken(attribute)) {
        return "";
      }
      const value = param[attribute];
      b += `; ${attribute.toLowerCase()}`;
      const needEnc = needsEncoding(value);
      if (needEnc) {
        b += "*";
      }
      b += "=";
      if (needEnc) {
        b += `utf-8''${encodeURIComponent(value)}`;
        continue;
      }
      if (isToken(value)) {
        b += value;
        continue;
      }
      b += `"${value.replace(/["\\]/gi, (m)=>`\\${m}`)}"`;
    }
  }
  return b;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvbWVkaWEtdHlwZXMvMC4yMjMuMC9mb3JtYXRfbWVkaWFfdHlwZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI0IHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG5pbXBvcnQgeyBpc0l0ZXJhdG9yLCBpc1Rva2VuLCBuZWVkc0VuY29kaW5nIH0gZnJvbSBcIi4vX3V0aWwudHNcIjtcblxuLyoqIFNlcmlhbGl6ZXMgdGhlIG1lZGlhIHR5cGUgYW5kIHRoZSBvcHRpb25hbCBwYXJhbWV0ZXJzIGFzIGEgbWVkaWEgdHlwZVxuICogY29uZm9ybWluZyB0byBSRkMgMjA0NSBhbmQgUkZDIDI2MTYuXG4gKlxuICogVGhlIHR5cGUgYW5kIHBhcmFtZXRlciBuYW1lcyBhcmUgd3JpdHRlbiBpbiBsb3dlci1jYXNlLlxuICpcbiAqIFdoZW4gYW55IG9mIHRoZSBhcmd1bWVudHMgcmVzdWx0cyBpbiBhIHN0YW5kYXJkIHZpb2xhdGlvbiB0aGVuIHRoZSByZXR1cm5cbiAqIHZhbHVlIHdpbGwgYmUgYW4gZW1wdHkgc3RyaW5nIChgXCJcImApLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgZm9ybWF0TWVkaWFUeXBlIH0gZnJvbSBcIkBzdGQvbWVkaWEtdHlwZXMvZm9ybWF0LW1lZGlhLXR5cGVcIjtcbiAqXG4gKiBmb3JtYXRNZWRpYVR5cGUoXCJ0ZXh0L3BsYWluXCIsIHsgY2hhcnNldDogXCJVVEYtOFwiIH0pOyAvLyBcInRleHQvcGxhaW47IGNoYXJzZXQ9VVRGLThcIlxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRNZWRpYVR5cGUoXG4gIHR5cGU6IHN0cmluZyxcbiAgcGFyYW0/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHwgSXRlcmFibGU8W3N0cmluZywgc3RyaW5nXT4sXG4pOiBzdHJpbmcge1xuICBsZXQgYiA9IFwiXCI7XG4gIGNvbnN0IFttYWpvciA9IFwiXCIsIHN1Yl0gPSB0eXBlLnNwbGl0KFwiL1wiKTtcbiAgaWYgKCFzdWIpIHtcbiAgICBpZiAoIWlzVG9rZW4odHlwZSkpIHtcbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cbiAgICBiICs9IHR5cGUudG9Mb3dlckNhc2UoKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAoIWlzVG9rZW4obWFqb3IpIHx8ICFpc1Rva2VuKHN1YikpIHtcbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cbiAgICBiICs9IGAke21ham9yLnRvTG93ZXJDYXNlKCl9LyR7c3ViLnRvTG93ZXJDYXNlKCl9YDtcbiAgfVxuXG4gIGlmIChwYXJhbSkge1xuICAgIHBhcmFtID0gaXNJdGVyYXRvcihwYXJhbSkgPyBPYmplY3QuZnJvbUVudHJpZXMocGFyYW0pIDogcGFyYW07XG4gICAgY29uc3QgYXR0cnMgPSBPYmplY3Qua2V5cyhwYXJhbSk7XG4gICAgYXR0cnMuc29ydCgpO1xuXG4gICAgZm9yIChjb25zdCBhdHRyaWJ1dGUgb2YgYXR0cnMpIHtcbiAgICAgIGlmICghaXNUb2tlbihhdHRyaWJ1dGUpKSB7XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgfVxuICAgICAgY29uc3QgdmFsdWUgPSBwYXJhbVthdHRyaWJ1dGVdITtcbiAgICAgIGIgKz0gYDsgJHthdHRyaWJ1dGUudG9Mb3dlckNhc2UoKX1gO1xuXG4gICAgICBjb25zdCBuZWVkRW5jID0gbmVlZHNFbmNvZGluZyh2YWx1ZSk7XG4gICAgICBpZiAobmVlZEVuYykge1xuICAgICAgICBiICs9IFwiKlwiO1xuICAgICAgfVxuICAgICAgYiArPSBcIj1cIjtcblxuICAgICAgaWYgKG5lZWRFbmMpIHtcbiAgICAgICAgYiArPSBgdXRmLTgnJyR7ZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKX1gO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzVG9rZW4odmFsdWUpKSB7XG4gICAgICAgIGIgKz0gdmFsdWU7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgYiArPSBgXCIke3ZhbHVlLnJlcGxhY2UoL1tcIlxcXFxdL2dpLCAobSkgPT4gYFxcXFwke219YCl9XCJgO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYjtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUscUNBQXFDO0FBRXJDLFNBQVMsVUFBVSxFQUFFLE9BQU8sRUFBRSxhQUFhLFFBQVEsYUFBYTtBQUVoRTs7Ozs7Ozs7Ozs7Ozs7Q0FjQyxHQUNELE9BQU8sU0FBUyxnQkFDZCxJQUFZLEVBQ1osS0FBMkQ7RUFFM0QsSUFBSSxJQUFJO0VBQ1IsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksR0FBRyxLQUFLLEtBQUssQ0FBQztFQUNyQyxJQUFJLENBQUMsS0FBSztJQUNSLElBQUksQ0FBQyxRQUFRLE9BQU87TUFDbEIsT0FBTztJQUNUO0lBQ0EsS0FBSyxLQUFLLFdBQVc7RUFDdkIsT0FBTztJQUNMLElBQUksQ0FBQyxRQUFRLFVBQVUsQ0FBQyxRQUFRLE1BQU07TUFDcEMsT0FBTztJQUNUO0lBQ0EsS0FBSyxDQUFDLEVBQUUsTUFBTSxXQUFXLEdBQUcsQ0FBQyxFQUFFLElBQUksV0FBVyxHQUFHLENBQUM7RUFDcEQ7RUFFQSxJQUFJLE9BQU87SUFDVCxRQUFRLFdBQVcsU0FBUyxPQUFPLFdBQVcsQ0FBQyxTQUFTO0lBQ3hELE1BQU0sUUFBUSxPQUFPLElBQUksQ0FBQztJQUMxQixNQUFNLElBQUk7SUFFVixLQUFLLE1BQU0sYUFBYSxNQUFPO01BQzdCLElBQUksQ0FBQyxRQUFRLFlBQVk7UUFDdkIsT0FBTztNQUNUO01BQ0EsTUFBTSxRQUFRLEtBQUssQ0FBQyxVQUFVO01BQzlCLEtBQUssQ0FBQyxFQUFFLEVBQUUsVUFBVSxXQUFXLEdBQUcsQ0FBQztNQUVuQyxNQUFNLFVBQVUsY0FBYztNQUM5QixJQUFJLFNBQVM7UUFDWCxLQUFLO01BQ1A7TUFDQSxLQUFLO01BRUwsSUFBSSxTQUFTO1FBQ1gsS0FBSyxDQUFDLE9BQU8sRUFBRSxtQkFBbUIsT0FBTyxDQUFDO1FBQzFDO01BQ0Y7TUFFQSxJQUFJLFFBQVEsUUFBUTtRQUNsQixLQUFLO1FBQ0w7TUFDRjtNQUNBLEtBQUssQ0FBQyxDQUFDLEVBQUUsTUFBTSxPQUFPLENBQUMsV0FBVyxDQUFDLElBQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZEO0VBQ0Y7RUFDQSxPQUFPO0FBQ1QifQ==