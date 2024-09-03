<script>
  import { userUuid } from "../stores/stores";
  import { onDestroy, onMount } from "svelte";
  import VoteBox from "./VoteBox.svelte";
  import { Socket } from "../stores/socket";

  export let question;

  const handleVote = (e) => {
    Socket.send({
      event: "send-vote",
      vote: {
        userId: $userUuid,
        votableId: e.detail.votableId,
        votableType: "question",
        voteValue: e.detail.value,
      },
    });
  };

  onMount(() => {
    Socket.use(`/api/socket/${question.id}?username=${$userUuid}`);

    Socket.addEventListener("message", (m) => {
      const data = JSON.parse(m.data);
      switch (data.event) {
        case "receive-vote":
          question = {
            ...question,
            updatedAt: data.vote.votedAt,
            votes: question.votes+data.vote.voteValue
          };
          break;
        case "new-answer":
          question = {
            ...question,
            updatedAt: data.answer.createdAt,
          };
          break;
      }
    })
  });

  onDestroy(() => {
    Socket.quit();
  });
</script>

<div class="flex flex-col border shadow-md rounded-lg p-6">
  <div class="flex gap-4 items-center">
    <VoteBox item={question} on:vote={handleVote} />
    <div class="flex-grow text-xl font-semibold">
      {question.body}
    </div>
  </div>
  <span class="text-sm truncate">
    last event {new Date(question.updatedAt).toLocaleDateString()} at {new Date(question.updatedAt).toLocaleTimeString()}
  </span>
  <span class="text-sm truncate">
    asked {new Date(question.createdAt).toLocaleDateString()} at {new Date(question.createdAt).toLocaleTimeString()}
  </span>
</div>