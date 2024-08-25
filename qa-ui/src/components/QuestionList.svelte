<script>
  import QuestionLoader from "./QuestionLoader.svelte";
  import { onDestroy, onMount } from "svelte";
  import { userUuid } from "../stores/stores";

  export let courseCode;
  export let questionsFromServer;
  let qs = questionsFromServer;
  let oldest = "";

  let socket = new WebSocket(
    `/api/socket/questions/${courseCode}?username=${$userUuid}`,
  );

  $: oldest = qs.reduce((prev, curr) => (
    new Date(curr.updatedAt) < new Date(prev.updatedAt) ? curr : prev
  )).updatedAt;
  
  onMount(() => {
    socket.onmessage = (m) => {
      const data = JSON.parse(m.data);
      console.log(data);

      switch (data.event) {
        case "question":
          console.log(data.question);
          qs = [data.question, ...qs]
          break;
        case "hello":
          console.log(data.message);
          break;
        case "fetch-old-questions":
          console.log(data.questions);
          qs = [...qs, ...data.questions];
          break;
      }
    };

    socket.onclose = () => {
      alert("connection closed");
    };
  });

  onDestroy(() => {
    if (socket) {
      socket.close();
    }
  });
</script>

<div class="flex flex-col p-2 {$$restProps.class}">
  {#each qs as q}
    <div class="relative flex justify-between items-center m-1 rounded-md border bg-white hover:border-black gap-x-2">
      <span class="absolute text-xxs -top-2 px-1 left-3 italic bg-white rounded-md truncate">
        {new Date(q.updatedAt).toLocaleString()}
      </span>
      <div class="flex border border-black px-1 rounded-full items-center gap-x-1 bg-gray-50">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="white" stroke="black" class="size-4 scale-90 {q.votes < 0 && 'rotate-180'}">
          <path d="M2.09 15a1 1 0 0 0 1-1V8a1 1 0 1 0-2 0v6a1 1 0 0 0 1 1ZM5.765 13H4.09V8c.663 0 1.218-.466 1.556-1.037a4.02 4.02 0 0 1 1.358-1.377c.478-.292.907-.706.989-1.26V4.32a9.03 9.03 0 0 0 0-2.642c-.028-.194.048-.394.224-.479A2 2 0 0 1 11.09 3c0 .812-.08 1.605-.235 2.371a.521.521 0 0 0 .502.629h1.733c1.104 0 2.01.898 1.901 1.997a19.831 19.831 0 0 1-1.081 4.788c-.27.747-.998 1.215-1.793 1.215H9.414c-.215 0-.428-.035-.632-.103l-2.384-.794A2.002 2.002 0 0 0 5.765 13Z" />
        </svg>
        <span class="font-mono text-sm">{Math.abs(q.votes)}</span>
      </div>
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
        class="flex-grow order-first font-semibold p-2 peer-[&:not(:checked)]:truncate overflow-hidden"
        href={`/${courseCode}/${q.id}`}
      >
        {q.body}
      </a>
    </div>
  {/each}
  <QuestionLoader {courseCode} bind:oldest={oldest} bind:socket={socket} />
</div>