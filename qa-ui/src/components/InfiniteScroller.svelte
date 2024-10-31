<script>
  import { onDestroy, onMount } from "svelte";

  let { onVisible } = $props();
  let targetElement = $state(); // This will hold the reference to the DOM element
  let isVisible = $state(false); // Reactive variable to track visibility status

  /** @type {IntersectionObserver} */
  let observer = $state();

  const startObserving = () => {
    // Create a new IntersectionObserver instance
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const wasVisible = isVisible;
        isVisible = entry.isIntersecting; // Update the visibility status

        // Log to the console if the element becomes visible
        if (isVisible && !wasVisible) {
          console.log("Element has become visible in the viewport.");
          onVisible();
        }
      });
    });

    if (targetElement) {
      observer.observe(targetElement); // Start observing the target element
    }
  };

  onMount(() => {
    startObserving();
  });

  onDestroy(() => {
    if (targetElement) {
      observer.unobserve(targetElement); // Clean up observer on component unmount
    }
  });
</script>


<div class="flex flex-col bg-white h-72" >
  <div class="flex-grow" ></div>
  <div bind:this={targetElement} ></div>
</div>