<script>
  import { newAnswers } from "../stores/stores";
  import { Source } from "../source";
  import VoteBox from "./VoteBox.svelte";
  import InfiniteScroller from "./InfiniteScroller.svelte";
  import { onDestroy, onMount } from "svelte";

  /** @type {Array}*/
  export let answers;
  export let question;

  let oldest = "";

  $: oldest = answers.reduce((prev, curr) => (
    new Date(curr.updatedAt) < new Date(prev.updatedAt) ? curr : prev
  ), { updatedAt: "9999-12-31T23:59:59.999Z" }).updatedAt;

  const addNewAnswers = (as) => {
    if (!as) return;
    question = { ...question, answers: question.answers+as.length, updatedAt: as[0].createdAt };
    answers = [...as, ...answers];
  };

  $: $newAnswers, addNewAnswers($newAnswers);

  const fetchMore = async () => {
    if (!oldest) {
      console.log("No older answers to fetch");
      return;
    }
    const response = await fetch(`/api/answers/${question.id}?from=${oldest}`);
    const newAnswers = await response.json();

    if (newAnswers.length === 0) {
      oldest = undefined;
      return;
    }
    answers = [...answers, ...newAnswers];
  };

  onMount(() => {
    Source.use(`/sse?question_id=${question.id}`);

    Source.addEventListener("ai-generated-answers", (e) => {
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
          <VoteBox bind:item={a} type="answer" />
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
  <InfiniteScroller on:bottom={fetchMore} />
</div>