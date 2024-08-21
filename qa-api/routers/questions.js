import { Router } from "../deps.js";
import { sql } from "../database.js";

const router = new Router();

router.get("/questions/:courseCode", async ({ response, params }) => {
  const questions = await sql`
    SELECT
      id, title, body
    FROM
      questions
    WHERE
      course_code ILIKE ${params.courseCode}
  ;`;
  response.body = questions;
});

export default router;