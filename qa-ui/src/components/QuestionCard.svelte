<script>
  import { newAnswers } from "../stores/stores";
  import VoteBox from "./VoteBox.svelte";

  export let question;

  const handleNewAnswers = (as) => {
    if (!as) return;
    question = { ...question, updatedAt: as[0].createdAt };
  };

  $: $newAnswers, handleNewAnswers($newAnswers);
</script>

<div class="flex flex-col border shadow-md rounded-lg p-6">
  <div class="flex gap-4 items-center">
    <VoteBox bind:item={question} type="question" />
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