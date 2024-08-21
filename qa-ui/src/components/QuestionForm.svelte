<script>
  import FloatingLabelInput from "./FloatingLabelInput.svelte";
  import Input from "./Input.svelte";

  let title = "";


</script>

<div class="p-4">
  <FloatingLabelInput bind:body={title} id="test" label="Title" />
</div>
