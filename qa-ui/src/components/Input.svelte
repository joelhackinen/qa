<script>
  const MAXLENGTH_DEFAULT = -1;

  export let id;
  export let label = "";
  export let maxLength = MAXLENGTH_DEFAULT;
  export let body;

  $: remaining = maxLength - body.length;
</script>

<div class="relative">
  <input
    id={id}
    name={id}
    type="text"
    class="appearance-none w-full peer border-2 rounded-md p-2 placeholder-transparent text-sm"
    placeholder=""
    maxlength="{maxLength}"
    bind:value={body}
  />
  {#if label}
    <label
      for={id}
      class="
        absolute z-10 bg-white font-semibold hover:cursor-text left-1 px-0.5
        -top-2 text-xs
        peer-focus:-top-2 peer-focus:text-xs
        peer-placeholder-shown:top-2 peer-placeholder-shown:text-base
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
        absolute bg-white font-semibold hover:cursor-text left-1 px-0.5 text-xs
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