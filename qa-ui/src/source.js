const reopenTimeouts = [2000, 5000, 10000, 30000, 60000];

export const Source = (() => {
  /** @type {EventSource} */
  let source, openPromise, reopenTimeoutHandler;
  let reopenCount = 0;
  let subscriptions = 0;

  const reopenTimeout = () => {
    const n = reopenCount;
    reopenCount++;
    return reopenTimeouts[
      n >= reopenTimeouts.length - 1 ? reopenTimeouts.length - 1 : n
    ];
  }

  const open = (url) => {
    if (reopenTimeoutHandler) {
      clearTimeout(reopenTimeoutHandler);
      reopenTimeoutHandler = undefined;
    }

    if (openPromise) return openPromise;
    if (source) return;

    console.log("Opening SSE connection to:", url);
    source = new EventSource(url);

    source.addEventListener("close", (_) => {
      console.log("SSE closed")
      reopen(url);
    });

    source.addEventListener("hello", (e) => {
      console.log(e.data);
    });

    source.addEventListener("message", (m) => {
      const data = JSON.parse(m.data);
      switch (data.event) {
        case "error":
          alert(data.message);
          break;
      }
    });

    openPromise = new Promise((resolve, reject) => {
      source.addEventListener("error", (error) => {
        reject(error);
        openPromise = undefined;
        console.error("Opening SSE failed");
      });
      source.addEventListener("open", (_) => {
        reopenCount = 0;
        resolve();
        openPromise = undefined;
        console.log("SSE connected to:", url);
      });
    });
    return openPromise;
  };

  const reopen = (url) => {
    console.log("Trying to reopen SSE to", url);
    close();
    if (subscriptions > 0) {
      reopenTimeoutHandler = setTimeout(() => open(url), reopenTimeout());
    }
  };

  const close = () => {
    if (reopenTimeoutHandler) {
      clearTimeout(reopenTimeoutHandler);
    }
    console.log("Closing SSE");
    if (source) {
      source.close();
      source = undefined;
    }
    console.log("SSE closed");
  };

  return {
    send: (value) => {
      const send = () => source.send(JSON.stringify(value));
      if (source.readyState !== EventSource.OPEN) open().then(send);
      else send();
    },
    use: (url) => {
      subscriptions++;
      open(url);
    },
    quit: () => {
      subscriptions--;
      if (subscriptions === 0) {
        close();
      }
    },
    addEventListener: (event, callback) => {
      const addListener = () => source.addEventListener(event, callback);
      if (source.readyState !== EventSource.OPEN) open().then(addListener);
      else addListener();
    },
  };
})();