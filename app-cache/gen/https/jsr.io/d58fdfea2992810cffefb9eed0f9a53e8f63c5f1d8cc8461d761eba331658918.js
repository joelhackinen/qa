// Copyright 2018-2024 the oak authors. All rights reserved. MIT license.
/**
 * The internal middleware interfaces and abstractions used by oak.
 *
 * Outside of the {@linkcode Middleware} interface, items are not generally
 * used by end users, but {@linkcode compose} can be used for advanced use
 * cases.
 *
 * @module
 */ // deno-lint-ignore-file
/** A type guard that returns true if the value is
 * {@linkcode MiddlewareObject}. */ export function isMiddlewareObject(value) {
  return value && typeof value === "object" && "handleRequest" in value;
}
/** Compose multiple middleware functions into a single middleware function. */ export function compose(middleware) {
  return function composedMiddleware(context, next) {
    let index = -1;
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times.");
      }
      index = i;
      let m = middleware[i];
      let fn;
      if (typeof m === "function") {
        fn = m;
      } else if (m && typeof m.handleRequest === "function") {
        fn = m.handleRequest.bind(m);
      }
      if (i === middleware.length) {
        fn = next;
      }
      if (!fn) {
        return;
      }
      await fn(context, dispatch.bind(null, i + 1));
    }
    return dispatch(0);
  };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvb2FrLzE2LjEuMC9taWRkbGV3YXJlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjQgdGhlIG9hayBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuLyoqXG4gKiBUaGUgaW50ZXJuYWwgbWlkZGxld2FyZSBpbnRlcmZhY2VzIGFuZCBhYnN0cmFjdGlvbnMgdXNlZCBieSBvYWsuXG4gKlxuICogT3V0c2lkZSBvZiB0aGUge0BsaW5rY29kZSBNaWRkbGV3YXJlfSBpbnRlcmZhY2UsIGl0ZW1zIGFyZSBub3QgZ2VuZXJhbGx5XG4gKiB1c2VkIGJ5IGVuZCB1c2VycywgYnV0IHtAbGlua2NvZGUgY29tcG9zZX0gY2FuIGJlIHVzZWQgZm9yIGFkdmFuY2VkIHVzZVxuICogY2FzZXMuXG4gKlxuICogQG1vZHVsZVxuICovXG5cbi8vIGRlbm8tbGludC1pZ25vcmUtZmlsZVxuXG5pbXBvcnQgdHlwZSB7IFN0YXRlIH0gZnJvbSBcIi4vYXBwbGljYXRpb24udHNcIjtcbmltcG9ydCB0eXBlIHsgQ29udGV4dCB9IGZyb20gXCIuL2NvbnRleHQudHNcIjtcblxuLyoqIEEgZnVuY3Rpb24gZm9yIGNoYWluaW5nIG1pZGRsZXdhcmUuICovXG5leHBvcnQgdHlwZSBOZXh0ID0gKCkgPT4gUHJvbWlzZTx1bmtub3duPjtcblxuLyoqIE1pZGRsZXdhcmUgYXJlIGZ1bmN0aW9ucyB3aGljaCBhcmUgY2hhaW5lZCB0b2dldGhlciB0byBkZWFsIHdpdGhcbiAqIHJlcXVlc3RzLiAqL1xuZXhwb3J0IGludGVyZmFjZSBNaWRkbGV3YXJlPFxuICBTIGV4dGVuZHMgU3RhdGUgPSBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxuICBUIGV4dGVuZHMgQ29udGV4dCA9IENvbnRleHQ8Uz4sXG4+IHtcbiAgKGNvbnRleHQ6IFQsIG5leHQ6IE5leHQpOiBQcm9taXNlPHVua25vd24+IHwgdW5rbm93bjtcbn1cblxuLyoqIE1pZGRsZXdhcmUgb2JqZWN0cyBhbGxvdyBlbmNhcHN1bGF0aW9uIG9mIG1pZGRsZXdhcmUgYWxvbmcgd2l0aCB0aGUgYWJpbGl0eVxuICogdG8gaW5pdGlhbGl6ZSB0aGUgbWlkZGxld2FyZSB1cG9uIGxpc3Rlbi4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWlkZGxld2FyZU9iamVjdDxcbiAgUyBleHRlbmRzIFN0YXRlID0gUmVjb3JkPHN0cmluZywgYW55PixcbiAgVCBleHRlbmRzIENvbnRleHQ8Uz4gPSBDb250ZXh0PFM+LFxuPiB7XG4gIC8qKiBPcHRpb25hbCBmdW5jdGlvbiBmb3IgZGVsYXllZCBpbml0aWFsaXphdGlvbiB3aGljaCB3aWxsIGJlIGNhbGxlZCB3aGVuXG4gICAqIHRoZSBhcHBsaWNhdGlvbiBzdGFydHMgbGlzdGVuaW5nLiAqL1xuICBpbml0PzogKCkgPT4gUHJvbWlzZTx1bmtub3duPiB8IHVua25vd247XG4gIC8qKiBUaGUgbWV0aG9kIHRvIGJlIGNhbGxlZCB0byBoYW5kbGUgdGhlIHJlcXVlc3QuICovXG4gIGhhbmRsZVJlcXVlc3QoY29udGV4dDogVCwgbmV4dDogTmV4dCk6IFByb21pc2U8dW5rbm93bj4gfCB1bmtub3duO1xufVxuXG4vKiogVHlwZSB0aGF0IHJlcHJlc2VudHMge0BsaW5rY29kZSBNaWRkbGV3YXJlfSBvclxuICoge0BsaW5rY29kZSBNaWRkbGV3YXJlT2JqZWN0fS4gKi9cbmV4cG9ydCB0eXBlIE1pZGRsZXdhcmVPck1pZGRsZXdhcmVPYmplY3Q8XG4gIFMgZXh0ZW5kcyBTdGF0ZSA9IFJlY29yZDxzdHJpbmcsIGFueT4sXG4gIFQgZXh0ZW5kcyBDb250ZXh0ID0gQ29udGV4dDxTPixcbj4gPSBNaWRkbGV3YXJlPFMsIFQ+IHwgTWlkZGxld2FyZU9iamVjdDxTLCBUPjtcblxuLyoqIEEgdHlwZSBndWFyZCB0aGF0IHJldHVybnMgdHJ1ZSBpZiB0aGUgdmFsdWUgaXNcbiAqIHtAbGlua2NvZGUgTWlkZGxld2FyZU9iamVjdH0uICovXG5leHBvcnQgZnVuY3Rpb24gaXNNaWRkbGV3YXJlT2JqZWN0PFxuICBTIGV4dGVuZHMgU3RhdGUgPSBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxuICBUIGV4dGVuZHMgQ29udGV4dCA9IENvbnRleHQ8Uz4sXG4+KHZhbHVlOiBNaWRkbGV3YXJlT3JNaWRkbGV3YXJlT2JqZWN0PFMsIFQ+KTogdmFsdWUgaXMgTWlkZGxld2FyZU9iamVjdDxTLCBUPiB7XG4gIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiYgXCJoYW5kbGVSZXF1ZXN0XCIgaW4gdmFsdWU7XG59XG5cbi8qKiBDb21wb3NlIG11bHRpcGxlIG1pZGRsZXdhcmUgZnVuY3Rpb25zIGludG8gYSBzaW5nbGUgbWlkZGxld2FyZSBmdW5jdGlvbi4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wb3NlPFxuICBTIGV4dGVuZHMgU3RhdGUgPSBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxuICBUIGV4dGVuZHMgQ29udGV4dCA9IENvbnRleHQ8Uz4sXG4+KFxuICBtaWRkbGV3YXJlOiBNaWRkbGV3YXJlT3JNaWRkbGV3YXJlT2JqZWN0PFMsIFQ+W10sXG4pOiAoY29udGV4dDogVCwgbmV4dD86IE5leHQpID0+IFByb21pc2U8dW5rbm93bj4ge1xuICByZXR1cm4gZnVuY3Rpb24gY29tcG9zZWRNaWRkbGV3YXJlKFxuICAgIGNvbnRleHQ6IFQsXG4gICAgbmV4dD86IE5leHQsXG4gICk6IFByb21pc2U8dW5rbm93bj4ge1xuICAgIGxldCBpbmRleCA9IC0xO1xuXG4gICAgYXN5bmMgZnVuY3Rpb24gZGlzcGF0Y2goaTogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICBpZiAoaSA8PSBpbmRleCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJuZXh0KCkgY2FsbGVkIG11bHRpcGxlIHRpbWVzLlwiKTtcbiAgICAgIH1cbiAgICAgIGluZGV4ID0gaTtcbiAgICAgIGxldCBtOiBNaWRkbGV3YXJlT3JNaWRkbGV3YXJlT2JqZWN0PFMsIFQ+IHwgdW5kZWZpbmVkID0gbWlkZGxld2FyZVtpXTtcbiAgICAgIGxldCBmbjogTWlkZGxld2FyZTxTLCBUPiB8IHVuZGVmaW5lZDtcbiAgICAgIGlmICh0eXBlb2YgbSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGZuID0gbTtcbiAgICAgIH0gZWxzZSBpZiAobSAmJiB0eXBlb2YgbS5oYW5kbGVSZXF1ZXN0ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgZm4gPSAobSBhcyBNaWRkbGV3YXJlT2JqZWN0KS5oYW5kbGVSZXF1ZXN0LmJpbmQobSk7XG4gICAgICB9XG4gICAgICBpZiAoaSA9PT0gbWlkZGxld2FyZS5sZW5ndGgpIHtcbiAgICAgICAgZm4gPSBuZXh0O1xuICAgICAgfVxuICAgICAgaWYgKCFmbikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBhd2FpdCBmbihjb250ZXh0LCBkaXNwYXRjaC5iaW5kKG51bGwsIGkgKyAxKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRpc3BhdGNoKDApO1xuICB9O1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHlFQUF5RTtBQUV6RTs7Ozs7Ozs7Q0FRQyxHQUVELHdCQUF3QjtBQXFDeEI7aUNBQ2lDLEdBQ2pDLE9BQU8sU0FBUyxtQkFHZCxLQUF5QztFQUN6QyxPQUFPLFNBQVMsT0FBTyxVQUFVLFlBQVksbUJBQW1CO0FBQ2xFO0FBRUEsNkVBQTZFLEdBQzdFLE9BQU8sU0FBUyxRQUlkLFVBQWdEO0VBRWhELE9BQU8sU0FBUyxtQkFDZCxPQUFVLEVBQ1YsSUFBVztJQUVYLElBQUksUUFBUSxDQUFDO0lBRWIsZUFBZSxTQUFTLENBQVM7TUFDL0IsSUFBSSxLQUFLLE9BQU87UUFDZCxNQUFNLElBQUksTUFBTTtNQUNsQjtNQUNBLFFBQVE7TUFDUixJQUFJLElBQW9ELFVBQVUsQ0FBQyxFQUFFO01BQ3JFLElBQUk7TUFDSixJQUFJLE9BQU8sTUFBTSxZQUFZO1FBQzNCLEtBQUs7TUFDUCxPQUFPLElBQUksS0FBSyxPQUFPLEVBQUUsYUFBYSxLQUFLLFlBQVk7UUFDckQsS0FBSyxBQUFDLEVBQXVCLGFBQWEsQ0FBQyxJQUFJLENBQUM7TUFDbEQ7TUFDQSxJQUFJLE1BQU0sV0FBVyxNQUFNLEVBQUU7UUFDM0IsS0FBSztNQUNQO01BQ0EsSUFBSSxDQUFDLElBQUk7UUFDUDtNQUNGO01BQ0EsTUFBTSxHQUFHLFNBQVMsU0FBUyxJQUFJLENBQUMsTUFBTSxJQUFJO0lBQzVDO0lBRUEsT0FBTyxTQUFTO0VBQ2xCO0FBQ0YifQ==