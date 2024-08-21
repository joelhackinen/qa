<script>
  const MAXLENGTH_DEFAULT = -1;

  export let body;  // mandatory
  export let id;    // mandatory
  export let maxLength = MAXLENGTH_DEFAULT;  // optional
  export let label = "";

  $: remaining = maxLength - body.length;
</script>

<div class="w-full relative {remaining === 0 ? 'animate-shake' : ''}">
  <input
    id={id}
    class="block appearance-none focus:ring-0 peer {maxLength !== MAXLENGTH_DEFAULT ? 'pl-3 pr-7' : 'px-3'} py-2 bg-transparent rounded-lg border:gray-500 border-2 disabled:opacity-50 disabled:cursor-not-allowed {$$restProps.class}"
    bind:value={body}
    maxLength={`${maxLength !== MAXLENGTH_DEFAULT ? maxLength : ''}`}
    placeholder=""
  />
  {#if label}
    <label
      for={id}
      class="absolute hover:cursor-text duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] px-2 peer-focus:px-2 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1 bg-white font-semibold"
    >
      {label}
    </label>
  {/if}
  {#if maxLength !== MAXLENGTH_DEFAULT}
    <label
      class={`absolute hover:cursor-text top-2 z-10 px-2 left-48 bg-white font-semibold
      ${remaining === 0 ? 'text-red-600' : 'text-gray-500'}`}
      for={id}
    >
      {remaining}
    </label>
  {/if}
</div>