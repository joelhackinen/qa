// Copyright 2018-2024 the oak authors. All rights reserved. MIT license.
/**
 * Provides a iterable map interfaces for managing cookies server side.
 *
 * @example
 * To access the keys in a request and have any set keys available for creating
 * a response:
 *
 * ```ts
 * import { CookieMap, mergeHeaders } from "jsr:@oak/commons/cookie_map";
 *
 * const request = new Request("https://localhost/", {
 *   headers: { "cookie": "foo=bar; bar=baz;"}
 * });
 *
 * const cookies = new CookieMap(request, { secure: true });
 * console.log(cookies.get("foo")); // logs "bar"
 * cookies.set("session", "1234567", { secure: true });
 *
 * const response = new Response("hello", {
 *   headers: mergeHeaders({
 *     "content-type": "text/plain",
 *   }, cookies),
 * });
 * ```
 *
 * @example
 * To have automatic management of cryptographically signed cookies, you can use
 * the {@linkcode SecureCookieMap} instead of {@linkcode CookieMap}. The biggest
 * difference is that the methods operate async in order to be able to support
 * async signing and validation of cookies:
 *
 * ```ts
 * import {
 *   SecureCookieMap,
 *   mergeHeaders,
 *   type KeyRing,
 * } from "jsr:@oak/commons/cookie_map";
 *
 * const request = new Request("https://localhost/", {
 *   headers: { "cookie": "foo=bar; bar=baz;"}
 * });
 *
 * // The keys must implement the `KeyRing` interface.
 * declare const keys: KeyRing;
 *
 * const cookies = new SecureCookieMap(request, { keys, secure: true });
 * console.log(await cookies.get("foo")); // logs "bar"
 * // the cookie will be automatically signed using the supplied key ring.
 * await cookies.set("session", "1234567");
 *
 * const response = new Response("hello", {
 *   headers: mergeHeaders({
 *     "content-type": "text/plain",
 *   }, cookies),
 * });
 * ```
 *
 * In addition, if you have a {@linkcode Response} or {@linkcode Headers} for a
 * response at construction of the cookies object, they can be passed and any
 * set cookies will be added directly to those headers:
 *
 * ```ts
 * import { CookieMap } from "jsr:@oak/commons/cookie_map";
 *
 * const request = new Request("https://localhost/", {
 *   headers: { "cookie": "foo=bar; bar=baz;"}
 * });
 *
 * const response = new Response("hello", {
 *   headers: { "content-type": "text/plain" },
 * });
 *
 * const cookies = new CookieMap(request, { response });
 * console.log(cookies.get("foo")); // logs "bar"
 * cookies.set("session", "1234567");
 * ```
 *
 * @module
 */ var _computedKey, _computedKey1, _computedKey2, _computedKey3;
// deno-lint-ignore no-control-regex
const FIELD_CONTENT_REGEXP = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
const KEY_REGEXP = /(?:^|;) *([^=]*)=[^;]*/g;
const SAME_SITE_REGEXP = /^(?:lax|none|strict)$/i;
const matchCache = {};
function getPattern(name) {
  if (name in matchCache) {
    return matchCache[name];
  }
  return matchCache[name] = new RegExp(`(?:^|;) *${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}=([^;]*)`);
}
function pushCookie(values, cookie) {
  if (cookie.overwrite) {
    for(let i = values.length - 1; i >= 0; i--){
      if (values[i].indexOf(`${cookie.name}=`) === 0) {
        values.splice(i, 1);
      }
    }
  }
  values.push(cookie.toHeaderValue());
}
function validateCookieProperty(key, value) {
  if (value && !FIELD_CONTENT_REGEXP.test(value)) {
    throw new TypeError(`The "${key}" of the cookie (${value}) is invalid.`);
  }
}
/** An internal abstraction to manage cookies. */ class Cookie {
  domain;
  expires;
  httpOnly = true;
  maxAge;
  name;
  overwrite = false;
  path = "/";
  sameSite = false;
  secure = false;
  signed;
  value;
  constructor(name, value, attributes){
    validateCookieProperty("name", name);
    this.name = name;
    validateCookieProperty("value", value);
    this.value = value ?? "";
    Object.assign(this, attributes);
    if (!this.value) {
      this.expires = new Date(0);
      this.maxAge = undefined;
    }
    validateCookieProperty("path", this.path);
    validateCookieProperty("domain", this.domain);
    if (this.sameSite && typeof this.sameSite === "string" && !SAME_SITE_REGEXP.test(this.sameSite)) {
      throw new TypeError(`The "sameSite" of the cookie ("${this.sameSite}") is invalid.`);
    }
  }
  toHeaderValue() {
    let value = this.toString();
    if (this.maxAge) {
      this.expires = new Date(Date.now() + this.maxAge * 1000);
    }
    if (this.path) {
      value += `; path=${this.path}`;
    }
    if (this.expires) {
      value += `; expires=${this.expires.toUTCString()}`;
    }
    if (this.domain) {
      value += `; domain=${this.domain}`;
    }
    if (this.sameSite) {
      value += `; samesite=${this.sameSite === true ? "strict" : this.sameSite.toLowerCase()}`;
    }
    if (this.secure) {
      value += "; secure";
    }
    if (this.httpOnly) {
      value += "; httponly";
    }
    return value;
  }
  toString() {
    return `${this.name}=${this.value}`;
  }
}
/**
 * Symbol which is used in {@link mergeHeaders} to extract a
 * `[string | string][]` from an instance to generate the final set of
 * headers.
 */ export const cookieMapHeadersInitSymbol = Symbol.for("oak.commons.cookieMap.headersInit");
