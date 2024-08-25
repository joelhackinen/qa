/*!
 * Adapted directly from forwarded-parse at https://github.com/lpinca/forwarded-parse
 * which is licensed as follows:
 *
 * Copyright(c) 2015 Luigi Pinca
 * Copyright(c) 2023 the oak authors
 * MIT Licensed
 */ /**
 * Provides utilities for parsing and validating the `Forwarded` header.
 *
 * @module
 */ import { assert } from "jsr:@std/assert@0.226/assert";
/**
 * Unescape a string.
 *
 * @param str The string to unescape.
 * @returns A new unescaped string.
 */ function decode(value) {
  return value.replace(/\\(.)/g, "$1");
}
/**
 * Check if a character is a delimiter as defined in section 3.2.6 of RFC 7230.
 *
 * @param code The code of the character to check.
 * @returns `true` if the character is a delimiter, else `false`.
 */ function isDelimiter(code) {
  return code === 0x22 || // '"'
  code === 0x28 || // '('
  code === 0x29 || // ')'
  code === 0x2C || // ','
  code === 0x2F || // '/'
  code >= 0x3A && code <= 0x40 || // ':', ';', '<', '=', '>', '?' '@'
  code >= 0x5B && code <= 0x5D || // '[', '\', ']'
  code === 0x7B || // '{'
  code === 0x7D; // '}'
}
/**
 * Check if a character is an extended ASCII character.
 *
 * @param code The code of the character to check.
 * @returns `true` if `code` is in the %x80-FF range, else `false`.
 */ function isExtended(code) {
  return code >= 0x80 && code <= 0xFF;
}
/**
 * Check if a character is a printable ASCII character.
 *
 * @param code The code of the character to check.
 * @returns `true` if `code` is in the %x20-7E range, else `false`.
 */ function isPrint(code) {
  return code >= 0x20 && code <= 0x7E;
}
/**
 * Check if a character is allowed in a token as defined in section 3.2.6
 * of RFC 7230.
 *
 * @param code The code of the character to check.
 * @returns `true` if the character is allowed, else `false`.
 */ function isTokenChar(code) {
  return code === 0x21 || // '!'
  code >= 0x23 && code <= 0x27 || // '#', '$', '%', '&', '''
  code === 0x2A || // '*'
  code === 0x2B || // '+'
  code === 0x2D || // '-'
  code === 0x2E || // '.'
  code >= 0x30 && code <= 0x39 || // 0-9
  code >= 0x41 && code <= 0x5A || // A-Z
  code >= 0x5E && code <= 0x7A || // '^', '_', '`', a-z
  code === 0x7C || // '|'
  code === 0x7E; // '~'
}
/**
 * Parse the `Forwarded` header field value into an array of objects. If the
 * value is not parsable, `undefined` is returned.
 *
 * @param value The header field value.
 */ export function parse(value) {
  let parameter;
  let start = -1;
  let end = -1;
  let isEscaping = false;
  let inQuotes = false;
  let mustUnescape = false;
  let code;
  let forwarded = {};
  const output = [];
  let i;
  for(i = 0; i < value.length; i++){
    code = value.charCodeAt(i);
    if (parameter === undefined) {
      if (i !== 0 && start === -1 && (code === 0x20 || code === 0x09)) {
        continue;
      }
      if (isTokenChar(code)) {
        if (start === -1) {
          start = i;
        }
      } else if (code === 0x3D && start !== -1) {
        parameter = value.slice(start, i).toLowerCase();
        start = -1;
      } else {
        return undefined;
      }
    } else {
      if (isEscaping && (code === 0x09 || isPrint(code) || isExtended(code))) {
        isEscaping = false;
      } else if (isTokenChar(code)) {
        if (end !== -1) {
          return undefined;
        }
        if (start === -1) {
          start = i;
        }
      } else if (isDelimiter(code) || isExtended(code)) {
        if (inQuotes) {
          if (code === 0x22) {
            inQuotes = false;
            end = i;
          } else if (code === 0x5C) {
            if (start === -1) {
              start = i;
            }
            isEscaping = mustUnescape = true;
          } else if (start === -1) {
            start = i;
          }
        } else if (code === 0x22 && value.charCodeAt(i - 1) === 0x3D) {
          inQuotes = true;
        } else if ((code === 0x2C || code === 0x3B) && (start !== -1 || end !== -1)) {
          assert(parameter, "Variable 'parameter' not defined.");
          if (start !== -1) {
            if (end === -1) {
              end = i;
            }
            forwarded[parameter] = mustUnescape ? decode(value.slice(start, end)) : value.slice(start, end);
          } else {
            forwarded[parameter] = "";
          }
          if (code === 0x2C) {
            output.push(forwarded);
            forwarded = {};
          }
          parameter = undefined;
          start = end = -1;
        } else {
          return undefined;
        }
      } else if (code === 0x20 || code === 0x09) {
        if (end !== -1) {
          continue;
        }
        if (inQuotes) {
          if (start === -1) {
            start = i;
          }
        } else if (start !== -1) {
          end = i;
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    }
  }
  if (parameter === undefined || inQuotes || start === -1 && end === -1 || code === 0x20 || code === 0x09) {
    return undefined;
  }
  if (start !== -1) {
    if (end === -1) {
      end = i;
    }
    forwarded[parameter] = mustUnescape ? decode(value.slice(start, end)) : value.slice(start, end);
  } else {
    forwarded[parameter] = "";
  }
  output.push(forwarded);
  return output;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvY29tbW9ucy8wLjExLjAvZm9yd2FyZGVkLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogQWRhcHRlZCBkaXJlY3RseSBmcm9tIGZvcndhcmRlZC1wYXJzZSBhdCBodHRwczovL2dpdGh1Yi5jb20vbHBpbmNhL2ZvcndhcmRlZC1wYXJzZVxuICogd2hpY2ggaXMgbGljZW5zZWQgYXMgZm9sbG93czpcbiAqXG4gKiBDb3B5cmlnaHQoYykgMjAxNSBMdWlnaSBQaW5jYVxuICogQ29weXJpZ2h0KGMpIDIwMjMgdGhlIG9hayBhdXRob3JzXG4gKiBNSVQgTGljZW5zZWRcbiAqL1xuXG4vKipcbiAqIFByb3ZpZGVzIHV0aWxpdGllcyBmb3IgcGFyc2luZyBhbmQgdmFsaWRhdGluZyB0aGUgYEZvcndhcmRlZGAgaGVhZGVyLlxuICpcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyBhc3NlcnQgfSBmcm9tIFwianNyOkBzdGQvYXNzZXJ0QDAuMjI2L2Fzc2VydFwiO1xuXG4vKipcbiAqIFVuZXNjYXBlIGEgc3RyaW5nLlxuICpcbiAqIEBwYXJhbSBzdHIgVGhlIHN0cmluZyB0byB1bmVzY2FwZS5cbiAqIEByZXR1cm5zIEEgbmV3IHVuZXNjYXBlZCBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIGRlY29kZSh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHZhbHVlLnJlcGxhY2UoL1xcXFwoLikvZywgXCIkMVwiKTtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBhIGNoYXJhY3RlciBpcyBhIGRlbGltaXRlciBhcyBkZWZpbmVkIGluIHNlY3Rpb24gMy4yLjYgb2YgUkZDIDcyMzAuXG4gKlxuICogQHBhcmFtIGNvZGUgVGhlIGNvZGUgb2YgdGhlIGNoYXJhY3RlciB0byBjaGVjay5cbiAqIEByZXR1cm5zIGB0cnVlYCBpZiB0aGUgY2hhcmFjdGVyIGlzIGEgZGVsaW1pdGVyLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzRGVsaW1pdGVyKGNvZGU6IG51bWJlcik6IGJvb2xlYW4ge1xuICByZXR1cm4gY29kZSA9PT0gMHgyMiB8fCAvLyAnXCInXG4gICAgY29kZSA9PT0gMHgyOCB8fCAvLyAnKCdcbiAgICBjb2RlID09PSAweDI5IHx8IC8vICcpJ1xuICAgIGNvZGUgPT09IDB4MkMgfHwgLy8gJywnXG4gICAgY29kZSA9PT0gMHgyRiB8fCAvLyAnLydcbiAgICBjb2RlID49IDB4M0EgJiYgY29kZSA8PSAweDQwIHx8IC8vICc6JywgJzsnLCAnPCcsICc9JywgJz4nLCAnPycgJ0AnXG4gICAgY29kZSA+PSAweDVCICYmIGNvZGUgPD0gMHg1RCB8fCAvLyAnWycsICdcXCcsICddJ1xuICAgIGNvZGUgPT09IDB4N0IgfHwgLy8gJ3snXG4gICAgY29kZSA9PT0gMHg3RDsgLy8gJ30nXG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYSBjaGFyYWN0ZXIgaXMgYW4gZXh0ZW5kZWQgQVNDSUkgY2hhcmFjdGVyLlxuICpcbiAqIEBwYXJhbSBjb2RlIFRoZSBjb2RlIG9mIHRoZSBjaGFyYWN0ZXIgdG8gY2hlY2suXG4gKiBAcmV0dXJucyBgdHJ1ZWAgaWYgYGNvZGVgIGlzIGluIHRoZSAleDgwLUZGIHJhbmdlLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzRXh0ZW5kZWQoY29kZTogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBjb2RlID49IDB4ODAgJiYgY29kZSA8PSAweEZGO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGEgY2hhcmFjdGVyIGlzIGEgcHJpbnRhYmxlIEFTQ0lJIGNoYXJhY3Rlci5cbiAqXG4gKiBAcGFyYW0gY29kZSBUaGUgY29kZSBvZiB0aGUgY2hhcmFjdGVyIHRvIGNoZWNrLlxuICogQHJldHVybnMgYHRydWVgIGlmIGBjb2RlYCBpcyBpbiB0aGUgJXgyMC03RSByYW5nZSwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc1ByaW50KGNvZGU6IG51bWJlcik6IGJvb2xlYW4ge1xuICByZXR1cm4gY29kZSA+PSAweDIwICYmIGNvZGUgPD0gMHg3RTtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBhIGNoYXJhY3RlciBpcyBhbGxvd2VkIGluIGEgdG9rZW4gYXMgZGVmaW5lZCBpbiBzZWN0aW9uIDMuMi42XG4gKiBvZiBSRkMgNzIzMC5cbiAqXG4gKiBAcGFyYW0gY29kZSBUaGUgY29kZSBvZiB0aGUgY2hhcmFjdGVyIHRvIGNoZWNrLlxuICogQHJldHVybnMgYHRydWVgIGlmIHRoZSBjaGFyYWN0ZXIgaXMgYWxsb3dlZCwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc1Rva2VuQ2hhcihjb2RlOiBudW1iZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIGNvZGUgPT09IDB4MjEgfHwgLy8gJyEnXG4gICAgY29kZSA+PSAweDIzICYmIGNvZGUgPD0gMHgyNyB8fCAvLyAnIycsICckJywgJyUnLCAnJicsICcnJ1xuICAgIGNvZGUgPT09IDB4MkEgfHwgLy8gJyonXG4gICAgY29kZSA9PT0gMHgyQiB8fCAvLyAnKydcbiAgICBjb2RlID09PSAweDJEIHx8IC8vICctJ1xuICAgIGNvZGUgPT09IDB4MkUgfHwgLy8gJy4nXG4gICAgY29kZSA+PSAweDMwICYmIGNvZGUgPD0gMHgzOSB8fCAvLyAwLTlcbiAgICBjb2RlID49IDB4NDEgJiYgY29kZSA8PSAweDVBIHx8IC8vIEEtWlxuICAgIGNvZGUgPj0gMHg1RSAmJiBjb2RlIDw9IDB4N0EgfHwgLy8gJ14nLCAnXycsICdgJywgYS16XG4gICAgY29kZSA9PT0gMHg3QyB8fCAvLyAnfCdcbiAgICBjb2RlID09PSAweDdFOyAvLyAnfidcbn1cblxuLyoqXG4gKiBQYXJzZSB0aGUgYEZvcndhcmRlZGAgaGVhZGVyIGZpZWxkIHZhbHVlIGludG8gYW4gYXJyYXkgb2Ygb2JqZWN0cy4gSWYgdGhlXG4gKiB2YWx1ZSBpcyBub3QgcGFyc2FibGUsIGB1bmRlZmluZWRgIGlzIHJldHVybmVkLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSBUaGUgaGVhZGVyIGZpZWxkIHZhbHVlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2UodmFsdWU6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5bXSB8IHVuZGVmaW5lZCB7XG4gIGxldCBwYXJhbWV0ZXI6IHVuZGVmaW5lZCB8IHN0cmluZztcbiAgbGV0IHN0YXJ0ID0gLTE7XG4gIGxldCBlbmQgPSAtMTtcbiAgbGV0IGlzRXNjYXBpbmcgPSBmYWxzZTtcbiAgbGV0IGluUXVvdGVzID0gZmFsc2U7XG4gIGxldCBtdXN0VW5lc2NhcGUgPSBmYWxzZTtcblxuICBsZXQgY29kZTtcbiAgbGV0IGZvcndhcmRlZDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICBjb25zdCBvdXRwdXQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5bXSA9IFtdO1xuICBsZXQgaTtcblxuICBmb3IgKGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICBjb2RlID0gdmFsdWUuY2hhckNvZGVBdChpKTtcblxuICAgIGlmIChwYXJhbWV0ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKGkgIT09IDAgJiYgc3RhcnQgPT09IC0xICYmIChjb2RlID09PSAweDIwIHx8IGNvZGUgPT09IDB4MDkpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXNUb2tlbkNoYXIoY29kZSkpIHtcbiAgICAgICAgaWYgKHN0YXJ0ID09PSAtMSkge1xuICAgICAgICAgIHN0YXJ0ID0gaTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjb2RlID09PSAweDNEICYmIHN0YXJ0ICE9PSAtMSkge1xuICAgICAgICBwYXJhbWV0ZXIgPSB2YWx1ZS5zbGljZShzdGFydCwgaSkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgc3RhcnQgPSAtMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChcbiAgICAgICAgaXNFc2NhcGluZyAmJiAoY29kZSA9PT0gMHgwOSB8fCBpc1ByaW50KGNvZGUpIHx8IGlzRXh0ZW5kZWQoY29kZSkpXG4gICAgICApIHtcbiAgICAgICAgaXNFc2NhcGluZyA9IGZhbHNlO1xuICAgICAgfSBlbHNlIGlmIChpc1Rva2VuQ2hhcihjb2RlKSkge1xuICAgICAgICBpZiAoZW5kICE9PSAtMSkge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0YXJ0ID09PSAtMSkge1xuICAgICAgICAgIHN0YXJ0ID0gaTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChpc0RlbGltaXRlcihjb2RlKSB8fCBpc0V4dGVuZGVkKGNvZGUpKSB7XG4gICAgICAgIGlmIChpblF1b3Rlcykge1xuICAgICAgICAgIGlmIChjb2RlID09PSAweDIyKSB7XG4gICAgICAgICAgICBpblF1b3RlcyA9IGZhbHNlO1xuICAgICAgICAgICAgZW5kID0gaTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNvZGUgPT09IDB4NUMpIHtcbiAgICAgICAgICAgIGlmIChzdGFydCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgc3RhcnQgPSBpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaXNFc2NhcGluZyA9IG11c3RVbmVzY2FwZSA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChzdGFydCA9PT0gLTEpIHtcbiAgICAgICAgICAgIHN0YXJ0ID0gaTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY29kZSA9PT0gMHgyMiAmJiB2YWx1ZS5jaGFyQ29kZUF0KGkgLSAxKSA9PT0gMHgzRCkge1xuICAgICAgICAgIGluUXVvdGVzID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAoY29kZSA9PT0gMHgyQyB8fCBjb2RlID09PSAweDNCKSAmJiAoc3RhcnQgIT09IC0xIHx8IGVuZCAhPT0gLTEpXG4gICAgICAgICkge1xuICAgICAgICAgIGFzc2VydChwYXJhbWV0ZXIsIFwiVmFyaWFibGUgJ3BhcmFtZXRlcicgbm90IGRlZmluZWQuXCIpO1xuICAgICAgICAgIGlmIChzdGFydCAhPT0gLTEpIHtcbiAgICAgICAgICAgIGlmIChlbmQgPT09IC0xKSB7XG4gICAgICAgICAgICAgIGVuZCA9IGk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvcndhcmRlZFtwYXJhbWV0ZXJdID0gbXVzdFVuZXNjYXBlXG4gICAgICAgICAgICAgID8gZGVjb2RlKHZhbHVlLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICAgICAgICAgICAgICA6IHZhbHVlLnNsaWNlKHN0YXJ0LCBlbmQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3J3YXJkZWRbcGFyYW1ldGVyXSA9IFwiXCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGNvZGUgPT09IDB4MkMpIHtcbiAgICAgICAgICAgIG91dHB1dC5wdXNoKGZvcndhcmRlZCk7XG4gICAgICAgICAgICBmb3J3YXJkZWQgPSB7fTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBwYXJhbWV0ZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgc3RhcnQgPSBlbmQgPSAtMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGNvZGUgPT09IDB4MjAgfHwgY29kZSA9PT0gMHgwOSkge1xuICAgICAgICBpZiAoZW5kICE9PSAtMSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGluUXVvdGVzKSB7XG4gICAgICAgICAgaWYgKHN0YXJ0ID09PSAtMSkge1xuICAgICAgICAgICAgc3RhcnQgPSBpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChzdGFydCAhPT0gLTEpIHtcbiAgICAgICAgICBlbmQgPSBpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKFxuICAgIHBhcmFtZXRlciA9PT0gdW5kZWZpbmVkIHx8IGluUXVvdGVzIHx8IChzdGFydCA9PT0gLTEgJiYgZW5kID09PSAtMSkgfHxcbiAgICBjb2RlID09PSAweDIwIHx8IGNvZGUgPT09IDB4MDlcbiAgKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlmIChzdGFydCAhPT0gLTEpIHtcbiAgICBpZiAoZW5kID09PSAtMSkge1xuICAgICAgZW5kID0gaTtcbiAgICB9XG4gICAgZm9yd2FyZGVkW3BhcmFtZXRlcl0gPSBtdXN0VW5lc2NhcGVcbiAgICAgID8gZGVjb2RlKHZhbHVlLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICAgICAgOiB2YWx1ZS5zbGljZShzdGFydCwgZW5kKTtcbiAgfSBlbHNlIHtcbiAgICBmb3J3YXJkZWRbcGFyYW1ldGVyXSA9IFwiXCI7XG4gIH1cblxuICBvdXRwdXQucHVzaChmb3J3YXJkZWQpO1xuICByZXR1cm4gb3V0cHV0O1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7O0NBT0MsR0FFRDs7OztDQUlDLEdBRUQsU0FBUyxNQUFNLFFBQVEsK0JBQStCO0FBRXREOzs7OztDQUtDLEdBQ0QsU0FBUyxPQUFPLEtBQWE7RUFDM0IsT0FBTyxNQUFNLE9BQU8sQ0FBQyxVQUFVO0FBQ2pDO0FBRUE7Ozs7O0NBS0MsR0FDRCxTQUFTLFlBQVksSUFBWTtFQUMvQixPQUFPLFNBQVMsUUFBUSxNQUFNO0VBQzVCLFNBQVMsUUFBUSxNQUFNO0VBQ3ZCLFNBQVMsUUFBUSxNQUFNO0VBQ3ZCLFNBQVMsUUFBUSxNQUFNO0VBQ3ZCLFNBQVMsUUFBUSxNQUFNO0VBQ3ZCLFFBQVEsUUFBUSxRQUFRLFFBQVEsbUNBQW1DO0VBQ25FLFFBQVEsUUFBUSxRQUFR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