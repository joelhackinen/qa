// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
/**
 * A `LimitedReader` reads from `reader` but limits the amount of data returned to just `limit` bytes.
 * Each call to `read` updates `limit` to reflect the new amount remaining.
 * `read` returns `null` when `limit` <= `0` or
 * when the underlying `reader` returns `null`.
 */ /**
 * @deprecated (will be removed after 1.0.0) Use the {@link https://developer.mozilla.org/en-US/docs/Web/API/Streams_API | Web Streams API} instead.
 */ export class LimitedReader {
  reader;
  limit;
  constructor(reader, limit){
    this.reader = reader;
    this.limit = limit;
  }
  async read(p) {
    if (this.limit <= 0) {
      return null;
    }
    if (p.length > this.limit) {
      p = p.subarray(0, this.limit);
    }
    const n = await this.reader.read(p);
    if (n === null) {
      return null;
    }
    this.limit -= n;
    return n;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvaW8vMC4yMjMuMC9saW1pdGVkX3JlYWRlci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI0IHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG4vKipcbiAqIEEgYExpbWl0ZWRSZWFkZXJgIHJlYWRzIGZyb20gYHJlYWRlcmAgYnV0IGxpbWl0cyB0aGUgYW1vdW50IG9mIGRhdGEgcmV0dXJuZWQgdG8ganVzdCBgbGltaXRgIGJ5dGVzLlxuICogRWFjaCBjYWxsIHRvIGByZWFkYCB1cGRhdGVzIGBsaW1pdGAgdG8gcmVmbGVjdCB0aGUgbmV3IGFtb3VudCByZW1haW5pbmcuXG4gKiBgcmVhZGAgcmV0dXJucyBgbnVsbGAgd2hlbiBgbGltaXRgIDw9IGAwYCBvclxuICogd2hlbiB0aGUgdW5kZXJseWluZyBgcmVhZGVyYCByZXR1cm5zIGBudWxsYC5cbiAqL1xuaW1wb3J0IHR5cGUgeyBSZWFkZXIgfSBmcm9tIFwiLi90eXBlcy50c1wiO1xuXG4vKipcbiAqIEBkZXByZWNhdGVkICh3aWxsIGJlIHJlbW92ZWQgYWZ0ZXIgMS4wLjApIFVzZSB0aGUge0BsaW5rIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9TdHJlYW1zX0FQSSB8IFdlYiBTdHJlYW1zIEFQSX0gaW5zdGVhZC5cbiAqL1xuZXhwb3J0IGNsYXNzIExpbWl0ZWRSZWFkZXIgaW1wbGVtZW50cyBSZWFkZXIge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZGVyOiBSZWFkZXIsIHB1YmxpYyBsaW1pdDogbnVtYmVyKSB7fVxuXG4gIGFzeW5jIHJlYWQocDogVWludDhBcnJheSk6IFByb21pc2U8bnVtYmVyIHwgbnVsbD4ge1xuICAgIGlmICh0aGlzLmxpbWl0IDw9IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmIChwLmxlbmd0aCA+IHRoaXMubGltaXQpIHtcbiAgICAgIHAgPSBwLnN1YmFycmF5KDAsIHRoaXMubGltaXQpO1xuICAgIH1cbiAgICBjb25zdCBuID0gYXdhaXQgdGhpcy5yZWFkZXIucmVhZChwKTtcbiAgICBpZiAobiA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5saW1pdCAtPSBuO1xuICAgIHJldHVybiBuO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFLHFDQUFxQztBQUVyQzs7Ozs7Q0FLQyxHQUdEOztDQUVDLEdBQ0QsT0FBTyxNQUFNOzs7RUFDWCxZQUFZLEFBQU8sTUFBYyxFQUFFLEFBQU8sS0FBYSxDQUFFO1NBQXRDLFNBQUE7U0FBdUIsUUFBQTtFQUFnQjtFQUUxRCxNQUFNLEtBQUssQ0FBYSxFQUEwQjtJQUNoRCxJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksR0FBRztNQUNuQixPQUFPO0lBQ1Q7SUFFQSxJQUFJLEVBQUUsTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUU7TUFDekIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLO0lBQzlCO0lBQ0EsTUFBTSxJQUFJLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDakMsSUFBSSxNQUFNLE1BQU07TUFDZCxPQUFPO0lBQ1Q7SUFFQSxJQUFJLENBQUMsS0FBSyxJQUFJO0lBQ2QsT0FBTztFQUNUO0FBQ0YifQ==