/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />

import { createClient, commandOptions } from "./deps.ts";
import { sql } from "./database.ts";
import { Question } from "./types.ts";

const consumerName = crypto.randomUUID();

const client = createClient({
  url: "redis://redis:6379",
  pingInterval: 1000,
});

const getAnswerFromLLM = async (question: string) => {  
  const response = await fetch("http://llm-api:7000/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({question}),
  });
  return await response.json();
};

const createConsumerGroup = async () => {
  try {
    await client.XGROUP_CREATE("ai_gen_answers", "ai_gen_answers_group", "0", {
      MKSTREAM: true
    });
    console.log("Created consumer group.");
  } catch (_e) {
    console.log("Consumer group already exists, skipped creation.");
  }
};

const readEntryFromStream = async () => {
  const response = await client.XREADGROUP(
    commandOptions({
      isolated: true
    }),
    "ai_gen_answers_group", 
    consumerName, [
      {
        key: "ai_gen_answers",
        id: '>',
      },
    ], {
      COUNT: 1,
      BLOCK: 5000
    },
  );
  return response;
};

self.onmessage = async () => {
  await client.connect();
  await createConsumerGroup();
  
  console.log(`Starting consumer ai_gen_answers-${consumerName}.`);

  while (true) {
    try {
      const response = await readEntryFromStream();
  
      if (response) {
        const entryId = response[0].messages[0].id;
        await client.XACK("ai_gen_answers", "ai_gen_answers_group", entryId);
        console.log(`Acknowledged processing of entry ${entryId}.`);
  
        const questionObj = JSON.parse(response[0].messages[0].message.question) as Question;

        const [r1, r2, r3] = await Promise.all([
          getAnswerFromLLM(questionObj.body),
          getAnswerFromLLM(questionObj.body),
          getAnswerFromLLM(questionObj.body),
        ]);
        const now = new Date(Date.now()).toISOString();
        console.log(now)
        try {
          const rows = await sql`
            INSERT INTO
              answers (question_id, body, user_id, created_at, updated_at)
            VALUES
              (${questionObj.id}, ${r1[0].generated_text}, 0, ${now}, ${now}),
              (${questionObj.id}, ${r2[0].generated_text}, 0, ${now}, ${now}),
              (${questionObj.id}, ${r3[0].generated_text}, 0, ${now}, ${now})
            RETURNING *
          ;`;
          self.postMessage(rows.map(r => ({
            id: r.id,
            body: r.body,
            questionId: r.question_id,
            userId: r.user_id,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            votes: 0,          
          })));
        } catch (error) {
          console.log(error);
        }
      } else {
        console.log("No new stream entries.");
      }
    } catch (err) {
      console.error(err);
    }
  }
};