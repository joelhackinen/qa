import { Router } from "../deps.js";
import { sql } from "../database.js";

const router = new Router();

router.get("/courses", async ({ response }) => {
  const courses = await sql`SELECT name, code FROM courses;`;
  response.body = courses;
});

export default router;