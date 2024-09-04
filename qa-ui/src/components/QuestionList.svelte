<script>
  import { Socket } from "../stores/socket";
  import { onDestroy, onMount } from "svelte";
  import { userUuid } from "../stores/stores";
  import VoteBox from "./VoteBox.svelte";
  import InfiniteScroller from "./InfiniteScroller.svelte";

  export let courseCode;

  /** @type {Array}*/
  export let questions;
  let oldest = "";

  $: oldest = questions.reduce((prev, curr) => (
    new Date(curr.updatedAt) < new Date(prev.updatedAt) ? curr : prev
  ), { updatedAt: "9999-12-31T23:59:59.999Z" }).updatedAt;

  onMount(() => {
    Socket.use(`/api/socket/${courseCode}?username=${$userUuid}`);

    Socket.addEventListener("message", (m) => {
      const data = JSON.parse(m.data);

      switch (data.event) {
        case "new-question":
          questions = [data.question, ...questions];
          break;
        case "fetch-questions":
          if (data.questions.length === 0) {
            oldest = undefined;
            return;
          }
          questions = [...questions, ...data.questions];
          break;
        case "send-vote":
          const vote = data.vote;
          const votedQ = questions.find(q => q.id === vote.votableId);
          if (!votedQ) return;
          const woVotedQ = questions.filter(q => q.id !== votedQ.id);
          questions = [{
            ...votedQ,
            updatedAt: vote.votedAt,
            votes: votedQ.votes+vote.voteValue,
          }, ...woVotedQ];
          break;
        case "add-answer-to-question":
          const answer = data.answer;
          const answeredQ = questions.find(q => q.id === answer.questionId);
          if (!answeredQ) return;
          const woAnsweredQ = questions.filter(q => q.id !== answeredQ.id);
          questions = [{
            ...answeredQ,
            answers: answeredQ.answers+1,
          }, ...woAnsweredQ];
          break;
      }
    });
  });

  onDestroy(() => {
    Socket.quit();
  });

  const fetchMore = () => {
    if (!oldest) return console.log("No older questions to fetch");
    Socket.send({
      event: "fetch-questions",
      courseCode,
      oldest,
    });
  };

  const handleVote = (e) => {
    Socket.send({
      event: "send-vote",
      vote: {
        userId: $userUuid,
        votableId: e.detail.votableId,
        votableType: "question",
        voteValue: e.detail.value,
      },
    });
  };
</script>

<div class="flex flex-col p-2 gap-4 {$$restProps.class}">
  {#each questions as q}
    <div class="flex flex-col border rounded-md px-4 py-6 gap-2 shadow-md hover:bg-gray-100">
      <div class="flex flex-grow items-center gap-4">
        <VoteBox item={q} on:vote={handleVote} />
        <a href={`${q.courseCode.toLowerCase()}/${q.id}`} class="font-semibold flex-grow truncate hover:underline">
          {q.body}
        </a>
      </div>
      <div class="flex justify-between items-center">
        <div class="flex flex-col truncate">
          <span class="text-xs truncate">
            last event at {new Date(q.updatedAt).toLocaleString()}
          </span>
          <span class="text-xs truncate">
            created at {new Date(q.createdAt).toLocaleString()}
          </span>
        </div>
        <a href={`${q.courseCode.toLowerCase()}/${q.id}`} class="flex items-center border border-black rounded-full p-1 gap-1 hover:bg-gray-300">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
          </svg>      
          <span class="text-sm font-semibold">
            {q.answers}
          </span>
        </a>
      </div>
    </div>
  {/each}
  <InfiniteScroller on:message={fetchMore} />
</div>