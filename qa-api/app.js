import { Application, createClient } from "./deps.js";
import coursesRouter from "./routers/courses.js";
import questionsRouter from "./routers/questions.js";
import answersRouter from "./routers/answers.js";
import voteRouter from "./routers/votes.js";

export const serviceClient = createClient({
  url: "redis://redis:6379",
  pingInterval: 1000,
  database: 0,
});

export const rateLimitClient = createClient({
  url: "redis://redis:6379",
  pingInterval: 1000,
  database: 1,
});

await serviceClient.connect();
await rateLimitClient.connect();

const app = new Application();

app.use(async ({ request, state }, next) => {
  state.user = request.headers.get("user-uuid");
  await next();
});

app.use(coursesRouter.routes());
app.use(voteRouter.routes());

app.use(questionsRouter.routes());
app.use(answersRouter.routes());

await app.listen({ port: 7777, hostname: "0.0.0.0" });
