<script>
  import { userUuid } from "../stores/stores";
  import TextArea from "./TextArea.svelte";

  let { courseCode, questionId } = $props();
  let answer = $state("");
  let resetTextAreaHeight = $state(() => {})

  const handleSendAnswer = async () => {
    const response = await fetch(`/api/answers/${questionId}`, {
      method: "post",
      body: JSON.stringify({
        courseCode,
        questionId,
        answer,
      }),
      headers: {
        "user-uuid": $userUuid,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      return alert(data.error);
    }

    answer = "";
    resetTextAreaHeight();
  };
</script>

<div class="flex flex-row gap-2 items-center w-full px-2 py-1">
  <TextArea bind:body={answer} bind:resetTextAreaHeight={resetTextAreaHeight} id="answer-input" label="Answer to this question" maxLength=500 class="peer" />
  <button
    class="
      w-fit h-fit bg-slate-900 shadow-md text-white font-semibold rounded-md p-2 hover:bg-black active:shadow-none
      transition-all disabled:bg-slate-500 mb-1
    "
    id="send-answer-button"
    disabled={!answer}
    onclick={handleSendAnswer}
  >
    Send
  </button>
</div>