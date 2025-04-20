FROM denoland/deno:alpine-2.2.11

EXPOSE 7777

WORKDIR /app

COPY . .

RUN deno install --entrypoint app.js

CMD [ "task", "dev" ]