import { Router } from "../deps.js";
import { sql } from "../database.js";

const router = new Router();

router.get("/answers/:questionId", async ({ response, params }) => {
  const answers = await sql`
    SELECT
      *
    FROM
      answers
    WHERE
      question_id = ${params.questionId}
  ;`;
  response.body = answers;
});

export default router;