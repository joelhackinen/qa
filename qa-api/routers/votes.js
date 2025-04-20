import { Router } from "../deps.js";
import { vote } from "../services/voteService.js";

const router = new Router();

router.post("/vote", async ({ request, response }) => {
  const body = request.body;
  const v = await body.json();

  const possibleVote = await vote(v);
  if (possibleVote instanceof Error) {
    response.status = 400;
    return response.body = { error: possibleVote.message };
  }
  response.body = possibleVote;
});

export default router;
