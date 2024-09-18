import { Router } from "../deps.js";
import { sql } from "../database.js";
import { getQuestions } from "../services/questionService.js";
import { rateLimitClient, serviceClient } from "../app.js";

const router = new Router();

router.get("/questions/:courseCode", async ({ response, request, params }) => {
  const questions = await getQuestions(
    params.courseCode,
    request.url.searchParams.get("from")
  );
  console.log(questions);

  response.body = questions;
});

router.get("/questions/:courseCode/:id", async (ctx) => {
  const courseCode = ctx.params.courseCode;
  const questionId = ctx.params.id;

  const [q] = await getQuestions(courseCode, null, questionId);

  ctx.response.body = q;
});

router.post("/questions/:courseCode",
  async ({ response, state }, next) => {
    const lastQuestionTimestamp = await rateLimitClient.GET(`question-${state.user}`);
    const diff = Date.now() - new Date(lastQuestionTimestamp ?? 0).valueOf();
  
    if (diff < 60 * 1000) {
      response.status = 400;
      return response.body = { error: `Only one question per minute. Please try again in ${Number(60 - diff / 1000).toFixed(0)} seconds` };
    }
    await next();
  },
  async ({ response, request, params, state }) => {
    const body = request.body;
    const { question } = await body.json();

    console.log(`"${question}" asked by ${state.user} on ${params.courseCode}`);

    const [q] = await sql`
      INSERT INTO
        questions (user_id, body, course_code)
      VALUES (
        ${state.user},
        ${question},
        ${params.courseCode.toUpperCase()}
      ) RETURNING
        id,
        body,
        to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
        to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at,
        course_code
    ;`;
    const newQuestion = {
      id: q.id,
      body: q.body,
      createdAt: q.created_at,
      updatedAt: q.updated_at,
      courseCode: q.course_code,
      votes: 0,
      answers: 0,
    };

    await rateLimitClient.SET(`question-${state.user}`, `${q.created_at}`);
    
    await serviceClient.PUBLISH("questions", JSON.stringify(newQuestion));
    await serviceClient.XADD("ai_gen_answers", "*", { question: JSON.stringify(q) });
    await serviceClient.XADD("ai_gen_answers", "*", { question: JSON.stringify(q) });
    await serviceClient.XADD("ai_gen_answers", "*", { question: JSON.stringify(q) });

    response.status = 200;
    response.body = newQuestion;
  },
);

export default router;