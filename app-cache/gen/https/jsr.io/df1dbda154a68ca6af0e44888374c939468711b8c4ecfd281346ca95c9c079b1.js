// Copyright 2018-2024 the oak authors. All rights reserved. MIT license.
/** With a provided attribute pattern, return a RegExp which will match and
 * capture in the first group the value of the attribute from a header value. */ export function toParamRegExp(attributePattern, flags) {
  // deno-fmt-ignore
  return new RegExp(`(?:^|;)\\s*${attributePattern}\\s*=\\s*` + `(` + `[^";\\s][^;\\s]*` + `|` + `"(?:[^"\\\\]|\\\\"?)+"?` + `)`, flags);
}
/** Unquotes attribute values that might be pass as part of a header. */ export function unquote(value) {
  if (value.startsWith(`"`)) {
    const parts = value.slice(1).split(`\\"`);
    for(let i = 0; i < parts.length; ++i){
      const quoteIndex = parts[i].indexOf(`"`);
      if (quoteIndex !== -1) {
        parts[i] = parts[i].slice(0, quoteIndex);
        parts.length = i + 1; // Truncates and stops the loop
      }
      parts[i] = parts[i].replace(/\\(.)/g, "$1");
    }
    value = parts.join(`"`);
  }
  return value;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvY29tbW9ucy8wLjExLjAvaGVhZGVyX3V0aWxzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjQgdGhlIG9hayBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuLyoqIFdpdGggYSBwcm92aWRlZCBhdHRyaWJ1dGUgcGF0dGVybiwgcmV0dXJuIGEgUmVnRXhwIHdoaWNoIHdpbGwgbWF0Y2ggYW5kXG4gKiBjYXB0dXJlIGluIHRoZSBmaXJzdCBncm91cCB0aGUgdmFsdWUgb2YgdGhlIGF0dHJpYnV0ZSBmcm9tIGEgaGVhZGVyIHZhbHVlLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvUGFyYW1SZWdFeHAoXG4gIGF0dHJpYnV0ZVBhdHRlcm46IHN0cmluZyxcbiAgZmxhZ3M/OiBzdHJpbmcsXG4pOiBSZWdFeHAge1xuICAvLyBkZW5vLWZtdC1pZ25vcmVcbiAgcmV0dXJuIG5ldyBSZWdFeHAoXG4gICAgYCg/Ol58OylcXFxccyoke2F0dHJpYnV0ZVBhdHRlcm59XFxcXHMqPVxcXFxzKmAgK1xuICAgIGAoYCArXG4gICAgICBgW15cIjtcXFxcc11bXjtcXFxcc10qYCArXG4gICAgYHxgICtcbiAgICAgIGBcIig/OlteXCJcXFxcXFxcXF18XFxcXFxcXFxcIj8pK1wiP2AgK1xuICAgIGApYCxcbiAgICBmbGFnc1xuICApO1xufVxuXG4vKiogVW5xdW90ZXMgYXR0cmlidXRlIHZhbHVlcyB0aGF0IG1pZ2h0IGJlIHBhc3MgYXMgcGFydCBvZiBhIGhlYWRlci4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bnF1b3RlKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAodmFsdWUuc3RhcnRzV2l0aChgXCJgKSkge1xuICAgIGNvbnN0IHBhcnRzID0gdmFsdWUuc2xpY2UoMSkuc3BsaXQoYFxcXFxcImApO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIGNvbnN0IHF1b3RlSW5kZXggPSBwYXJ0c1tpXS5pbmRleE9mKGBcImApO1xuICAgICAgaWYgKHF1b3RlSW5kZXggIT09IC0xKSB7XG4gICAgICAgIHBhcnRzW2ldID0gcGFydHNbaV0uc2xpY2UoMCwgcXVvdGVJbmRleCk7XG4gICAgICAgIHBhcnRzLmxlbmd0aCA9IGkgKyAxOyAvLyBUcnVuY2F0ZXMgYW5kIHN0b3BzIHRoZSBsb29wXG4gICAgICB9XG4gICAgICBwYXJ0c1tpXSA9IHBhcnRzW2ldLnJlcGxhY2UoL1xcXFwoLikvZywgXCIkMVwiKTtcbiAgICB9XG4gICAgdmFsdWUgPSBwYXJ0cy5qb2luKGBcImApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSx5RUFBeUU7QUFFekU7OEVBQzhFLEdBQzlFLE9BQU8sU0FBUyxjQUNkLGdCQUF3QixFQUN4QixLQUFjO0VBRWQsa0JBQWtCO0VBQ2xCLE9BQU8sSUFBSSxPQUNULENBQUMsV0FBVyxFQUFFLGlCQUFpQixTQUFTLENBQUMsR0FDekMsQ0FBQyxDQUFDLENBQUMsR0FDRCxDQUFDLGdCQUFnQixDQUFDLEdBQ3BCLENBQUMsQ0FBQyxDQUFDLEdBQ0QsQ0FBQyx1QkFBdUIsQ0FBQyxHQUMzQixDQUFDLENBQUMsQ0FBQyxFQUNIO0FBRUo7QUFFQSxzRUFBc0UsR0FDdEUsT0FBTyxTQUFTLFFBQVEsS0FBYTtFQUNuQyxJQUFJLE1BQU0sVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7SUFDekIsTUFBTSxRQUFRLE1BQU0sS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDO0lBQ3hDLElBQUssSUFBSSxJQUFJLEdBQUcsSUFBSSxNQUFNLE1BQU0sRUFBRSxFQUFFLEVBQUc7TUFDckMsTUFBTSxhQUFhLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO01BQ3ZDLElBQUksZUFBZSxDQUFDLEdBQUc7UUFDckIsS0FBSyxDQUFDLEVBQUUsR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHO1FBQzdCLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRywrQkFBK0I7TUFDdkQ7TUFDQSxLQUFLLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVU7SUFDeEM7SUFDQSxRQUFRLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3hCO0VBQ0EsT0FBTztBQUNUIn0=