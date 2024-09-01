import { writable } from "svelte/store";

export const createWebSocketStore = (url) => {
  const { subscribe, set } = writable(null);

  /** @type {WebSocket} */
  let socket;

  const connect = () => {
    socket = new WebSocket(url);

    socket.addEventListener("open", () => {
      console.log("socket connected");
      set(socket);
    });

    socket.addEventListener("close", () => {
      console.log("socket closed");
      set(null);
    });

    socket.addEventListener("message", (e) => {
      console.log(e);
    });

    socket.addEventListener("error", (e) => {
      console.error(e);
    });
  };

  const disconnect = () => {
    if (socket) socket.close();
  };

  const send = (m) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(m));
      return;
    }
    console.log("Socket not ready")
  }

  return {
    subscribe,
    connect,
    disconnect,
    send,
  };
};

