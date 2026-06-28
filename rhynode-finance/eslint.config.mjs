import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  { ignores: ["native/**", "native", "native-legacy/**", "native-legacy"] },
  ...coreWebVitals,
  ...typescript,
  {
    files: [
      "src/**/*.{ts,tsx}",
      "apps/mobile/**/*.{ts,tsx}",
      "packages/shared/**/*.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["warn", { allow: ["error"] }],
    },
  },
];

export default eslintConfig;
