<script>
  import { newAnswer } from "../stores/stores";
  import VoteBox from "./VoteBox.svelte";

  export let question;

  const handleNewAnswer = (a) => {
    if (!a) return;
    question = { ...question, updatedAt: a.createdAt };
  };

  $: $newAnswer, handleNewAnswer($newAnswer);
</script>

<div class="flex flex-col border shadow-md rounded-lg p-6">
  <div class="flex gap-4 items-center">
    <VoteBox bind:item={question} type="question" />
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