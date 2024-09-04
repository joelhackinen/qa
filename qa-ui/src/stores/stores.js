import { readable, writable } from "svelte/store";

let user = localStorage.getItem("userUuid");

if (!user) {
  user = crypto.randomUUID().toString();
  localStorage.setItem("userUuid", user);
} 

export const userUuid = readable(user);


const newQuestionStore = (defaultValue=null) => {
  const store = writable(defaultValue);

  return {
    subscribe: (run) => {
      return store.subscribe(value => {
        if (value) {
          run(value);
          store.set(defaultValue);
        }
      })
    },
    set: store.set,
  };
};

export const newQuestion = newQuestionStore();