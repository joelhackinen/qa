<script>
  import QuestionLoader from "./QuestionLoader.svelte";
  import QuestionCard from "./QuestionCard.svelte";
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

<div class="flex flex-col p-2 gap-4 {$$restProps.class}">
  {#each qs as q}
    <QuestionCard question={q} />
  {/each}
  <QuestionLoader {courseCode} bind:oldest={oldest} bind:socket={socket} />
</div>