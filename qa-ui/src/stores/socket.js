import { writable } from "svelte/store";

export const createWebSocketStore = (url) => {
  /** @type {WebSocket} */
  let socket;

  let subscribers = 0;

  const { subscribe, set } = writable(null, () => {
    if (!socket) {
      socket = new WebSocket(url);

      socket.addEventListener("open", () => {
        console.log("socket connected");
        set(socket);
      });

      socket.addEventListener("close", () => {
        console.log("socket closed");
        set(null);
        socket = null;
      });
  
      socket.addEventListener("message", (e) => {
        console.log(e);
      });
  
      socket.addEventListener("error", (e) => {
        console.error(e);
      });
    }
    subscribers += 1;

    return () => {
      subscribers -= 1;
      if (subscribers === 0 && socket) {
        socket.close();
      }
    };
  });

  const send = (m) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(m));
      return;
    }
    console.log("Socket not ready");
  };

  return {
    subscribe,
    send,
  };
};