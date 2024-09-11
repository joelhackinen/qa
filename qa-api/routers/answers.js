import { Router } from "../deps.js";
import { sql } from "../database.js";
import { getAnswers } from "../services/answerService.js";
import { rateLimitClient } from "../app.js";

const router = new Router();

router.get("/answers/:questionId", async ({ response, request, params }) => {
  const answers = await getAnswers(
    params.questionId,
    request.url.searchParams.get("from")
  );
  response.body = answers;
});

router.post("/answers/:questionId",
  async ({ response, state }, next) => {
    const lastAnswerTimestamp = await rateLimitClient.get(`answer-${state.user}`);
    const diff = Date.now() - new Date(lastAnswerTimestamp ?? 0).valueOf();
  
    if (diff < 60 * 1000) {
      response.status = 400;
      return response.body = { error: `Only one answer per minute. Please try again in ${Number(60 - diff / 1000).toFixed(0)} seconds` };
    }
    await next();
  },
  async ({ request, response, state }) => {
    const requestBody = request.body;
    const { questionId, answer, courseCode } = await requestBody.json();

    const [a] = await sql`
      INSERT INTO
        answers (question_id, body, user_id)
      VALUES (
        ${questionId},
        ${answer},
        ${state.user}
      ) RETURNING
        id,
        question_id,
        body,
        to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
        to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at,
        user_id,
        votes
    ;`;

    await rateLimitClient.set(`answer-${state.user}`, `${a.created_at}`);

    response.body = {
      id: a.id,
      questionId: a.question_id,
      body: a.body,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
      courseCode,
      userId: a.user_id,
      votes: a.votes
    };
  }
);

export default router;