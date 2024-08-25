// Copyright 2018-2024 the oak authors. All rights reserved. MIT license.
// deno-lint-ignore-file no-irregular-whitespace
/**
 * Several APIs designed for processing of media types in request bodies.
 *
 * `MediaType`, `parse()` and `format()` are inspired media-typer at
 * https://github.com/jshttp/media-typer/ which is licensed as follows:
 *
 * Copyright(c) 2014-2017 Douglas Christopher Wilson
 *
 * MIT License
 *
 * `matches()` is inspired by type-is at https://github.com/jshttp/type-is/
 * which is licensed as follows:
 *
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 *
 * MIT License
 *
 * @module
 */ import { typeByExtension } from "jsr:@std/media-types@0.224/type-by-extension";
const SUBTYPE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9!#$&^_.-]{0,126}$/;
const TYPE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126}$/;
const TYPE_RE = /^ *([A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126})\/([A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}) *$/;
function mediaTypeMatch(expected, actual) {
  if (!expected) {
    return false;
  }
  const actualParts = actual.split("/");
  const expectedParts = expected.split("/");
  if (actualParts.length !== 2 || expectedParts.length !== 2) {
    return false;
  }
  const [actualType, actualSubtype] = actualParts;
  const [expectedType, expectedSubtype] = expectedParts;
  if (expectedType !== "*" && expectedType !== actualType) {
    return false;
  }
  if (expectedSubtype.substring(0, 2) === "*+") {
    return expectedSubtype.length <= actualSubtype.length + 1 && expectedSubtype.substring(1) === actualSubtype.substring(actualSubtype.length + 1 - expectedSubtype.length);
  }
  if (expectedSubtype !== "*" && expectedSubtype !== actualSubtype) {
    return false;
  }
  return true;
}
function normalize(mediaType) {
  if (mediaType === "urlencoded") {
    return "application/x-www-form-urlencoded";
  }
  if (mediaType === "multipart") {
    return "multipart/*";
  }
  if (mediaType.startsWith("+")) {
    return `*/*${mediaType}`;
  }
  return mediaType.includes("/") ? mediaType : typeByExtension(mediaType);
}
function normalizeType(value) {
  try {
    const [type] = value.split(/\s*;/);
    const mediaType = MediaType.parse(type);
    return mediaType.toString();
  } catch  {
    return undefined;
  }
}
/** A class which encapsulates the information in a media type, allowing
 * inspecting of modifying individual parts of the media type. */ export class MediaType {
  #subtype;
  #suffix;
  #type;
  /** Create an instance of {@linkcode MediaType} by providing the components
   * of `type`, `subtype` and optionally a `suffix`. */ constructor(type, subtype, suffix){
    this.type = type;
    this.subtype = subtype;
    if (suffix) {
      this.suffix = suffix;
    }
  }
  /** The subtype of the media type. */ set subtype(value) {
    if (!SUBTYPE_NAME_RE.test(value)) {
      throw new TypeError("Invalid subtype.");
    }
    this.#subtype = value;
  }
  /** The subtype of the media type. */ get subtype() {
    return this.#subtype;
  }
  /** The optional suffix of the media type. */ set suffix(value) {
    if (value && !TYPE_NAME_RE.test(value)) {
      throw new TypeError("Invalid suffix.");
    }
    this.#suffix = value;
  }
  /** The optional suffix of the media type. */ get suffix() {
    return this.#suffix;
  }
  /** The type of the media type. */ set type(value) {
    if (!TYPE_NAME_RE.test(value)) {
      throw new TypeError("Invalid type.");
    }
    this.#type = value;
  }
  /** The type of the media type. */ get type() {
    return this.#type;
  }
  /** Return the parsed media type in its valid string format. */ toString() {
    return this.#suffix ? `${this.#type}/${this.#subtype}+${this.#suffix}` : `${this.#type}/${this.#subtype}`;
  }
  /** Take a string and attempt to parse it into a {@linkcode MediaType}
   * object. */ static parse(value) {
    const match = TYPE_RE.exec(value.toLowerCase());
    if (!match) {
      throw new TypeError("Invalid media type.");
    }
    let [, type, subtype] = match;
    let suffix;
    const idx = subtype.lastIndexOf("+");
    if (idx >= 0) {
      suffix = subtype.substring(idx + 1);
      subtype = subtype.substring(0, idx);
    }
    return new this(type, subtype, suffix);
  }
}
/** Determines if the provided media type matches one of the supplied media
 * types. If there is a match, the matched media type is returned, otherwise
 * `undefined` is returned.
 *
 * Each type in the media types array can be one of the following:
 *
 * - A file extension name such as `json`. This name will be returned if
 *   matched.
 * - A media type such as `application/json`.
 * - A media type with a wildcard such as `*​/*` or `*​/json` or `application/*`.
 *   The full media type will be returned if matched.
 * - A suffix such as `+json`. This can be combined with a wildcard such as
 *   `*​/vnd+json` or `application/*+json`. The full mime type will be returned
 *   if matched.
 * - Special cases of `urlencoded` and `multipart` which get normalized to
 *   `application/x-www-form-urlencoded` and `multipart/*` respectively.
 */ export function matches(value, mediaTypes) {
  const normalized = normalizeType(value);
  if (!normalized) {
    return undefined;
  }
  if (!mediaTypes.length) {
    return normalized;
  }
  for (const mediaType of mediaTypes){
    if (mediaTypeMatch(normalize(mediaType), normalized)) {
      return mediaType.startsWith("+") || mediaType.includes("*") ? normalized : mediaType;
    }
  }
  return undefined;
}
/**
 * Convert a type, subtype and optional suffix of a media type into its valid
 * string form.
 */ export function format(value) {
  const mediaType = value instanceof MediaType ? value : new MediaType(value.type, value.subtype, value.suffix);
  return mediaType.toString();
}
/** Parses a media type into a {@linkcode MediaType} object which provides
 * parts of the media type as individual properties. */ export function parse(value) {
  return MediaType.parse(value);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvY29tbW9ucy8wLjExLjAvbWVkaWFfdHlwZXMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNCB0aGUgb2FrIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gZGVuby1saW50LWlnbm9yZS1maWxlIG5vLWlycmVndWxhci13aGl0ZXNwYWNlXG5cbi8qKlxuICogU2V2ZXJhbCBBUElzIGRlc2lnbmVkIGZvciBwcm9jZXNzaW5nIG9mIG1lZGlhIHR5cGVzIGluIHJlcXVlc3QgYm9kaWVzLlxuICpcbiAqIGBNZWRpYVR5cGVgLCBgcGFyc2UoKWAgYW5kIGBmb3JtYXQoKWAgYXJlIGluc3BpcmVkIG1lZGlhLXR5cGVyIGF0XG4gKiBodHRwczovL2dpdGh1Yi5jb20vanNodHRwL21lZGlhLXR5cGVyLyB3aGljaCBpcyBsaWNlbnNlZCBhcyBmb2xsb3dzOlxuICpcbiAqIENvcHlyaWdodChjKSAyMDE0LTIwMTcgRG91Z2xhcyBDaHJpc3RvcGhlciBXaWxzb25cbiAqXG4gKiBNSVQgTGljZW5zZVxuICpcbiAqIGBtYXRjaGVzKClgIGlzIGluc3BpcmVkIGJ5IHR5cGUtaXMgYXQgaHR0cHM6Ly9naXRodWIuY29tL2pzaHR0cC90eXBlLWlzL1xuICogd2hpY2ggaXMgbGljZW5zZWQgYXMgZm9sbG93czpcbiAqXG4gKiBDb3B5cmlnaHQoYykgMjAxNCBKb25hdGhhbiBPbmdcbiAqIENvcHlyaWdodChjKSAyMDE0LTIwMTUgRG91Z2xhcyBDaHJpc3RvcGhlciBXaWxzb25cbiAqXG4gKiBNSVQgTGljZW5zZVxuICpcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyB0eXBlQnlFeHRlbnNpb24gfSBmcm9tIFwianNyOkBzdGQvbWVkaWEtdHlwZXNAMC4yMjQvdHlwZS1ieS1leHRlbnNpb25cIjtcblxuY29uc3QgU1VCVFlQRV9OQU1FX1JFID0gL15bQS1aYS16MC05XVtBLVphLXowLTkhIyQmXl8uLV17MCwxMjZ9JC87XG5jb25zdCBUWVBFX05BTUVfUkUgPSAvXltBLVphLXowLTldW0EtWmEtejAtOSEjJCZeXy1dezAsMTI2fSQvO1xuY29uc3QgVFlQRV9SRSA9XG4gIC9eICooW0EtWmEtejAtOV1bQS1aYS16MC05ISMkJl5fLV17MCwxMjZ9KVxcLyhbQS1aYS16MC05XVtBLVphLXowLTkhIyQmXl8uKy1dezAsMTI2fSkgKiQvO1xuXG5mdW5jdGlvbiBtZWRpYVR5cGVNYXRjaChleHBlY3RlZDogc3RyaW5nIHwgdW5kZWZpbmVkLCBhY3R1YWw6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBpZiAoIWV4cGVjdGVkKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgYWN0dWFsUGFydHMgPSBhY3R1YWwuc3BsaXQoXCIvXCIpO1xuICBjb25zdCBleHBlY3RlZFBhcnRzID0gZXhwZWN0ZWQuc3BsaXQoXCIvXCIpO1xuXG4gIGlmIChhY3R1YWxQYXJ0cy5sZW5ndGggIT09IDIgfHwgZXhwZWN0ZWRQYXJ0cy5sZW5ndGggIT09IDIpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdCBbYWN0dWFsVHlwZSwgYWN0dWFsU3VidHlwZV0gPSBhY3R1YWxQYXJ0cztcbiAgY29uc3QgW2V4cGVjdGVkVHlwZSwgZXhwZWN0ZWRTdWJ0eXBlXSA9IGV4cGVjdGVkUGFydHM7XG5cbiAgaWYgKGV4cGVjdGVkVHlwZSAhPT0gXCIqXCIgJiYgZXhwZWN0ZWRUeXBlICE9PSBhY3R1YWxUeXBlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKGV4cGVjdGVkU3VidHlwZS5zdWJzdHJpbmcoMCwgMikgPT09IFwiKitcIikge1xuICAgIHJldHVybiBleHBlY3RlZFN1YnR5cGUubGVuZ3RoIDw9IGFjdHVhbFN1YnR5cGUubGVuZ3RoICsgMSAmJlxuICAgICAgZXhwZWN0ZWRTdWJ0eXBlLnN1YnN0cmluZygxKSA9PT1cbiAgICAgICAgYWN0dWFsU3VidHlwZS5zdWJzdHJpbmcoXG4gICAgICAgICAgYWN0dWFsU3VidHlwZS5sZW5ndGggKyAxIC0gZXhwZWN0ZWRTdWJ0eXBlLmxlbmd0aCxcbiAgICAgICAgKTtcbiAgfVxuXG4gIGlmIChleHBlY3RlZFN1YnR5cGUgIT09IFwiKlwiICYmIGV4cGVjdGVkU3VidHlwZSAhPT0gYWN0dWFsU3VidHlwZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemUobWVkaWFUeXBlOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBpZiAobWVkaWFUeXBlID09PSBcInVybGVuY29kZWRcIikge1xuICAgIHJldHVybiBcImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZFwiO1xuICB9XG4gIGlmIChtZWRpYVR5cGUgPT09IFwibXVsdGlwYXJ0XCIpIHtcbiAgICByZXR1cm4gXCJtdWx0aXBhcnQvKlwiO1xuICB9XG4gIGlmIChtZWRpYVR5cGUuc3RhcnRzV2l0aChcIitcIikpIHtcbiAgICByZXR1cm4gYCovKiR7bWVkaWFUeXBlfWA7XG4gIH1cbiAgcmV0dXJuIG1lZGlhVHlwZS5pbmNsdWRlcyhcIi9cIikgPyBtZWRpYVR5cGUgOiB0eXBlQnlFeHRlbnNpb24obWVkaWFUeXBlKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplVHlwZSh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBbdHlwZV0gPSB2YWx1ZS5zcGxpdCgvXFxzKjsvKTtcbiAgICBjb25zdCBtZWRpYVR5cGUgPSBNZWRpYVR5cGUucGFyc2UodHlwZSk7XG4gICAgcmV0dXJuIG1lZGlhVHlwZS50b1N0cmluZygpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbi8qKiBBIGNsYXNzIHdoaWNoIGVuY2Fwc3VsYXRlcyB0aGUgaW5mb3JtYXRpb24gaW4gYSBtZWRpYSB0eXBlLCBhbGxvd2luZ1xuICogaW5zcGVjdGluZyBvZiBtb2RpZnlpbmcgaW5kaXZpZHVhbCBwYXJ0cyBvZiB0aGUgbWVkaWEgdHlwZS4gKi9cbmV4cG9ydCBjbGFzcyBNZWRpYVR5cGUge1xuICAjc3VidHlwZSE6IHN0cmluZztcbiAgI3N1ZmZpeD86IHN0cmluZztcbiAgI3R5cGUhOiBzdHJpbmc7XG5cbiAgLyoqIENyZWF0ZSBhbiBpbnN0YW5jZSBvZiB7QGxpbmtjb2RlIE1lZGlhVHlwZX0gYnkgcHJvdmlkaW5nIHRoZSBjb21wb25lbnRzXG4gICAqIG9mIGB0eXBlYCwgYHN1YnR5cGVgIGFuZCBvcHRpb25hbGx5IGEgYHN1ZmZpeGAuICovXG4gIGNvbnN0cnVjdG9yKHR5cGU6IHN0cmluZywgc3VidHlwZTogc3RyaW5nLCBzdWZmaXg/OiBzdHJpbmcpIHtcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIHRoaXMuc3VidHlwZSA9IHN1YnR5cGU7XG4gICAgaWYgKHN1ZmZpeCkge1xuICAgICAgdGhpcy5zdWZmaXggPSBzdWZmaXg7XG4gICAgfVxuICB9XG5cbiAgLyoqIFRoZSBzdWJ0eXBlIG9mIHRoZSBtZWRpYSB0eXBlLiAqL1xuICBzZXQgc3VidHlwZSh2YWx1ZTogc3RyaW5nKSB7XG4gICAgaWYgKCFTVUJUWVBFX05BTUVfUkUudGVzdCh2YWx1ZSkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIHN1YnR5cGUuXCIpO1xuICAgIH1cbiAgICB0aGlzLiNzdWJ0eXBlID0gdmFsdWU7XG4gIH1cblxuICAvKiogVGhlIHN1YnR5cGUgb2YgdGhlIG1lZGlhIHR5cGUuICovXG4gIGdldCBzdWJ0eXBlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuI3N1YnR5cGU7XG4gIH1cblxuICAvKiogVGhlIG9wdGlvbmFsIHN1ZmZpeCBvZiB0aGUgbWVkaWEgdHlwZS4gKi9cbiAgc2V0IHN1ZmZpeCh2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkKSB7XG4gICAgaWYgKHZhbHVlICYmICFUWVBFX05BTUVfUkUudGVzdCh2YWx1ZSkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIHN1ZmZpeC5cIik7XG4gICAgfVxuICAgIHRoaXMuI3N1ZmZpeCA9IHZhbHVlO1xuICB9XG5cbiAgLyoqIFRoZSBvcHRpb25hbCBzdWZmaXggb2YgdGhlIG1lZGlhIHR5cGUuICovXG4gIGdldCBzdWZmaXgoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy4jc3VmZml4O1xuICB9XG5cbiAgLyoqIFRoZSB0eXBlIG9mIHRoZSBtZWRpYSB0eXBlLiAqL1xuICBzZXQgdHlwZSh2YWx1ZTogc3RyaW5nKSB7XG4gICAgaWYgKCFUWVBFX05BTUVfUkUudGVzdCh2YWx1ZSkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIHR5cGUuXCIpO1xuICAgIH1cbiAgICB0aGlzLiN0eXBlID0gdmFsdWU7XG4gIH1cblxuICAvKiogVGhlIHR5cGUgb2YgdGhlIG1lZGlhIHR5cGUuICovXG4gIGdldCB0eXBlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuI3R5cGU7XG4gIH1cblxuICAvKiogUmV0dXJuIHRoZSBwYXJzZWQgbWVkaWEgdHlwZSBpbiBpdHMgdmFsaWQgc3RyaW5nIGZvcm1hdC4gKi9cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy4jc3VmZml4XG4gICAgICA/IGAke3RoaXMuI3R5cGV9LyR7dGhpcy4jc3VidHlwZX0rJHt0aGlzLiNzdWZmaXh9YFxuICAgICAgOiBgJHt0aGlzLiN0eXBlfS8ke3RoaXMuI3N1YnR5cGV9YDtcbiAgfVxuXG4gIC8qKiBUYWtlIGEgc3RyaW5nIGFuZCBhdHRlbXB0IHRvIHBhcnNlIGl0IGludG8gYSB7QGxpbmtjb2RlIE1lZGlhVHlwZX1cbiAgICogb2JqZWN0LiAqL1xuICBzdGF0aWMgcGFyc2UodmFsdWU6IHN0cmluZyk6IE1lZGlhVHlwZSB7XG4gICAgY29uc3QgbWF0Y2ggPSBUWVBFX1JFLmV4ZWModmFsdWUudG9Mb3dlckNhc2UoKSk7XG5cbiAgICBpZiAoIW1hdGNoKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBtZWRpYSB0eXBlLlwiKTtcbiAgICB9XG5cbiAgICBsZXQgWywgdHlwZSwgc3VidHlwZV0gPSBtYXRjaDtcbiAgICBsZXQgc3VmZml4OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgICBjb25zdCBpZHggPSBzdWJ0eXBlLmxhc3RJbmRleE9mKFwiK1wiKTtcbiAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgIHN1ZmZpeCA9IHN1YnR5cGUuc3Vic3RyaW5nKGlkeCArIDEpO1xuICAgICAgc3VidHlwZSA9IHN1YnR5cGUuc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKHR5cGUsIHN1YnR5cGUsIHN1ZmZpeCk7XG4gIH1cbn1cblxuLyoqIERldGVybWluZXMgaWYgdGhlIHByb3ZpZGVkIG1lZGlhIHR5cGUgbWF0Y2hlcyBvbmUgb2YgdGhlIHN1cHBsaWVkIG1lZGlhXG4gKiB0eXBlcy4gSWYgdGhlcmUgaXMgYSBtYXRjaCwgdGhlIG1hdGNoZWQgbWVkaWEgdHlwZSBpcyByZXR1cm5lZCwgb3RoZXJ3aXNlXG4gKiBgdW5kZWZpbmVkYCBpcyByZXR1cm5lZC5cbiAqXG4gKiBFYWNoIHR5cGUgaW4gdGhlIG1lZGlhIHR5cGVzIGFycmF5IGNhbiBiZSBvbmUgb2YgdGhlIGZvbGxvd2luZzpcbiAqXG4gKiAtIEEgZmlsZSBleHRlbnNpb24gbmFtZSBzdWNoIGFzIGBqc29uYC4gVGhpcyBuYW1lIHdpbGwgYmUgcmV0dXJuZWQgaWZcbiAqICAgbWF0Y2hlZC5cbiAqIC0gQSBtZWRpYSB0eXBlIHN1Y2ggYXMgYGFwcGxpY2F0aW9uL2pzb25gLlxuICogLSBBIG1lZGlhIHR5cGUgd2l0aCBhIHdpbGRjYXJkIHN1Y2ggYXMgYCrigIsvKmAgb3IgYCrigIsvanNvbmAgb3IgYGFwcGxpY2F0aW9uLypgLlxuICogICBUaGUgZnVsbCBtZWRpYSB0eXBlIHdpbGwgYmUgcmV0dXJuZWQgaWYgbWF0Y2hlZC5cbiAqIC0gQSBzdWZmaXggc3VjaCBhcyBgK2pzb25gLiBUaGlzIGNhbiBiZSBjb21iaW5lZCB3aXRoIGEgd2lsZGNhcmQgc3VjaCBhc1xuICogICBgKuKAiy92bmQranNvbmAgb3IgYGFwcGxpY2F0aW9uLyoranNvbmAuIFRoZSBmdWxsIG1pbWUgdHlwZSB3aWxsIGJlIHJldHVybmVkXG4gKiAgIGlmIG1hdGNoZWQuXG4gKiAtIFNwZWNpYWwgY2FzZXMgb2YgYHVybGVuY29kZWRgIGFuZCBgbXVsdGlwYXJ0YCB3aGljaCBnZXQgbm9ybWFsaXplZCB0b1xuICogICBgYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkYCBhbmQgYG11bHRpcGFydC8qYCByZXNwZWN0aXZlbHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXRjaGVzKFxuICB2YWx1ZTogc3RyaW5nLFxuICBtZWRpYVR5cGVzOiBzdHJpbmdbXSxcbik6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSBub3JtYWxpemVUeXBlKHZhbHVlKTtcblxuICBpZiAoIW5vcm1hbGl6ZWQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKCFtZWRpYVR5cGVzLmxlbmd0aCkge1xuICAgIHJldHVybiBub3JtYWxpemVkO1xuICB9XG5cbiAgZm9yIChjb25zdCBtZWRpYVR5cGUgb2YgbWVkaWFUeXBlcykge1xuICAgIGlmIChtZWRpYVR5cGVNYXRjaChub3JtYWxpemUobWVkaWFUeXBlKSwgbm9ybWFsaXplZCkpIHtcbiAgICAgIHJldHVybiBtZWRpYVR5cGUuc3RhcnRzV2l0aChcIitcIikgfHwgbWVkaWFUeXBlLmluY2x1ZGVzKFwiKlwiKVxuICAgICAgICA/IG5vcm1hbGl6ZWRcbiAgICAgICAgOiBtZWRpYVR5cGU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgdHlwZSwgc3VidHlwZSBhbmQgb3B0aW9uYWwgc3VmZml4IG9mIGEgbWVkaWEgdHlwZSBpbnRvIGl0cyB2YWxpZFxuICogc3RyaW5nIGZvcm0uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXQoXG4gIHZhbHVlOiB7IHR5cGU6IHN0cmluZzsgc3VidHlwZTogc3RyaW5nOyBzdWZmaXg/OiBzdHJpbmcgfSxcbik6IHN0cmluZyB7XG4gIGNvbnN0IG1lZGlhVHlwZSA9IHZhbHVlIGluc3RhbmNlb2YgTWVkaWFUeXBlXG4gICAgPyB2YWx1ZVxuICAgIDogbmV3IE1lZGlhVHlwZSh2YWx1ZS50eXBlLCB2YWx1ZS5zdWJ0eXBlLCB2YWx1ZS5zdWZmaXgpO1xuICByZXR1cm4gbWVkaWFUeXBlLnRvU3RyaW5nKCk7XG59XG5cbi8qKiBQYXJzZXMgYSBtZWRpYSB0eXBlIGludG8gYSB7QGxpbmtjb2RlIE1lZGlhVHlwZX0gb2JqZWN0IHdoaWNoIHByb3ZpZGVzXG4gKiBwYXJ0cyBvZiB0aGUgbWVkaWEgdHlwZSBhcyBpbmRpdmlkdWFsIHByb3BlcnRpZXMuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2UodmFsdWU6IHN0cmluZyk6IE1lZGlhVHlwZSB7XG4gIHJldHVybiBNZWRpYVR5cGUucGFyc2UodmFsdWUpO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHlFQUF5RTtBQUN6RSxnREFBZ0Q7QUFFaEQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FtQkMsR0FFRCxTQUFTLGVBQWUsUUFBUSwrQ0FBK0M7QUFFL0UsTUFBTSxrQkFBa0I7QUFDeEIsTUFBTSxlQUFlO0FBQ3JCLE1BQU0sVUFDSjtBQUVGLFNBQVMsZUFBZSxRQUE0QixFQUFFLE1BQWM7RUFDbEUsSUFBSSxDQUFDLFVBQVU7SUFDYixPQUFPO0VBQ1Q7RUFFQSxNQUFNLGNBQWMsT0FBTyxLQUFLLENBQUM7RUFDakMsTUFBTSxnQkFBZ0IsU0FBUyxLQUFLLENBQUM7RUFFckMsSUFBSSxZQUFZLE1BQU0sS0FBSyxLQUFLLGNBQWMsTUFBTSxLQUFLLEdBQUc7SUFDMUQsT0FBTztFQUNUO0VBRUEsTUFBTSxDQUFDLFlBQVksY0FBYyxHQUFHO0VBQ3BDLE1BQU0sQ0FBQyxjQUFjLGdCQUFnQixHQUFHO0VBRXhDLElBQUksaUJBQWlCLE9BQU8saUJBQWlCLFlBQVk7SUFDdkQsT0FBTztFQUNUO0VBRUEsSUFBSSxnQkFBZ0IsU0FBUyxDQUFDLEdBQUcsT0FBTyxNQUFNO0lBQzVDLE9BQU8sZ0JBQWdCLE1BQU0sSUFBSSxjQUFjLE1BQU0sR0FBRyxLQUN0RCxnQkFBZ0IsU0FBUyxDQUFDLE9BQ3hCLGNBQWMsU0FBUyxDQUNyQixjQUFjLE1BQU0sR0FBRyxJQUFJLGdCQUFnQixNQUFNO0VBRXpEO0VBRUEsSUFBSSxvQkFBb0IsT0FBTyxvQkFBb0IsZUFBZTtJQUNoRSxPQUFPO0VBQ1Q7RUFFQSxPQUFPO0FBQ1Q7QUFFQSxTQUFTLFVBQVUsU0FBaUI7RUFDbEMsSUFBSSxjQUFjLGNBQWM7SUFDOUIsT0FBTztFQUNUO0VBQ0EsSUFBSSxjQUFjLGFBQWE7SUFDN0IsT0FBTztFQUNUO0VBQ0EsSUFBSSxVQUFVLFVBQVUsQ0FBQyxNQUFNO0lBQzdCLE9BQU8sQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDO0VBQzFCO0VBQ0EsT0FBTyxVQUFVLFFBQVEsQ0FBQyxPQUFPLFlBQVksZ0JBQWdCO0FBQy9EO0FBRUEsU0FBUyxjQUFjLEtBQWE7RUFDbEMsSUFBSTtJQUNGLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxLQUFLLENBQUM7SUFDM0IsTUFBTSxZQUFZLFVBQVUsS0FBSyxDQUFDO0lBQ2xDLE9BQU8sVUFBVSxRQUFRO0VBQzNCLEVBQUUsT0FBTTtJQUNOLE9BQU87RUFDVDtBQUNGO0FBRUE7K0RBQytELEdBQy9ELE9BQU8sTUFBTTtFQUNYLENBQUMsT0FBTyxDQUFVO0VBQ2xCLENBQUMsTUFBTSxDQUFVO0VBQ2pCLENBQUMsSUFBSSxDQUFVO0VBRWY7cURBQ21ELEdBQ25ELFlBQVksSUFBWSxFQUFFLE9BQWUsRUFBRSxNQUFlLENBQUU7SUFDMUQsSUFBSSxDQUFDLElBQUksR0FBRztJQUNaLElBQUksQ0FBQyxPQUFPLEdBQUc7SUFDZixJQUFJLFFBQVE7TUFDVixJQUFJLENBQUMsTUFBTSxHQUFHO0lBQ2hCO0VBQ0Y7RUFFQSxtQ0FBbUMsR0FDbkMsSUFBSSxRQUFRLEtBQWEsRUFBRTtJQUN6QixJQUFJLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxRQUFRO01BQ2hDLE1BQU0sSUFBSSxVQUFVO0lBQ3RCO0lBQ0EsSUFBSSxDQUFDLENBQUMsT0FBTyxHQUFHO0VBQ2xCO0VBRUEsbUNBQW1DLEdBQ25DLElBQUksVUFBa0I7SUFDcEIsT0FBTyxJQUFJLENBQUMsQ0FBQyxPQUFPO0VBQ3RCO0VBRUEsMkNBQTJDLEdBQzNDLElBQUksT0FBTyxLQUF5QixFQUFFO0lBQ3BDLElBQUksU0FBUyxDQUFDLGFBQWEsSUFBSSxDQUFDLFFBQVE7TUFDdEMsTUFBTSxJQUFJLFVBQVU7SUFDdEI7SUFDQSxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUc7RUFDakI7RUFFQSwyQ0FBMkMsR0FDM0MsSUFBSSxTQUE2QjtJQUMvQixPQUFPLElBQUksQ0FBQyxDQUFDLE1BQU07RUFDckI7RUFFQSxnQ0FBZ0MsR0FDaEMsSUFBSSxLQUFLLEtBQWEsRUFBRTtJQUN0QixJQUFJLENBQUMsYUFBYSxJQUFJLENBQUMsUUFBUTtNQUM3QixNQUFNLElBQUksVUFBVTtJQUN0QjtJQUNBLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRztFQUNmO0VBRUEsZ0NBQWdDLEdBQ2hDLElBQUksT0FBZTtJQUNqQixPQUFPLElBQUksQ0FBQyxDQUFDLElBQUk7RUFDbkI7RUFFQSw2REFBNkQsR0FDN0QsV0FBbUI7SUFDakIsT0FBTyxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQ2YsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUNoRCxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztFQUN0QztFQUVBO2FBQ1csR0FDWCxPQUFPLE1BQU0sS0FBYSxFQUFhO0lBQ3JDLE1BQU0sUUFBUSxRQUFRLElBQUksQ0FBQyxNQUFNLFdBQVc7SUFFNUMsSUFBSSxDQUFDLE9BQU87TUFDVixNQUFNLElBQUksVUFBVTtJQUN0QjtJQUVBLElBQUksR0FBRyxNQUFNLFFBQVEsR0FBRztJQUN4QixJQUFJO0lBRUosTUFBTSxNQUFNLFFBQVEsV0FBVyxDQUFDO0lBQ2hDLElBQUksT0FBTyxHQUFHO01BQ1osU0FBUyxRQUFRLFNBQVMsQ0FBQyxNQUFNO01BQ2pDLFVBQVUsUUFBUSxTQUFTLENBQUMsR0FBRztJQUNqQztJQUVBLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxTQUFTO0VBQ2pDO0FBQ0Y7QUFFQTs7Ozs7Ozs7Ozs7Ozs7OztDQWdCQyxHQUNELE9BQU8sU0FBUyxRQUNkLEtBQWEsRUFDYixVQUFvQjtFQUVwQixNQUFNLGFBQWEsY0FBYztFQUVqQyxJQUFJLENBQUMsWUFBWTtJQUNmLE9BQU87RUFDVDtFQUVBLElBQUksQ0FBQyxXQUFXLE1BQU0sRUFBRTtJQUN0QixPQUFPO0VBQ1Q7RUFFQSxLQUFLLE1BQU0sYUFBYSxXQUFZO0lBQ2xDLElBQUksZUFBZSxVQUFVLFlBQVksYUFBYTtNQUNwRCxPQUFPLFVBQVUsVUFBVSxDQUFDLFFBQVEsVUFBVSxRQUFRLENBQUMsT0FDbkQsYUFDQTtJQUNOO0VBQ0Y7RUFFQSxPQUFPO0FBQ1Q7QUFFQTs7O0NBR0MsR0FDRCxPQUFPLFNBQVMsT0FDZCxLQUF5RDtFQUV6RCxNQUFNLFlBQVksaUJBQWlCLFlBQy9CLFFBQ0EsSUFBSSxVQUFVLE1BQU0sSUFBSSxFQUFFLE1BQU0sT0FBTyxFQUFFLE1BQU0sTUFBTTtFQUN6RCxPQUFPLFVBQVUsUUFBUTtBQUMzQjtBQUVBO3FEQUNxRCxHQUNyRCxPQUFPLFNBQVMsTUFBTSxLQUFhO0VBQ2pDLE9BQU8sVUFBVSxLQUFLLENBQUM7QUFDekIifQ==