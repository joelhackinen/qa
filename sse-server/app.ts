import { createClient } from "./deps.ts";
import { Application, Router, ServerSentEvent, ServerSentEventTarget } from "./deps.ts";
import { toNumber } from "./util.ts";

const clientsA = new Map<ServerSentEventTarget, number>();
const clientsQ = new Map<ServerSentEventTarget, string>();

const app = new Application();
const router = new Router();

const client = createClient({
  url: "redis://redis:6379",
  pingInterval: 1000,
});
await client.connect();

const answerSub = client.duplicate();
const questionSub = client.duplicate();

await answerSub.connect();
await questionSub.connect();

await answerSub.subscribe("answers", (message) => {
  const data = JSON.parse(message);
  for (const [client, questionId] of clientsA.entries()) {
    if (questionId === data.questionId) {
      const e = new ServerSentEvent("answers", { data: [data] });
      client.dispatchEvent(e);
    }
  }
});

await questionSub.subscribe("questions", (message) => {
  const data = JSON.parse(message);
  for (const [client, courseCode] of clientsQ.entries()) {
    if (courseCode === data.courseCode.toLowerCase()) {
      const e = new ServerSentEvent("questions", { data });
      client.dispatchEvent(e);
    }
  }
});

router.get("/sse", async (ctx) => {
  const questionIdParam = ctx.request.url.searchParams.get("question_id");
  const courseCodeParam = ctx.request.url.searchParams.get("course_code");

  if (questionIdParam) {
    const possibleQuestionId = toNumber(questionIdParam);
    if (possibleQuestionId instanceof Error) {
      console.log(possibleQuestionId.message);
      return ctx.response.status = 400;
    }
    const target = await ctx.sendEvents({ keepAlive: true });

    clientsA.set(target, possibleQuestionId);
    console.log("Client connected");

    target.addEventListener("close", () => {
      clientsA.delete(target);
      console.log("Connection closed");
    });

    const e = new ServerSentEvent("hello", { data: "hello from server" });

    target.dispatchEvent(e);
    return;
  }

  if (courseCodeParam) {
    const target = await ctx.sendEvents({ keepAlive: true });
    console.log(courseCodeParam);
    clientsQ.set(target, courseCodeParam);
    console.log("Client connected");

    target.addEventListener("close", () => {
      clientsQ.delete(target);
      console.log("Connection closed");
    });

    const e = new ServerSentEvent("hello", { data: "hello from server" });

    target.dispatchEvent(e);
    return;
  }
  ctx.response.status = 400;
  ctx.response.body = { error: "missing query params" };
});

app.use(router.routes());

await app.listen({ port: 4000, hostname: "0.0.0.0" });