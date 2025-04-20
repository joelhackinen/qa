FROM denoland/deno:alpine-2.2.11

EXPOSE 4000

WORKDIR /app

COPY . .

RUN deno install --entrypoint app.ts

CMD [ "task", "dev" ]