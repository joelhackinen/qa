import { Router } from "../deps.js";
import { sql } from "../database.js";
import { getAnswers } from "../services/answerService.js";

const router = new Router();

router.get("/answers/:questionId", async ({ response, request, params }) => {
  const answers = await getAnswers(
    params.questionId,
    request.url.searchParams.get("from")
  );
  response.body = answers;
});

router.post("/answers/:questionId", async ({ request, response, state }) => {
  if (!state.user) return response.status = 403;

  const requestBody = request.body;
  const { questionId, answer, courseCode } = await requestBody.json();

  const [a] = await sql`
    INSERT INTO
      answers (question_id, body, user_id)
    VALUES (
      ${questionId},
      ${answer},
      ${state.user}
    ) RETURNING *
  ;`;
  console.log(a);
  response.body = {
    id: a.id,
    questionId: a.question_id,
    body: a.body,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    courseCode
  };
});

export default router;