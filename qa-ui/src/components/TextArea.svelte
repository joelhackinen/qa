<script>
  export let id;
  export let label;
  export let maxLength;
  export let body;
  export let focusHeight = 120;

  $: remaining = maxLength - body.length;

  const adjustHeight = ({ currentTarget }) => {
    currentTarget.style.height = "auto";
    if (currentTarget.scrollHeight > focusHeight) {
      currentTarget.style.height = (currentTarget.scrollHeight) + "px";
      return;
    }
    currentTarget.style.height = "";
  };
</script>

<div class="relative w-full px-2 py-4 truncate {$$restProps.class}">
  <textarea
    style="--focus-height: {focusHeight}px"
    class="
      appearance-none w-full peer resize-none text-base outline-none hover:cursor-pointer focus:cursor-text
      ring-1 ring-offset-4 ring-gray-300 focus:ring-blue-400 rounded-md
      transition-all duration-200 focus:delay-100
      h-8 focus:h-[var(--focus-height)] [&:not(:placeholder-shown)]:h-[var(--focus-height)] max-h-60
    "
    id={id}
    name={id}
    maxlength="{maxLength}"
    bind:value={body}
    on:input={adjustHeight}
    placeholder=""
    spellcheck="false"
  />
  <label
    for={id}
    class="
      absolute z-10 bg-white hover:cursor-pointer peer-focus:cursor-text left-4 px-0.5 truncate
      top-0.5 text-xs
      peer-focus:top-0.5 peer-focus:text-xs peer-focus:text-black
      peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
      transition-all duration-100
      peer-[&:not(:focus)]:delay-200
    "
  >
    {label}
  </label>
  <label
    for={id}
    class="
      absolute bg-white font-semibold hover:cursor-text px-0.5 text-xs truncate
      bottom-2 left-4
      peer-[&:not(:focus)]:peer-placeholder-shown:hidden
    "
  >
    {remaining}
  </label>
</div>