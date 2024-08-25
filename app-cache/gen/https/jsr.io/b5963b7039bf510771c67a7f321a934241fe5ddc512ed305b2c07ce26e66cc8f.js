// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import { concat } from "jsr:/@std/bytes@^0.223.0/concat";
import { DEFAULT_CHUNK_SIZE } from "./_constants.ts";
/**
 * Read {@linkcode Reader} `r` until EOF (`null`) and resolve to the content as
 * {@linkcode Uint8Array}.
 *
 * @example
 * ```ts
 * import { readAll } from "@std/io/read-all";
 *
 * // Example from stdin
 * const stdinContent = await readAll(Deno.stdin);
 *
 * // Example from file
 * using file = await Deno.open("my_file.txt", {read: true});
 * const myFileContent = await readAll(file);
 * ```
 */ export async function readAll(reader) {
  const chunks = [];
  while(true){
    let chunk = new Uint8Array(DEFAULT_CHUNK_SIZE);
    const n = await reader.read(chunk);
    if (n === null) {
      break;
    }
    if (n < DEFAULT_CHUNK_SIZE) {
      chunk = chunk.subarray(0, n);
    }
    chunks.push(chunk);
  }
  return concat(chunks);
}
/**
 * Synchronously reads {@linkcode ReaderSync} `r` until EOF (`null`) and returns
 * the content as {@linkcode Uint8Array}.
 *
 * @example
 * ```ts
 * import { readAllSync } from "@std/io/read-all";
 *
 * // Example from stdin
 * const stdinContent = readAllSync(Deno.stdin);
 *
 * // Example from file
 * using file = Deno.openSync("my_file.txt", {read: true});
 * const myFileContent = readAllSync(file);
 * ```
 */ export function readAllSync(reader) {
  const chunks = [];
  while(true){
    const chunk = new Uint8Array(DEFAULT_CHUNK_SIZE);
    const n = reader.readSync(chunk);
    if (n === null) {
      break;
    }
    if (n < DEFAULT_CHUNK_SIZE) {
      chunks.push(chunk.subarray(0, n));
      break;
    }
    chunks.push(chunk);
  }
  return concat(chunks);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvaW8vMC4yMjMuMC9yZWFkX2FsbC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI0IHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG5pbXBvcnQgeyBjb25jYXQgfSBmcm9tIFwianNyOi9Ac3RkL2J5dGVzQF4wLjIyMy4wL2NvbmNhdFwiO1xuaW1wb3J0IHsgREVGQVVMVF9DSFVOS19TSVpFIH0gZnJvbSBcIi4vX2NvbnN0YW50cy50c1wiO1xuaW1wb3J0IHR5cGUgeyBSZWFkZXIsIFJlYWRlclN5bmMgfSBmcm9tIFwiLi90eXBlcy50c1wiO1xuXG4vKipcbiAqIFJlYWQge0BsaW5rY29kZSBSZWFkZXJ9IGByYCB1bnRpbCBFT0YgKGBudWxsYCkgYW5kIHJlc29sdmUgdG8gdGhlIGNvbnRlbnQgYXNcbiAqIHtAbGlua2NvZGUgVWludDhBcnJheX0uXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyByZWFkQWxsIH0gZnJvbSBcIkBzdGQvaW8vcmVhZC1hbGxcIjtcbiAqXG4gKiAvLyBFeGFtcGxlIGZyb20gc3RkaW5cbiAqIGNvbnN0IHN0ZGluQ29udGVudCA9IGF3YWl0IHJlYWRBbGwoRGVuby5zdGRpbik7XG4gKlxuICogLy8gRXhhbXBsZSBmcm9tIGZpbGVcbiAqIHVzaW5nIGZpbGUgPSBhd2FpdCBEZW5vLm9wZW4oXCJteV9maWxlLnR4dFwiLCB7cmVhZDogdHJ1ZX0pO1xuICogY29uc3QgbXlGaWxlQ29udGVudCA9IGF3YWl0IHJlYWRBbGwoZmlsZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRBbGwocmVhZGVyOiBSZWFkZXIpOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgY29uc3QgY2h1bmtzOiBVaW50OEFycmF5W10gPSBbXTtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBsZXQgY2h1bmsgPSBuZXcgVWludDhBcnJheShERUZBVUxUX0NIVU5LX1NJWkUpO1xuICAgIGNvbnN0IG4gPSBhd2FpdCByZWFkZXIucmVhZChjaHVuayk7XG4gICAgaWYgKG4gPT09IG51bGwpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBpZiAobiA8IERFRkFVTFRfQ0hVTktfU0laRSkge1xuICAgICAgY2h1bmsgPSBjaHVuay5zdWJhcnJheSgwLCBuKTtcbiAgICB9XG4gICAgY2h1bmtzLnB1c2goY2h1bmspO1xuICB9XG4gIHJldHVybiBjb25jYXQoY2h1bmtzKTtcbn1cblxuLyoqXG4gKiBTeW5jaHJvbm91c2x5IHJlYWRzIHtAbGlua2NvZGUgUmVhZGVyU3luY30gYHJgIHVudGlsIEVPRiAoYG51bGxgKSBhbmQgcmV0dXJuc1xuICogdGhlIGNvbnRlbnQgYXMge0BsaW5rY29kZSBVaW50OEFycmF5fS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IHJlYWRBbGxTeW5jIH0gZnJvbSBcIkBzdGQvaW8vcmVhZC1hbGxcIjtcbiAqXG4gKiAvLyBFeGFtcGxlIGZyb20gc3RkaW5cbiAqIGNvbnN0IHN0ZGluQ29udGVudCA9IHJlYWRBbGxTeW5jKERlbm8uc3RkaW4pO1xuICpcbiAqIC8vIEV4YW1wbGUgZnJvbSBmaWxlXG4gKiB1c2luZyBmaWxlID0gRGVuby5vcGVuU3luYyhcIm15X2ZpbGUudHh0XCIsIHtyZWFkOiB0cnVlfSk7XG4gKiBjb25zdCBteUZpbGVDb250ZW50ID0gcmVhZEFsbFN5bmMoZmlsZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBbGxTeW5jKHJlYWRlcjogUmVhZGVyU3luYyk6IFVpbnQ4QXJyYXkge1xuICBjb25zdCBjaHVua3M6IFVpbnQ4QXJyYXlbXSA9IFtdO1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IGNodW5rID0gbmV3IFVpbnQ4QXJyYXkoREVGQVVMVF9DSFVOS19TSVpFKTtcbiAgICBjb25zdCBuID0gcmVhZGVyLnJlYWRTeW5jKGNodW5rKTtcbiAgICBpZiAobiA9PT0gbnVsbCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGlmIChuIDwgREVGQVVMVF9DSFVOS19TSVpFKSB7XG4gICAgICBjaHVua3MucHVzaChjaHVuay5zdWJhcnJheSgwLCBuKSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY2h1bmtzLnB1c2goY2h1bmspO1xuICB9XG4gIHJldHVybiBjb25jYXQoY2h1bmtzKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUscUNBQXFDO0FBRXJDLFNBQVMsTUFBTSxRQUFRLGtDQUFrQztBQUN6RCxTQUFTLGtCQUFrQixRQUFRLGtCQUFrQjtBQUdyRDs7Ozs7Ozs7Ozs7Ozs7O0NBZUMsR0FDRCxPQUFPLGVBQWUsUUFBUSxNQUFjO0VBQzFDLE1BQU0sU0FBdUIsRUFBRTtFQUMvQixNQUFPLEtBQU07SUFDWCxJQUFJLFFBQVEsSUFBSSxXQUFXO0lBQzNCLE1BQU0sSUFBSSxNQUFNLE9BQU8sSUFBSSxDQUFDO0lBQzVCLElBQUksTUFBTSxNQUFNO01BQ2Q7SUFDRjtJQUNBLElBQUksSUFBSSxvQkFBb0I7TUFDMUIsUUFBUSxNQUFNLFFBQVEsQ0FBQyxHQUFHO0lBQzVCO0lBQ0EsT0FBTyxJQUFJLENBQUM7RUFDZDtFQUNBLE9BQU8sT0FBTztBQUNoQjtBQUVBOzs7Ozs7Ozs7Ozs7Ozs7Q0FlQyxHQUNELE9BQU8sU0FBUyxZQUFZLE1BQWtCO0VBQzVDLE1BQU0sU0FBdUIsRUFBRTtFQUMvQixNQUFPLEtBQU07SUFDWCxNQUFNLFFBQVEsSUFBSSxXQUFXO0lBQzdCLE1BQU0sSUFBSSxPQUFPLFFBQVEsQ0FBQztJQUMxQixJQUFJLE1BQU0sTUFBTTtNQUNkO0lBQ0Y7SUFDQSxJQUFJLElBQUksb0JBQW9CO01BQzFCLE9BQU8sSUFBSSxDQUFDLE1BQU0sUUFBUSxDQUFDLEdBQUc7TUFDOUI7SUFDRjtJQUNBLE9BQU8sSUFBSSxDQUFDO0VBQ2Q7RUFDQSxPQUFPLE9BQU87QUFDaEIifQ==