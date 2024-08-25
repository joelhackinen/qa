// Copyright 2018-2024 the oak authors. All rights reserved. MIT license.
/**
 * A collection of HTTP errors and utilities.
 *
 * The export {@linkcode errors} contains an individual class that extends
 * {@linkcode HttpError} which makes handling HTTP errors in a structured way.
 *
 * The function {@linkcode createHttpError} provides a way to create instances
 * of errors in a factory pattern.
 *
 * The function {@linkcode isHttpError} is a type guard that will narrow a value
 * to an `HttpError` instance.
 *
 * @example
 * ```ts
 * import { errors, isHttpError } from "jsr:@oak/commons/http_errors";
 *
 * try {
 *   throw new errors.NotFound();
 * } catch (e) {
 *   if (isHttpError(e)) {
 *     const response = new Response(e.message, { status: e.status });
 *   } else {
 *     throw e;
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * import { createHttpError } from "jsr:@oak/commons/http_errors";
 * import { Status } from "jsr:@oak/commons/status";
 *
 * try {
 *   throw createHttpError(
 *     Status.BadRequest,
 *     "The request was bad.",
 *     { expose: false }
 *   );
 * } catch (e) {
 *   // handle errors
 * }
 * ```
 *
 * @module
 */ import { isClientErrorStatus, Status, STATUS_TEXT } from "./status.ts";
const ERROR_STATUS_MAP = {
  "BadRequest": 400,
  "Unauthorized": 401,
  "PaymentRequired": 402,
  "Forbidden": 403,
  "NotFound": 404,
  "MethodNotAllowed": 405,
  "NotAcceptable": 406,
  "ProxyAuthRequired": 407,
  "RequestTimeout": 408,
  "Conflict": 409,
  "Gone": 410,
  "LengthRequired": 411,
  "PreconditionFailed": 412,
  "RequestEntityTooLarge": 413,
  "RequestURITooLong": 414,
  "UnsupportedMediaType": 415,
  "RequestedRangeNotSatisfiable": 416,
  "ExpectationFailed": 417,
  "Teapot": 418,
  "MisdirectedRequest": 421,
  "UnprocessableEntity": 422,
  "Locked": 423,
  "FailedDependency": 424,
  "UpgradeRequired": 426,
  "PreconditionRequired": 428,
  "TooManyRequests": 429,
  "RequestHeaderFieldsTooLarge": 431,
  "UnavailableForLegalReasons": 451,
  "InternalServerError": 500,
  "NotImplemented": 501,
  "BadGateway": 502,
  "ServiceUnavailable": 503,
  "GatewayTimeout": 504,
  "HTTPVersionNotSupported": 505,
  "VariantAlsoNegotiates": 506,
  "InsufficientStorage": 507,
  "LoopDetected": 508,
  "NotExtended": 510,
  "NetworkAuthenticationRequired": 511
};
/**
 * The base class that all derivative HTTP extend, providing a `status` and an
 * `expose` property.
 */ export class HttpError extends Error {
  #status = Status.InternalServerError;
  #expose;
  #headers;
  constructor(message = "Http Error", options){
    super(message, options);
    this.#expose = options?.expose === undefined ? isClientErrorStatus(this.status) : options.expose;
    if (options?.headers) {
      this.#headers = new Headers(options.headers);
    }
  }
  /** A flag to indicate if the internals of the error, like the stack, should
   * be exposed to a client, or if they are "private" and should not be leaked.
   * By default, all client errors are `true` and all server errors are
   * `false`. */ get expose() {
    return this.#expose;
  }
  /** The optional headers object that is set on the error. */ get headers() {
    return this.#headers;
  }
  /** The error status that is set on the error. */ get status() {
    return this.#status;
  }
}
function createHttpErrorConstructor(status) {
  const name = `${Status[status]}Error`;
  const ErrorCtor = class extends HttpError {
    constructor(message = STATUS_TEXT[status], options){
      super(message, options);
      Object.defineProperty(this, "name", {
        configurable: true,
        enumerable: false,
        value: name,
        writable: true
      });
    }
    get status() {
      return status;
    }
  };
  return ErrorCtor;
}
/**
 * A namespace that contains each error constructor. Each error extends
 * `HTTPError` and provides `.status` and `.expose` properties, where the
 * `.status` will be an error `Status` value and `.expose` indicates if
 * information, like a stack trace, should be shared in the response.
 *
 * By default, `.expose` is set to false in server errors, and true for client
 * errors.
 *
 * @example
 * ```ts
 * import { errors } from "jsr:@oak/commons/http_errors";
 *
 * throw new errors.InternalServerError("Ooops!");
 * ```
 */ export const errors = {};
