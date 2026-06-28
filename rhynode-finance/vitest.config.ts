import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths({
      // Avoid parsing native/tsconfig.json (Expo base isn't installed here).
      ignoreConfigErrors: true,
    }),
  ],
  test: {
    globals: true,
    environment: "node",
    exclude: [
      "**/node_modules/**",
      "e2e",
      "dist",
      ".next",
      "native",
      "native-legacy",
      "apps/mobile/__tests__",
      "apps/mobile/jest.config.js",
      "apps/mobile/jest.setup.js",
      "apps/mobile/maestro",
    ],
  },
});
