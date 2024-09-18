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
      const [answer] = await getAnswerFromLLM(questionObj.body);

      try {
        const [a] = await sql`
          INSERT INTO
            answers (question_id, body, user_id)
          VALUES
            (${questionObj.id}, ${answer.generated_text}, 0)
          RETURNING
            id,
            question_id,
            body,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
            to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at,
            user_id,
            votes
        ;`;
        const newAnswer = {
          id: a.id,
          body: a.body,
          questionId: a.question_id,
          userId: a.user_id,
          createdAt: a.created_at,
          updatedAt: a.updated_at,
          votes: 0,          
        };
        await client.PUBLISH("answers", JSON.stringify(newAnswer));
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