<script>
  import { userUuid } from "../stores/stores";
  import TextArea from "./TextArea.svelte";

  let { courseCode } = $props();
  let question = $state("");
  let resetTextAreaHeight = $state(() => {})

  const handleSendQuestion = async () => {
    const response = await fetch(`/api/questions/${courseCode}`, {
      method: "post",
      body: JSON.stringify({
        question,
      }),
      headers: {
        "user-uuid": $userUuid,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      return alert(data.error);
    }

    question = "";
    resetTextAreaHeight();
  };
</script>

<div class="flex flex-row gap-2 items-center w-full px-2 py-1">
  <TextArea bind:body={question} bind:resetTextAreaHeight={resetTextAreaHeight} id="question-input" label="Add a question to {courseCode.toUpperCase()}" maxLength=500 class="peer" />
  <button
    id="send-question-button"
    class="
      w-fit h-fit bg-slate-900 shadow-md text-white font-semibold rounded-md p-2 hover:bg-black active:shadow-none
      transition-all disabled:bg-slate-500 mb-1
    "
    disabled={!question}
    onclick={handleSendQuestion}
  >
    Send
  </button>
</div>
