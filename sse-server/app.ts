import {
  Router,
  Application,
  ServerSentEvent,
  ServerSentEventTarget
} from "./deps.ts";
import { toNumber } from "./util.ts";

const clients = new Map<ServerSentEventTarget, number>();

const app = new Application();
const router = new Router();

const worker = new Worker(import.meta.resolve("./worker.ts"), { type: "module" });
worker.postMessage("Start");

worker.onmessage = ({ data }: MessageEvent) => {
  for (const [client, questionId] of clients.entries()) {
    if (questionId === data[0].questionId) {
      const e = new ServerSentEvent("ai-generated-answers", { data });
      client.dispatchEvent(e);
    }
  }
};

router.get("/sse", async (ctx) => {
  const questionIdParam = ctx.request.url.searchParams.get("question_id");

  const possibleQuestionId = toNumber(questionIdParam);
  if (possibleQuestionId instanceof Error) {
    console.log(possibleQuestionId.message);
    return ctx.response.status = 400;
  }

  const target = await ctx.sendEvents({ keepAlive: true });

  clients.set(target, possibleQuestionId);
  console.log("Client connected");

  target.addEventListener("close", () => {
    clients.delete(target);
    console.log("Connection closed");
  });

  const e = new ServerSentEvent("hello", { data: "hello from server" });

  target.dispatchEvent(e);
});


app.use(router.routes());

await app.listen({ port: 4000, hostname: "0.0.0.0" });