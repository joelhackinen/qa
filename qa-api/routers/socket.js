import { Router } from "../deps.js";
import { getQuestions } from "../services/questionService.js";

const connectedClientsQ = new Map();
const connectedClientsA = new Map();

const router = new Router();

export const broadcastQuestion = (body) => {
  for (const client of connectedClientsQ.values()) {
    if (client.subscribedCourse === body.courseCode.toLowerCase()) {
      client.socket.send(JSON.stringify({ event: "question", question: body }));
    }
  }
};

export const broadcastAnswer = (body) => {
  for (const client of connectedClientsA.values()) {
    if (client.socket.subscribedQuestionId === body.questionId) {
      client.socket.send(JSON.stringify({ event: "answer", answer: body }));
    }
  }
};

router.get("/socket/questions/:courseCode", (ctx) => {
  const username = ctx.request.url.searchParams.get("username");
  if (!username) {
    return ctx.response.status = 400;
  }
  const socket = ctx.upgrade();

  if (connectedClientsQ.has(username)) {
    socket.close(1008, "This connection already exists");
    return;
  }
  socket.username = username;
  connectedClientsQ.set(username, {
    subscribedCourse: ctx.params.courseCode.toLowerCase(),
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
    connectedClientsQ.delete(username);
  };

  socket.onmessage = async (m) => {
    const data = JSON.parse(m.data);
    switch (data.event) {
      case "send-question":
        broadcastQuestion(data.question);
        break;
      case "fetch-questions":
        const qs = await getQuestions(data.courseCode, data.oldest);
        socket.send(JSON.stringify({
          event: "fetch-old-questions",
          questions: qs,
        }));
        break;
    }
  };
});

router.get("/socket/answers/:questionId", (ctx) => {
  const username = ctx.request.url.searchParams.get("username");
  if (!username) {
    return ctx.response.status = 400;
  }
  const socket = ctx.upgrade();

  if (connectedClientsA.has(username)) {
    socket.close(1008, `Username ${username} is already taken`);
    return;
  }
  socket.username = username;
  connectedClientsA.set(username, {
    subscribedQuestionId: ctx.params.questionId,
    socket,
  });
  console.log(`New client connected: ${username}`);

  socket.onopen = () => {
    socket.send(JSON.stringify({
      event: "hello",
      message: "Hello from server",
    }));
  };

  socket.onclose = () => {
    console.log(`${socket.username} disconnected`);
    connectedClientsA.delete(socket.username);
  };

  socket.onmessage = (m) => {
    const data = JSON.parse(m.data);
    switch (data.event) {
      case "send-answer":
        broadcastAnswer(data.answer);
        break;
    }
  };
});

export default router;