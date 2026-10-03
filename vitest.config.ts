import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // next-auth imports `next/server` without an extension, which Node's ESM
    // resolver rejects ("Did you mean next/server.js?"). Inlined, Vite resolves it.
    server: { deps: { inline: ["next-auth"] } },
    include: ["src/**/*.test.ts"],
    // Far from UTC on purpose: date formatting must not follow the machine's
    // zone, and a test run in UTC would never notice if it did.
    env: { TZ: "Pacific/Kiritimati" },
  },
});
