<script>
  import Button from "./Button.svelte";
  import TextArea from "./TextArea.svelte";

  export let courseCode;
  let question = "";
</script>

<form
  class="flex flex-row gap-4 items-center w-full ml-1"
  action="/api/"
  method="post"
>
  <TextArea bind:body={question} id="question-input" label="Add a question to {courseCode.toUpperCase()}" maxLength=500 />
  <Button class="w-fit h-fit" />
</form>
