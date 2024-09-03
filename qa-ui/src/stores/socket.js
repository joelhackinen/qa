const reopenTimeouts = [2000, 5000, 10000, 30000, 60000];

export const Socket = (() => {
  /** @type {WebSocket} */
  let socket, openPromise, reopenTimeoutHandler, connectionUrl;
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
    if (socket) return;

    console.log("Opening WebSocket connection to:", url);
    socket = new WebSocket(url);

    socket.addEventListener("close", (_) => {
      console.log("WebSocket closed")
      reopen(url);
    });

    openPromise = new Promise((resolve, reject) => {
      socket.addEventListener("error", (error) => {
        reject(error);
        openPromise = undefined;
        console.error("Opening WebSocket failed");
      });
      socket.addEventListener("open", (_) => {
        reopenCount = 0;
        resolve();
        openPromise = undefined;
        connectionUrl = url;
        console.log("WebSocket connected to:", url);
      });
    });
    return openPromise;
  };

  const reopen = (connectionUrl) => {
    console.log("Trying to reopen WebSocket to", connectionUrl);
    close();
    if (subscriptions > 0) {
      reopenTimeoutHandler = setTimeout(() => open(connectionUrl), reopenTimeout());
    }
  };

  const close = () => {
    if (reopenTimeoutHandler) {
      clearTimeout(reopenTimeoutHandler);
    }
    console.log("Closing WebSocket");
    if (socket) {
      socket.close();
      socket = undefined;
      connectionUrl = undefined;
    }
    console.log("WebSocket closed");
  };

  return {
    send: (value) => {
      const send = () => socket.send(JSON.stringify(value));
      if (socket.readyState !== WebSocket.OPEN) open().then(send);
      else send();
    },
    connect: (url) => {
      subscriptions++;
      open(url);
    },
    disconnect: () => {
      subscriptions--;
      if (subscriptions === 0) {
        close();
      }
    },
    addEventListener: (event, callback) => {
      const addListener = () => socket.addEventListener(event, callback);
      if (socket.readyState !== WebSocket.OPEN) open().then(addListener);
      else addListener();
    },
  };
})();