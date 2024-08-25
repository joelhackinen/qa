// Copyright 2018-2024 the oak authors. All rights reserved. MIT license.
// deno-lint-ignore-file no-explicit-any
/**
 * A collection of utility APIs which can make testing of an oak application
 * easier.
 *
 * @module
 */ import { accepts, createHttpError, SecureCookieMap } from "./deps.ts";
import { Response } from "./response.ts";
/** Creates a mock of `Application`. */ export function createMockApp(state = {}) {
  const app = {
    state,
    use () {
      return app;
    },
    [Symbol.for("Deno.customInspect")] () {
      return "MockApplication {}";
    },
    [Symbol.for("nodejs.util.inspect.custom")] (depth, options, inspect) {
      if (depth < 0) {
        return options.stylize(`[MockApplication]`, "special");
      }
      const newOptions = Object.assign({}, options, {
        depth: options.depth === null ? null : options.depth - 1
      });
      return `${options.stylize("MockApplication", "special")} ${inspect({}, newOptions)}`;
    }
  };
  return app;
}
/** Allows external parties to modify the context state. */ export const mockContextState = {
  /** Adjusts the return value of the `acceptedEncodings` in the context's
   * `request` object. */ encodingsAccepted: "identity"
};
/** Create a mock of `Context` or `RouterContext`. */ export function createMockContext({ ip = "127.0.0.1", method = "GET", params, path = "/", state, app = createMockApp(state), headers: requestHeaders } = {}) {
  function createMockRequest() {
    const headers = new Headers(requestHeaders);
    return {
      get source () {
        return new globalThis.Request(new URL(path, "http://localhost/"), {
          method,
          headers
        });
      },
      accepts (...types) {
        if (!headers.has("Accept")) {
          return;
        }
        if (types.length) {
          return accepts({
            headers
          }, ...types);
        }
        return accepts({
          headers
        });
      },
      acceptsEncodings () {
        return mockContextState.encodingsAccepted;
      },
      headers,
      ip,
      method,
      path,
      search: undefined,
      searchParams: new URLSearchParams(),
      url: new URL(path, "http://localhost/")
    };
  }
  const request = createMockRequest();
  const response = new Response(request);
  const cookies = new SecureCookieMap(request, {
    response
  });
  return {
    app,
    params,
    request,
    cookies,
    response,
    state: Object.assign({}, app.state),
    assert (condition, errorStatus = 500, message, props) {
      if (condition) {
        return;
      }
      const err = createHttpError(errorStatus, message);
      if (props) {
        Object.assign(err, props);
      }
      throw err;
    },
    throw (errorStatus, message, props) {
      const err = createHttpError(errorStatus, message);
      if (props) {
        Object.assign(err, props);
      }
      throw err;
    },
    [Symbol.for("Deno.customInspect")] () {
      return `MockContext {}`;
    },
    [Symbol.for("nodejs.util.inspect.custom")] (depth, options, inspect) {
      if (depth < 0) {
        return options.stylize(`[MockContext]`, "special");
      }
      const newOptions = Object.assign({}, options, {
        depth: options.depth === null ? null : options.depth - 1
      });
      return `${options.stylize("MockContext", "special")} ${inspect({}, newOptions)}`;
    }
  };
}
/** Creates a mock `next()` function which can be used when calling
 * middleware. */ export function createMockNext() {
  return async function next() {};
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvb2FrLzE2LjEuMC90ZXN0aW5nLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjQgdGhlIG9hayBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuLy8gZGVuby1saW50LWlnbm9yZS1maWxlIG5vLWV4cGxpY2l0LWFueVxuXG4vKipcbiAqIEEgY29sbGVjdGlvbiBvZiB1dGlsaXR5IEFQSXMgd2hpY2ggY2FuIG1ha2UgdGVzdGluZyBvZiBhbiBvYWsgYXBwbGljYXRpb25cbiAqIGVhc2llci5cbiAqXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBBcHBsaWNhdGlvbiwgU3RhdGUgfSBmcm9tIFwiLi9hcHBsaWNhdGlvbi50c1wiO1xuaW1wb3J0IHtcbiAgYWNjZXB0cyxcbiAgY3JlYXRlSHR0cEVycm9yLFxuICB0eXBlIEVycm9yU3RhdHVzLFxuICBTZWN1cmVDb29raWVNYXAsXG59IGZyb20gXCIuL2RlcHMudHNcIjtcbmltcG9ydCB0eXBlIHsgUm91dGVQYXJhbXMsIFJvdXRlckNvbnRleHQgfSBmcm9tIFwiLi9yb3V0ZXIudHNcIjtcbmltcG9ydCB0eXBlIHsgUmVxdWVzdCB9IGZyb20gXCIuL3JlcXVlc3QudHNcIjtcbmltcG9ydCB7IFJlc3BvbnNlIH0gZnJvbSBcIi4vcmVzcG9uc2UudHNcIjtcblxuLyoqIENyZWF0ZXMgYSBtb2NrIG9mIGBBcHBsaWNhdGlvbmAuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTW9ja0FwcDxcbiAgUyBleHRlbmRzIFJlY29yZDxzdHJpbmcgfCBudW1iZXIgfCBzeW1ib2wsIGFueT4gPSBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxuPihcbiAgc3RhdGU6IFMgPSB7fSBhcyBTLFxuKTogQXBwbGljYXRpb248Uz4ge1xuICBjb25zdCBhcHAgPSB7XG4gICAgc3RhdGUsXG4gICAgdXNlKCkge1xuICAgICAgcmV0dXJuIGFwcDtcbiAgICB9LFxuICAgIFtTeW1ib2wuZm9yKFwiRGVuby5jdXN0b21JbnNwZWN0XCIpXSgpIHtcbiAgICAgIHJldHVybiBcIk1vY2tBcHBsaWNhdGlvbiB7fVwiO1xuICAgIH0sXG4gICAgW1N5bWJvbC5mb3IoXCJub2RlanMudXRpbC5pbnNwZWN0LmN1c3RvbVwiKV0oXG4gICAgICBkZXB0aDogbnVtYmVyLFxuICAgICAgb3B0aW9uczogYW55LFxuICAgICAgaW5zcGVjdDogKHZhbHVlOiB1bmtub3duLCBvcHRpb25zPzogdW5rbm93bikgPT4gc3RyaW5nLFxuICAgICkge1xuICAgICAgaWYgKGRlcHRoIDwgMCkge1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKGBbTW9ja0FwcGxpY2F0aW9uXWAsIFwic3BlY2lhbFwiKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbmV3T3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHtcbiAgICAgICAgZGVwdGg6IG9wdGlvbnMuZGVwdGggPT09IG51bGwgPyBudWxsIDogb3B0aW9ucy5kZXB0aCAtIDEsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBgJHtvcHRpb25zLnN0eWxpemUoXCJNb2NrQXBwbGljYXRpb25cIiwgXCJzcGVjaWFsXCIpfSAke1xuICAgICAgICBpbnNwZWN0KHt9LCBuZXdPcHRpb25zKVxuICAgICAgfWA7XG4gICAgfSxcbiAgfSBhcyBhbnk7XG4gIHJldHVybiBhcHA7XG59XG5cbi8qKiBPcHRpb25zIHRoYXQgY2FuIGJlIHNldCBpbiBhIG1vY2sgY29udGV4dC4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTW9ja0NvbnRleHRPcHRpb25zPFxuICBSIGV4dGVuZHMgc3RyaW5nLFxuICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8Uj4gPSBSb3V0ZVBhcmFtczxSPixcbiAgUyBleHRlbmRzIFN0YXRlID0gUmVjb3JkPHN0cmluZywgYW55Pixcbj4ge1xuICBhcHA/OiBBcHBsaWNhdGlvbjxTPjtcbiAgaXA/OiBzdHJpbmc7XG4gIG1ldGhvZD86IHN0cmluZztcbiAgcGFyYW1zPzogUDtcbiAgcGF0aD86IHN0cmluZztcbiAgc3RhdGU/OiBTO1xuICBoZWFkZXJzPzogW3N0cmluZywgc3RyaW5nXVtdO1xufVxuXG4vKiogQWxsb3dzIGV4dGVybmFsIHBhcnRpZXMgdG8gbW9kaWZ5IHRoZSBjb250ZXh0IHN0YXRlLiAqL1xuZXhwb3J0IGNvbnN0IG1vY2tDb250ZXh0U3RhdGUgPSB7XG4gIC8qKiBBZGp1c3RzIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGBhY2NlcHRlZEVuY29kaW5nc2AgaW4gdGhlIGNvbnRleHQnc1xuICAgKiBgcmVxdWVzdGAgb2JqZWN0LiAqL1xuICBlbmNvZGluZ3NBY2NlcHRlZDogXCJpZGVudGl0eVwiLFxufTtcblxuLyoqIENyZWF0ZSBhIG1vY2sgb2YgYENvbnRleHRgIG9yIGBSb3V0ZXJDb250ZXh0YC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVNb2NrQ29udGV4dDxcbiAgUiBleHRlbmRzIHN0cmluZyxcbiAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPFI+ID0gUm91dGVQYXJhbXM8Uj4sXG4gIFMgZXh0ZW5kcyBTdGF0ZSA9IFJlY29yZDxzdHJpbmcsIGFueT4sXG4+KFxuICB7XG4gICAgaXAgPSBcIjEyNy4wLjAuMVwiLFxuICAgIG1ldGhvZCA9IFwiR0VUXCIsXG4gICAgcGFyYW1zLFxuICAgIHBhdGggPSBcIi9cIixcbiAgICBzdGF0ZSxcbiAgICBhcHAgPSBjcmVhdGVNb2NrQXBwKHN0YXRlKSxcbiAgICBoZWFkZXJzOiByZXF1ZXN0SGVhZGVycyxcbiAgfTogTW9ja0NvbnRleHRPcHRpb25zPFI+ID0ge30sXG4pOiBSb3V0ZXJDb250ZXh0PFIsIFAsIFM+IHtcbiAgZnVuY3Rpb24gY3JlYXRlTW9ja1JlcXVlc3QoKTogUmVxdWVzdCB7XG4gICAgY29uc3QgaGVhZGVycyA9IG5ldyBIZWFkZXJzKHJlcXVlc3RIZWFkZXJzKTtcbiAgICByZXR1cm4ge1xuICAgICAgZ2V0IHNvdXJjZSgpOiBnbG9iYWxUaGlzLlJlcXVlc3QgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gbmV3IGdsb2JhbFRoaXMuUmVxdWVzdChuZXcgVVJMKHBhdGgsIFwiaHR0cDovL2xvY2FsaG9zdC9cIiksIHtcbiAgICAgICAgICBtZXRob2QsXG4gICAgICAgICAgaGVhZGVycyxcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgYWNjZXB0cyguLi50eXBlczogc3RyaW5nW10pIHtcbiAgICAgICAgaWYgKCFoZWFkZXJzLmhhcyhcIkFjY2VwdFwiKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZXMubGVuZ3RoKSB7XG4gICAgICAgICAgcmV0dXJuIGFjY2VwdHMoeyBoZWFkZXJzIH0sIC4uLnR5cGVzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYWNjZXB0cyh7IGhlYWRlcnMgfSk7XG4gICAgICB9LFxuICAgICAgYWNjZXB0c0VuY29kaW5ncygpIHtcbiAgICAgICAgcmV0dXJuIG1vY2tDb250ZXh0U3RhdGUuZW5jb2RpbmdzQWNjZXB0ZWQ7XG4gICAgICB9LFxuICAgICAgaGVhZGVycyxcbiAgICAgIGlwLFxuICAgICAgbWV0aG9kLFxuICAgICAgcGF0aCxcbiAgICAgIHNlYXJjaDogdW5kZWZpbmVkLFxuICAgICAgc2VhcmNoUGFyYW1zOiBuZXcgVVJMU2VhcmNoUGFyYW1zKCksXG4gICAgICB1cmw6IG5ldyBVUkwocGF0aCwgXCJodHRwOi8vbG9jYWxob3N0L1wiKSxcbiAgICB9IGFzIGFueTtcbiAgfVxuXG4gIGNvbnN0IHJlcXVlc3QgPSBjcmVhdGVNb2NrUmVxdWVzdCgpO1xuICBjb25zdCByZXNwb25zZSA9IG5ldyBSZXNwb25zZShyZXF1ZXN0KTtcbiAgY29uc3QgY29va2llcyA9IG5ldyBTZWN1cmVDb29raWVNYXAocmVxdWVzdCwgeyByZXNwb25zZSB9KTtcblxuICByZXR1cm4gKHtcbiAgICBhcHAsXG4gICAgcGFyYW1zLFxuICAgIHJlcXVlc3QsXG4gICAgY29va2llcyxcbiAgICByZXNwb25zZSxcbiAgICBzdGF0ZTogT2JqZWN0LmFzc2lnbih7fSwgYXBwLnN0YXRlKSxcbiAgICBhc3NlcnQoXG4gICAgICBjb25kaXRpb246IGFueSxcbiAgICAgIGVycm9yU3RhdHVzOiBFcnJvclN0YXR1cyA9IDUwMCxcbiAgICAgIG1lc3NhZ2U/OiBzdHJpbmcsXG4gICAgICBwcm9wcz86IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICAgICk6IGFzc2VydHMgY29uZGl0aW9uIHtcbiAgICAgIGlmIChjb25kaXRpb24pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgZXJyID0gY3JlYXRlSHR0cEVycm9yKGVycm9yU3RhdHVzLCBtZXNzYWdlKTtcbiAgICAgIGlmIChwcm9wcykge1xuICAgICAgICBPYmplY3QuYXNzaWduKGVyciwgcHJvcHMpO1xuICAgICAgfVxuICAgICAgdGhyb3cgZXJyO1xuICAgIH0sXG4gICAgdGhyb3coXG4gICAgICBlcnJvclN0YXR1czogRXJyb3JTdGF0dXMsXG4gICAgICBtZXNzYWdlPzogc3RyaW5nLFxuICAgICAgcHJvcHM/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgICApOiBuZXZlciB7XG4gICAgICBjb25zdCBlcnIgPSBjcmVhdGVIdHRwRXJyb3IoZXJyb3JTdGF0dXMsIG1lc3NhZ2UpO1xuICAgICAgaWYgKHByb3BzKSB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24oZXJyLCBwcm9wcyk7XG4gICAgICB9XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfSxcbiAgICBbU3ltYm9sLmZvcihcIkRlbm8uY3VzdG9tSW5zcGVjdFwiKV0oKSB7XG4gICAgICByZXR1cm4gYE1vY2tDb250ZXh0IHt9YDtcbiAgICB9LFxuICAgIFtTeW1ib2wuZm9yKFwibm9kZWpzLnV0aWwuaW5zcGVjdC5jdXN0b21cIildKFxuICAgICAgZGVwdGg6IG51bWJlcixcbiAgICAgIG9wdGlvbnM6IGFueSxcbiAgICAgIGluc3BlY3Q6ICh2YWx1ZTogdW5rbm93biwgb3B0aW9ucz86IHVua25vd24pID0+IHN0cmluZyxcbiAgICApIHtcbiAgICAgIGlmIChkZXB0aCA8IDApIHtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShgW01vY2tDb250ZXh0XWAsIFwic3BlY2lhbFwiKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbmV3T3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHtcbiAgICAgICAgZGVwdGg6IG9wdGlvbnMuZGVwdGggPT09IG51bGwgPyBudWxsIDogb3B0aW9ucy5kZXB0aCAtIDEsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBgJHtvcHRpb25zLnN0eWxpemUoXCJNb2NrQ29udGV4dFwiLCBcInNwZWNpYWxcIil9ICR7XG4gICAgICAgIGluc3BlY3Qoe30sIG5ld09wdGlvbnMpXG4gICAgICB9YDtcbiAgICB9LFxuICB9IGFzIHVua25vd24pIGFzIFJvdXRlckNvbnRleHQ8UiwgUCwgUz47XG59XG5cbi8qKiBDcmVhdGVzIGEgbW9jayBgbmV4dCgpYCBmdW5jdGlvbiB3aGljaCBjYW4gYmUgdXNlZCB3aGVuIGNhbGxpbmdcbiAqIG1pZGRsZXdhcmUuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTW9ja05leHQoKTogKCkgPT4gUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBhc3luYyBmdW5jdGlvbiBuZXh0KCkge307XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEseUVBQXlFO0FBRXpFLHdDQUF3QztBQUV4Qzs7Ozs7Q0FLQyxHQUdELFNBQ0UsT0FBTyxFQUNQLGVBQWUsRUFFZixlQUFlLFFBQ1YsWUFBWTtBQUduQixTQUFTLFFBQVEsUUFBUSxnQkFBZ0I7QUFFekMscUNBQXFDLEdBQ3JDLE9BQU8sU0FBUyxjQUdkLFFBQVcsQ0FBQyxDQUFNO0VBRWxCLE1BQU0sTUFBTTtJQUNWO0lBQ0E7TUFDRSxPQUFPO0lBQ1Q7SUFD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