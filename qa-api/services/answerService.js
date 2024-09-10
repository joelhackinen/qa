import { sql } from "../database.js";

export const getAnswers = async (questionId, olderThanThis=null) => {
  const rows = await sql`
    SELECT
      id,
      question_id,
      body,
      created_at,
      updated_at,
      user_id,
      votes
    FROM
      answers
    WHERE
      ${olderThanThis ? sql`updated_at < ${olderThanThis} AND` : sql``}
      ${questionId ? sql`question_id = ${questionId}` : sql``}
    ORDER BY
      updated_at DESC
    LIMIT 20;
  ;`;

  return rows.map(a => ({
    id: a.id,
    body: a.body,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    votes: a.votes,
    userId: a.user_id,
  }));
};