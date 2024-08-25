// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import db from "./vendor/mime-db.v1.52.0.ts";
/** A map of the media type for a given extension */ export const types = new Map();
/** A map of extensions for a given media type. */ const extensions = new Map();
/** Internal function to populate the maps based on the Mime DB. */ const preference = [
  "nginx",
  "apache",
  undefined,
  "iana"
];
for (const type of Object.keys(db)){
  const mime = db[type];
  const exts = mime.extensions;
  if (!exts || !exts.length) {
    continue;
  }
  // @ts-ignore work around denoland/dnt#148
  extensions.set(type, exts);
  for (const ext of exts){
    const current = types.get(ext);
    if (current) {
      const from = preference.indexOf(db[current].source);
      const to = preference.indexOf(mime.source);
      if (current !== "application/octet-stream" && (from > to || // @ts-ignore work around denoland/dnt#148
      from === to && current.startsWith("application/"))) {
        continue;
      }
    }
    types.set(ext, type);
  }
}
export { db, extensions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvbWVkaWEtdHlwZXMvMC4yMjMuMC9fZGIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNCB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbmltcG9ydCBkYiBmcm9tIFwiLi92ZW5kb3IvbWltZS1kYi52MS41Mi4wLnRzXCI7XG5pbXBvcnQgdHlwZSB7IERCRW50cnkgfSBmcm9tIFwiLi9fdXRpbC50c1wiO1xuXG5leHBvcnQgdHlwZSBLZXlPZkRiID0ga2V5b2YgdHlwZW9mIGRiO1xuXG4vKiogQSBtYXAgb2YgdGhlIG1lZGlhIHR5cGUgZm9yIGEgZ2l2ZW4gZXh0ZW5zaW9uICovXG5leHBvcnQgY29uc3QgdHlwZXMgPSBuZXcgTWFwPHN0cmluZywgS2V5T2ZEYj4oKTtcblxuLyoqIEEgbWFwIG9mIGV4dGVuc2lvbnMgZm9yIGEgZ2l2ZW4gbWVkaWEgdHlwZS4gKi9cbmNvbnN0IGV4dGVuc2lvbnM6IE1hcDxzdHJpbmcsIHN0cmluZ1tdPiA9IG5ldyBNYXAoKTtcblxuLyoqIEludGVybmFsIGZ1bmN0aW9uIHRvIHBvcHVsYXRlIHRoZSBtYXBzIGJhc2VkIG9uIHRoZSBNaW1lIERCLiAqL1xuY29uc3QgcHJlZmVyZW5jZSA9IFtcIm5naW54XCIsIFwiYXBhY2hlXCIsIHVuZGVmaW5lZCwgXCJpYW5hXCJdO1xuXG5mb3IgKGNvbnN0IHR5cGUgb2YgT2JqZWN0LmtleXMoZGIpIGFzIEtleU9mRGJbXSkge1xuICBjb25zdCBtaW1lID0gZGJbdHlwZV0gYXMgREJFbnRyeTtcbiAgY29uc3QgZXh0cyA9IG1pbWUuZXh0ZW5zaW9ucztcblxuICBpZiAoIWV4dHMgfHwgIWV4dHMubGVuZ3RoKSB7XG4gICAgY29udGludWU7XG4gIH1cblxuICAvLyBAdHMtaWdub3JlIHdvcmsgYXJvdW5kIGRlbm9sYW5kL2RudCMxNDhcbiAgZXh0ZW5zaW9ucy5zZXQodHlwZSwgZXh0cyk7XG5cbiAgZm9yIChjb25zdCBleHQgb2YgZXh0cykge1xuICAgIGNvbnN0IGN1cnJlbnQgPSB0eXBlcy5nZXQoZXh0KTtcbiAgICBpZiAoY3VycmVudCkge1xuICAgICAgY29uc3QgZnJvbSA9IHByZWZlcmVuY2UuaW5kZXhPZigoZGJbY3VycmVudF0gYXMgREJFbnRyeSkuc291cmNlKTtcbiAgICAgIGNvbnN0IHRvID0gcHJlZmVyZW5jZS5pbmRleE9mKG1pbWUuc291cmNlKTtcblxuICAgICAgaWYgKFxuICAgICAgICBjdXJyZW50ICE9PSBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiICYmXG4gICAgICAgIChmcm9tID4gdG8gfHxcbiAgICAgICAgICAvLyBAdHMtaWdub3JlIHdvcmsgYXJvdW5kIGRlbm9sYW5kL2RudCMxNDhcbiAgICAgICAgICAoZnJvbSA9PT0gdG8gJiYgY3VycmVudC5zdGFydHNXaXRoKFwiYXBwbGljYXRpb24vXCIpKSlcbiAgICAgICkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0eXBlcy5zZXQoZXh0LCB0eXBlKTtcbiAgfVxufVxuXG5leHBvcnQgeyBkYiwgZXh0ZW5zaW9ucyB9O1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUMxRSxPQUFPLFFBQVEsOEJBQThCO0FBSzdDLGtEQUFrRCxHQUNsRCxPQUFPLE1BQU0sUUFBUSxJQUFJLE1BQXVCO0FBRWhELGdEQUFnRCxHQUNoRCxNQUFNLGFBQW9DLElBQUk7QUFFOUMsaUVBQWlFLEdBQ2pFLE1BQU0sYUFBYTtFQUFDO0VBQVM7RUFBVTtFQUFXO0NBQU87QUFFekQsS0FBSyxNQUFNLFFBQVEsT0FBTyxJQUFJLENBQUMsSUFBa0I7RUFDL0MsTUFBTSxPQUFPLEVBQUUsQ0FBQyxLQUFLO0VBQ3JCLE1BQU0sT0FBTyxLQUFLLFVBQVU7RUFFNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLE1BQU0sRUFBRTtJQUN6QjtFQUNGO0VBRUEsMENBQTBDO0VBQzFDLFdBQVcsR0FBRyxDQUFDLE1BQU07RUFFckIsS0FBSyxNQUFNLE9BQU8sS0FBTTtJQUN0QixNQUFNLFVBQVUsTUFBTSxHQUFHLENBQUM7SUFDMUIsSUFBSSxTQUFTO01BQ1gsTUFBTSxPQUFPLFdBQVcsT0FBTyxDQUFDLEFBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBYSxNQUFNO01BQy9ELE1BQU0sS0FBSyxXQUFXLE9BQU8sQ0FBQyxLQUFLLE1BQU07TUFFekMsSUFDRSxZQUFZLDhCQUNaLENBQUMsT0FBTyxNQUNOLDBDQUEwQztNQUN6QyxTQUFTLE1BQU0sUUFBUSxVQUFVLENBQUMsZUFBZ0IsR0FDckQ7UUFDQTtNQUNGO0lBQ0Y7SUFFQSxNQUFNLEdBQUcsQ0FBQyxLQUFLO0VBQ2pCO0FBQ0Y7QUFFQSxTQUFTLEVBQUUsRUFBRSxVQUFVLEdBQUcifQ==