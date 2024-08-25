// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
/**
 * Error thrown when an assertion fails.
 *
 * @example Usage
 * ```ts no-eval
 * import { AssertionError } from "@std/assert/assertion-error";
 *
 * throw new AssertionError("Assertion failed");
 * ```
 */ export class AssertionError extends Error {
  /** Constructs a new instance.
   *
   * @example Usage
   * ```ts no-eval
   * import { AssertionError } from "@std/assert/assertion-error";
   *
   * throw new AssertionError("Assertion failed");
   * ```
   *
   * @param message The error message.
   */ constructor(message){
    super(message);
    this.name = "AssertionError";
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvYXNzZXJ0LzAuMjI2LjAvYXNzZXJ0aW9uX2Vycm9yLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjQgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG4vLyBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG5cbi8qKlxuICogRXJyb3IgdGhyb3duIHdoZW4gYW4gYXNzZXJ0aW9uIGZhaWxzLlxuICpcbiAqIEBleGFtcGxlIFVzYWdlXG4gKiBgYGB0cyBuby1ldmFsXG4gKiBpbXBvcnQgeyBBc3NlcnRpb25FcnJvciB9IGZyb20gXCJAc3RkL2Fzc2VydC9hc3NlcnRpb24tZXJyb3JcIjtcbiAqXG4gKiB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IoXCJBc3NlcnRpb24gZmFpbGVkXCIpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBBc3NlcnRpb25FcnJvciBleHRlbmRzIEVycm9yIHtcbiAgLyoqIENvbnN0cnVjdHMgYSBuZXcgaW5zdGFuY2UuXG4gICAqXG4gICAqIEBleGFtcGxlIFVzYWdlXG4gICAqIGBgYHRzIG5vLWV2YWxcbiAgICogaW1wb3J0IHsgQXNzZXJ0aW9uRXJyb3IgfSBmcm9tIFwiQHN0ZC9hc3NlcnQvYXNzZXJ0aW9uLWVycm9yXCI7XG4gICAqXG4gICAqIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihcIkFzc2VydGlvbiBmYWlsZWRcIik7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gbWVzc2FnZSBUaGUgZXJyb3IgbWVzc2FnZS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZykge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9IFwiQXNzZXJ0aW9uRXJyb3JcIjtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUMxRSxxQ0FBcUM7QUFFckM7Ozs7Ozs7OztDQVNDLEdBQ0QsT0FBTyxNQUFNLHVCQUF1QjtFQUNsQzs7Ozs7Ozs7OztHQVVDLEdBQ0QsWUFBWSxPQUFlLENBQUU7SUFDM0IsS0FBSyxDQUFDO0lBQ04sSUFBSSxDQUFDLElBQUksR0FBRztFQUNkO0FBQ0YifQ==