import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      "native/**",
      "native",
      "native-legacy/**",
      "native-legacy",
      "apps/mobile/metro.config.js",
      "apps/mobile/tailwind.config.js",
      "apps/mobile/vendor/**",
      "apps/mobile/android/**",
      "apps/mobile/ios/**",
      "apps/mobile/.expo/**",
      "apps/mobile/dist/**",
      "apps/mobile/app-debug*.apk",
      "apps/mobile/app-release*.apk",
      "**/*.d.ts",
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    files: [
      "src/**/*.{ts,tsx}",
      "apps/mobile/**/*.{ts,tsx}",
      "packages/shared/**/*.{ts,tsx}",
      "scripts/generate-vapid-keys.ts",
      "scripts/reset-user-data.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["warn", { allow: ["error"] }],
    },
  },
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
