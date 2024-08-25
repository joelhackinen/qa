/*!
 * Adapted directly from content-disposition.js at
 * https://github.com/Rob--W/open-in-browser/blob/master/extension/content-disposition.js
 * which is licensed as:
 *
 * (c) 2017 Rob Wu <rob@robwu.nl> (https://robwu.nl)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */ import { toParamRegExp, unquote } from "./header_utils.ts";
let needsEncodingFixup = false;
function fixupEncoding(value) {
  if (needsEncodingFixup && /[\x80-\xff]/.test(value)) {
    value = textDecode("utf-8", value);
    if (needsEncodingFixup) {
      value = textDecode("iso-8859-1", value);
    }
  }
  return value;
}
const FILENAME_STAR_REGEX = toParamRegExp("filename\\*", "i");
const FILENAME_START_ITER_REGEX = toParamRegExp("filename\\*((?!0\\d)\\d+)(\\*?)", "ig");
const FILENAME_REGEX = toParamRegExp("filename", "i");
function rfc2047decode(value) {
  // deno-lint-ignore no-control-regex
  if (!value.startsWith("=?") || /[\x00-\x19\x80-\xff]/.test(value)) {
    return value;
  }
  return value.replace(/=\?([\w-]*)\?([QqBb])\?((?:[^?]|\?(?!=))*)\?=/g, (_, charset, encoding, text)=>{
    if (encoding === "q" || encoding === "Q") {
      text = text.replace(/_/g, " ");
      text = text.replace(/=([0-9a-fA-F]{2})/g, (_, hex)=>String.fromCharCode(parseInt(hex, 16)));
      return textDecode(charset, text);
    }
    try {
      text = atob(text);
    // deno-lint-ignore no-empty
    } catch  {}
    return textDecode(charset, text);
  });
}
function rfc2231getParam(header) {
  const matches = [];
  let match;
  while(match = FILENAME_START_ITER_REGEX.exec(header)){
    const [, ns, quote, part] = match;
    const n = parseInt(ns, 10);
    if (n in matches) {
      if (n === 0) {
        break;
      }
      continue;
    }
    matches[n] = [
      quote,
      part
    ];
  }
  const parts = [];
  for(let n = 0; n < matches.length; ++n){
    if (!(n in matches)) {
      break;
    }
    let [quote, part] = matches[n];
    part = unquote(part);
    if (quote) {
      part = unescape(part);
      if (n === 0) {
        part = rfc5987decode(part);
      }
    }
    parts.push(part);
  }
  return parts.join("");
}
function rfc5987decode(value) {
  const encodingEnd = value.indexOf(`'`);
  if (encodingEnd === -1) {
    return value;
  }
  const encoding = value.slice(0, encodingEnd);
  const langValue = value.slice(encodingEnd + 1);
  return textDecode(encoding, langValue.replace(/^[^']*'/, ""));
}
function textDecode(encoding, value) {
  if (encoding) {
    try {
      const decoder = new TextDecoder(encoding, {
        fatal: true
      });
      const bytes = Array.from(value, (c)=>c.charCodeAt(0));
      if (bytes.every((code)=>code <= 0xFF)) {
        value = decoder.decode(new Uint8Array(bytes));
        needsEncodingFixup = false;
      }
    // deno-lint-ignore no-empty
    } catch  {}
  }
  return value;
}
/**
 * Parse a `Content-Disposition` header value to retrieve the filename of the
 * file.
 */ export function getFilename(header) {
  needsEncodingFixup = true;
  // filename*=ext-value ("ext-value" from RFC 5987, referenced by RFC 6266).
  let matches = FILENAME_STAR_REGEX.exec(header);
  if (matches) {
    const [, filename] = matches;
    return fixupEncoding(rfc2047decode(rfc5987decode(unescape(unquote(filename)))));
  }
  // Continuations (RFC 2231 section 3, referenced by RFC 5987 section 3.1).
  // filename*n*=part
  // filename*n=part
  const filename = rfc2231getParam(header);
  if (filename) {
    return fixupEncoding(rfc2047decode(filename));
  }
  // filename=value (RFC 5987, section 4.1).
  matches = FILENAME_REGEX.exec(header);
  if (matches) {
    const [, filename] = matches;
    return fixupEncoding(rfc2047decode(unquote(filename)));
  }
  return "";
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvY29tbW9ucy8wLjExLjAvY29udGVudF9kaXNwb3NpdGlvbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqIEFkYXB0ZWQgZGlyZWN0bHkgZnJvbSBjb250ZW50LWRpc3Bvc2l0aW9uLmpzIGF0XG4gKiBodHRwczovL2dpdGh1Yi5jb20vUm9iLS1XL29wZW4taW4tYnJvd3Nlci9ibG9iL21hc3Rlci9leHRlbnNpb24vY29udGVudC1kaXNwb3NpdGlvbi5qc1xuICogd2hpY2ggaXMgbGljZW5zZWQgYXM6XG4gKlxuICogKGMpIDIwMTcgUm9iIFd1IDxyb2JAcm9id3Uubmw+IChodHRwczovL3JvYnd1Lm5sKVxuICogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqL1xuXG5pbXBvcnQgeyB0b1BhcmFtUmVnRXhwLCB1bnF1b3RlIH0gZnJvbSBcIi4vaGVhZGVyX3V0aWxzLnRzXCI7XG5cbmxldCBuZWVkc0VuY29kaW5nRml4dXAgPSBmYWxzZTtcblxuZnVuY3Rpb24gZml4dXBFbmNvZGluZyh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKG5lZWRzRW5jb2RpbmdGaXh1cCAmJiAvW1xceDgwLVxceGZmXS8udGVzdCh2YWx1ZSkpIHtcbiAgICB2YWx1ZSA9IHRleHREZWNvZGUoXCJ1dGYtOFwiLCB2YWx1ZSk7XG4gICAgaWYgKG5lZWRzRW5jb2RpbmdGaXh1cCkge1xuICAgICAgdmFsdWUgPSB0ZXh0RGVjb2RlKFwiaXNvLTg4NTktMVwiLCB2YWx1ZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuY29uc3QgRklMRU5BTUVfU1RBUl9SRUdFWCA9IHRvUGFyYW1SZWdFeHAoXCJmaWxlbmFtZVxcXFwqXCIsIFwiaVwiKTtcbmNvbnN0IEZJTEVOQU1FX1NUQVJUX0lURVJfUkVHRVggPSB0b1BhcmFtUmVnRXhwKFxuICBcImZpbGVuYW1lXFxcXCooKD8hMFxcXFxkKVxcXFxkKykoXFxcXCo/KVwiLFxuICBcImlnXCIsXG4pO1xuY29uc3QgRklMRU5BTUVfUkVHRVggPSB0b1BhcmFtUmVnRXhwKFwiZmlsZW5hbWVcIiwgXCJpXCIpO1xuXG5mdW5jdGlvbiByZmMyMDQ3ZGVjb2RlKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWNvbnRyb2wtcmVnZXhcbiAgaWYgKCF2YWx1ZS5zdGFydHNXaXRoKFwiPT9cIikgfHwgL1tcXHgwMC1cXHgxOVxceDgwLVxceGZmXS8udGVzdCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgcmV0dXJuIHZhbHVlLnJlcGxhY2UoXG4gICAgLz1cXD8oW1xcdy1dKilcXD8oW1FxQmJdKVxcPygoPzpbXj9dfFxcPyg/IT0pKSopXFw/PS9nLFxuICAgIChfOiBzdHJpbmcsIGNoYXJzZXQ6IHN0cmluZywgZW5jb2Rpbmc6IHN0cmluZywgdGV4dDogc3RyaW5nKSA9PiB7XG4gICAgICBpZiAoZW5jb2RpbmcgPT09IFwicVwiIHx8IGVuY29kaW5nID09PSBcIlFcIikge1xuICAgICAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9fL2csIFwiIFwiKTtcbiAgICAgICAgdGV4dCA9IHRleHQucmVwbGFjZShcbiAgICAgICAgICAvPShbMC05YS1mQS1GXXsyfSkvZyxcbiAgICAgICAgICAoXywgaGV4KSA9PiBTdHJpbmcuZnJvbUNoYXJDb2RlKHBhcnNlSW50KGhleCwgMTYpKSxcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIHRleHREZWNvZGUoY2hhcnNldCwgdGV4dCk7XG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICB0ZXh0ID0gYXRvYih0ZXh0KTtcbiAgICAgICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1lbXB0eVxuICAgICAgfSBjYXRjaCB7fVxuICAgICAgcmV0dXJuIHRleHREZWNvZGUoY2hhcnNldCwgdGV4dCk7XG4gICAgfSxcbiAgKTtcbn1cblxuZnVuY3Rpb24gcmZjMjIzMWdldFBhcmFtKGhlYWRlcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbWF0Y2hlczogW3N0cmluZywgc3RyaW5nXVtdID0gW107XG4gIGxldCBtYXRjaDogUmVnRXhwRXhlY0FycmF5IHwgbnVsbDtcbiAgd2hpbGUgKChtYXRjaCA9IEZJTEVOQU1FX1NUQVJUX0lURVJfUkVHRVguZXhlYyhoZWFkZXIpKSkge1xuICAgIGNvbnN0IFssIG5zLCBxdW90ZSwgcGFydF0gPSBtYXRjaDtcbiAgICBjb25zdCBuID0gcGFyc2VJbnQobnMsIDEwKTtcbiAgICBpZiAobiBpbiBtYXRjaGVzKSB7XG4gICAgICBpZiAobiA9PT0gMCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBtYXRjaGVzW25dID0gW3F1b3RlLCBwYXJ0XTtcbiAgfVxuICBjb25zdCBwYXJ0czogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChsZXQgbiA9IDA7IG4gPCBtYXRjaGVzLmxlbmd0aDsgKytuKSB7XG4gICAgaWYgKCEobiBpbiBtYXRjaGVzKSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGxldCBbcXVvdGUsIHBhcnRdID0gbWF0Y2hlc1tuXTtcbiAgICBwYXJ0ID0gdW5xdW90ZShwYXJ0KTtcbiAgICBpZiAocXVvdGUpIHtcbiAgICAgIHBhcnQgPSB1bmVzY2FwZShwYXJ0KTtcbiAgICAgIGlmIChuID09PSAwKSB7XG4gICAgICAgIHBhcnQgPSByZmM1OTg3ZGVjb2RlKHBhcnQpO1xuICAgICAgfVxuICAgIH1cbiAgICBwYXJ0cy5wdXNoKHBhcnQpO1xuICB9XG4gIHJldHVybiBwYXJ0cy5qb2luKFwiXCIpO1xufVxuXG5mdW5jdGlvbiByZmM1OTg3ZGVjb2RlKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBlbmNvZGluZ0VuZCA9IHZhbHVlLmluZGV4T2YoYCdgKTtcbiAgaWYgKGVuY29kaW5nRW5kID09PSAtMSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBjb25zdCBlbmNvZGluZyA9IHZhbHVlLnNsaWNlKDAsIGVuY29kaW5nRW5kKTtcbiAgY29uc3QgbGFuZ1ZhbHVlID0gdmFsdWUuc2xpY2UoZW5jb2RpbmdFbmQgKyAxKTtcbiAgcmV0dXJuIHRleHREZWNvZGUoZW5jb2RpbmcsIGxhbmdWYWx1ZS5yZXBsYWNlKC9eW14nXSonLywgXCJcIikpO1xufVxuXG5mdW5jdGlvbiB0ZXh0RGVjb2RlKGVuY29kaW5nOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoZW5jb2RpbmcpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZGVjb2RlciA9IG5ldyBUZXh0RGVjb2RlcihlbmNvZGluZywgeyBmYXRhbDogdHJ1ZSB9KTtcbiAgICAgIGNvbnN0IGJ5dGVzID0gQXJyYXkuZnJvbSh2YWx1ZSwgKGMpID0+IGMuY2hhckNvZGVBdCgwKSk7XG4gICAgICBpZiAoYnl0ZXMuZXZlcnkoKGNvZGUpID0+IGNvZGUgPD0gMHhGRikpIHtcbiAgICAgICAgdmFsdWUgPSBkZWNvZGVyLmRlY29kZShuZXcgVWludDhBcnJheShieXRlcykpO1xuICAgICAgICBuZWVkc0VuY29kaW5nRml4dXAgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZW1wdHlcbiAgICB9IGNhdGNoIHt9XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFBhcnNlIGEgYENvbnRlbnQtRGlzcG9zaXRpb25gIGhlYWRlciB2YWx1ZSB0byByZXRyaWV2ZSB0aGUgZmlsZW5hbWUgb2YgdGhlXG4gKiBmaWxlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZW5hbWUoaGVhZGVyOiBzdHJpbmcpOiBzdHJpbmcge1xuICBuZWVkc0VuY29kaW5nRml4dXAgPSB0cnVlO1xuXG4gIC8vIGZpbGVuYW1lKj1leHQtdmFsdWUgKFwiZXh0LXZhbHVlXCIgZnJvbSBSRkMgNTk4NywgcmVmZXJlbmNlZCBieSBSRkMgNjI2NikuXG4gIGxldCBtYXRjaGVzID0gRklMRU5BTUVfU1RBUl9SRUdFWC5leGVjKGhlYWRlcik7XG4gIGlmIChtYXRjaGVzKSB7XG4gICAgY29uc3QgWywgZmlsZW5hbWVdID0gbWF0Y2hlcztcbiAgICByZXR1cm4gZml4dXBFbmNvZGluZyhcbiAgICAgIHJmYzIwNDdkZWNvZGUocmZjNTk4N2RlY29kZSh1bmVzY2FwZSh1bnF1b3RlKGZpbGVuYW1lKSkpKSxcbiAgICApO1xuICB9XG5cbiAgLy8gQ29udGludWF0aW9ucyAoUkZDIDIyMzEgc2VjdGlvbiAzLCByZWZlcmVuY2VkIGJ5IFJGQyA1OTg3IHNlY3Rpb24gMy4xKS5cbiAgLy8gZmlsZW5hbWUqbio9cGFydFxuICAvLyBmaWxlbmFtZSpuPXBhcnRcbiAgY29uc3QgZmlsZW5hbWUgPSByZmMyMjMxZ2V0UGFyYW0oaGVhZGVyKTtcbiAgaWYgKGZpbGVuYW1lKSB7XG4gICAgcmV0dXJuIGZpeHVwRW5jb2RpbmcocmZjMjA0N2RlY29kZShmaWxlbmFtZSkpO1xuICB9XG5cbiAgLy8gZmlsZW5hbWU9dmFsdWUgKFJGQyA1OTg3LCBzZWN0aW9uIDQuMSkuXG4gIG1hdGNoZXMgPSBGSUxFTkFNRV9SRUdFWC5leGVjKGhlYWRlcik7XG4gIGlmIChtYXRjaGVzKSB7XG4gICAgY29uc3QgWywgZmlsZW5hbWVdID0gbWF0Y2hlcztcbiAgICByZXR1cm4gZml4dXBFbmNvZGluZyhyZmMyMDQ3ZGVjb2RlKHVucXVvdGUoZmlsZW5hbWUpKSk7XG4gIH1cblxuICByZXR1cm4gXCJcIjtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7O0NBU0Ms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