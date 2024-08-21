<script>
  export let courseCode;
  export let questionId;
  export let answers;
</script>

<div class="flex flex-col">
  {#each answers as answer}
    <a
      class="m-2 border-2 px-2 py-4 rounded-md hover:bg-gray-300 text-left"
      href={`/${courseCode.toLowerCase()}/${questionId}`}
    >
      <span class="text-gray-500 font-bold">
        {answer.body}
      </span>
    </a>
  {/each}
</div>