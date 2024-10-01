import globals from "globals";
import eslint from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";


export default [
    {
        // Global ignores 
        // https://eslint.org/docs/latest/use/configure/configuration-files#configuration-objects
        ignores: [
            "node_modules",
            "dist",
            "build",
            "demo.js",
            "webpack.config.js",
        ],
    },
    {
        files: ["**/*.{js,mjs,cjs,ts}"],
        languageOptions: {
            globals: globals.browser,
        },
    },
    {
        plugins: {
            "@stylistic": stylistic,
        },
        rules: {
            "@stylistic/indent": ["error", 4],
            "@stylistic/quotes": ["error", "double"],
            "@stylistic/semi": ["error", "always"],
        }

    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
];
