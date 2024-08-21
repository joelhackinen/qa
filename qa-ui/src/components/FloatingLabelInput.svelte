<script>
  export let id;
  export let label;
</script>

<div class="relative">
  <input
    id={id}
    type="text"
    class="w-full peer border-2 rounded-md p-2"
    placeholder=""
  />
  <label
    for={id}
    class="
      absolute z-10 bg-white font-semibold
      -top-2.5 left-1 scale-75 px-1
      peer-focus:-top-2.5 peer-focus:left-1 peer-focus:scale-75 peer-focus:px-1
      peer-placeholder-shown:top-2 peer-placeholder-shown:left-2 peer-placeholder-shown:scale-100
      transition-all
    "
  >
    {label}
  </label>
  <label
    for={id}
    class="
      absolute bg-white font-semibold
      top-8 left-1 scale-75 px-1
      peer-focus:top-8 peer-focus:left-1 peer-focus:scale-75 peer-focus:px-1
      peer-placeholder-shown:top-2 peer-placeholder-shown:left-2 peer-placeholder-shown:scale-100
      transition-all 
    "
  >
    50
  </label>
</div>