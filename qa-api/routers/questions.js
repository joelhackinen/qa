import { Router } from "../deps.js";
import { sql } from "../database.js";
import { getQuestions } from "../services/questionService.js";

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

router.post("/questions/:courseCode", async ( { response, request, params, state }) => {
  const body = request.body;
  const { question, userId } = await body.json();

  console.log(`"${question}" asked by ${userId} on ${params.courseCode}`);

  const [q] = await sql`
    INSERT INTO
      questions (user_id, body, course_code)
    VALUES (
      ${userId},
      ${question},
      ${params.courseCode.toUpperCase()}
    ) RETURNING *
  ;`;
  response.status = 200;
  response.body = {
    id: q.id,
    body: q.body,
    createdAt: q.created_at,
    updatedAt: q.updated_at,
    courseCode: q.course_code,
    votes: 0,
    answers: q.answers,
  };
});

export default router;