import { Application } from "./deps.js";
import coursesRouter from "./routers/courses.js";
import questionsRouter from "./routers/questions.js";
import { sql } from "./database.js";

const handleRequest = async (request) => {
  const data = await request.json();

  const response = await fetch("http://llm-api:7000/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return response;
};

const app = new Application();

app.use(coursesRouter.routes());
app.use(questionsRouter.routes());

app.use(async ({ request, state }, next) => {
  state.user = request.headers.get("Authorization");
  await next();
});


await app.listen({ port: 7777, hostname: "0.0.0.0" });