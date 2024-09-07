import { sql } from "../database.js";

export const getAnswers = async (questionId, olderThanThis=null) => {
  const rows = await sql`
    SELECT
      a.id AS id,
      a.question_id,
      a.body,
      a.created_at,
      a.updated_at,
      a.user_id,
      COALESCE(SUM(v.vote_value), 0)::INTEGER AS vote_count
    FROM
      answers a
    LEFT JOIN
      votes v
    ON
      a.id = v.votable_id
        AND
      v.votable_type = 'answer'
    WHERE
      ${olderThanThis ? sql`a.updated_at < ${olderThanThis} AND` : sql``}
      ${questionId ? sql`a.question_id = ${questionId}` : sql``}
    GROUP BY
      a.id
    ORDER BY
      updated_at DESC
    LIMIT 10;
  ;`;

  return rows.map(a => ({
    id: a.id,
    body: a.body,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    votes: a.vote_count,
    userId: a.user_id,
  }));
};