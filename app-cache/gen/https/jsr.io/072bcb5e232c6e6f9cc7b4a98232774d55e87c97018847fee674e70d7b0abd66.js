// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
/**
 * Utilities for
 * {@link https://datatracker.ietf.org/doc/html/rfc4648#section-4 | base64}
 * encoding and decoding.
 *
 * This module is browser compatible.
 *
 * ```ts
 * import {
 *   encodeBase64,
 *   decodeBase64,
 * } from "@std/encoding/base64";
 *
 * const encoded = encodeBase64("foobar"); // "Zm9vYmFy"
 *
 * decodeBase64(encoded); // Uint8Array(6) [ 102, 111, 111, 98, 97, 114 ]
 * ```
 *
 * @module
 */ import { validateBinaryLike } from "./_util.ts";
const base64abc = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "+",
  "/"
];
/**
 * Converts data into a base64-encoded string.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc4648#section-4}
 *
 * @param data The data to encode.
 * @returns The base64-encoded string.
 *
 * @example
 * ```ts
 * import { encodeBase64 } from "@std/encoding/base64";
 *
 * encodeBase64("foobar"); // "Zm9vYmFy"
 * ```
 */ export function encodeBase64(data) {
  // CREDIT: https://gist.github.com/enepomnyaschih/72c423f727d395eeaa09697058238727
  const uint8 = validateBinaryLike(data);
  let result = "";
  let i;
  const l = uint8.length;
  for(i = 2; i < l; i += 3){
    result += base64abc[uint8[i - 2] >> 2];
    result += base64abc[(uint8[i - 2] & 0x03) << 4 | uint8[i - 1] >> 4];
    result += base64abc[(uint8[i - 1] & 0x0f) << 2 | uint8[i] >> 6];
    result += base64abc[uint8[i] & 0x3f];
  }
  if (i === l + 1) {
    // 1 octet yet to write
    result += base64abc[uint8[i - 2] >> 2];
    result += base64abc[(uint8[i - 2] & 0x03) << 4];
    result += "==";
  }
  if (i === l) {
    // 2 octets yet to write
    result += base64abc[uint8[i - 2] >> 2];
    result += base64abc[(uint8[i - 2] & 0x03) << 4 | uint8[i - 1] >> 4];
    result += base64abc[(uint8[i - 1] & 0x0f) << 2];
    result += "=";
  }
  return result;
}
/**
 * Decodes a base64-encoded string.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc4648#section-4}
 *
 * @param b64 The base64-encoded string to decode.
 * @returns The decoded data.
 *
 * @example
 * ```ts
 * import { decodeBase64 } from "@std/encoding/base64";
 *
 * decodeBase64("Zm9vYmFy"); // Uint8Array(6) [ 102, 111, 111, 98, 97, 114 ]
 * ```
 */ export function decodeBase64(b64) {
  const binString = atob(b64);
  const size = binString.length;
  const bytes = new Uint8Array(size);
  for(let i = 0; i < size; i++){
    bytes[i] = binString.charCodeAt(i);
  }
  return bytes;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvZW5jb2RpbmcvMC4yMjMuMC9iYXNlNjQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNCB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cblxuLyoqXG4gKiBVdGlsaXRpZXMgZm9yXG4gKiB7QGxpbmsgaHR0cHM6Ly9kYXRhdHJhY2tlci5pZXRmLm9yZy9kb2MvaHRtbC9yZmM0NjQ4I3NlY3Rpb24tNCB8IGJhc2U2NH1cbiAqIGVuY29kaW5nIGFuZCBkZWNvZGluZy5cbiAqXG4gKiBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7XG4gKiAgIGVuY29kZUJhc2U2NCxcbiAqICAgZGVjb2RlQmFzZTY0LFxuICogfSBmcm9tIFwiQHN0ZC9lbmNvZGluZy9iYXNlNjRcIjtcbiAqXG4gKiBjb25zdCBlbmNvZGVkID0gZW5jb2RlQmFzZTY0KFwiZm9vYmFyXCIpOyAvLyBcIlptOXZZbUZ5XCJcbiAqXG4gKiBkZWNvZGVCYXNlNjQoZW5jb2RlZCk7IC8vIFVpbnQ4QXJyYXkoNikgWyAxMDIsIDExMSwgMTExLCA5OCwgOTcsIDExNCBdXG4gKiBgYGBcbiAqXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgdmFsaWRhdGVCaW5hcnlMaWtlIH0gZnJvbSBcIi4vX3V0aWwudHNcIjtcblxuY29uc3QgYmFzZTY0YWJjID0gW1xuICBcIkFcIixcbiAgXCJCXCIsXG4gIFwiQ1wiLFxuICBcIkRcIixcbiAgXCJFXCIsXG4gIFwiRlwiLFxuICBcIkdcIixcbiAgXCJIXCIsXG4gIFwiSVwiLFxuICBcIkpcIixcbiAgXCJLXCIsXG4gIFwiTFwiLFxuICBcIk1cIixcbiAgXCJOXCIsXG4gIFwiT1wiLFxuICBcIlBcIixcbiAgXCJRXCIsXG4gIFwiUlwiLFxuICBcIlNcIixcbiAgXCJUXCIsXG4gIFwiVVwiLFxuICBcIlZcIixcbiAgXCJXXCIsXG4gIFwiWFwiLFxuICBcIllcIixcbiAgXCJaXCIsXG4gIFwiYVwiLFxuICBcImJcIixcbiAgXCJjXCIsXG4gIFwiZFwiLFxuICBcImVcIixcbiAgXCJmXCIsXG4gIFwiZ1wiLFxuICBcImhcIixcbiAgXCJpXCIsXG4gIFwialwiLFxuICBcImtcIixcbiAgXCJsXCIsXG4gIFwibVwiLFxuICBcIm5cIixcbiAgXCJvXCIsXG4gIFwicFwiLFxuICBcInFcIixcbiAgXCJyXCIsXG4gIFwic1wiLFxuICBcInRcIixcbiAgXCJ1XCIsXG4gIFwidlwiLFxuICBcIndcIixcbiAgXCJ4XCIsXG4gIFwieVwiLFxuICBcInpcIixcbiAgXCIwXCIsXG4gIFwiMVwiLFxuICBcIjJcIixcbiAgXCIzXCIsXG4gIFwiNFwiLFxuICBcIjVcIixcbiAgXCI2XCIsXG4gIFwiN1wiLFxuICBcIjhcIixcbiAgXCI5XCIsXG4gIFwiK1wiLFxuICBcIi9cIixcbl07XG5cbi8qKlxuICogQ29udmVydHMgZGF0YSBpbnRvIGEgYmFzZTY0LWVuY29kZWQgc3RyaW5nLlxuICpcbiAqIEBzZWUge0BsaW5rIGh0dHBzOi8vZGF0YXRyYWNrZXIuaWV0Zi5vcmcvZG9jL2h0bWwvcmZjNDY0OCNzZWN0aW9uLTR9XG4gKlxuICogQHBhcmFtIGRhdGEgVGhlIGRhdGEgdG8gZW5jb2RlLlxuICogQHJldHVybnMgVGhlIGJhc2U2NC1lbmNvZGVkIHN0cmluZy5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IGVuY29kZUJhc2U2NCB9IGZyb20gXCJAc3RkL2VuY29kaW5nL2Jhc2U2NFwiO1xuICpcbiAqIGVuY29kZUJhc2U2NChcImZvb2JhclwiKTsgLy8gXCJabTl2WW1GeVwiXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuY29kZUJhc2U2NChkYXRhOiBBcnJheUJ1ZmZlciB8IFVpbnQ4QXJyYXkgfCBzdHJpbmcpOiBzdHJpbmcge1xuICAvLyBDUkVESVQ6IGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL2VuZXBvbW55YXNjaGloLzcyYzQyM2Y3MjdkMzk1ZWVhYTA5Njk3MDU4MjM4NzI3XG4gIGNvbnN0IHVpbnQ4ID0gdmFsaWRhdGVCaW5hcnlMaWtlKGRhdGEpO1xuICBsZXQgcmVzdWx0ID0gXCJcIjtcbiAgbGV0IGk7XG4gIGNvbnN0IGwgPSB1aW50OC5sZW5ndGg7XG4gIGZvciAoaSA9IDI7IGkgPCBsOyBpICs9IDMpIHtcbiAgICByZXN1bHQgKz0gYmFzZTY0YWJjWyh1aW50OFtpIC0gMl0hKSA+PiAyXTtcbiAgICByZXN1bHQgKz0gYmFzZTY0YWJjW1xuICAgICAgKCgodWludDhbaSAtIDJdISkgJiAweDAzKSA8PCA0KSB8XG4gICAgICAoKHVpbnQ4W2kgLSAxXSEpID4+IDQpXG4gICAgXTtcbiAgICByZXN1bHQgKz0gYmFzZTY0YWJjW1xuICAgICAgKCgodWludDhbaSAtIDFdISkgJiAweDBmKSA8PCAyKSB8XG4gICAgICAoKHVpbnQ4W2ldISkgPj4gNilcbiAgICBdO1xuICAgIHJlc3VsdCArPSBiYXNlNjRhYmNbKHVpbnQ4W2ldISkgJiAweDNmXTtcbiAgfVxuICBpZiAoaSA9PT0gbCArIDEpIHtcbiAgICAvLyAxIG9jdGV0IHlldCB0byB3cml0ZVxuICAgIHJlc3VsdCArPSBiYXNlNjRhYmNbKHVpbnQ4W2kgLSAyXSEpID4+IDJdO1xuICAgIHJlc3VsdCArPSBiYXNlNjRhYmNbKCh1aW50OFtpIC0gMl0hKSAmIDB4MDMpIDw8IDRdO1xuICAgIHJlc3VsdCArPSBcIj09XCI7XG4gIH1cbiAgaWYgKGkgPT09IGwpIHtcbiAgICAvLyAyIG9jdGV0cyB5ZXQgdG8gd3JpdGVcbiAgICByZXN1bHQgKz0gYmFzZTY0YWJjWyh1aW50OFtpIC0gMl0hKSA+PiAyXTtcbiAgICByZXN1bHQgKz0gYmFzZTY0YWJjW1xuICAgICAgKCgodWludDhbaSAtIDJdISkgJiAweDAzKSA8PCA0KSB8XG4gICAgICAoKHVpbnQ4W2kgLSAxXSEpID4+IDQpXG4gICAgXTtcbiAgICByZXN1bHQgKz0gYmFzZTY0YWJjWygodWludDhbaSAtIDFdISkgJiAweDBmKSA8PCAyXTtcbiAgICByZXN1bHQgKz0gXCI9XCI7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBEZWNvZGVzIGEgYmFzZTY0LWVuY29kZWQgc3RyaW5nLlxuICpcbiAqIEBzZWUge0BsaW5rIGh0dHBzOi8vZGF0YXRyYWNrZXIuaWV0Zi5vcmcvZG9jL2h0bWwvcmZjNDY0OCNzZWN0aW9uLTR9XG4gKlxuICogQHBhcmFtIGI2NCBUaGUgYmFzZTY0LWVuY29kZWQgc3RyaW5nIHRvIGRlY29kZS5cbiAqIEByZXR1cm5zIFRoZSBkZWNvZGVkIGRhdGEuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBkZWNvZGVCYXNlNjQgfSBmcm9tIFwiQHN0ZC9lbmNvZGluZy9iYXNlNjRcIjtcbiAqXG4gKiBkZWNvZGVCYXNlNjQoXCJabTl2WW1GeVwiKTsgLy8gVWludDhBcnJheSg2KSBbIDEwMiwgMTExLCAxMTEsIDk4LCA5NywgMTE0IF1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVjb2RlQmFzZTY0KGI2NDogc3RyaW5nKTogVWludDhBcnJheSB7XG4gIGNvbnN0IGJpblN0cmluZyA9IGF0b2IoYjY0KTtcbiAgY29uc3Qgc2l6ZSA9IGJpblN0cmluZy5sZW5ndGg7XG4gIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoc2l6ZSk7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc2l6ZTsgaSsrKSB7XG4gICAgYnl0ZXNbaV0gPSBiaW5TdHJpbmcuY2hhckNvZGVBdChpKTtcbiAgfVxuICByZXR1cm4gYnl0ZXM7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFLHFDQUFxQztBQUVyQzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQW1CQyxHQUVELFNBQVMsa0JBQWtCLFFBQVEsYUFBYTtB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