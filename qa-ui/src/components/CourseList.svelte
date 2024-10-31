<script>
  let { courses } = $props();
</script>

<div class="flex flex-col p-2">
  {#each courses as course}
    <a
      id={course.code + "-link"}
      class="m-2 border-2 px-2 py-4 rounded-md hover:bg-gray-300 text-left"
      href={`/${course.code.toLowerCase()}`}
    >
      <span class="text-gray-500 font-bold">
        {course.code}
      </span>
      <span class="font-semibold">
        {course.name}
      </span>
    </a>
  {/each}
</div>