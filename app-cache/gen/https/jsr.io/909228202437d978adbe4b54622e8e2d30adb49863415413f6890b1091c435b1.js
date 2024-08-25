// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
// Keep this up-to-date with Deno.build.os
export const osType = (()=>{
  // deno-lint-ignore no-explicit-any
  const { Deno } = globalThis;
  if (typeof Deno?.build?.os === "string") {
    return Deno.build.os;
  }
  // deno-lint-ignore no-explicit-any
  const { navigator } = globalThis;
  if (navigator?.appVersion?.includes?.("Win")) {
    return "windows";
  }
  return "linux";
})();
export const isWindows = osType === "windows";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvcGF0aC8wLjIyMy4wL19vcy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI0IHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG4vLyBLZWVwIHRoaXMgdXAtdG8tZGF0ZSB3aXRoIERlbm8uYnVpbGQub3NcbmV4cG9ydCB0eXBlIE9TVHlwZSA9XG4gIHwgXCJkYXJ3aW5cIlxuICB8IFwibGludXhcIlxuICB8IFwid2luZG93c1wiXG4gIHwgXCJmcmVlYnNkXCJcbiAgfCBcIm5ldGJzZFwiXG4gIHwgXCJhaXhcIlxuICB8IFwic29sYXJpc1wiXG4gIHwgXCJpbGx1bW9zXCI7XG5cbmV4cG9ydCBjb25zdCBvc1R5cGU6IE9TVHlwZSA9ICgoKSA9PiB7XG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIGNvbnN0IHsgRGVubyB9ID0gZ2xvYmFsVGhpcyBhcyBhbnk7XG4gIGlmICh0eXBlb2YgRGVubz8uYnVpbGQ/Lm9zID09PSBcInN0cmluZ1wiKSB7XG4gICAgcmV0dXJuIERlbm8uYnVpbGQub3M7XG4gIH1cblxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBjb25zdCB7IG5hdmlnYXRvciB9ID0gZ2xvYmFsVGhpcyBhcyBhbnk7XG4gIGlmIChuYXZpZ2F0b3I/LmFwcFZlcnNpb24/LmluY2x1ZGVzPy4oXCJXaW5cIikpIHtcbiAgICByZXR1cm4gXCJ3aW5kb3dzXCI7XG4gIH1cblxuICByZXR1cm4gXCJsaW51eFwiO1xufSkoKTtcblxuZXhwb3J0IGNvbnN0IGlzV2luZG93cyA9IG9zVHlwZSA9PT0gXCJ3aW5kb3dzXCI7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFLHFDQUFxQztBQUVyQywwQ0FBMEM7QUFXMUMsT0FBTyxNQUFNLFNBQWlCLENBQUM7RUFDN0IsbUNBQW1DO0VBQ25DLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRztFQUNqQixJQUFJLE9BQU8sTUFBTSxPQUFPLE9BQU8sVUFBVTtJQUN2QyxPQUFPLEtBQUssS0FBSyxDQUFDLEVBQUU7RUFDdEI7RUFFQSxtQ0FBbUM7RUFDbkMsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHO0VBQ3RCLElBQUksV0FBVyxZQUFZLFdBQVcsUUFBUTtJQUM1QyxPQUFPO0VBQ1Q7RUFFQSxPQUFPO0FBQ1QsQ0FBQyxJQUFJO0FBRUwsT0FBTyxNQUFNLFlBQVksV0FBVyxVQUFVIn0=