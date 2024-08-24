<script>
  const MAXLENGTH_DEFAULT = -1;

  export let id;
  export let label = "";
  export let maxLength = MAXLENGTH_DEFAULT;
  export let body;

  $: remaining = maxLength - body.length;

  const adjustHeight = ({ currentTarget }) => {
    currentTarget.style.height = "auto";
    if (currentTarget.scrollHeight > 96) {
      currentTarget.style.height = (currentTarget.scrollHeight) + "px";
      return;
    }
    currentTarget.style.height = "";
  };
</script>

<div class="relative w-full">
  <textarea
    class="
      appearance-none w-full peer resize-none text-base outline-none hover:cursor-pointer focus:cursor-text
      ring-2 ring-offset-4 ring-gray-300 focus:ring-blue-400 rounded-md
      transition-all duration-300
      h-10 focus:h-24 [&:not(:placeholder-shown)]:h-24 max-h-48
    "
    id={id}
    name={id}
    maxlength="{maxLength}"
    bind:value={body}
    on:input={adjustHeight}
    placeholder=""
    spellcheck="false"
  />
  {#if label}
    <label
      for={id}
      class="
        absolute z-10 bg-white hover:cursor-pointer peer-focus:cursor-text left-1 px-0.5 truncate
        -top-3.5 text-xs
        peer-focus:-top-3.5 peer-focus:text-xs peer-focus:left-1 peer-focus:text-black
        peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
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
        absolute bg-white font-semibold hover:cursor-text left-1 px-0.5 text-xs truncate
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