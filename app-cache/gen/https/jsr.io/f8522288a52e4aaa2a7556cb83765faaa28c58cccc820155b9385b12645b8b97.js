// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
const WHITESPACE_ENCODINGS = {
  "\u0009": "%09",
  "\u000A": "%0A",
  "\u000B": "%0B",
  "\u000C": "%0C",
  "\u000D": "%0D",
  "\u0020": "%20"
};
export function encodeWhitespace(string) {
  return string.replaceAll(/[\s]/g, (c)=>{
    return WHITESPACE_ENCODINGS[c] ?? c;
  });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvcGF0aC8wLjIyMy4wL19jb21tb24vdG9fZmlsZV91cmwudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNCB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cblxuY29uc3QgV0hJVEVTUEFDRV9FTkNPRElOR1M6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIFwiXFx1MDAwOVwiOiBcIiUwOVwiLFxuICBcIlxcdTAwMEFcIjogXCIlMEFcIixcbiAgXCJcXHUwMDBCXCI6IFwiJTBCXCIsXG4gIFwiXFx1MDAwQ1wiOiBcIiUwQ1wiLFxuICBcIlxcdTAwMERcIjogXCIlMERcIixcbiAgXCJcXHUwMDIwXCI6IFwiJTIwXCIsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZW5jb2RlV2hpdGVzcGFjZShzdHJpbmc6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBzdHJpbmcucmVwbGFjZUFsbCgvW1xcc10vZywgKGMpID0+IHtcbiAgICByZXR1cm4gV0hJVEVTUEFDRV9FTkNPRElOR1NbY10gPz8gYztcbiAgfSk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFLHFDQUFxQztBQUVyQyxNQUFNLHVCQUErQztFQUNuRCxVQUFVO0VBQ1YsVUFBVTtFQUNWLFVBQVU7RUFDVixVQUFVO0VBQ1YsVUFBVTtFQUNWLFVBQVU7QUFDWjtBQUVBLE9BQU8sU0FBUyxpQkFBaUIsTUFBYztFQUM3QyxPQUFPLE9BQU8sVUFBVSxDQUFDLFNBQVMsQ0FBQztJQUNqQyxPQUFPLG9CQUFvQixDQUFDLEVBQUUsSUFBSTtFQUNwQztBQUNGIn0=