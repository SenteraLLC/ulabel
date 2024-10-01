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
            "@stylistic/array-element-newline": [
                "error",
                {
                    "consistent": true,
                    "multiline": true,
                },
            ],
            "@stylistic/block-spacing": ["error", "always"],
            "@stylistic/brace-style": ["error", "1tbs"],
            "@stylistic/comma-dangle": ["error", "always-multiline"],
            "@stylistic/comma-spacing": [
                "error",
                {
                    before: false,
                    after: true,
                },
            ],
            "@stylistic/comma-style": ["error", "last"],
            "@stylistic/dot-location": ["error", "property"],
            "@stylistic/eol-last": ["error", "always"],
            "@stylistic/function-call-argument-newline": ["error", "consistent"],
            "@stylistic/function-call-spacing": ["error", "never"],
            "@stylistic/indent": ["error", 4],
            "@stylistic/quotes": ["error", "double"],
            "@stylistic/semi": ["error", "always"],
        },

    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
];
