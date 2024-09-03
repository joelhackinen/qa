import { Router } from "../deps.js";
import { getAnswers } from "../services/answerService.js";
import { getQuestions } from "../services/questionService.js";
import { vote } from "../services/voteService.js";

const connectedClients = new Map();

const router = new Router();

// for new questions: broadcast question to all clients subscribed to the course
export const broadcastQuestion = (body) => {
  for (const client of connectedClients.values()) {
    if (client.subscribeTarget === body.courseCode.toLowerCase()) {
      client.socket.send(JSON.stringify({ event: "new-question", question: body }));
    }
  }
};

// for new answers:
//    broadcast new answer to all clients subscribed to the question
//    broadcast updated question to all clients subscribed to the course
export const broadcastAnswer = (body) => {
  for (const client of connectedClients.values()) {
    if (client.subscribeTarget === body.questionId.toString()) {
      client.socket.send(JSON.stringify({ event: "new-answer", answer: body }));
    }
  }
};

// target is either course code or question id
router.get("/socket/:target", (ctx) => {
  const username = ctx.request.url.searchParams.get("username");
  if (!username) {
    return ctx.response.status = 400;
  }
  const socket = ctx.upgrade();

  if (connectedClients.has(username)) {
    socket.close(1008, "This connection already exists");
    return;
  }
  socket.username = username;
  connectedClients.set(username, {
    subscribeTarget: ctx.params.target.toLowerCase(),
    socket,
  });

  console.log(`New client connected: ${username}`);

  socket.onopen = () => {
    socket.send(JSON.stringify({
      event: "hello",
      message: `Hello from server, ${username}`, 
    }));
  };

  socket.onclose = () => {
    console.log(`Client ${username} disconnected`);
    connectedClients.delete(username);
  };

  socket.onmessage = async (m) => {
    const data = JSON.parse(m.data);
    switch (data.event) {
      case "new-question":
        broadcastQuestion(data.question);
        break;
      case "new-answer":
        broadcastAnswer(data.answer);
        break;
      case "fetch-questions":
        socket.send(JSON.stringify({
          event: "fetch-questions",
          questions: (await getQuestions(data.courseCode, data.oldest)),
        }));
        break;
      case "fetch-answers":
        socket.send(JSON.stringify({
          event: "fetch-answers",
          answers: (await getAnswers(data.questionId, data.oldest)),
        }));
        break;
      case "send-vote":
        const possibleVote = await vote(data.vote);
        if (possibleVote instanceof Error) {
          socket.send(JSON.stringify({
            event: "error",
            message: possibleVote.message,
          }));
          return;
        }
        socket.send(JSON.stringify({
          event: "send-vote",
          vote: possibleVote,
        }));
        break;
    }
  };
});


export default router;