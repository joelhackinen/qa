import { sql } from "../database.js";

export const vote = async ({ userId, votableId, votableType, voteValue }) => {
  let v;
  try {
    [v] = await sql`
      INSERT INTO
        votes (user_id, votable_id, votable_type, vote_value)
      VALUES (
        ${userId},
        ${votableId},
        ${votableType},
        ${voteValue}
      ) RETURNING *
    ;`;
  } catch (error) {
    if (error.code == 23505) {
      console.log("the user has already voted to this question");
    }
    return new Error("the user has already voted to this question");
  }
  console.log(v);
  return {
    votableId: v.votable_id,
    votableType: v.votable_type,
    voteValue: v.vote_value,
    votedAt: v.voted_at,
  };
};