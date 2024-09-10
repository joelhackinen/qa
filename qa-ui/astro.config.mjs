import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";

const makeDevConfig = () => {
  return defineConfig({
    integrations: [svelte(), tailwind()],
    server: {
      port: 3000,
      host: true
    },
    output: "server",
  });
};

const makeProdConfig = async () => {
  const node = (await import("@astrojs/node")).default;

  return defineConfig({
    integrations: [svelte(), tailwind()],
    server: {
      port: 3000,
    },
    output: "server",
    adapter: node({
      mode: "standalone",
    }),
  });
};

export default import.meta.env.DEV ? makeDevConfig() : await makeProdConfig();