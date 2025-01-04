import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    ignores: ["node_modules/**"],
  },
  {
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "no-unused-expressions": "warn",
      "no-unused-labels": "warn",
    },
  },
];
