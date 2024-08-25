import { Router } from "../deps.js";
import { sql } from "../database.js";
import { broadcast } from "./socket.js";
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

router.post("/questions/:courseCode", async ( { response, request, params, state }) => {
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
    ) RETURNING *
  ;`;
  response.status = 200;

  broadcast("question", params.course_code, {
    id: q.id,
    body: q.body,
    createdAt: q.created_at,
    updatedAt: q.updated_at,
    courseCode: q.course_code,
    votes: 0,
  });
});

export default router;