import { Router } from "../deps.js";
import { getQuestions } from "../services/questionService.js";

const connectedClients = new Map();

const router = new Router();

export const broadcast = (type, id, body) => {
  for (const client of connectedClients.values()) {
    if (client.subscribedEventType === type && client.subscribedEventId === id) {
      client.socket.send(JSON.stringify({
        event: type,
        question: body
      }));
    }
  }
};

router.get("/socket/questions/:courseCode", async (ctx) => {
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
    subscribedEventType: "question",
    subscribedEventId: ctx.params.courseCode,
    socket
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
      case "send-question":
        broadcast(
          JSON.stringify({
            event: "send-question",
            question: data.question,
          })
        );
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

router.get("/socket/answers/:questionId", async (ctx) => {
  const username = ctx.request.url.searchParams.get("username");
  if (!username) {
    return ctx.response.status = 400;
  }
  const socket = ctx.upgrade();

  if (connectedClients.has(username)) {
    socket.close(1008, `Username ${username} is already taken`);
    return;
  }
  socket.username = username;
  connectedClients.set(username, socket);
  console.log(`New client connected: ${username}`);

  socket.onopen = () => {
    socket.send(JSON.stringify({
      event: "hello",
      message: "Hello from server",
    }));
  };

  socket.onclose = () => {
    console.log(`${socket.username} disconnected`);
    connectedClients.delete(socket.username);
  };

  socket.onmessage = (m) => {
    const data = JSON.parse(m.data);
    switch (data.event) {
      case "send-question":
        broadcast(
          JSON.stringify({
            event: "send-question",
            question: data.question,
          })
        );
        break;
    }
  };
});

export default router;