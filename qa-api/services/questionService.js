import { sql } from "../database.js";

export const getQuestions = async (courseCode, olderThanThis) => {
  const rows = await sql`
    SELECT
      q.id AS id,
      q.course_code,
      q.body,
      q.created_at,
      q.updated_at,
      COALESCE(SUM(v.vote_value), 0)::INTEGER AS vote_count
    FROM
      questions q
    LEFT JOIN
      votes v
    ON
      q.id = v.votable_id
        AND
      v.votable_type = 'question'
    WHERE
      ${olderThanThis ? sql`q.updated_at < ${olderThanThis} AND` : sql``}
      q.course_code ILIKE ${courseCode}
    GROUP BY
      q.id
    ORDER BY
      updated_at DESC
    LIMIT 10;
  ;`;

  return rows.map(q => ({
    id: q.id,
    body: q.body,
    createdAt: q.created_at,
    updatedAt: q.updated_at,
    courseCode: q.course_code,
    votes: q.vote_count,
  }));
};