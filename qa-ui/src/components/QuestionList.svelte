<script>
  import { onMount } from "svelte";

  export let courseCode;
  export let questions;

  let qs = questions;

  onMount(() => {
    for (let i = 0; i < 20; i++) {
      qs = qs.concat({ id: 222, title: "mororor", body: "hahahaha" });
    }
    
  });
</script>

<div class="flex flex-col p-2 {$$restProps.class}">
  {#each qs as question}
    <a
      class="m-1 border-2 px-2 py-2 rounded-md hover:bg-gray-300 text-left truncate"
      href={`/${courseCode}/${question.id}`}
    >
      <span class="text-gray-500 font-bold">
        {question.title}
      </span>
      <span class="font-semibold">
        {question.body}
      </span>
    </a>
  {/each}
</div>