<script>
  import { userUuid } from "../stores/stores";
  import { newAnswers } from "../stores/stores";
  import { Source } from "../source";
  import VoteBox from "./VoteBox.svelte";
  import InfiniteScroller from "./InfiniteScroller.svelte";
  import { onDestroy, onMount } from "svelte";

  let { answers=$bindable(), question=$bindable() } = $props();

  const oldest = $derived(answers.reduce((prev, curr) => (
    new Date(curr.updatedAt) < new Date(prev.updatedAt)
    ? curr
    : prev
  ), { updatedAt: "9999-12-31T23:59:59.999Z" }).updatedAt
  );

  $effect(() => {
    addNewAnswers($newAnswers)
  });

  const addNewAnswers = (as) => {
    if (!as) return;
    question = { ...question, answers: question.answers+as.length, updatedAt: as[0].createdAt };
    answers = [...as, ...answers];
  };

  const fetchMore = async () => {
    console.log("fetching more answers");
    const response = await fetch(`/api/answers/${question.id}?from=${oldest}`);
    const newAnswers = await response.json();

    answers = [...answers, ...newAnswers];
  };

  const handleVote = async (votedA, value) => {
    const response = await fetch(`/api/vote`, {
      method: "post",
      body: JSON.stringify({
        userId: $userUuid,
        votableId: votedA.id,
        votableType: "answer",
        voteValue: value,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      return alert(data.error);
    }
    answers = answers.map((a) => a.id === votedA.id ? { ...a, votes: votedA.votes+data.voteValue, updatedAt: data.votedAt } : A);
  };

  onMount(() => {
    Source.use(`/sse?question_id=${question.id}`);

    Source.addEventListener("answers", (e) => {
      $newAnswers = JSON.parse(e.data);
    });
  });

  onDestroy(() => {
    Source.quit();
  });
</script>

<div class="flex flex-col ml-8 mt-4" id="answer-list">
  <h1 class="text-md font-semibold">Answers ({question.answers})</h1>
  {#each answers as a}
    <div class="relative py-1">
      <div class="flex gap-x-2 items-center border rounded-md pl-2 pr-4 py-1 shadow-sm">
        <div class="flex flex-grow gap-x-2 items-center">
          <VoteBox item={a} {handleVote} />
          <div class="break-words">
            {a.body}
          </div>
        </div>
        {#if a.userId == 0}
          <span class="text-gray-500 font-semibold">AI</span>
        {/if}
      </div>
      <div class="absolute -bottom-0.5 left-10 bg-white rounded-lg px-1 text-xs truncate border-b shadow-sm">
        {new Date(a.updatedAt).toLocaleString("en-GB")}
      </div>
    </div>
  {/each}
  <InfiniteScroller onVisible={fetchMore} />
</div>