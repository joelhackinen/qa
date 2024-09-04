import { sql } from "../database.js";
import { cacheMethodCalls } from "../util.js";

const getCoursesFromDB = async () => {
  return await sql`SELECT name, code FROM courses;`;
};

export const getCourses = cacheMethodCalls(getCoursesFromDB);