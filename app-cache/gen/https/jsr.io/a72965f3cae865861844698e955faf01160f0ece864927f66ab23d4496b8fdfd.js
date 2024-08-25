// Copyright 2018-2024 the oak authors. All rights reserved. MIT license.
class ErrorEvent extends Event {
  #message;
  #filename;
  #lineno;
  #colno;
  // deno-lint-ignore no-explicit-any
  #error;
  get message() {
    return this.#message;
  }
  get filename() {
    return this.#filename;
  }
  get lineno() {
    return this.#lineno;
  }
  get colno() {
    return this.#colno;
  }
  // deno-lint-ignore no-explicit-any
  get error() {
    return this.#error;
  }
  constructor(type, eventInitDict = {}){
    super(type, eventInitDict);
    const { message = "error", filename = "", lineno = 0, colno = 0, error } = eventInitDict;
    this.#message = message;
    this.#filename = filename;
    this.#lineno = lineno;
    this.#colno = colno;
    this.#error = error;
  }
}
if (!("ErrorEvent" in globalThis)) {
  Object.defineProperty(globalThis, "ErrorEvent", {
    value: ErrorEvent,
    writable: true,
    enumerable: false,
    configurable: true
  });
}
if (!("ReadableStream" in globalThis) || !("TransformStream" in globalThis)) {
  (async ()=>{
    const { ReadableStream, TransformStream } = await import("node:stream/web");
    Object.defineProperties(globalThis, {
      "ReadableStream": {
        value: ReadableStream,
        writable: true,
        enumerable: false,
        configurable: true
      },
      "TransformStream": {
        value: TransformStream,
        writable: true,
        enumerable: false,
        configurable: true
      }
    });
  })();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvb2FrLzE2LjEuMC9ub2RlX3NoaW1zLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjQgdGhlIG9hayBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuY2xhc3MgRXJyb3JFdmVudCBleHRlbmRzIEV2ZW50IHtcbiAgI21lc3NhZ2U6IHN0cmluZztcbiAgI2ZpbGVuYW1lOiBzdHJpbmc7XG4gICNsaW5lbm86IG51bWJlcjtcbiAgI2NvbG5vOiBudW1iZXI7XG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICNlcnJvcjogYW55O1xuXG4gIGdldCBtZXNzYWdlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuI21lc3NhZ2U7XG4gIH1cbiAgZ2V0IGZpbGVuYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuI2ZpbGVuYW1lO1xuICB9XG4gIGdldCBsaW5lbm8oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy4jbGluZW5vO1xuICB9XG4gIGdldCBjb2xubygpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLiNjb2xubztcbiAgfVxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBnZXQgZXJyb3IoKTogYW55IHtcbiAgICByZXR1cm4gdGhpcy4jZXJyb3I7XG4gIH1cblxuICBjb25zdHJ1Y3Rvcih0eXBlOiBzdHJpbmcsIGV2ZW50SW5pdERpY3Q6IEVycm9yRXZlbnRJbml0ID0ge30pIHtcbiAgICBzdXBlcih0eXBlLCBldmVudEluaXREaWN0KTtcbiAgICBjb25zdCB7IG1lc3NhZ2UgPSBcImVycm9yXCIsIGZpbGVuYW1lID0gXCJcIiwgbGluZW5vID0gMCwgY29sbm8gPSAwLCBlcnJvciB9ID1cbiAgICAgIGV2ZW50SW5pdERpY3Q7XG4gICAgdGhpcy4jbWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgdGhpcy4jZmlsZW5hbWUgPSBmaWxlbmFtZTtcbiAgICB0aGlzLiNsaW5lbm8gPSBsaW5lbm87XG4gICAgdGhpcy4jY29sbm8gPSBjb2xubztcbiAgICB0aGlzLiNlcnJvciA9IGVycm9yO1xuICB9XG59XG5cbmlmICghKFwiRXJyb3JFdmVudFwiIGluIGdsb2JhbFRoaXMpKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCBcIkVycm9yRXZlbnRcIiwge1xuICAgIHZhbHVlOiBFcnJvckV2ZW50LFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgfSk7XG59XG5cbmlmICghKFwiUmVhZGFibGVTdHJlYW1cIiBpbiBnbG9iYWxUaGlzKSB8fCAhKFwiVHJhbnNmb3JtU3RyZWFtXCIgaW4gZ2xvYmFsVGhpcykpIHtcbiAgKGFzeW5jICgpID0+IHtcbiAgICBjb25zdCB7IFJlYWRhYmxlU3RyZWFtLCBUcmFuc2Zvcm1TdHJlYW0gfSA9IGF3YWl0IGltcG9ydChcIm5vZGU6c3RyZWFtL3dlYlwiKTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhnbG9iYWxUaGlzLCB7XG4gICAgICBcIlJlYWRhYmxlU3RyZWFtXCI6IHtcbiAgICAgICAgdmFsdWU6IFJlYWRhYmxlU3RyZWFtLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBcIlRyYW5zZm9ybVN0cmVhbVwiOiB7XG4gICAgICAgIHZhbHVlOiBUcmFuc2Zvcm1TdHJlYW0sXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSkoKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSx5RUFBeUU7QUFFekUsTUFBTSxtQkFBbUI7RUFDdkIsQ0FBQyxPQUFPLENBQVM7RUFDakIsQ0FBQyxRQUFRLENBQVM7RUFDbEIsQ0FBQyxNQUFNLENBQVM7RUFDaEIsQ0FBQyxLQUFLLENBQVM7RUFDZixtQ0FBbUM7RUFDbkMsQ0FBQyxLQUFLLENBQU07RUFFWixJQUFJLFVBQWtCO0lBQ3BCLE9BQU8sSUFBSSxDQUFDLENBQUMsT0FBTztFQUN0QjtFQUNBLElBQUksV0FBbUI7SUFDckIsT0FBTyxJQUFJLENBQUMsQ0FBQyxRQUFRO0VBQ3ZCO0VBQ0EsSUFBSSxTQUFpQjtJQUNuQixPQUFPLElBQUksQ0FBQyxDQUFDLE1BQU07RUFDckI7RUFDQSxJQUFJLFFBQWdCO0lBQ2xCLE9BQU8sSUFBSSxDQUFDLENBQUMsS0FBSztFQUNwQjtFQUNBLG1DQUFtQztFQUNuQyxJQUFJLFFBQWE7SUFDZixPQUFPLElBQUksQ0FBQyxDQUFDLEtBQUs7RUFDcEI7RUFFQSxZQUFZLElBQVksRUFBRSxnQkFBZ0MsQ0FBQyxDQUFDLENBQUU7SUFDNUQsS0FBSyxDQUFDLE1BQU07SUFDWixNQUFNLEVBQUUsVUFBVSxPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQ3RFO0lBQ0YsSUFBSSxDQUFDLENBQUMsT0FBTyxHQUFHO0lBQ2hCLElBQUksQ0FBQyxDQUFDLFFBQVEsR0FBRztJQUNqQixJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUc7SUFDZixJQUFJLENBQUMsQ0FBQyxLQUFLLEdBQUc7SUFDZCxJQUFJLENBQUMsQ0FBQyxLQUFLLEdBQUc7RUFDaEI7QUFDRjtBQUVBLElBQUksQ0FBQyxDQUFDLGdCQUFnQixVQUFVLEdBQUc7RUFDakMsT0FBTyxjQUFjLENBQUMsWUFBWSxjQUFjO0lBQzlDLE9BQU87SUFDUCxVQUFVO0lBQ1YsWUFBWTtJQUNaLGNBQWM7RUFDaEI7QUFDRjtBQUVBLElBQUksQ0FBQyxDQUFDLG9CQUFvQixVQUFVLEtBQUssQ0FBQyxDQUFDLHFCQUFxQixVQUFVLEdBQUc7RUFDM0UsQ0FBQztJQUNDLE1BQU0sRUFBRSxjQUFjLEVBQUUsZUFBZSxFQUFFLEdBQUcsTUFBTSxNQUFNLENBQUM7SUFDekQsT0FBTyxnQkFBZ0IsQ0FBQyxZQUFZO01BQ2xDLGtCQUFrQjtRQUNoQixPQUFPO1FBQ1AsVUFBVTtRQUNWLFlBQVk7UUFDWixjQUFjO01BQ2hCO01BQ0EsbUJBQW1CO1FBQ2pCLE9BQU87UUFDUCxVQUFVO1FBQ1YsWUFBWTtRQUNaLGNBQWM7TUFDaEI7SUFDRjtFQUNGLENBQUM7QUFDSCJ9