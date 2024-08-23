<footer
  class="
    fixed -bottom-10 left-1/2 transform -translate-x-1/2 w-full max-w-screen-md
    hover:bottom-0
    focus-within:bottom-0
    transition-all
    opacity-35
    hover:opacity-100
    has-[:placeholder-shown]:[&:not(:hover)]:opacity-100
    focus-within:opacity-100
  "
>
  <div class="bg-white focus-within:border-blue-400 z-10 max-w-screen-lg mx-auto border-t-2 border-l-2 border-r-2 rounded-tl-3xl rounded-tr-3xl px-4 pt-4 pb-2">
    <slot/>
  </div>
</footer>