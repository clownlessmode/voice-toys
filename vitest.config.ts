import { defineConfig } from "vitest/config";
import { resolve } from "path";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    test: {
      environment: "jsdom",
      setupFiles: ["./test/setup.ts"],
      include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
      exclude: ["node_modules", "dist", ".next"],
      globals: true,
      env: {
        ...env,
        // Allow CI and local safety runs to isolate Prisma from the developer database.
        ...(process.env.DATABASE_URL ? { DATABASE_URL: process.env.DATABASE_URL } : {}),
      },
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
  };
});