function isMergeable(value) {
  return value !== null && value !== undefined && typeof value === "object" && cookieMapHeadersInitSymbol in value;
}
/**
 * Allows merging of various sources of headers into a final set of headers
 * which can be used in a {@linkcode Response}.
 *
 * Note, that unlike when passing a `Response` or {@linkcode Headers} used in a
 * response to {@linkcode CookieMap} or {@linkcode SecureCookieMap}, merging
 * will not ensure that there are no other `Set-Cookie` headers from other
 * sources, it will simply append the various headers together.
 */ export function mergeHeaders(...sources) {
  const headers = new Headers();
  for (const source of sources){
    let entries;
    if (source instanceof Headers) {
      entries = source;
    } else if ("headers" in source && source.headers instanceof Headers) {
      entries = source.headers;
    } else if (isMergeable(source)) {
      entries = source[cookieMapHeadersInitSymbol]();
    } else if (Array.isArray(source)) {
      entries = source;
    } else {
      entries = Object.entries(source);
    }
    for (const [key, value] of entries){
      headers.append(key, value);
    }
  }
  return headers;
}
const keys = Symbol("#keys");
const requestHeaders = Symbol("#requestHeaders");
const responseHeaders = Symbol("#responseHeaders");
const isSecure = Symbol("#secure");
const requestKeys = Symbol("#requestKeys");
_computedKey = Symbol.for("Deno.customInspect"), _computedKey1 = Symbol.for("nodejs.util.inspect.custom");
/** An internal abstract class which provides common functionality for
 * {@link CookieMap} and {@link SecureCookieMap}.
 */ class CookieMapBase {
  [keys];
  [requestHeaders];
  [responseHeaders];
  [isSecure];
  [requestKeys]() {
    if (this[keys]) {
      return this[keys];
    }
    const result = this[keys] = [];
    const header = this[requestHeaders].get("cookie");
    if (!header) {
      return result;
    }
    let matches;
    while(matches = KEY_REGEXP.exec(header)){
      const [, key] = matches;
      result.push(key);
    }
    return result;
  }
  constructor(request, options){
    this[requestHeaders] = "headers" in request ? request.headers : request;
    const { secure = false, response = new Headers() } = options;
    this[responseHeaders] = "headers" in response ? response.headers : response;
    this[isSecure] = secure;
  }
  /** A method used by {@linkcode mergeHeaders} to be able to merge
   * headers from various sources when forming a {@linkcode Response}. */ [cookieMapHeadersInitSymbol]() {
    const init = [];
    for (const [key, value] of this[responseHeaders]){
      if (key === "set-cookie") {
        init.push([
          key,
          value
        ]);
      }
    }
    return init;
  }
  [_computedKey]() {
    return `${this.constructor.name} []`;
  }
  [_computedKey1](depth, // deno-lint-ignore no-explicit-any
  options, inspect) {
    if (depth < 0) {
      return options.stylize(`[${this.constructor.name}]`, "special");
    }
    const newOptions = Object.assign({}, options, {
      depth: options.depth === null ? null : options.depth - 1
    });
    return `${options.stylize(this.constructor.name, "special")} ${inspect([], newOptions)}`;
  }
}
_computedKey2 = Symbol.iterator;
/**
 * Provides a way to manage cookies in a request and response on the server
 * as a single iterable collection.
 *
 * The methods and properties align to {@linkcode Map}. When constructing a
 * {@linkcode Request} or {@linkcode Headers} from the request need to be
 * provided, as well as optionally the {@linkcode Response} or `Headers` for the
 * response can be provided. Alternatively the {@linkcode mergeHeaders}
 * function can be used to generate a final set of headers for sending in the
 * response.
 */ export class CookieMap extends CookieMapBase {
  /** Contains the number of valid cookies in the request headers. */ get size() {
    return [
      ...this
    ].length;
  }
  constructor(request, options = {}){
    super(request, options);
  }
  /** Deletes all the cookies from the {@linkcode Request} in the response. */ clear(options = {}) {
    for (const key of this.keys()){
      this.set(key, null, options);
    }
  }
  /** Set a cookie to be deleted in the response.
   *
   * This is a convenience function for `set(key, null, options?)`.
   */ delete(key, options = {}) {
    this.set(key, null, options);
    return true;
  }
  /** Return the value of a matching key present in the {@linkcode Request}. If
   * the key is not present `undefined` is returned. */ get(key) {
    const headerValue = this[requestHeaders].get("cookie");
    if (!headerValue) {
      return undefined;
    }
    const match = headerValue.match(getPattern(key));
    if (!match) {
      return undefined;
    }
    const [, value] = match;
    return value;
  }
  /** Returns `true` if the matching key is present in the {@linkcode Request},
   * otherwise `false`. */ has(key) {
    const headerValue = this[requestHeaders].get("cookie");
    if (!headerValue) {
      return false;
    }
    return getPattern(key).test(headerValue);
  }
  /** Set a named cookie in the response. The optional
   * {@linkcode CookieMapSetDeleteOptions} are applied to the cookie being set.
   */ set(key, value, options = {}) {
    const resHeaders = this[responseHeaders];
    const values = [];
    for (const [key, value] of resHeaders){
      if (key === "set-cookie") {
        values.push(value);
      }
    }
    const secure = this[isSecure];
    if (!secure && options.secure && !options.ignoreInsecure) {
      throw new TypeError("Cannot send secure cookie over unencrypted connection.");
    }
    const cookie = new Cookie(key, value, options);
    cookie.secure = options.secure ?? secure;
    pushCookie(values, cookie);
    resHeaders.delete("set-cookie");
    for (const value of values){
      resHeaders.append("set-cookie", value);
    }
    return this;
  }
  /** Iterate over the cookie keys and values that are present in the
   * {@linkcode Request}. This is an alias of the `[Symbol.iterator]` method
   * present on the class. */ entries() {
    return this[Symbol.iterator]();
  }
  /** Iterate over the cookie keys that are present in the
   * {@linkcode Request}. */ *keys() {
    for (const [key] of this){
      yield key;
    }
  }
  /** Iterate over the cookie values that are present in the
   * {@linkcode Request}. */ *values() {
    for (const [, value] of this){
      yield value;
    }
  }
  /** Iterate over the cookie keys and values that are present in the
   * {@linkcode Request}. */ *[_computedKey2]() {
    const keys = this[requestKeys]();
    for (const key of keys){
      const value = this.get(key);
      if (value) {
        yield [
          key,
          value
        ];
      }
    }
  }
}
_computedKey3 = Symbol.asyncIterator;
/**
 * Provides an way to manage cookies in a request and response on the server
 * as a single iterable collection, as well as the ability to sign and verify
 * cookies to prevent tampering.
 *
 * The methods and properties align to {@linkcode Map}, but due to the need to
 * support asynchronous cryptographic keys, all the APIs operate async. When
 * constructing a {@linkcode Request} or {@linkcode Headers} from the request
 * need to be provided, as well as optionally the {@linkcode Response} or
 * `Headers` for the response can be provided. Alternatively the
 * {@linkcode mergeHeaders} function can be used to generate a final set
 * of headers for sending in the response.
 *
 * On construction, the optional set of keys implementing the
 * {@linkcode KeyRing} interface. While it is optional, if you don't plan to use
 * keys, you might want to consider using just the {@linkcode CookieMap}.
 */ export class SecureCookieMap extends CookieMapBase {
  #keyRing;
  /** Is set to a promise which resolves with the number of cookies in the
   * {@linkcode Request}. */ get size() {
    return (async ()=>{
      let size = 0;
      for await (const _ of this){
        size++;
      }
      return size;
    })();
  }
  constructor(request, options = {}){
    super(request, options);
    const { keys } = options;
    this.#keyRing = keys;
  }
  /** Sets all cookies in the {@linkcode Request} to be deleted in the
   * response. */ async clear(options) {
    const promises = [];
    for await (const key of this.keys()){
      promises.push(this.set(key, null, options));
    }
    await Promise.all(promises);
  }
  /** Set a cookie to be deleted in the response.
   *
   * This is a convenience function for `set(key, null, options?)`. */ async delete(key, options = {}) {
    await this.set(key, null, options);
    return true;
  }
  /** Get the value of a cookie from the {@linkcode Request}.
   *
   * If the cookie is signed, and the signature is invalid, `undefined` will be
   * returned and the cookie will be set to be deleted in the response. If the
   * cookie is using an "old" key from the keyring, the cookie will be re-signed
   * with the current key and be added to the response to be updated. */ async get(key, options = {}) {
    const signed = options.signed ?? !!this.#keyRing;
    const nameSig = `${key}.sig`;
    const header = this[requestHeaders].get("cookie");
    if (!header) {
      return;
    }
    const match = header.match(getPattern(key));
    if (!match) {
      return;
    }
    const [, value] = match;
    if (!signed) {
      return value;
    }
    const digest = await this.get(nameSig, {
      signed: false
    });
    if (!digest) {
      return;
    }
    const data = `${key}=${value}`;
    if (!this.#keyRing) {
      throw new TypeError("key ring required for signed cookies");
    }
    const index = await this.#keyRing.indexOf(data, digest);
    if (index < 0) {
      await this.delete(nameSig, {
        path: "/",
        signed: false
      });
    } else {
      if (index) {
        await this.set(nameSig, await this.#keyRing.sign(data), {
          signed: false
        });
      }
      return value;
    }
  }
  /** Returns `true` if the key is in the {@linkcode Request}.
   *
   * If the cookie is signed, and the signature is invalid, `false` will be
   * returned and the cookie will be set to be deleted in the response. If the
   * cookie is using an "old" key from the keyring, the cookie will be re-signed
   * with the current key and be added to the response to be updated. */ async has(key, options = {}) {
    const signed = options.signed ?? !!this.#keyRing;
    const nameSig = `${key}.sig`;
    const header = this[requestHeaders].get("cookie");
    if (!header) {
      return false;
    }
    const match = header.match(getPattern(key));
    if (!match) {
      return false;
    }
    if (!signed) {
      return true;
    }
    const digest = await this.get(nameSig, {
      signed: false
    });
    if (!digest) {
      return false;
    }
    const [, value] = match;
    const data = `${key}=${value}`;
    if (!this.#keyRing) {
      throw new TypeError("key ring required for signed cookies");
    }
    const index = await this.#keyRing.indexOf(data, digest);
    if (index < 0) {
      await this.delete(nameSig, {
        path: "/",
        signed: false
      });
      return false;
    } else {
      if (index) {
        await this.set(nameSig, await this.#keyRing.sign(data), {
          signed: false
        });
      }
      return true;
    }
  }
  /** Set a cookie in the response headers.
   *
   * If there was a keyring set, cookies will be automatically signed, unless
   * overridden by the passed options. Cookies can be deleted by setting the
   * value to `null`. */ async set(key, value, options = {}) {
    const resHeaders = this[responseHeaders];
    const headers = [];
    for (const [key, value] of resHeaders.entries()){
      if (key === "set-cookie") {
        headers.push(value);
      }
    }
    const secure = this[isSecure];
    const signed = options.signed ?? !!this.#keyRing;
    if (!secure && options.secure && !options.ignoreInsecure) {
      throw new TypeError("Cannot send secure cookie over unencrypted connection.");
    }
    const cookie = new Cookie(key, value, options);
    cookie.secure = options.secure ?? secure;
    pushCookie(headers, cookie);
    if (signed) {
      if (!this.#keyRing) {
        throw new TypeError("keys required for signed cookies.");
      }
      cookie.value = await this.#keyRing.sign(cookie.toString());
      cookie.name += ".sig";
      pushCookie(headers, cookie);
    }
    resHeaders.delete("set-cookie");
    for (const header of headers){
      resHeaders.append("set-cookie", header);
    }
    return this;
  }
  /** Iterate over the {@linkcode Request} cookies, yielding up a tuple
   * containing the key and value of each cookie.
   *
   * If a key ring was provided, only properly signed cookie keys and values are
   * returned. */ entries() {
    return this[Symbol.asyncIterator]();
  }
  /** Iterate over the request's cookies, yielding up the key of each cookie.
   *
   * If a keyring was provided, only properly signed cookie keys are
   * returned. */ async *keys() {
    for await (const [key] of this){
      yield key;
    }
  }
  /** Iterate over the request's cookies, yielding up the value of each cookie.
   *
   * If a keyring was provided, only properly signed cookie values are
   * returned. */ async *values() {
    for await (const [, value] of this){
      yield value;
    }
  }
  /** Iterate over the {@linkcode Request} cookies, yielding up a tuple
   * containing the key and value of each cookie.
   *
   * If a key ring was provided, only properly signed cookie keys and values are
   * returned. */ async *[_computedKey3]() {
    const keys = this[requestKeys]();
    for (const key of keys){
      const value = await this.get(key);
      if (value) {
        yield [
          key,
          value
        ];
      }
    }
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvY29tbW9ucy8wLjExLjAvY29va2llX21hcC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI0IHRoZSBvYWsgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbi8qKlxuICogUHJvdmlkZXMgYSBpdGVyYWJsZSBtYXAgaW50ZXJmYWNlcyBmb3IgbWFuYWdpbmcgY29va2llcyBzZXJ2ZXIgc2lkZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogVG8gYWNjZXNzIHRoZSBrZXlzIGluIGEgcmVxdWVzdCBhbmQgaGF2ZSBhbnkgc2V0IGtleXMgYXZhaWxhYmxlIGZvciBjcmVhdGluZ1xuICogYSByZXNwb25zZTpcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgQ29va2llTWFwLCBtZXJnZUhlYWRlcnMgfSBmcm9tIFwianNyOkBvYWsvY29tbW9ucy9jb29raWVfbWFwXCI7XG4gKlxuICogY29uc3QgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KFwiaHR0cHM6Ly9sb2NhbGhvc3QvXCIsIHtcbiAqICAgaGVhZGVyczogeyBcImNvb2tpZVwiOiBcImZvbz1iYXI7IGJhcj1iYXo7XCJ9XG4gKiB9KTtcbiAqXG4gKiBjb25zdCBjb29raWVzID0gbmV3IENvb2tpZU1hcChyZXF1ZXN0LCB7IHNlY3VyZTogdHJ1ZSB9KTtcbiAqIGNvbnNvbGUubG9nKGNvb2tpZXMuZ2V0KFwiZm9vXCIpKTsgLy8gbG9ncyBcImJhclwiXG4gKiBjb29raWVzLnNldChcInNlc3Npb25cIiwgXCIxMjM0NTY3XCIsIHsgc2VjdXJlOiB0cnVlIH0pO1xuICpcbiAqIGNvbnN0IHJlc3BvbnNlID0gbmV3IFJlc3BvbnNlKFwiaGVsbG9cIiwge1xuICogICBoZWFkZXJzOiBtZXJnZUhlYWRlcnMoe1xuICogICAgIFwiY29udGVudC10eXBlXCI6IFwidGV4dC9wbGFpblwiLFxuICogICB9LCBjb29raWVzKSxcbiAqIH0pO1xuICogYGBgXG4gKlxuICogQGV4YW1wbGVcbiAqIFRvIGhhdmUgYXV0b21hdGljIG1hbmFnZW1lbnQgb2YgY3J5cHRvZ3JhcGhpY2FsbHkgc2lnbmVkIGNvb2tpZXMsIHlvdSBjYW4gdXNlXG4gKiB0aGUge0BsaW5rY29kZSBTZWN1cmVDb29raWVNYXB9IGluc3RlYWQgb2Yge0BsaW5rY29kZSBDb29raWVNYXB9LiBUaGUgYmlnZ2VzdFxuICogZGlmZmVyZW5jZSBpcyB0aGF0IHRoZSBtZXRob2RzIG9wZXJhdGUgYXN5bmMgaW4gb3JkZXIgdG8gYmUgYWJsZSB0byBzdXBwb3J0XG4gKiBhc3luYyBzaWduaW5nIGFuZCB2YWxpZGF0aW9uIG9mIGNvb2tpZXM6XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7XG4gKiAgIFNlY3VyZUNvb2tpZU1hcCxcbiAqICAgbWVyZ2VIZWFkZXJzLFxuICogICB0eXBlIEtleVJpbmcsXG4gKiB9IGZyb20gXCJqc3I6QG9hay9jb21tb25zL2Nvb2tpZV9tYXBcIjtcbiAqXG4gKiBjb25zdCByZXF1ZXN0ID0gbmV3IFJlcXVlc3QoXCJodHRwczovL2xvY2FsaG9zdC9cIiwge1xuICogICBoZWFkZXJzOiB7IFwiY29va2llXCI6IFwiZm9vPWJhcjsgYmFyPWJhejtcIn1cbiAqIH0pO1xuICpcbiAqIC8vIFRoZSBrZXlzIG11c3QgaW1wbGVtZW50IHRoZSBgS2V5UmluZ2AgaW50ZXJmYWNlLlxuICogZGVjbGFyZSBjb25zdCBrZXlzOiBLZXlSaW5nO1xuICpcbiAqIGNvbnN0IGNvb2tpZXMgPSBuZXcgU2VjdXJlQ29va2llTWFwKHJlcXVlc3QsIHsga2V5cywgc2VjdXJlOiB0cnVlIH0pO1xuICogY29uc29sZS5sb2coYXdhaXQgY29va2llcy5nZXQoXCJmb29cIikpOyAvLyBsb2dzIFwiYmFyXCJcbiAqIC8vIHRoZSBjb29raWUgd2lsbCBiZSBhdXRvbWF0aWNhbGx5IHNpZ25lZCB1c2luZyB0aGUgc3VwcGxpZWQga2V5IHJpbmcuXG4gKiBhd2FpdCBjb29raWVzLnNldChcInNlc3Npb25cIiwgXCIxMjM0NTY3XCIpO1xuICpcbiAqIGNvbnN0IHJlc3BvbnNlID0gbmV3IFJlc3BvbnNlKFwiaGVsbG9cIiwge1xuICogICBoZWFkZXJzOiBtZXJnZUhlYWRlcnMoe1xuICogICAgIFwiY29udGVudC10eXBlXCI6IFwidGV4dC9wbGFpblwiLFxuICogICB9LCBjb29raWVzKSxcbiAqIH0pO1xuICogYGBgXG4gKlxuICogSW4gYWRkaXRpb24sIGlmIHlvdSBoYXZlIGEge0BsaW5rY29kZSBSZXNwb25zZX0gb3Ige0BsaW5rY29kZSBIZWFkZXJzfSBmb3IgYVxuICogcmVzcG9uc2UgYXQgY29uc3RydWN0aW9uIG9mIHRoZSBjb29raWVzIG9iamVjdCwgdGhleSBjYW4gYmUgcGFzc2VkIGFuZCBhbnlcbiAqIHNldCBjb29raWVzIHdpbGwgYmUgYWRkZWQgZGlyZWN0bHkgdG8gdGhvc2UgaGVhZGVyczpcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgQ29va2llTWFwIH0gZnJvbSBcImpzcjpAb2FrL2NvbW1vbnMvY29va2llX21hcFwiO1xuICpcbiAqIGNvbnN0IHJlcXVlc3QgPSBuZXcgUmVxdWVzdChcImh0dHBzOi8vbG9jYWxob3N0L1wiLCB7XG4gKiAgIGhlYWRlcnM6IHsgXCJjb29raWVcIjogXCJmb289YmFyOyBiYXI9YmF6O1wifVxuICogfSk7XG4gKlxuICogY29uc3QgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UoXCJoZWxsb1wiLCB7XG4gKiAgIGhlYWRlcnM6IHsgXCJjb250ZW50LXR5cGVcIjogXCJ0ZXh0L3BsYWluXCIgfSxcbiAqIH0pO1xuICpcbiAqIGNvbnN0IGNvb2tpZXMgPSBuZXcgQ29va2llTWFwKHJlcXVlc3QsIHsgcmVzcG9uc2UgfSk7XG4gKiBjb25zb2xlLmxvZyhjb29raWVzLmdldChcImZvb1wiKSk7IC8vIGxvZ3MgXCJiYXJcIlxuICogY29va2llcy5zZXQoXCJzZXNzaW9uXCIsIFwiMTIzNDU2N1wiKTtcbiAqIGBgYFxuICpcbiAqIEBtb2R1bGVcbiAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIENvb2tpZU1hcE9wdGlvbnMge1xuICAvKiogVGhlIHtAbGlua2NvZGUgUmVzcG9uc2V9IG9yIHRoZSBoZWFkZXJzIHRoYXQgd2lsbCBiZSB1c2VkIHdpdGggdGhlXG4gICAqIHJlc3BvbnNlLiBXaGVuIHByb3ZpZGVkLCBgU2V0LUNvb2tpZWAgaGVhZGVycyB3aWxsIGJlIHNldCBpbiB0aGUgaGVhZGVyc1xuICAgKiB3aGVuIGNvb2tpZXMgYXJlIHNldCBvciBkZWxldGVkIGluIHRoZSBtYXAuXG4gICAqXG4gICAqIEFuIGFsdGVybmF0aXZlIHdheSB0byBleHRyYWN0IHRoZSBoZWFkZXJzIGlzIHRvIHBhc3MgdGhlIGNvb2tpZSBtYXAgdG8gdGhlXG4gICAqIHtAbGlua2NvZGUgbWVyZ2VIZWFkZXJzfSBmdW5jdGlvbiB0byBtZXJnZSB2YXJpb3VzIHNvdXJjZXMgb2YgdGhlXG4gICAqIGhlYWRlcnMgdG8gYmUgcHJvdmlkZWQgd2hlbiBjcmVhdGluZyBvciB1cGRhdGluZyBhIHJlc3BvbnNlLlxuICAgKi9cbiAgcmVzcG9uc2U/OiBIZWFkZXJlZCB8IEhlYWRlcnM7XG4gIC8qKiBBIGZsYWcgdGhhdCBpbmRpY2F0ZXMgaWYgdGhlIHJlcXVlc3QgYW5kIHJlc3BvbnNlIGFyZSBiZWluZyBoYW5kbGVkIG92ZXJcbiAgICogYSBzZWN1cmUgKGUuZy4gSFRUUFMvVExTKSBjb25uZWN0aW9uLlxuICAgKlxuICAgKiBAZGVmYXVsdCB7ZmFsc2V9XG4gICAqL1xuICBzZWN1cmU/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvb2tpZU1hcFNldERlbGV0ZU9wdGlvbnMge1xuICAvKiogVGhlIGRvbWFpbiB0byBzY29wZSB0aGUgY29va2llIGZvci4gKi9cbiAgZG9tYWluPzogc3RyaW5nO1xuICAvKiogV2hlbiB0aGUgY29va2llIGV4cGlyZXMuICovXG4gIGV4cGlyZXM/OiBEYXRlO1xuICAvKiogTnVtYmVyIG9mIHNlY29uZHMgdW50aWwgdGhlIGNvb2tpZSBleHBpcmVzICovXG4gIG1heEFnZT86IG51bWJlcjtcbiAgLyoqIEEgZmxhZyB0aGF0IGluZGljYXRlcyBpZiB0aGUgY29va2llIGlzIHZhbGlkIG92ZXIgSFRUUCBvbmx5LiAqL1xuICBodHRwT25seT86IGJvb2xlYW47XG4gIC8qKiBEbyBub3QgZXJyb3Igd2hlbiBzaWduaW5nIGFuZCB2YWxpZGF0aW5nIGNvb2tpZXMgb3ZlciBhbiBpbnNlY3VyZVxuICAgKiBjb25uZWN0aW9uLiAqL1xuICBpZ25vcmVJbnNlY3VyZT86IGJvb2xlYW47XG4gIC8qKiBPdmVyd3JpdGUgYW4gZXhpc3RpbmcgdmFsdWUuICovXG4gIG92ZXJ3cml0ZT86IGJvb2xlYW47XG4gIC8qKiBUaGUgcGF0aCB0aGUgY29va2llIGlzIHZhbGlkIGZvci4gKi9cbiAgcGF0aD86IHN0cmluZztcbiAgLyoqIE92ZXJyaWRlIHRoZSBmbGFnIHRoYXQgd2FzIHNldCB3aGVuIHRoZSBpbnN0YW5jZSB3YXMgY3JlYXRlZC4gKi9cbiAgc2VjdXJlPzogYm9vbGVhbjtcbiAgLyoqIFNldCB0aGUgc2FtZS1zaXRlIGluZGljYXRvciBmb3IgYSBjb29raWUuICovXG4gIHNhbWVTaXRlPzogXCJzdHJpY3RcIiB8IFwibGF4XCIgfCBcIm5vbmVcIiB8IGJvb2xlYW47XG59XG5cbi8qKlxuICogQW4gb2JqZWN0IHdoaWNoIGNvbnRhaW5zIGEgYGhlYWRlcnNgIHByb3BlcnR5IHdoaWNoIGhhcyBhIHZhbHVlIG9mIGFuXG4gKiBpbnN0YW5jZSBvZiB7QGxpbmtjb2RlIEhlYWRlcnN9LCBsaWtlIHtAbGlua2NvZGUgUmVxdWVzdH0gYW5kXG4gKiB7QGxpbmtjb2RlIFJlc3BvbnNlfS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIZWFkZXJlZCB7XG4gIGhlYWRlcnM6IEhlYWRlcnM7XG59XG5cbi8qKlxuICogQW4gb2JqZWN0IHdoaWNoIGNvbnRhaW5zIGEgc3ltYm9sIHdoaWNoIGluZGljYXRlcyB0aGF0IGl0IGNhbiBiZSBtZXJnZWQgd2l0aFxuICogb3RoZXIgaGVhZGVycy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNZXJnZWFibGUge1xuICBbY29va2llTWFwSGVhZGVyc0luaXRTeW1ib2xdKCk6IFtzdHJpbmcsIHN0cmluZ11bXTtcbn1cblxuLyoqIE9wdGlvbnMgd2hpY2ggY2FuIGJlIHNldCB3aGVuIGluaXRpYWxpemluZyBhIHtAbGlua2NvZGUgU2VjdXJlQ29va2llTWFwfS4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2VjdXJlQ29va2llTWFwT3B0aW9ucyB7XG4gIC8qKiBLZXlzIHdoaWNoIHdpbGwgYmUgdXNlZCB0byB2YWxpZGF0ZSBhbmQgc2lnbiBjb29raWVzLiBUaGUga2V5IHJpbmcgc2hvdWxkXG4gICAqIGltcGxlbWVudCB0aGUge0BsaW5rY29kZSBLZXlSaW5nfSBpbnRlcmZhY2UuICovXG4gIGtleXM/OiBLZXlSaW5nO1xuXG4gIC8qKiBUaGUge0BsaW5rY29kZSBSZXNwb25zZX0gb3IgdGhlIGhlYWRlcnMgdGhhdCB3aWxsIGJlIHVzZWQgd2l0aCB0aGVcbiAgICogcmVzcG9uc2UuIFdoZW4gcHJvdmlkZWQsIGBTZXQtQ29va2llYCBoZWFkZXJzIHdpbGwgYmUgc2V0IGluIHRoZSBoZWFkZXJzXG4gICAqIHdoZW4gY29va2llcyBhcmUgc2V0IG9yIGRlbGV0ZWQgaW4gdGhlIG1hcC5cbiAgICpcbiAgICogQW4gYWx0ZXJuYXRpdmUgd2F5IHRvIGV4dHJhY3QgdGhlIGhlYWRlcnMgaXMgdG8gcGFzcyB0aGUgY29va2llIG1hcCB0byB0aGVcbiAgICoge0BsaW5rY29kZSBtZXJnZUhlYWRlcnN9IGZ1bmN0aW9uIHRvIG1lcmdlIHZhcmlvdXMgc291cmNlcyBvZiB0aGVcbiAgICogaGVhZGVycyB0byBiZSBwcm92aWRlZCB3aGVuIGNyZWF0aW5nIG9yIHVwZGF0aW5nIGEgcmVzcG9uc2UuXG4gICAqL1xuICByZXNwb25zZT86IEhlYWRlcmVkIHwgSGVhZGVycztcblxuICAvKiogQSBmbGFnIHRoYXQgaW5kaWNhdGVzIGlmIHRoZSByZXF1ZXN0IGFuZCByZXNwb25zZSBhcmUgYmVpbmcgaGFuZGxlZCBvdmVyXG4gICAqIGEgc2VjdXJlIChlLmcuIEhUVFBTL1RMUykgY29ubmVjdGlvbi5cbiAgICpcbiAgICogQGRlZmF1bHQge2ZhbHNlfVxuICAgKi9cbiAgc2VjdXJlPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBPcHRpb25zIHdoaWNoIGNhbiBiZSBzZXQgd2hlbiBjYWxsaW5nIHRoZSBgLmdldCgpYCBtZXRob2Qgb24gYVxuICoge0BsaW5rY29kZSBTZWN1cmVDb29raWVNYXB9LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFNlY3VyZUNvb2tpZU1hcEdldE9wdGlvbnMge1xuICAvKiogT3ZlcnJpZGVzIHRoZSBmbGFnIHRoYXQgd2FzIHNldCB3aGVuIHRoZSBpbnN0YW5jZSB3YXMgY3JlYXRlZC4gKi9cbiAgc2lnbmVkPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBPcHRpb25zIHdoaWNoIGNhbiBiZSBzZXQgd2hlbiBjYWxsaW5nIHRoZSBgLnNldCgpYCBvciBgLmRlbGV0ZSgpYCBtZXRob2Qgb24gYVxuICoge0BsaW5rY29kZSBTZWN1cmVDb29raWVNYXB9LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFNlY3VyZUNvb2tpZU1hcFNldERlbGV0ZU9wdGlvbnMge1xuICAvKiogVGhlIGRvbWFpbiB0byBzY29wZSB0aGUgY29va2llIGZvci4gKi9cbiAgZG9tYWluPzogc3RyaW5nO1xuICAvKiogV2hlbiB0aGUgY29va2llIGV4cGlyZXMuICovXG4gIGV4cGlyZXM/OiBEYXRlO1xuICAvKiogTnVtYmVyIG9mIHNlY29uZHMgdW50aWwgdGhlIGNvb2tpZSBleHBpcmVzICovXG4gIG1heEFnZT86IG51bWJlcjtcbiAgLyoqIEEgZmxhZyB0aGF0IGluZGljYXRlcyBpZiB0aGUgY29va2llIGlzIHZhbGlkIG92ZXIgSFRUUCBvbmx5LiAqL1xuICBodHRwT25seT86IGJvb2xlYW47XG4gIC8qKiBEbyBub3QgZXJyb3Igd2hlbiBzaWduaW5nIGFuZCB2YWxpZGF0aW5nIGNvb2tpZXMgb3ZlciBhbiBpbnNlY3VyZVxuICAgKiBjb25uZWN0aW9uLiAqL1xuICBpZ25vcmVJbnNlY3VyZT86IGJvb2xlYW47XG4gIC8qKiBPdmVyd3JpdGUgYW4gZXhpc3RpbmcgdmFsdWUuICovXG4gIG92ZXJ3cml0ZT86IGJvb2xlYW47XG4gIC8qKiBUaGUgcGF0aCB0aGUgY29va2llIGlzIHZhbGlkIGZvci4gKi9cbiAgcGF0aD86IHN0cmluZztcbiAgLyoqIE92ZXJyaWRlIHRoZSBmbGFnIHRoYXQgd2FzIHNldCB3aGVuIHRoZSBpbnN0YW5jZSB3YXMgY3JlYXRlZC4gKi9cbiAgc2VjdXJlPzogYm9vbGVhbjtcbiAgLyoqIFNldCB0aGUgc2FtZS1zaXRlIGluZGljYXRvciBmb3IgYSBjb29raWUuICovXG4gIHNhbWVTaXRlPzogXCJzdHJpY3RcIiB8IFwibGF4XCIgfCBcIm5vbmVcIiB8IGJvb2xlYW47XG4gIC8qKiBPdmVycmlkZSB0aGUgZGVmYXVsdCBiZWhhdmlvciBvZiBzaWduaW5nIHRoZSBjb29raWUuICovXG4gIHNpZ25lZD86IGJvb2xlYW47XG59XG5cbnR5cGUgQ29va2llQXR0cmlidXRlcyA9IFNlY3VyZUNvb2tpZU1hcFNldERlbGV0ZU9wdGlvbnM7XG5cbi8vIGRlbm8tbGludC1pZ25vcmUgbm8tY29udHJvbC1yZWdleFxuY29uc3QgRklFTERfQ09OVEVOVF9SRUdFWFAgPSAvXltcXHUwMDA5XFx1MDAyMC1cXHUwMDdlXFx1MDA4MC1cXHUwMGZmXSskLztcbmNvbnN0IEtFWV9SRUdFWFAgPSAvKD86Xnw7KSAqKFtePV0qKT1bXjtdKi9nO1xuY29uc3QgU0FNRV9TSVRFX1JFR0VYUCA9IC9eKD86bGF4fG5vbmV8c3RyaWN0KSQvaTtcblxuY29uc3QgbWF0Y2hDYWNoZTogUmVjb3JkPHN0cmluZywgUmVnRXhwPiA9IHt9O1xuZnVuY3Rpb24gZ2V0UGF0dGVybihuYW1lOiBzdHJpbmcpOiBSZWdFeHAge1xuICBpZiAobmFtZSBpbiBtYXRjaENhY2hlKSB7XG4gICAgcmV0dXJuIG1hdGNoQ2FjaGVbbmFtZV07XG4gIH1cblxuICByZXR1cm4gbWF0Y2hDYWNoZVtuYW1lXSA9IG5ldyBSZWdFeHAoXG4gICAgYCg/Ol58OykgKiR7bmFtZS5yZXBsYWNlKC9bLVtcXF17fSgpKis/LixcXFxcXiR8I1xcc10vZywgXCJcXFxcJCZcIil9PShbXjtdKilgLFxuICApO1xufVxuXG5mdW5jdGlvbiBwdXNoQ29va2llKHZhbHVlczogc3RyaW5nW10sIGNvb2tpZTogQ29va2llKSB7XG4gIGlmIChjb29raWUub3ZlcndyaXRlKSB7XG4gICAgZm9yIChsZXQgaSA9IHZhbHVlcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgaWYgKHZhbHVlc1tpXS5pbmRleE9mKGAke2Nvb2tpZS5uYW1lfT1gKSA9PT0gMCkge1xuICAgICAgICB2YWx1ZXMuc3BsaWNlKGksIDEpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICB2YWx1ZXMucHVzaChjb29raWUudG9IZWFkZXJWYWx1ZSgpKTtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVDb29raWVQcm9wZXJ0eShcbiAga2V5OiBzdHJpbmcsXG4gIHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsLFxuKSB7XG4gIGlmICh2YWx1ZSAmJiAhRklFTERfQ09OVEVOVF9SRUdFWFAudGVzdCh2YWx1ZSkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBUaGUgXCIke2tleX1cIiBvZiB0aGUgY29va2llICgke3ZhbHVlfSkgaXMgaW52YWxpZC5gKTtcbiAgfVxufVxuXG4vKiogQW4gaW50ZXJuYWwgYWJzdHJhY3Rpb24gdG8gbWFuYWdlIGNvb2tpZXMuICovXG5jbGFzcyBDb29raWUgaW1wbGVtZW50cyBDb29raWVBdHRyaWJ1dGVzIHtcbiAgZG9tYWluPzogc3RyaW5nO1xuICBleHBpcmVzPzogRGF0ZTtcbiAgaHR0cE9ubHkgPSB0cnVlO1xuICBtYXhBZ2U/OiBudW1iZXI7XG4gIG5hbWU6IHN0cmluZztcbiAgb3ZlcndyaXRlID0gZmFsc2U7XG4gIHBhdGggPSBcIi9cIjtcbiAgc2FtZVNpdGU6IFwic3RyaWN0XCIgfCBcImxheFwiIHwgXCJub25lXCIgfCBib29sZWFuID0gZmFsc2U7XG4gIHNlY3VyZSA9IGZhbHNlO1xuICBzaWduZWQ/OiBib29sZWFuO1xuICB2YWx1ZTogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICB2YWx1ZTogc3RyaW5nIHwgbnVsbCxcbiAgICBhdHRyaWJ1dGVzOiBDb29raWVBdHRyaWJ1dGVzLFxuICApIHtcbiAgICB2YWxpZGF0ZUNvb2tpZVByb3BlcnR5KFwibmFtZVwiLCBuYW1lKTtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHZhbGlkYXRlQ29va2llUHJvcGVydHkoXCJ2YWx1ZVwiLCB2YWx1ZSk7XG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlID8/IFwiXCI7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCBhdHRyaWJ1dGVzKTtcbiAgICBpZiAoIXRoaXMudmFsdWUpIHtcbiAgICAgIHRoaXMuZXhwaXJlcyA9IG5ldyBEYXRlKDApO1xuICAgICAgdGhpcy5tYXhBZ2UgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgdmFsaWRhdGVDb29raWVQcm9wZXJ0eShcInBhdGhcIiwgdGhpcy5wYXRoKTtcbiAgICB2YWxpZGF0ZUNvb2tpZVByb3BlcnR5KFwiZG9tYWluXCIsIHRoaXMuZG9tYWluKTtcbiAgICBpZiAoXG4gICAgICB0aGlzLnNhbWVTaXRlICYmIHR5cGVvZiB0aGlzLnNhbWVTaXRlID09PSBcInN0cmluZ1wiICYmXG4gICAgICAhU0FNRV9TSVRFX1JFR0VYUC50ZXN0KHRoaXMuc2FtZVNpdGUpXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICBgVGhlIFwic2FtZVNpdGVcIiBvZiB0aGUgY29va2llIChcIiR7dGhpcy5zYW1lU2l0ZX1cIikgaXMgaW52YWxpZC5gLFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICB0b0hlYWRlclZhbHVlKCk6IHN0cmluZyB7XG4gICAgbGV0IHZhbHVlID0gdGhpcy50b1N0cmluZygpO1xuICAgIGlmICh0aGlzLm1heEFnZSkge1xuICAgICAgdGhpcy5leHBpcmVzID0gbmV3IERhdGUoRGF0ZS5ub3coKSArICh0aGlzLm1heEFnZSAqIDEwMDApKTtcbiAgICB9XG4gICAgaWYgKHRoaXMucGF0aCkge1xuICAgICAgdmFsdWUgKz0gYDsgcGF0aD0ke3RoaXMucGF0aH1gO1xuICAgIH1cbiAgICBpZiAodGhpcy5leHBpcmVzKSB7XG4gICAgICB2YWx1ZSArPSBgOyBleHBpcmVzPSR7dGhpcy5leHBpcmVzLnRvVVRDU3RyaW5nKCl9YDtcbiAgICB9XG4gICAgaWYgKHRoaXMuZG9tYWluKSB7XG4gICAgICB2YWx1ZSArPSBgOyBkb21haW49JHt0aGlzLmRvbWFpbn1gO1xuICAgIH1cbiAgICBpZiAodGhpcy5zYW1lU2l0ZSkge1xuICAgICAgdmFsdWUgKz0gYDsgc2FtZXNpdGU9JHtcbiAgICAgICAgdGhpcy5zYW1lU2l0ZSA9PT0gdHJ1ZSA/IFwic3RyaWN0XCIgOiB0aGlzLnNhbWVTaXRlLnRvTG93ZXJDYXNlKClcbiAgICAgIH1gO1xuICAgIH1cbiAgICBpZiAodGhpcy5zZWN1cmUpIHtcbiAgICAgIHZhbHVlICs9IFwiOyBzZWN1cmVcIjtcbiAgICB9XG4gICAgaWYgKHRoaXMuaHR0cE9ubHkpIHtcbiAgICAgIHZhbHVlICs9IFwiOyBodHRwb25seVwiO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgJHt0aGlzLm5hbWV9PSR7dGhpcy52YWx1ZX1gO1xuICB9XG59XG5cbi8qKlxuICogU3ltYm9sIHdoaWNoIGlzIHVzZWQgaW4ge0BsaW5rIG1lcmdlSGVhZGVyc30gdG8gZXh0cmFjdCBhXG4gKiBgW3N0cmluZyB8IHN0cmluZ11bXWAgZnJvbSBhbiBpbnN0YW5jZSB0byBnZW5lcmF0ZSB0aGUgZmluYWwgc2V0IG9mXG4gKiBoZWFkZXJzLlxuICovXG5leHBvcnQgY29uc3QgY29va2llTWFwSGVhZGVyc0luaXRTeW1ib2w6IHVuaXF1ZSBzeW1ib2wgPSBTeW1ib2wuZm9yKFxuICBcIm9hay5jb21tb25zLmNvb2tpZU1hcC5oZWFkZXJzSW5pdFwiLFxuKTtcblxuZnVuY3Rpb24gaXNNZXJnZWFibGUodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBNZXJnZWFibGUge1xuICByZXR1cm4gdmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiZcbiAgICBjb29raWVNYXBIZWFkZXJzSW5pdFN5bWJvbCBpbiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBBbGxvd3MgbWVyZ2luZyBvZiB2YXJpb3VzIHNvdXJjZXMgb2YgaGVhZGVycyBpbnRvIGEgZmluYWwgc2V0IG9mIGhlYWRlcnNcbiAqIHdoaWNoIGNhbiBiZSB1c2VkIGluIGEge0BsaW5rY29kZSBSZXNwb25zZX0uXG4gKlxuICogTm90ZSwgdGhhdCB1bmxpa2Ugd2hlbiBwYXNzaW5nIGEgYFJlc3BvbnNlYCBvciB7QGxpbmtjb2RlIEhlYWRlcnN9IHVzZWQgaW4gYVxuICogcmVzcG9uc2UgdG8ge0BsaW5rY29kZSBDb29raWVNYXB9IG9yIHtAbGlua2NvZGUgU2VjdXJlQ29va2llTWFwfSwgbWVyZ2luZ1xuICogd2lsbCBub3QgZW5zdXJlIHRoYXQgdGhlcmUgYXJlIG5vIG90aGVyIGBTZXQtQ29va2llYCBoZWFkZXJzIGZyb20gb3RoZXJcbiAqIHNvdXJjZXMsIGl0IHdpbGwgc2ltcGx5IGFwcGVuZCB0aGUgdmFyaW91cyBoZWFkZXJzIHRvZ2V0aGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWVyZ2VIZWFkZXJzKFxuICAuLi5zb3VyY2VzOiAoSGVhZGVyZWQgfCBIZWFkZXJzSW5pdCB8IE1lcmdlYWJsZSlbXVxuKTogSGVhZGVycyB7XG4gIGNvbnN0IGhlYWRlcnMgPSBuZXcgSGVhZGVycygpO1xuICBmb3IgKGNvbnN0IHNvdXJjZSBvZiBzb3VyY2VzKSB7XG4gICAgbGV0IGVudHJpZXM6IEl0ZXJhYmxlPFtzdHJpbmcsIHN0cmluZ10+O1xuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBIZWFkZXJzKSB7XG4gICAgICBlbnRyaWVzID0gc291cmNlO1xuICAgIH0gZWxzZSBpZiAoXCJoZWFkZXJzXCIgaW4gc291cmNlICYmIHNvdXJjZS5oZWFkZXJzIGluc3RhbmNlb2YgSGVhZGVycykge1xuICAgICAgZW50cmllcyA9IHNvdXJjZS5oZWFkZXJzO1xuICAgIH0gZWxzZSBpZiAoaXNNZXJnZWFibGUoc291cmNlKSkge1xuICAgICAgZW50cmllcyA9IHNvdXJjZVtjb29raWVNYXBIZWFkZXJzSW5pdFN5bWJvbF0oKTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoc291cmNlKSkge1xuICAgICAgZW50cmllcyA9IHNvdXJjZSBhcyBbc3RyaW5nLCBzdHJpbmddW107XG4gICAgfSBlbHNlIHtcbiAgICAgIGVudHJpZXMgPSBPYmplY3QuZW50cmllcyhzb3VyY2UpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBlbnRyaWVzKSB7XG4gICAgICBoZWFkZXJzLmFwcGVuZChrZXksIHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGhlYWRlcnM7XG59XG5cbmNvbnN0IGtleXMgPSBTeW1ib2woXCIja2V5c1wiKTtcbmNvbnN0IHJlcXVlc3RIZWFkZXJzID0gU3ltYm9sKFwiI3JlcXVlc3RIZWFkZXJzXCIpO1xuY29uc3QgcmVzcG9uc2VIZWFkZXJzID0gU3ltYm9sKFwiI3Jlc3BvbnNlSGVhZGVyc1wiKTtcbmNvbnN0IGlzU2VjdXJlID0gU3ltYm9sKFwiI3NlY3VyZVwiKTtcbmNvbnN0IHJlcXVlc3RLZXlzOiB1bmlxdWUgc3ltYm9sID0gU3ltYm9sKFwiI3JlcXVlc3RLZXlzXCIpO1xuXG4vKiogQW4gaW50ZXJuYWwgYWJzdHJhY3QgY2xhc3Mgd2hpY2ggcHJvdmlkZXMgY29tbW9uIGZ1bmN0aW9uYWxpdHkgZm9yXG4gKiB7QGxpbmsgQ29va2llTWFwfSBhbmQge0BsaW5rIFNlY3VyZUNvb2tpZU1hcH0uXG4gKi9cbmFic3RyYWN0IGNsYXNzIENvb2tpZU1hcEJhc2UgaW1wbGVtZW50cyBNZXJnZWFibGUge1xuICBba2V5c10/OiBzdHJpbmdbXTtcbiAgW3JlcXVlc3RIZWFkZXJzXTogSGVhZGVycztcbiAgW3Jlc3BvbnNlSGVhZGVyc106IEhlYWRlcnM7XG4gIFtpc1NlY3VyZV06IGJvb2xlYW47XG5cbiAgW3JlcXVlc3RLZXlzXSgpOiBzdHJpbmdbXSB7XG4gICAgaWYgKHRoaXNba2V5c10pIHtcbiAgICAgIHJldHVybiB0aGlzW2tleXNdO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzW2tleXNdID0gW10gYXMgc3RyaW5nW107XG4gICAgY29uc3QgaGVhZGVyID0gdGhpc1tyZXF1ZXN0SGVhZGVyc10uZ2V0KFwiY29va2llXCIpO1xuICAgIGlmICghaGVhZGVyKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBsZXQgbWF0Y2hlczogUmVnRXhwRXhlY0FycmF5IHwgbnVsbDtcbiAgICB3aGlsZSAoKG1hdGNoZXMgPSBLRVlfUkVHRVhQLmV4ZWMoaGVhZGVyKSkpIHtcbiAgICAgIGNvbnN0IFssIGtleV0gPSBtYXRjaGVzO1xuICAgICAgcmVzdWx0LnB1c2goa2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHJlcXVlc3Q6IEhlYWRlcnMgfCBIZWFkZXJlZCwgb3B0aW9uczogQ29va2llTWFwT3B0aW9ucykge1xuICAgIHRoaXNbcmVxdWVzdEhlYWRlcnNdID0gXCJoZWFkZXJzXCIgaW4gcmVxdWVzdCA/IHJlcXVlc3QuaGVhZGVycyA6IHJlcXVlc3Q7XG4gICAgY29uc3QgeyBzZWN1cmUgPSBmYWxzZSwgcmVzcG9uc2UgPSBuZXcgSGVhZGVycygpIH0gPSBvcHRpb25zO1xuICAgIHRoaXNbcmVzcG9uc2VIZWFkZXJzXSA9IFwiaGVhZGVyc1wiIGluIHJlc3BvbnNlID8gcmVzcG9uc2UuaGVhZGVycyA6IHJlc3BvbnNlO1xuICAgIHRoaXNbaXNTZWN1cmVdID0gc2VjdXJlO1xuICB9XG5cbiAgLyoqIEEgbWV0aG9kIHVzZWQgYnkge0BsaW5rY29kZSBtZXJnZUhlYWRlcnN9IHRvIGJlIGFibGUgdG8gbWVyZ2VcbiAgICogaGVhZGVycyBmcm9tIHZhcmlvdXMgc291cmNlcyB3aGVuIGZvcm1pbmcgYSB7QGxpbmtjb2RlIFJlc3BvbnNlfS4gKi9cbiAgW2Nvb2tpZU1hcEhlYWRlcnNJbml0U3ltYm9sXSgpOiBbc3RyaW5nLCBzdHJpbmddW10ge1xuICAgIGNvbnN0IGluaXQ6IFtzdHJpbmcsIHN0cmluZ11bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIHRoaXNbcmVzcG9uc2VIZWFkZXJzXSkge1xuICAgICAgaWYgKGtleSA9PT0gXCJzZXQtY29va2llXCIpIHtcbiAgICAgICAgaW5pdC5wdXNoKFtrZXksIHZhbHVlXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpbml0O1xuICB9XG5cbiAgW1N5bWJvbC5mb3IoXCJEZW5vLmN1c3RvbUluc3BlY3RcIildKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gW11gO1xuICB9XG5cbiAgW1N5bWJvbC5mb3IoXCJub2RlanMudXRpbC5pbnNwZWN0LmN1c3RvbVwiKV0oXG4gICAgZGVwdGg6IG51bWJlcixcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIG9wdGlvbnM6IGFueSxcbiAgICBpbnNwZWN0OiAodmFsdWU6IHVua25vd24sIG9wdGlvbnM/OiB1bmtub3duKSA9PiBzdHJpbmcsXG4gICk6IHN0cmluZyB7XG4gICAgaWYgKGRlcHRoIDwgMCkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShgWyR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfV1gLCBcInNwZWNpYWxcIik7XG4gICAgfVxuXG4gICAgY29uc3QgbmV3T3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHtcbiAgICAgIGRlcHRoOiBvcHRpb25zLmRlcHRoID09PSBudWxsID8gbnVsbCA6IG9wdGlvbnMuZGVwdGggLSAxLFxuICAgIH0pO1xuICAgIHJldHVybiBgJHtvcHRpb25zLnN0eWxpemUodGhpcy5jb25zdHJ1Y3Rvci5uYW1lLCBcInNwZWNpYWxcIil9ICR7XG4gICAgICBpbnNwZWN0KFtdLCBuZXdPcHRpb25zKVxuICAgIH1gO1xuICB9XG59XG5cbi8qKlxuICogUHJvdmlkZXMgYSB3YXkgdG8gbWFuYWdlIGNvb2tpZXMgaW4gYSByZXF1ZXN0IGFuZCByZXNwb25zZSBvbiB0aGUgc2VydmVyXG4gKiBhcyBhIHNpbmdsZSBpdGVyYWJsZSBjb2xsZWN0aW9uLlxuICpcbiAqIFRoZSBtZXRob2RzIGFuZCBwcm9wZXJ0aWVzIGFsaWduIHRvIHtAbGlua2NvZGUgTWFwfS4gV2hlbiBjb25zdHJ1Y3RpbmcgYVxuICoge0BsaW5rY29kZSBSZXF1ZXN0fSBvciB7QGxpbmtjb2RlIEhlYWRlcnN9IGZyb20gdGhlIHJlcXVlc3QgbmVlZCB0byBiZVxuICogcHJvdmlkZWQsIGFzIHdlbGwgYXMgb3B0aW9uYWxseSB0aGUge0BsaW5rY29kZSBSZXNwb25zZX0gb3IgYEhlYWRlcnNgIGZvciB0aGVcbiAqIHJlc3BvbnNlIGNhbiBiZSBwcm92aWRlZC4gQWx0ZXJuYXRpdmVseSB0aGUge0BsaW5rY29kZSBtZXJnZUhlYWRlcnN9XG4gKiBmdW5jdGlvbiBjYW4gYmUgdXNlZCB0byBnZW5lcmF0ZSBhIGZpbmFsIHNldCBvZiBoZWFkZXJzIGZvciBzZW5kaW5nIGluIHRoZVxuICogcmVzcG9uc2UuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb29raWVNYXAgZXh0ZW5kcyBDb29raWVNYXBCYXNlIHtcbiAgLyoqIENvbnRhaW5zIHRoZSBudW1iZXIgb2YgdmFsaWQgY29va2llcyBpbiB0aGUgcmVxdWVzdCBoZWFkZXJzLiAqL1xuICBnZXQgc2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiBbLi4udGhpc10ubGVuZ3RoO1xuICB9XG5cbiAgY29uc3RydWN0b3IocmVxdWVzdDogSGVhZGVycyB8IEhlYWRlcmVkLCBvcHRpb25zOiBDb29raWVNYXBPcHRpb25zID0ge30pIHtcbiAgICBzdXBlcihyZXF1ZXN0LCBvcHRpb25zKTtcbiAgfVxuXG4gIC8qKiBEZWxldGVzIGFsbCB0aGUgY29va2llcyBmcm9tIHRoZSB7QGxpbmtjb2RlIFJlcXVlc3R9IGluIHRoZSByZXNwb25zZS4gKi9cbiAgY2xlYXIob3B0aW9uczogQ29va2llTWFwU2V0RGVsZXRlT3B0aW9ucyA9IHt9KSB7XG4gICAgZm9yIChjb25zdCBrZXkgb2YgdGhpcy5rZXlzKCkpIHtcbiAgICAgIHRoaXMuc2V0KGtleSwgbnVsbCwgb3B0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNldCBhIGNvb2tpZSB0byBiZSBkZWxldGVkIGluIHRoZSByZXNwb25zZS5cbiAgICpcbiAgICogVGhpcyBpcyBhIGNvbnZlbmllbmNlIGZ1bmN0aW9uIGZvciBgc2V0KGtleSwgbnVsbCwgb3B0aW9ucz8pYC5cbiAgICovXG4gIGRlbGV0ZShrZXk6IHN0cmluZywgb3B0aW9uczogQ29va2llTWFwU2V0RGVsZXRlT3B0aW9ucyA9IHt9KTogYm9vbGVhbiB7XG4gICAgdGhpcy5zZXQoa2V5LCBudWxsLCBvcHRpb25zKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKiBSZXR1cm4gdGhlIHZhbHVlIG9mIGEgbWF0Y2hpbmcga2V5IHByZXNlbnQgaW4gdGhlIHtAbGlua2NvZGUgUmVxdWVzdH0uIElmXG4gICAqIHRoZSBrZXkgaXMgbm90IHByZXNlbnQgYHVuZGVmaW5lZGAgaXMgcmV0dXJuZWQuICovXG4gIGdldChrZXk6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgaGVhZGVyVmFsdWUgPSB0aGlzW3JlcXVlc3RIZWFkZXJzXS5nZXQoXCJjb29raWVcIik7XG4gICAgaWYgKCFoZWFkZXJWYWx1ZSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgbWF0Y2ggPSBoZWFkZXJWYWx1ZS5tYXRjaChnZXRQYXR0ZXJuKGtleSkpO1xuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IFssIHZhbHVlXSA9IG1hdGNoO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgbWF0Y2hpbmcga2V5IGlzIHByZXNlbnQgaW4gdGhlIHtAbGlua2NvZGUgUmVxdWVzdH0sXG4gICAqIG90aGVyd2lzZSBgZmFsc2VgLiAqL1xuICBoYXMoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCBoZWFkZXJWYWx1ZSA9IHRoaXNbcmVxdWVzdEhlYWRlcnNdLmdldChcImNvb2tpZVwiKTtcbiAgICBpZiAoIWhlYWRlclZhbHVlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBnZXRQYXR0ZXJuKGtleSkudGVzdChoZWFkZXJWYWx1ZSk7XG4gIH1cblxuICAvKiogU2V0IGEgbmFtZWQgY29va2llIGluIHRoZSByZXNwb25zZS4gVGhlIG9wdGlvbmFsXG4gICAqIHtAbGlua2NvZGUgQ29va2llTWFwU2V0RGVsZXRlT3B0aW9uc30gYXJlIGFwcGxpZWQgdG8gdGhlIGNvb2tpZSBiZWluZyBzZXQuXG4gICAqL1xuICBzZXQoXG4gICAga2V5OiBzdHJpbmcsXG4gICAgdmFsdWU6IHN0cmluZyB8IG51bGwsXG4gICAgb3B0aW9uczogQ29va2llTWFwU2V0RGVsZXRlT3B0aW9ucyA9IHt9LFxuICApOiB0aGlzIHtcbiAgICBjb25zdCByZXNIZWFkZXJzID0gdGhpc1tyZXNwb25zZUhlYWRlcnNdO1xuICAgIGNvbnN0IHZhbHVlczogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiByZXNIZWFkZXJzKSB7XG4gICAgICBpZiAoa2V5ID09PSBcInNldC1jb29raWVcIikge1xuICAgICAgICB2YWx1ZXMucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHNlY3VyZSA9IHRoaXNbaXNTZWN1cmVdO1xuXG4gICAgaWYgKCFzZWN1cmUgJiYgb3B0aW9ucy5zZWN1cmUgJiYgIW9wdGlvbnMuaWdub3JlSW5zZWN1cmUpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgIFwiQ2Fubm90IHNlbmQgc2VjdXJlIGNvb2tpZSBvdmVyIHVuZW5jcnlwdGVkIGNvbm5lY3Rpb24uXCIsXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IGNvb2tpZSA9IG5ldyBDb29raWUoa2V5LCB2YWx1ZSwgb3B0aW9ucyk7XG4gICAgY29va2llLnNlY3VyZSA9IG9wdGlvbnMuc2VjdXJlID8/IHNlY3VyZTtcbiAgICBwdXNoQ29va2llKHZhbHVlcywgY29va2llKTtcblxuICAgIHJlc0hlYWRlcnMuZGVsZXRlKFwic2V0LWNvb2tpZVwiKTtcbiAgICBmb3IgKGNvbnN0IHZhbHVlIG9mIHZhbHVlcykge1xuICAgICAgcmVzSGVhZGVycy5hcHBlbmQoXCJzZXQtY29va2llXCIsIHZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKiogSXRlcmF0ZSBvdmVyIHRoZSBjb29raWUga2V5cyBhbmQgdmFsdWVzIHRoYXQgYXJlIHByZXNlbnQgaW4gdGhlXG4gICAqIHtAbGlua2NvZGUgUmVxdWVzdH0uIFRoaXMgaXMgYW4gYWxpYXMgb2YgdGhlIGBbU3ltYm9sLml0ZXJhdG9yXWAgbWV0aG9kXG4gICAqIHByZXNlbnQgb24gdGhlIGNsYXNzLiAqL1xuICBlbnRyaWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W3N0cmluZywgc3RyaW5nXT4ge1xuICAgIHJldHVybiB0aGlzW1N5bWJvbC5pdGVyYXRvcl0oKTtcbiAgfVxuXG4gIC8qKiBJdGVyYXRlIG92ZXIgdGhlIGNvb2tpZSBrZXlzIHRoYXQgYXJlIHByZXNlbnQgaW4gdGhlXG4gICAqIHtAbGlua2NvZGUgUmVxdWVzdH0uICovXG4gICprZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8c3RyaW5nPiB7XG4gICAgZm9yIChjb25zdCBba2V5XSBvZiB0aGlzKSB7XG4gICAgICB5aWVsZCBrZXk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEl0ZXJhdGUgb3ZlciB0aGUgY29va2llIHZhbHVlcyB0aGF0IGFyZSBwcmVzZW50IGluIHRoZVxuICAgKiB7QGxpbmtjb2RlIFJlcXVlc3R9LiAqL1xuICAqdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8c3RyaW5nPiB7XG4gICAgZm9yIChjb25zdCBbLCB2YWx1ZV0gb2YgdGhpcykge1xuICAgICAgeWllbGQgdmFsdWU7XG4gICAgfVxuICB9XG5cbiAgLyoqIEl0ZXJhdGUgb3ZlciB0aGUgY29va2llIGtleXMgYW5kIHZhbHVlcyB0aGF0IGFyZSBwcmVzZW50IGluIHRoZVxuICAgKiB7QGxpbmtjb2RlIFJlcXVlc3R9LiAqL1xuICAqW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxbc3RyaW5nLCBzdHJpbmddPiB7XG4gICAgY29uc3Qga2V5cyA9IHRoaXNbcmVxdWVzdEtleXNdKCk7XG4gICAgZm9yIChjb25zdCBrZXkgb2Yga2V5cykge1xuICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLmdldChrZXkpO1xuICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgIHlpZWxkIFtrZXksIHZhbHVlXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBUeXBlcyBvZiBkYXRhIHRoYXQgY2FuIGJlIHNpZ25lZCBjcnlwdG9ncmFwaGljYWxseS5cbiAqL1xuZXhwb3J0IHR5cGUgRGF0YSA9IHN0cmluZyB8IG51bWJlcltdIHwgQXJyYXlCdWZmZXIgfCBVaW50OEFycmF5O1xuXG4vKipcbiAqIEFuIGludGVyZmFjZSB3aGljaCBkZXNjcmliZXMgdGhlIG1ldGhvZHMgdGhhdCB7QGxpbmtjb2RlIFNlY3VyZUNvb2tpZU1hcH1cbiAqIHVzZXMgdG8gc2lnbiBhbmQgdmVyaWZ5IGNvb2tpZXMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgS2V5UmluZyB7XG4gIC8qKiBHaXZlbiBhIHNldCBvZiBkYXRhIGFuZCBhIGRpZ2VzdCwgcmV0dXJuIHRoZSBrZXkgaW5kZXggb2YgdGhlIGtleSB1c2VkXG4gICAqIHRvIHNpZ24gdGhlIGRhdGEuIFRoZSBpbmRleCBpcyAwIGJhc2VkLiBBIG5vbi1uZWdhdGl2ZSBudW1iZXIgaW5kaWNlcyB0aGVcbiAgICogZGlnZXN0IGlzIHZhbGlkIGFuZCBhIGtleSB3YXMgZm91bmQuICovXG4gIGluZGV4T2YoZGF0YTogRGF0YSwgZGlnZXN0OiBzdHJpbmcpOiBQcm9taXNlPG51bWJlcj4gfCBudW1iZXI7XG4gIC8qKiBTaWduIHRoZSBkYXRhLCByZXR1cm5pbmcgYSBzdHJpbmcgYmFzZWQgZGlnZXN0IG9mIHRoZSBkYXRhLiAqL1xuICBzaWduKGRhdGE6IERhdGEpOiBQcm9taXNlPHN0cmluZz4gfCBzdHJpbmc7XG4gIC8qKiBWZXJpZmllcyB0aGUgZGlnZXN0IG1hdGNoZXMgdGhlIHByb3ZpZGVkIGRhdGEsIGluZGljYXRpbmcgdGhlIGRhdGEgd2FzXG4gICAqIHNpZ25lZCBieSB0aGUga2V5cmluZyBhbmQgaGFzIG5vdCBiZWVuIHRhbXBlcmVkIHdpdGguICovXG4gIHZlcmlmeShkYXRhOiBEYXRhLCBkaWdlc3Q6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4gfCBib29sZWFuO1xufVxuXG4vKipcbiAqIFByb3ZpZGVzIGFuIHdheSB0byBtYW5hZ2UgY29va2llcyBpbiBhIHJlcXVlc3QgYW5kIHJlc3BvbnNlIG9uIHRoZSBzZXJ2ZXJcbiAqIGFzIGEgc2luZ2xlIGl0ZXJhYmxlIGNvbGxlY3Rpb24sIGFzIHdlbGwgYXMgdGhlIGFiaWxpdHkgdG8gc2lnbiBhbmQgdmVyaWZ5XG4gKiBjb29raWVzIHRvIHByZXZlbnQgdGFtcGVyaW5nLlxuICpcbiAqIFRoZSBtZXRob2RzIGFuZCBwcm9wZXJ0aWVzIGFsaWduIHRvIHtAbGlua2NvZGUgTWFwfSwgYnV0IGR1ZSB0byB0aGUgbmVlZCB0b1xuICogc3VwcG9ydCBhc3luY2hyb25vdXMgY3J5cHRvZ3JhcGhpYyBrZXlzLCBhbGwgdGhlIEFQSXMgb3BlcmF0ZSBhc3luYy4gV2hlblxuICogY29uc3RydWN0aW5nIGEge0BsaW5rY29kZSBSZXF1ZXN0fSBvciB7QGxpbmtjb2RlIEhlYWRlcnN9IGZyb20gdGhlIHJlcXVlc3RcbiAqIG5lZWQgdG8gYmUgcHJvdmlkZWQsIGFzIHdlbGwgYXMgb3B0aW9uYWxseSB0aGUge0BsaW5rY29kZSBSZXNwb25zZX0gb3JcbiAqIGBIZWFkZXJzYCBmb3IgdGhlIHJlc3BvbnNlIGNhbiBiZSBwcm92aWRlZC4gQWx0ZXJuYXRpdmVseSB0aGVcbiAqIHtAbGlua2NvZGUgbWVyZ2VIZWFkZXJzfSBmdW5jdGlvbiBjYW4gYmUgdXNlZCB0byBnZW5lcmF0ZSBhIGZpbmFsIHNldFxuICogb2YgaGVhZGVycyBmb3Igc2VuZGluZyBpbiB0aGUgcmVzcG9uc2UuXG4gKlxuICogT24gY29uc3RydWN0aW9uLCB0aGUgb3B0aW9uYWwgc2V0IG9mIGtleXMgaW1wbGVtZW50aW5nIHRoZVxuICoge0BsaW5rY29kZSBLZXlSaW5nfSBpbnRlcmZhY2UuIFdoaWxlIGl0IGlzIG9wdGlvbmFsLCBpZiB5b3UgZG9uJ3QgcGxhbiB0byB1c2VcbiAqIGtleXMsIHlvdSBtaWdodCB3YW50IHRvIGNvbnNpZGVyIHVzaW5nIGp1c3QgdGhlIHtAbGlua2NvZGUgQ29va2llTWFwfS5cbiAqL1xuZXhwb3J0IGNsYXNzIFNlY3VyZUNvb2tpZU1hcCBleHRlbmRzIENvb2tpZU1hcEJhc2Uge1xuICAja2V5UmluZz86IEtleVJpbmc7XG5cbiAgLyoqIElzIHNldCB0byBhIHByb21pc2Ugd2hpY2ggcmVzb2x2ZXMgd2l0aCB0aGUgbnVtYmVyIG9mIGNvb2tpZXMgaW4gdGhlXG4gICAqIHtAbGlua2NvZGUgUmVxdWVzdH0uICovXG4gIGdldCBzaXplKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgcmV0dXJuIChhc3luYyAoKSA9PiB7XG4gICAgICBsZXQgc2l6ZSA9IDA7XG4gICAgICBmb3IgYXdhaXQgKGNvbnN0IF8gb2YgdGhpcykge1xuICAgICAgICBzaXplKys7XG4gICAgICB9XG4gICAgICByZXR1cm4gc2l6ZTtcbiAgICB9KSgpO1xuICB9XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcmVxdWVzdDogSGVhZGVycyB8IEhlYWRlcmVkLFxuICAgIG9wdGlvbnM6IFNlY3VyZUNvb2tpZU1hcE9wdGlvbnMgPSB7fSxcbiAgKSB7XG4gICAgc3VwZXIocmVxdWVzdCwgb3B0aW9ucyk7XG4gICAgY29uc3QgeyBrZXlzIH0gPSBvcHRpb25zO1xuICAgIHRoaXMuI2tleVJpbmcgPSBrZXlzO1xuICB9XG5cbiAgLyoqIFNldHMgYWxsIGNvb2tpZXMgaW4gdGhlIHtAbGlua2NvZGUgUmVxdWVzdH0gdG8gYmUgZGVsZXRlZCBpbiB0aGVcbiAgICogcmVzcG9uc2UuICovXG4gIGFzeW5jIGNsZWFyKG9wdGlvbnM6IFNlY3VyZUNvb2tpZU1hcFNldERlbGV0ZU9wdGlvbnMpIHtcbiAgICBjb25zdCBwcm9taXNlcyA9IFtdO1xuICAgIGZvciBhd2FpdCAoY29uc3Qga2V5IG9mIHRoaXMua2V5cygpKSB7XG4gICAgICBwcm9taXNlcy5wdXNoKHRoaXMuc2V0KGtleSwgbnVsbCwgb3B0aW9ucykpO1xuICAgIH1cbiAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gIH1cblxuICAvKiogU2V0IGEgY29va2llIHRvIGJlIGRlbGV0ZWQgaW4gdGhlIHJlc3BvbnNlLlxuICAgKlxuICAgKiBUaGlzIGlzIGEgY29udmVuaWVuY2UgZnVuY3Rpb24gZm9yIGBzZXQoa2V5LCBudWxsLCBvcHRpb25zPylgLiAqL1xuICBhc3luYyBkZWxldGUoXG4gICAga2V5OiBzdHJpbmcsXG4gICAgb3B0aW9uczogU2VjdXJlQ29va2llTWFwU2V0RGVsZXRlT3B0aW9ucyA9IHt9LFxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBhd2FpdCB0aGlzLnNldChrZXksIG51bGwsIG9wdGlvbnMpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqIEdldCB0aGUgdmFsdWUgb2YgYSBjb29raWUgZnJvbSB0aGUge0BsaW5rY29kZSBSZXF1ZXN0fS5cbiAgICpcbiAgICogSWYgdGhlIGNvb2tpZSBpcyBzaWduZWQsIGFuZCB0aGUgc2lnbmF0dXJlIGlzIGludmFsaWQsIGB1bmRlZmluZWRgIHdpbGwgYmVcbiAgICogcmV0dXJuZWQgYW5kIHRoZSBjb29raWUgd2lsbCBiZSBzZXQgdG8gYmUgZGVsZXRlZCBpbiB0aGUgcmVzcG9uc2UuIElmIHRoZVxuICAgKiBjb29raWUgaXMgdXNpbmcgYW4gXCJvbGRcIiBrZXkgZnJvbSB0aGUga2V5cmluZywgdGhlIGNvb2tpZSB3aWxsIGJlIHJlLXNpZ25lZFxuICAgKiB3aXRoIHRoZSBjdXJyZW50IGtleSBhbmQgYmUgYWRkZWQgdG8gdGhlIHJlc3BvbnNlIHRvIGJlIHVwZGF0ZWQuICovXG4gIGFzeW5jIGdldChcbiAgICBrZXk6IHN0cmluZyxcbiAgICBvcHRpb25zOiBTZWN1cmVDb29raWVNYXBHZXRPcHRpb25zID0ge30sXG4gICk6IFByb21pc2U8c3RyaW5nIHwgdW5kZWZpbmVkPiB7XG4gICAgY29uc3Qgc2lnbmVkID0gb3B0aW9ucy5zaWduZWQgPz8gISF0aGlzLiNrZXlSaW5nO1xuICAgIGNvbnN0IG5hbWVTaWcgPSBgJHtrZXl9LnNpZ2A7XG5cbiAgICBjb25zdCBoZWFkZXIgPSB0aGlzW3JlcXVlc3RIZWFkZXJzXS5nZXQoXCJjb29raWVcIik7XG4gICAgaWYgKCFoZWFkZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgbWF0Y2ggPSBoZWFkZXIubWF0Y2goZ2V0UGF0dGVybihrZXkpKTtcbiAgICBpZiAoIW1hdGNoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IFssIHZhbHVlXSA9IG1hdGNoO1xuICAgIGlmICghc2lnbmVkKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIGNvbnN0IGRpZ2VzdCA9IGF3YWl0IHRoaXMuZ2V0KG5hbWVTaWcsIHsgc2lnbmVkOiBmYWxzZSB9KTtcbiAgICBpZiAoIWRpZ2VzdCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBkYXRhID0gYCR7a2V5fT0ke3ZhbHVlfWA7XG4gICAgaWYgKCF0aGlzLiNrZXlSaW5nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwia2V5IHJpbmcgcmVxdWlyZWQgZm9yIHNpZ25lZCBjb29raWVzXCIpO1xuICAgIH1cbiAgICBjb25zdCBpbmRleCA9IGF3YWl0IHRoaXMuI2tleVJpbmcuaW5kZXhPZihkYXRhLCBkaWdlc3QpO1xuXG4gICAgaWYgKGluZGV4IDwgMCkge1xuICAgICAgYXdhaXQgdGhpcy5kZWxldGUobmFtZVNpZywgeyBwYXRoOiBcIi9cIiwgc2lnbmVkOiBmYWxzZSB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGluZGV4KSB7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0KG5hbWVTaWcsIGF3YWl0IHRoaXMuI2tleVJpbmcuc2lnbihkYXRhKSwge1xuICAgICAgICAgIHNpZ25lZDogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBSZXR1cm5zIGB0cnVlYCBpZiB0aGUga2V5IGlzIGluIHRoZSB7QGxpbmtjb2RlIFJlcXVlc3R9LlxuICAgKlxuICAgKiBJZiB0aGUgY29va2llIGlzIHNpZ25lZCwgYW5kIHRoZSBzaWduYXR1cmUgaXMgaW52YWxpZCwgYGZhbHNlYCB3aWxsIGJlXG4gICAqIHJldHVybmVkIGFuZCB0aGUgY29va2llIHdpbGwgYmUgc2V0IHRvIGJlIGRlbGV0ZWQgaW4gdGhlIHJlc3BvbnNlLiBJZiB0aGVcbiAgICogY29va2llIGlzIHVzaW5nIGFuIFwib2xkXCIga2V5IGZyb20gdGhlIGtleXJpbmcsIHRoZSBjb29raWUgd2lsbCBiZSByZS1zaWduZWRcbiAgICogd2l0aCB0aGUgY3VycmVudCBrZXkgYW5kIGJlIGFkZGVkIHRvIHRoZSByZXNwb25zZSB0byBiZSB1cGRhdGVkLiAqL1xuICBhc3luYyBoYXMoXG4gICAga2V5OiBzdHJpbmcsXG4gICAgb3B0aW9uczogU2VjdXJlQ29va2llTWFwR2V0T3B0aW9ucyA9IHt9LFxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBzaWduZWQgPSBvcHRpb25zLnNpZ25lZCA/PyAhIXRoaXMuI2tleVJpbmc7XG4gICAgY29uc3QgbmFtZVNpZyA9IGAke2tleX0uc2lnYDtcblxuICAgIGNvbnN0IGhlYWRlciA9IHRoaXNbcmVxdWVzdEhlYWRlcnNdLmdldChcImNvb2tpZVwiKTtcbiAgICBpZiAoIWhlYWRlcikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCBtYXRjaCA9IGhlYWRlci5tYXRjaChnZXRQYXR0ZXJuKGtleSkpO1xuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFzaWduZWQpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBjb25zdCBkaWdlc3QgPSBhd2FpdCB0aGlzLmdldChuYW1lU2lnLCB7IHNpZ25lZDogZmFsc2UgfSk7XG4gICAgaWYgKCFkaWdlc3QpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3QgWywgdmFsdWVdID0gbWF0Y2g7XG4gICAgY29uc3QgZGF0YSA9IGAke2tleX09JHt2YWx1ZX1gO1xuICAgIGlmICghdGhpcy4ja2V5UmluZykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImtleSByaW5nIHJlcXVpcmVkIGZvciBzaWduZWQgY29va2llc1wiKTtcbiAgICB9XG4gICAgY29uc3QgaW5kZXggPSBhd2FpdCB0aGlzLiNrZXlSaW5nLmluZGV4T2YoZGF0YSwgZGlnZXN0KTtcblxuICAgIGlmIChpbmRleCA8IDApIHtcbiAgICAgIGF3YWl0IHRoaXMuZGVsZXRlKG5hbWVTaWcsIHsgcGF0aDogXCIvXCIsIHNpZ25lZDogZmFsc2UgfSk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChpbmRleCkge1xuICAgICAgICBhd2FpdCB0aGlzLnNldChuYW1lU2lnLCBhd2FpdCB0aGlzLiNrZXlSaW5nLnNpZ24oZGF0YSksIHtcbiAgICAgICAgICBzaWduZWQ6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZXQgYSBjb29raWUgaW4gdGhlIHJlc3BvbnNlIGhlYWRlcnMuXG4gICAqXG4gICAqIElmIHRoZXJlIHdhcyBhIGtleXJpbmcgc2V0LCBjb29raWVzIHdpbGwgYmUgYXV0b21hdGljYWxseSBzaWduZWQsIHVubGVzc1xuICAgKiBvdmVycmlkZGVuIGJ5IHRoZSBwYXNzZWQgb3B0aW9ucy4gQ29va2llcyBjYW4gYmUgZGVsZXRlZCBieSBzZXR0aW5nIHRoZVxuICAgKiB2YWx1ZSB0byBgbnVsbGAuICovXG4gIGFzeW5jIHNldChcbiAgICBrZXk6IHN0cmluZyxcbiAgICB2YWx1ZTogc3RyaW5nIHwgbnVsbCxcbiAgICBvcHRpb25zOiBTZWN1cmVDb29raWVNYXBTZXREZWxldGVPcHRpb25zID0ge30sXG4gICk6IFByb21pc2U8dGhpcz4ge1xuICAgIGNvbnN0IHJlc0hlYWRlcnMgPSB0aGlzW3Jlc3BvbnNlSGVhZGVyc107XG4gICAgY29uc3QgaGVhZGVyczogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiByZXNIZWFkZXJzLmVudHJpZXMoKSkge1xuICAgICAgaWYgKGtleSA9PT0gXCJzZXQtY29va2llXCIpIHtcbiAgICAgICAgaGVhZGVycy5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3Qgc2VjdXJlID0gdGhpc1tpc1NlY3VyZV07XG4gICAgY29uc3Qgc2lnbmVkID0gb3B0aW9ucy5zaWduZWQgPz8gISF0aGlzLiNrZXlSaW5nO1xuXG4gICAgaWYgKCFzZWN1cmUgJiYgb3B0aW9ucy5zZWN1cmUgJiYgIW9wdGlvbnMuaWdub3JlSW5zZWN1cmUpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgIFwiQ2Fubm90IHNlbmQgc2VjdXJlIGNvb2tpZSBvdmVyIHVuZW5jcnlwdGVkIGNvbm5lY3Rpb24uXCIsXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IGNvb2tpZSA9IG5ldyBDb29raWUoa2V5LCB2YWx1ZSwgb3B0aW9ucyk7XG4gICAgY29va2llLnNlY3VyZSA9IG9wdGlvbnMuc2VjdXJlID8/IHNlY3VyZTtcbiAgICBwdXNoQ29va2llKGhlYWRlcnMsIGNvb2tpZSk7XG5cbiAgICBpZiAoc2lnbmVkKSB7XG4gICAgICBpZiAoIXRoaXMuI2tleVJpbmcpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImtleXMgcmVxdWlyZWQgZm9yIHNpZ25lZCBjb29raWVzLlwiKTtcbiAgICAgIH1cbiAgICAgIGNvb2tpZS52YWx1ZSA9IGF3YWl0IHRoaXMuI2tleVJpbmcuc2lnbihjb29raWUudG9TdHJpbmcoKSk7XG4gICAgICBjb29raWUubmFtZSArPSBcIi5zaWdcIjtcbiAgICAgIHB1c2hDb29raWUoaGVhZGVycywgY29va2llKTtcbiAgICB9XG5cbiAgICByZXNIZWFkZXJzLmRlbGV0ZShcInNldC1jb29raWVcIik7XG4gICAgZm9yIChjb25zdCBoZWFkZXIgb2YgaGVhZGVycykge1xuICAgICAgcmVzSGVhZGVycy5hcHBlbmQoXCJzZXQtY29va2llXCIsIGhlYWRlcik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqIEl0ZXJhdGUgb3ZlciB0aGUge0BsaW5rY29kZSBSZXF1ZXN0fSBjb29raWVzLCB5aWVsZGluZyB1cCBhIHR1cGxlXG4gICAqIGNvbnRhaW5pbmcgdGhlIGtleSBhbmQgdmFsdWUgb2YgZWFjaCBjb29raWUuXG4gICAqXG4gICAqIElmIGEga2V5IHJpbmcgd2FzIHByb3ZpZGVkLCBvbmx5IHByb3Blcmx5IHNpZ25lZCBjb29raWUga2V5cyBhbmQgdmFsdWVzIGFyZVxuICAgKiByZXR1cm5lZC4gKi9cbiAgZW50cmllcygpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8W3N0cmluZywgc3RyaW5nXT4ge1xuICAgIHJldHVybiB0aGlzW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpO1xuICB9XG5cbiAgLyoqIEl0ZXJhdGUgb3ZlciB0aGUgcmVxdWVzdCdzIGNvb2tpZXMsIHlpZWxkaW5nIHVwIHRoZSBrZXkgb2YgZWFjaCBjb29raWUuXG4gICAqXG4gICAqIElmIGEga2V5cmluZyB3YXMgcHJvdmlkZWQsIG9ubHkgcHJvcGVybHkgc2lnbmVkIGNvb2tpZSBrZXlzIGFyZVxuICAgKiByZXR1cm5lZC4gKi9cbiAgYXN5bmMgKmtleXMoKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPHN0cmluZz4ge1xuICAgIGZvciBhd2FpdCAoY29uc3QgW2tleV0gb2YgdGhpcykge1xuICAgICAgeWllbGQga2V5O1xuICAgIH1cbiAgfVxuXG4gIC8qKiBJdGVyYXRlIG92ZXIgdGhlIHJlcXVlc3QncyBjb29raWVzLCB5aWVsZGluZyB1cCB0aGUgdmFsdWUgb2YgZWFjaCBjb29raWUuXG4gICAqXG4gICAqIElmIGEga2V5cmluZyB3YXMgcHJvdmlkZWQsIG9ubHkgcHJvcGVybHkgc2lnbmVkIGNvb2tpZSB2YWx1ZXMgYXJlXG4gICAqIHJldHVybmVkLiAqL1xuICBhc3luYyAqdmFsdWVzKCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxzdHJpbmc+IHtcbiAgICBmb3IgYXdhaXQgKGNvbnN0IFssIHZhbHVlXSBvZiB0aGlzKSB7XG4gICAgICB5aWVsZCB2YWx1ZTtcbiAgICB9XG4gIH1cblxuICAvKiogSXRlcmF0ZSBvdmVyIHRoZSB7QGxpbmtjb2RlIFJlcXVlc3R9IGNvb2tpZXMsIHlpZWxkaW5nIHVwIGEgdHVwbGVcbiAgICogY29udGFpbmluZyB0aGUga2V5IGFuZCB2YWx1ZSBvZiBlYWNoIGNvb2tpZS5cbiAgICpcbiAgICogSWYgYSBrZXkgcmluZyB3YXMgcHJvdmlkZWQsIG9ubHkgcHJvcGVybHkgc2lnbmVkIGNvb2tpZSBrZXlzIGFuZCB2YWx1ZXMgYXJlXG4gICAqIHJldHVybmVkLiAqL1xuICBhc3luYyAqW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8W3N0cmluZywgc3RyaW5nXT4ge1xuICAgIGNvbnN0IGtleXMgPSB0aGlzW3JlcXVlc3RLZXlzXSgpO1xuICAgIGZvciAoY29uc3Qga2V5IG9mIGtleXMpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgdGhpcy5nZXQoa2V5KTtcbiAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICB5aWVsZCBba2V5LCB2YWx1ZV07XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEseUVBQXlFO0FBRXpFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0E4RUM7QUEwSEQsb0NBQW9DO0FBQ3BDLE1BQU0sdUJBQXVCO0FBQzdCLE1BQU0sYUFBYTtBQUNuQixNQUFNLG1CQUFtQjtBQUV6QixNQUFNLGFBQXFDLENBQUM7QUFDNUMsU0FBUyxXQUFXLElBQVk7RUFDOUIsSUFBSSxRQUFRLFlBQVk7SUFDdEIsT0FBTyxVQUFVLENBQUMsS0FBSztFQUN6QjtFQUVBLE9BQU8sVUFBVSxDQUFDLEtBQUssR0FBRyxJQUFJLE9B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