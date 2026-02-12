import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    cloudflare({
      configPath: "./wrangler.jsonc",
      inspectorPort: false,
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "./shared"),
    },
  },
  ssr: {
    target: "webworker",
  },
});
