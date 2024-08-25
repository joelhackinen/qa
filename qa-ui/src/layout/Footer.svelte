<footer
  class="
    fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-screen-md
    transition-all
    opacity-40
    hover:opacity-100
    has-[:placeholder-shown]:[&:not(:hover)]:opacity-100
    focus-within:opacity-100
  "
>
  <div class="bg-white shadow-2xl z-10 max-w-screen-lg mx-auto border-t border-l border-r rounded-tl-3xl rounded-tr-3xl">
    <slot/>
  </div>
</footer>