<script>
  import { userUuid, newQuestion } from "../stores/stores";
  import TextArea from "./TextArea.svelte";

  export let courseCode;
  let question = "";

  const handleSendQuestion = async () => {
    const response = await fetch(`/api/questions/${courseCode}`, {
      method: "post",
      body: JSON.stringify({
        question,
      }),
      headers: {
        "Authorization": $userUuid,
      },
    });
    if (!response.ok) {
      console.error("Error");
    }
    const data = await response.json();

    question = "";
    $newQuestion = data;
  };
</script>

<div class="flex flex-row gap-2 items-center w-full px-2 py-1">
  <TextArea bind:body={question} id="question-input" label="Add a question to {courseCode.toUpperCase()}" maxLength=500 class="peer" />
  <button
    class="
      w-fit h-fit bg-slate-900 shadow-md text-white font-semibold rounded-md p-2 hover:bg-black active:shadow-none
      transition-all disabled:bg-slate-500 mb-1
    "
    disabled={!question}
    on:click={handleSendQuestion}
  >
    Send
  </button>
</div>
