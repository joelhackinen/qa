<script>
  import { onMount } from "svelte";
  import { userUuid } from "../stores/stores";
    import VoteBox from "./VoteBox.svelte";
  export let answers;
  export let questionId;

  const socket = new WebSocket(
    `/api/socket/${questionId}?username=${$userUuid}`,
  );

  onMount(() => {
    socket.onopen = () => {
      console.log("yay")
    };

    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      console.log(data)
      
      switch (data.event) {
        case "answer":
          console.log("here")
          answers = [data.answer, ...answers];
          break;
        case "hello":
          console.log(data);
          break;
      }
    };
  });
</script>

<div class="flex flex-col ml-8 mt-4 gap-3">
  <h1 class="text-md font-semibold">Answers</h1>
  {#each answers as a}
    <div class="flex items-center border rounded-md">
      <VoteBox item={a} />
      <span class="">
        {a.body}
      </span>
    </div>
  {/each}
</div>