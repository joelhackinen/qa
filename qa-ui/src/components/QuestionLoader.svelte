<script>
  import { onDestroy, onMount } from "svelte";

  export let courseCode;
  export let oldest;
  export let socket;
  let targetElement; // This will hold the reference to the DOM element
  let isVisible = false; // Reactive variable to track visibility status
  let oldestEntryFound = false;
  let observer;

  const fetchMore = () => {
    console.log(oldest);
    if (oldestEntryFound) return;
    if (!socket || socket.readyState !== 1) return;

    socket.send(JSON.stringify({
      event: "fetch-questions",
      courseCode,
      oldest,
    }));
  };

  const startObserving = () => {
    // Create a new IntersectionObserver instance
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const wasVisible = isVisible;
        isVisible = entry.isIntersecting; // Update the visibility status

        // Log to the console if the element becomes visible
        if (isVisible && !wasVisible) {
          console.log('Element has become visible in the viewport.');
          fetchMore();
        }
      });
    });

    if (targetElement) {
      observer.observe(targetElement); // Start observing the target element
    }
  };

  onMount(() => { 
    socket.onopen = () => {
      startObserving();
    };
  });

  onDestroy(() => {
    if (targetElement) {
      observer.unobserve(targetElement); // Clean up observer on component unmount
    }
  })
</script>


<div class="bg-white h-72" bind:this={targetElement} />