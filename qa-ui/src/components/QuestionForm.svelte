<script>
  import Button from "./Button.svelte";
  import Input from "./Input.svelte";
  import TextArea from "./TextArea.svelte";

  let title = "";
  let question = "";
</script>

<form
  class="flex flex-col xs:flex-row gap-4 p-4"
  action="/api/"
  method="post"
>
  <div class="flex flex-col gap-y-4 w-full">
    <Input bind:body={title} id="title-input" label="Title" maxLength=50 />
    <TextArea bind:body={question} id="question-input" label="Question" maxLength=500 />
  </div>
  <Button class="w-fit" />
</form>
