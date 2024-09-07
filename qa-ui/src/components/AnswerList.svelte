<script>
  import { newAnswer } from "../stores/stores";
  import VoteBox from "./VoteBox.svelte";
  import InfiniteScroller from "./InfiniteScroller.svelte";
    import { onMount } from "svelte";

  /** @type {Array}*/
  export let answers;
  export let question;

  /** @type {EventSource}*/
  let source;

  let oldest = "";

  $: oldest = answers.reduce((prev, curr) => (
    new Date(curr.updatedAt) < new Date(prev.updatedAt) ? curr : prev
  ), { updatedAt: "9999-12-31T23:59:59.999Z" }).updatedAt;

  const addNewAnswer = (a) => {
    if (!a) return;
    question = { ...question, answers: question.answers+1 };
    answers = [{ ...a, votes: 0 }, ...answers];
  };

  $: $newAnswer, addNewAnswer($newAnswer);

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
    source = new EventSource(`/sse?question_id=${question.id}`);

    source.addEventListener("hello", (e) => {
      console.log(e.data);
    });

    source.addEventListener("open", () => {
      console.log("SSE open")
    });

    source.addEventListener("ai-generated-answers", (e) => {
      const aiAnswers = JSON.parse(e.data);
      console.log(aiAnswers);
      answers = [...aiAnswers, ...answers];
      question = { ...question, answers: question.answers+3 };
    });
  });
</script>

<div class="flex flex-col ml-8 mt-4">
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
        {new Date(a.updatedAt).toLocaleString()}
      </div>
    </div>
  {/each}
  <InfiniteScroller on:bottom={fetchMore} />
</div>