<script>
  const INDEX_NAME = "courses";
  export let pathname = "/";

  const slicedPath = pathname.slice(1, pathname.length);

  const parts = slicedPath === "" ? [INDEX_NAME] : [INDEX_NAME, ...slicedPath.split("/")];
</script>

<div class="flex flex-nowrap font-semibold gap-1 p-4 items-center">
  {#each parts as part, i}
    /
    <a
      class={`bg-gray-400 rounded-md px-1 ${i === parts.length-1 && "underline"} whitespace-nowrap`}
      href={"/" + parts.slice(1, i+1).join("/")}
    >
      {part}
    </a>
  {/each}
</div>