<script>
  import { onDestroy, onMount } from "svelte";
  import { userUuid } from "../stores/stores";
  import { Socket } from "../stores/socket";
  import VoteBox from "./VoteBox.svelte";
    import InfiniteScroller from "./InfiniteScroller.svelte";

  /** @type {Array}*/
  export let answers;
  export let questionId;

  let oldest = "";

  $: oldest = answers.reduce((prev, curr) => (
    new Date(curr.updatedAt) < new Date(prev.updatedAt) ? curr : prev
  ), { updatedAt: "9999-12-31T23:59:59.999Z" }).updatedAt;

  onMount(() => {
    Socket.use(`/api/socket/${questionId}?username=${$userUuid}`);
    
    Socket.addEventListener("message", (m) => {
      const data = JSON.parse(m.data);
      
      switch (data.event) {
        case "new-answer":
          answers = [{ ...data.answer, votes: 0 }, ...answers];
          break;
        case "send-vote":
          const votedA = answers.find(a => a.id === data.vote.votableId);
          if (!votedA) return;
          const woVotedA = answers.filter(a => a.id !== data.vote.votableId);
          answers = [{
            ...votedA,
            votes: votedA.votes+data.vote.voteValue,
            updatedAt: data.vote.votedAt,
          }, ...woVotedA];
          break;
        case "fetch-answers":
          if (data.answers.length === 0) {
            oldest = undefined;
            return;
          }
          answers = [...answers, ...data.answers];
          break;
      }
    });
  });

  onDestroy(() => {
    Socket.quit();
  });

  const handleVote = (e) => {
    Socket.send({
      event: "send-vote",
      vote: {
        userId: $userUuid,
        votableId: e.detail.votableId,
        votableType: "answer",
        voteValue: e.detail.value,
      },
    });
  };

  const fetchMore = () => {
    if (!oldest) return console.log("No older questions to fetch");
    Socket.send({
      event: "fetch-answers",
      questionId,
      oldest,
    });
  };
</script>

<div class="flex flex-col ml-8 mt-4">
  <h1 class="text-md font-semibold">Answers</h1>
  {#each answers as a}
    <div class="relative py-1">
      <div class="flex gap-x-2 items-center border rounded-md px-2 py-1 shadow-md">
        <VoteBox item={a} on:vote={handleVote} />
        <div class="break-words">
          {a.body}
        </div>
      </div>
      <div class="absolute -bottom-0.5 left-10 bg-white rounded-lg px-1 text-xs truncate shadow-md">
        {new Date(a.updatedAt).toLocaleString()}
      </div>
    </div>
  {/each}
  <InfiniteScroller on:message={fetchMore} />
</div>