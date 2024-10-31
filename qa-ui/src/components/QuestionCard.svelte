<script>
  import { userUuid } from "../stores/stores";
  import { newAnswers } from "../stores/stores";
  import VoteBox from "./VoteBox.svelte";

  let { question=$bindable() } = $props();

  const handleNewAnswers = (as) => {
    if (!as) return;
    question = { ...question, updatedAt: as[0].createdAt };
  };

  $effect(() => {
    handleNewAnswers($newAnswers);
  });

  const handleVote = async (votedQ, value) => {
    const response = await fetch(`/api/vote`, {
      method: "post",
      body: JSON.stringify({
        userId: $userUuid,
        votableId: votedQ.id,
        votableType: "question",
        voteValue: value,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      return alert(data.error);
    }
    question = { ...question, votes: votedQ.votes+data.voteValue, updatedAt: data.votedAt };
  };
</script>

<div class="flex flex-col border shadow-md rounded-lg p-6">
  <div class="flex gap-4 items-center">
    <VoteBox item={question} {handleVote} />
    <div class="flex-grow text-xl font-semibold">
      {question.body}
    </div>
  </div>
  <span class="text-sm truncate">
    last event {new Date(question.updatedAt).toLocaleDateString("en-GB")} at {new Date(question.updatedAt).toLocaleTimeString("en-GB")}
  </span>
  <span class="text-sm truncate">
    asked {new Date(question.createdAt).toLocaleDateString("en-GB")} at {new Date(question.createdAt).toLocaleTimeString("en-GB")}
  </span>
</div>