<script>
  const MAXLENGTH_DEFAULT = -1;

  export let id;
  export let label = "";
  export let maxLength = MAXLENGTH_DEFAULT;
  export let body;

  $: remaining = maxLength - body.length;

  const adjustHeight = ({ currentTarget }) => {
    currentTarget.style.height = "auto";
    currentTarget.style.height = (currentTarget.scrollHeight) + "px";
  };
</script>

<div class="relative">
  <textarea
    class="appearance-none w-full peer border-2 rounded-md p-2 overflow-y-auto resize-none max-h-48 text-sm"
    id={id}
    name={id}
    maxlength="{maxLength}"
    on:input={adjustHeight}
    bind:value={body}
    placeholder=""
  />
  {#if label}
    <label
      for={id}
      class="
        absolute z-10 bg-white font-semibold hover:cursor-text left-1 px-1
        -top-2.5 scale-75
        peer-focus:-top-2.5 peer-focus:scale-75 peer-focus:left-0
        peer-placeholder-shown:top-2 peer-placeholder-shown:scale-100
        transition-all
      "
    >
      {label}
    </label>
  {/if}
  {#if maxLength !== MAXLENGTH_DEFAULT}
    <label
      for={id}
      class="
        absolute bg-white font-semibold hover:cursor-text left-1 px-1 scale-75
        top-auto -bottom-2
        peer-focus:top-auto peer-focus:-bottom-2
        peer-placeholder-shown:top-2 peer-placeholder-shown:bottom-auto
        transition-all
      "
    >
      {remaining}
    </label>
  {/if}
</div>