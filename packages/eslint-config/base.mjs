import { defineConfig, globalIgnores } from "eslint/config";

export const baseConfig = defineConfig([
  globalIgnores([
    "node_modules/**",
    "dist/**",
    ".next/**",
    "out/**",
    "build/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/test/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default baseConfig;
