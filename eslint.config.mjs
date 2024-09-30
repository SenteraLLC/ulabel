import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    ignores: ["node_modules", "dist", "build", "demo.js", "webpack.config.js"],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
        "sort-imports": "error",
    }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];