for (const [key, value] of Object.entries(ERROR_STATUS_MAP)){
  errors[key] = createHttpErrorConstructor(value);
}
/**
 * A factory function which provides a way to create errors. It takes up to 3
 * arguments, the error `Status`, an message, which defaults to the status text
 * and error options, which includes the `expose` property to set the `.expose`
 * value on the error.
 */ export function createHttpError(status = Status.InternalServerError, message, options) {
  return new errors[Status[status]](message, options);
}
/**
 * A type guard that determines if the value is an HttpError or not.
 */ export function isHttpError(value) {
  return value instanceof HttpError;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvY29tbW9ucy8wLjExLjAvaHR0cF9lcnJvcnMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNCB0aGUgb2FrIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuXG4vKipcbiAqIEEgY29sbGVjdGlvbiBvZiBIVFRQIGVycm9ycyBhbmQgdXRpbGl0aWVzLlxuICpcbiAqIFRoZSBleHBvcnQge0BsaW5rY29kZSBlcnJvcnN9IGNvbnRhaW5zIGFuIGluZGl2aWR1YWwgY2xhc3MgdGhhdCBleHRlbmRzXG4gKiB7QGxpbmtjb2RlIEh0dHBFcnJvcn0gd2hpY2ggbWFrZXMgaGFuZGxpbmcgSFRUUCBlcnJvcnMgaW4gYSBzdHJ1Y3R1cmVkIHdheS5cbiAqXG4gKiBUaGUgZnVuY3Rpb24ge0BsaW5rY29kZSBjcmVhdGVIdHRwRXJyb3J9IHByb3ZpZGVzIGEgd2F5IHRvIGNyZWF0ZSBpbnN0YW5jZXNcbiAqIG9mIGVycm9ycyBpbiBhIGZhY3RvcnkgcGF0dGVybi5cbiAqXG4gKiBUaGUgZnVuY3Rpb24ge0BsaW5rY29kZSBpc0h0dHBFcnJvcn0gaXMgYSB0eXBlIGd1YXJkIHRoYXQgd2lsbCBuYXJyb3cgYSB2YWx1ZVxuICogdG8gYW4gYEh0dHBFcnJvcmAgaW5zdGFuY2UuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBlcnJvcnMsIGlzSHR0cEVycm9yIH0gZnJvbSBcImpzcjpAb2FrL2NvbW1vbnMvaHR0cF9lcnJvcnNcIjtcbiAqXG4gKiB0cnkge1xuICogICB0aHJvdyBuZXcgZXJyb3JzLk5vdEZvdW5kKCk7XG4gKiB9IGNhdGNoIChlKSB7XG4gKiAgIGlmIChpc0h0dHBFcnJvcihlKSkge1xuICogICAgIGNvbnN0IHJlc3BvbnNlID0gbmV3IFJlc3BvbnNlKGUubWVzc2FnZSwgeyBzdGF0dXM6IGUuc3RhdHVzIH0pO1xuICogICB9IGVsc2Uge1xuICogICAgIHRocm93IGU7XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgY3JlYXRlSHR0cEVycm9yIH0gZnJvbSBcImpzcjpAb2FrL2NvbW1vbnMvaHR0cF9lcnJvcnNcIjtcbiAqIGltcG9ydCB7IFN0YXR1cyB9IGZyb20gXCJqc3I6QG9hay9jb21tb25zL3N0YXR1c1wiO1xuICpcbiAqIHRyeSB7XG4gKiAgIHRocm93IGNyZWF0ZUh0dHBFcnJvcihcbiAqICAgICBTdGF0dXMuQmFkUmVxdWVzdCxcbiAqICAgICBcIlRoZSByZXF1ZXN0IHdhcyBiYWQuXCIsXG4gKiAgICAgeyBleHBvc2U6IGZhbHNlIH1cbiAqICAgKTtcbiAqIH0gY2F0Y2ggKGUpIHtcbiAqICAgLy8gaGFuZGxlIGVycm9yc1xuICogfVxuICogYGBgXG4gKlxuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7XG4gIHR5cGUgRXJyb3JTdGF0dXMsXG4gIGlzQ2xpZW50RXJyb3JTdGF0dXMsXG4gIFN0YXR1cyxcbiAgU1RBVFVTX1RFWFQsXG59IGZyb20gXCIuL3N0YXR1cy50c1wiO1xuXG5jb25zdCBFUlJPUl9TVEFUVVNfTUFQID0ge1xuICBcIkJhZFJlcXVlc3RcIjogNDAwLFxuICBcIlVuYXV0aG9yaXplZFwiOiA0MDEsXG4gIFwiUGF5bWVudFJlcXVpcmVkXCI6IDQwMixcbiAgXCJGb3JiaWRkZW5cIjogNDAzLFxuICBcIk5vdEZvdW5kXCI6IDQwNCxcbiAgXCJNZXRob2ROb3RBbGxvd2VkXCI6IDQwNSxcbiAgXCJOb3RBY2NlcHRhYmxlXCI6IDQwNixcbiAgXCJQcm94eUF1dGhSZXF1aXJlZFwiOiA0MDcsXG4gIFwiUmVxdWVzdFRpbWVvdXRcIjogNDA4LFxuICBcIkNvbmZsaWN0XCI6IDQwOSxcbiAgXCJHb25lXCI6IDQxMCxcbiAgXCJMZW5ndGhSZXF1aXJlZFwiOiA0MTEsXG4gIFwiUHJlY29uZGl0aW9uRmFpbGVkXCI6IDQxMixcbiAgXCJSZXF1ZXN0RW50aXR5VG9vTGFyZ2VcIjogNDEzLFxuICBcIlJlcXVlc3RVUklUb29Mb25nXCI6IDQxNCxcbiAgXCJVbnN1cHBvcnRlZE1lZGlhVHlwZVwiOiA0MTUsXG4gIFwiUmVxdWVzdGVkUmFuZ2VOb3RTYXRpc2ZpYWJsZVwiOiA0MTYsXG4gIFwiRXhwZWN0YXRpb25GYWlsZWRcIjogNDE3LFxuICBcIlRlYXBvdFwiOiA0MTgsXG4gIFwiTWlzZGlyZWN0ZWRSZXF1ZXN0XCI6IDQyMSxcbiAgXCJVbnByb2Nlc3NhYmxlRW50aXR5XCI6IDQyMixcbiAgXCJMb2NrZWRcIjogNDIzLFxuICBcIkZhaWxlZERlcGVuZGVuY3lcIjogNDI0LFxuICBcIlVwZ3JhZGVSZXF1aXJlZFwiOiA0MjYsXG4gIFwiUHJlY29uZGl0aW9uUmVxdWlyZWRcIjogNDI4LFxuICBcIlRvb01hbnlSZXF1ZXN0c1wiOiA0MjksXG4gIFwiUmVxdWVzdEhlYWRlckZpZWxkc1Rvb0xhcmdlXCI6IDQzMSxcbiAgXCJVbmF2YWlsYWJsZUZvckxlZ2FsUmVhc29uc1wiOiA0NTEsXG4gIFwiSW50ZXJuYWxTZXJ2ZXJFcnJvclwiOiA1MDAsXG4gIFwiTm90SW1wbGVtZW50ZWRcIjogNTAxLFxuICBcIkJhZEdhdGV3YXlcIjogNTAyLFxuICBcIlNlcnZpY2VVbmF2YWlsYWJsZVwiOiA1MDMsXG4gIFwiR2F0ZXdheVRpbWVvdXRcIjogNTA0LFxuICBcIkhUVFBWZXJzaW9uTm90U3VwcG9ydGVkXCI6IDUwNSxcbiAgXCJWYXJpYW50QWxzb05lZ290aWF0ZXNcIjogNTA2LFxuICBcIkluc3VmZmljaWVudFN0b3JhZ2VcIjogNTA3LFxuICBcIkxvb3BEZXRlY3RlZFwiOiA1MDgsXG4gIFwiTm90RXh0ZW5kZWRcIjogNTEwLFxuICBcIk5ldHdvcmtBdXRoZW50aWNhdGlvblJlcXVpcmVkXCI6IDUxMSxcbn0gYXMgY29uc3Q7XG5cbi8qKlxuICogQSB0eXBlIGFsaWFzIHdoaWNoIGlzIGEgc2V0IG9mIGFsbCB0aGUgc3RyaW5nIGxpdGVyYWwgbmFtZXMgb2YgdGhlIGVycm9yXG4gKiBzdGF0dXMgY29kZXMuXG4gKi9cbmV4cG9ydCB0eXBlIEVycm9yU3RhdHVzS2V5cyA9IGtleW9mIHR5cGVvZiBFUlJPUl9TVEFUVVNfTUFQO1xuXG4vKipcbiAqIE9wdGlvbnMgd2hpY2ggY2FuIGJlIHNldCB3aGVuIGluaXRpYWxpemluZyBhbiB7QGxpbmtjb2RlIEh0dHBFcnJvcn1cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIdHRwRXJyb3JPcHRpb25zIGV4dGVuZHMgRXJyb3JPcHRpb25zIHtcbiAgLyoqIERldGVybWluZSBpZiB0aGUgdW5kZXJseWluZyBlcnJvciBzdGFjayBzaG91bGQgYmUgZXhwb3NlZCB0byBhIGNsaWVudC4gKi9cbiAgZXhwb3NlPzogYm9vbGVhbjtcbiAgLyoqIEFueSBoZWFkZXJzIHRoYXQgc2hvdWxkIGJlIHNldCB3aGVuIHJldHVybmluZyB0aGUgZXJyb3IgYXMgYSByZXNwb25zZS4gKi9cbiAgaGVhZGVycz86IEhlYWRlcnNJbml0O1xufVxuXG4vKipcbiAqIFRoZSBiYXNlIGNsYXNzIHRoYXQgYWxsIGRlcml2YXRpdmUgSFRUUCBleHRlbmQsIHByb3ZpZGluZyBhIGBzdGF0dXNgIGFuZCBhblxuICogYGV4cG9zZWAgcHJvcGVydHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBIdHRwRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gICNzdGF0dXM6IEVycm9yU3RhdHVzID0gU3RhdHVzLkludGVybmFsU2VydmVyRXJyb3I7XG4gICNleHBvc2U6IGJvb2xlYW47XG4gICNoZWFkZXJzPzogSGVhZGVycztcbiAgY29uc3RydWN0b3IoXG4gICAgbWVzc2FnZSA9IFwiSHR0cCBFcnJvclwiLFxuICAgIG9wdGlvbnM/OiBIdHRwRXJyb3JPcHRpb25zLFxuICApIHtcbiAgICBzdXBlcihtZXNzYWdlLCBvcHRpb25zKTtcbiAgICB0aGlzLiNleHBvc2UgPSBvcHRpb25zPy5leHBvc2UgPT09IHVuZGVmaW5lZFxuICAgICAgPyBpc0NsaWVudEVycm9yU3RhdHVzKHRoaXMuc3RhdHVzKVxuICAgICAgOiBvcHRpb25zLmV4cG9zZTtcbiAgICBpZiAob3B0aW9ucz8uaGVhZGVycykge1xuICAgICAgdGhpcy4jaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycyk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEEgZmxhZyB0byBpbmRpY2F0ZSBpZiB0aGUgaW50ZXJuYWxzIG9mIHRoZSBlcnJvciwgbGlrZSB0aGUgc3RhY2ssIHNob3VsZFxuICAgKiBiZSBleHBvc2VkIHRvIGEgY2xpZW50LCBvciBpZiB0aGV5IGFyZSBcInByaXZhdGVcIiBhbmQgc2hvdWxkIG5vdCBiZSBsZWFrZWQuXG4gICAqIEJ5IGRlZmF1bHQsIGFsbCBjbGllbnQgZXJyb3JzIGFyZSBgdHJ1ZWAgYW5kIGFsbCBzZXJ2ZXIgZXJyb3JzIGFyZVxuICAgKiBgZmFsc2VgLiAqL1xuICBnZXQgZXhwb3NlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLiNleHBvc2U7XG4gIH1cbiAgLyoqIFRoZSBvcHRpb25hbCBoZWFkZXJzIG9iamVjdCB0aGF0IGlzIHNldCBvbiB0aGUgZXJyb3IuICovXG4gIGdldCBoZWFkZXJzKCk6IEhlYWRlcnMgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLiNoZWFkZXJzO1xuICB9XG4gIC8qKiBUaGUgZXJyb3Igc3RhdHVzIHRoYXQgaXMgc2V0IG9uIHRoZSBlcnJvci4gKi9cbiAgZ2V0IHN0YXR1cygpOiBFcnJvclN0YXR1cyB7XG4gICAgcmV0dXJuIHRoaXMuI3N0YXR1cztcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVIdHRwRXJyb3JDb25zdHJ1Y3RvcihzdGF0dXM6IEVycm9yU3RhdHVzKTogdHlwZW9mIEh0dHBFcnJvciB7XG4gIGNvbnN0IG5hbWUgPSBgJHtTdGF0dXNbc3RhdHVzXX1FcnJvcmA7XG4gIGNvbnN0IEVycm9yQ3RvciA9IGNsYXNzIGV4dGVuZHMgSHR0cEVycm9yIHtcbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgIG1lc3NhZ2UgPSBTVEFUVVNfVEVYVFtzdGF0dXNdLFxuICAgICAgb3B0aW9ucz86IEh0dHBFcnJvck9wdGlvbnMsXG4gICAgKSB7XG4gICAgICBzdXBlcihtZXNzYWdlLCBvcHRpb25zKTtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcIm5hbWVcIiwge1xuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB2YWx1ZTogbmFtZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBvdmVycmlkZSBnZXQgc3RhdHVzKCkge1xuICAgICAgcmV0dXJuIHN0YXR1cztcbiAgICB9XG4gIH07XG4gIHJldHVybiBFcnJvckN0b3I7XG59XG5cbi8qKlxuICogQSBuYW1lc3BhY2UgdGhhdCBjb250YWlucyBlYWNoIGVycm9yIGNvbnN0cnVjdG9yLiBFYWNoIGVycm9yIGV4dGVuZHNcbiAqIGBIVFRQRXJyb3JgIGFuZCBwcm92aWRlcyBgLnN0YXR1c2AgYW5kIGAuZXhwb3NlYCBwcm9wZXJ0aWVzLCB3aGVyZSB0aGVcbiAqIGAuc3RhdHVzYCB3aWxsIGJlIGFuIGVycm9yIGBTdGF0dXNgIHZhbHVlIGFuZCBgLmV4cG9zZWAgaW5kaWNhdGVzIGlmXG4gKiBpbmZvcm1hdGlvbiwgbGlrZSBhIHN0YWNrIHRyYWNlLCBzaG91bGQgYmUgc2hhcmVkIGluIHRoZSByZXNwb25zZS5cbiAqXG4gKiBCeSBkZWZhdWx0LCBgLmV4cG9zZWAgaXMgc2V0IHRvIGZhbHNlIGluIHNlcnZlciBlcnJvcnMsIGFuZCB0cnVlIGZvciBjbGllbnRcbiAqIGVycm9ycy5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IGVycm9ycyB9IGZyb20gXCJqc3I6QG9hay9jb21tb25zL2h0dHBfZXJyb3JzXCI7XG4gKlxuICogdGhyb3cgbmV3IGVycm9ycy5JbnRlcm5hbFNlcnZlckVycm9yKFwiT29vcHMhXCIpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBlcnJvcnM6IFJlY29yZDxFcnJvclN0YXR1c0tleXMsIHR5cGVvZiBIdHRwRXJyb3I+ID0ge30gYXMgUmVjb3JkPFxuICBFcnJvclN0YXR1c0tleXMsXG4gIHR5cGVvZiBIdHRwRXJyb3Jcbj47XG5cbmZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKEVSUk9SX1NUQVRVU19NQVApKSB7XG4gIGVycm9yc1trZXkgYXMgRXJyb3JTdGF0dXNLZXlzXSA9IGNyZWF0ZUh0dHBFcnJvckNvbnN0cnVjdG9yKHZhbHVlKTtcbn1cblxuLyoqXG4gKiBBIGZhY3RvcnkgZnVuY3Rpb24gd2hpY2ggcHJvdmlkZXMgYSB3YXkgdG8gY3JlYXRlIGVycm9ycy4gSXQgdGFrZXMgdXAgdG8gM1xuICogYXJndW1lbnRzLCB0aGUgZXJyb3IgYFN0YXR1c2AsIGFuIG1lc3NhZ2UsIHdoaWNoIGRlZmF1bHRzIHRvIHRoZSBzdGF0dXMgdGV4dFxuICogYW5kIGVycm9yIG9wdGlvbnMsIHdoaWNoIGluY2x1ZGVzIHRoZSBgZXhwb3NlYCBwcm9wZXJ0eSB0byBzZXQgdGhlIGAuZXhwb3NlYFxuICogdmFsdWUgb24gdGhlIGVycm9yLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlSHR0cEVycm9yKFxuICBzdGF0dXM6IEVycm9yU3RhdHVzID0gU3RhdHVzLkludGVybmFsU2VydmVyRXJyb3IsXG4gIG1lc3NhZ2U/OiBzdHJpbmcsXG4gIG9wdGlvbnM/OiBIdHRwRXJyb3JPcHRpb25zLFxuKTogSHR0cEVycm9yIHtcbiAgcmV0dXJuIG5ldyBlcnJvcnNbU3RhdHVzW3N0YXR1c10gYXMgRXJyb3JTdGF0dXNLZXlzXShtZXNzYWdlLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBBIHR5cGUgZ3VhcmQgdGhhdCBkZXRlcm1pbmVzIGlmIHRoZSB2YWx1ZSBpcyBhbiBIdHRwRXJyb3Igb3Igbm90LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNIdHRwRXJyb3IodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBIdHRwRXJyb3Ige1xuICByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBIdHRwRXJyb3I7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEseUVBQXlFO0FBRXpFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQTRDQyxHQUVELFNBRUUsbUJBQW1CLEVBQ25CLE1BQU0sRUFDTixXQUFXLFFBQ04sY0FBYztBQUVyQixNQUFNLG1CQUFtQjtFQUN2QixjQUFjO0VBQ2QsZ0JBQWdCO0VBQ2hCLG1CQUFtQjtFQUNuQixhQUFhO0VBQ2IsWUFBWTtFQUNaLG9CQUFvQjtFQUNwQixpQkFBaUI7RUFDakIscUJBQXFCO0VBQ3JCLGtCQUFrQjtFQUNsQixZQUFZO0VBQ1osUUFBUTtFQUNSLGtCQUFrQjtFQUNsQixzQkFBc0I7RUFDdEIseUJBQXlCO0VBQ3pCLHFCQUFxQjtFQUNyQix3QkFBd0I7RUFDeEIsZ0NBQWdDO0VBQ2hDLHFCQUFxQjtFQUNyQixVQUFVO0VBQ1Ysc0JBQXNCO0VBQ3RCLHVCQUF1QjtFQUN2QixVQUFVO0VBQ1Ysb0JBQW9CO0VBQ3BCLG1CQUFtQjtFQUNuQix3QkFBd0I7RUFDeEIsbUJBQW1CO0VBQ25CLCtCQUErQjtFQUMvQiw4QkFBOEI7RUFDOUIsdUJBQXVCO0VBQ3ZCLGtCQUFrQjtFQUNsQixjQUFjO0VBQ2Qsc0JBQXNCO0VBQ3RCLGtCQUFrQjtFQUNsQiwyQkFBMkI7RUFDM0IseUJBQXlCO0VBQ3pCLHVCQUF1QjtFQUN2QixnQkFBZ0I7RUFDaEIsZUFBZTtFQUNmLGlDQUFpQztBQUNuQztBQWtCQTs7O0NBR0MsR0FDRCxPQUFPLE1BQU0sa0JBQWtCO0VBQzdCLENBQUMsTUFBTSxHQUFnQixPQUFPLG1CQUFtQixDQUFDO0VBQ2xELENBQUMsTUFBTSxDQUFVO0VBQ2pCLENBQUMsT0FBTyxDQUFXO0VBQ25CLFlBQ0UsVUFBVSxZQUFZLEVBQ3RCLE9BQTBCLENBQzFCO0lBQ0EsS0FBSyxDQUFDLFNBQVM7SUFDZixJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsU0FBUyxXQUFXLFlBQy9CLG9CQUFvQixJQUFJLENBQUMsTUFBTSxJQUMvQixRQUFRLE1BQU07SUFDbEIsSUFBSSxTQUFTLFNBQVM7TUFDcEIsSUFBSSxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksUUFBUSxRQUFRLE9BQU87SUFDN0M7RUFDRjtFQUVBOzs7Y0FHWSxHQUNaLElBQUksU0FBa0I7SUFDcEIsT0FBTyxJQUFJLENBQUMsQ0FBQyxNQUFNO0VBQ3JCO0VBQ0EsMERBQTBELEdBQzFELElBQUksVUFBK0I7SUFDakMsT0FBTyxJQUFJLENBQUMsQ0FBQyxPQUFPO0VBQ3RCO0VBQ0EsK0NBQStDLEdBQy9DLElBQUksU0FBc0I7SUFDeEIsT0FBTyxJQUFJLENBQUMsQ0FBQyxNQUFNO0VBQ3JCO0FBQ0Y7QUFFQSxTQUFTLDJCQUEyQixNQUFtQjtFQUNyRCxNQUFNLE9BQU8sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO0VBQ3JDLE1BQU0sWUFBWSxjQUFjO0lBQzlCLFlBQ0UsVUFBVSxXQUFXLENBQUMsT0FBTyxFQUM3QixPQUEwQixDQUMxQjtNQUNBLEtBQUssQ0FBQyxTQUFTO01BQ2YsT0FBTyxjQUFjLENBQUMsSUFBSSxFQUFFLFFBQVE7UUFDbEMsY0FBYztRQUNkLFlBQVk7UUFDWixPQUFPO1FBQ1AsVUFBVTtNQUNaO0lBQ0Y7SUFFQSxJQUFhLFNBQVM7TUFDcEIsT0FBTztJQUNUO0VBQ0Y7RUFDQSxPQUFPO0FBQ1Q7QUFFQTs7Ozs7Ozs7Ozs7Ozs7O0NBZUMsR0FDRCxPQUFPLE1BQU0sU0FBb0QsQ0FBQyxFQUdoRTtBQUVGLEtBQUssTUFBTSxDQUFDLEtBQUssTUFBTSxJQUFJLE9BQU8sT0FBTyxDQUFDLGtCQUFtQjtFQUMzRCxNQUFNLENBQUMsSUFBdUIsR0FBRywyQkFBMkI7QUFDOUQ7QUFFQTs7Ozs7Q0FLQyxHQUNELE9BQU8sU0FBUyxnQkFDZCxTQUFzQixPQUFPLG1CQUFtQixFQUNoRCxPQUFnQixFQUNoQixPQUEwQjtFQUUxQixPQUFPLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQW9CLENBQUMsU0FBUztBQUNoRTtBQUVBOztDQUVDLEdBQ0QsT0FBTyxTQUFTLFlBQVksS0FBYztFQUN4QyxPQUFPLGlCQUFpQjtBQUMxQiJ9