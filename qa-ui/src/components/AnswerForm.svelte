<script>
  import { newAnswer, userUuid } from "../stores/stores";
  import TextArea from "./TextArea.svelte";

  export let courseCode;
  export let questionId;
  let answer = "";

  const handleSendAnswer = async () => {
    const response = await fetch(`/api/answers/${questionId}`, {
      method: "post",
      body: JSON.stringify({
        courseCode,
        questionId,
        answer,
      }),
      headers: {
        "Authorization": $userUuid,
      },
    });
    if (!response.ok) {
      console.error("Error");
    }
    const data = await response.json();
    $newAnswer = data;
    answer = "";
  };
</script>

<div class="flex flex-row gap-2 items-center w-full px-2 py-1">
  <TextArea bind:body={answer} id="answer-input" label="Answer to this question" maxLength=500 class="peer" />
  <button
    class="
      w-fit h-fit bg-slate-900 shadow-md text-white font-semibold rounded-md p-2 hover:bg-black active:shadow-none
      transition-all disabled:bg-slate-500 mb-1
    "
    disabled={!answer}
    on:click={handleSendAnswer}
  >
    Send
  </button>
</div>