import { sql } from "../database.js";

export const getQuestions = async (
  courseCode,
  olderThanThis = null,
  questionId = null,
) => {
  const rows = await sql`
    SELECT
      id,
      course_code,
      body,
      created_at,
      updated_at,
      answers,
      votes
    FROM
      questions
    WHERE
      ${olderThanThis ? sql`updated_at < ${olderThanThis} AND` : sql``}
      ${questionId ? sql`id = ${questionId} AND` : sql``}
      course_code ILIKE ${courseCode}
    ORDER BY
      updated_at DESC
    LIMIT 20;
  ;`;

  return rows.map((q) => ({
    id: q.id,
    body: q.body,
    createdAt: q.created_at,
    updatedAt: q.updated_at,
    courseCode: q.course_code,
    votes: q.votes,
    answers: q.answers,
  }));
};
