<script>
  import { onMount } from "svelte";

  export let courseCode;
  export let questions;

  let qs = questions;
  
  onMount(() => {
    qs = qs.concat({ id: Math.random(), body: "How do I install Deno??How do I install Deno??How do I install Deno??How do I install Deno??"})
  });
</script>

<div class="flex flex-col p-2 {$$restProps.class}">
  {#each qs as q}
    <div class="flex justify-between items-center m-1 rounded-md border-2 bg-white hover:bg-gray-200">
      <input id={q.id} type="checkbox" class="order-last hidden peer" />
      <label for={q.id} class="bg-white rounded-full mr-2 hover:bg-blue-300 peer-checked:hidden">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4" >
          <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
        </svg>   
      </label>
      <label for={q.id} class="bg-white rounded-full mr-2 hover:bg-blue-300 hidden peer-checked:block">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4 rotate-180" >
          <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
        </svg>   
      </label>
      <a
        class="flex-grow order-first font-semibold p-2 peer-[&:not(:checked)]:truncate"
        href={`/${courseCode}/${q.id}`}
      >
        {q.body}
      </a>
    </div>
  {/each}
</div>