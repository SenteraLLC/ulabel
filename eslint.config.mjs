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
    stylistic.configs.customize(
        {
            commaDangle: "always-multiline",
            indent: 4,
            quotes: "double",
        },
    ),
    {
        plugins: {
            "@stylistic": stylistic,
        },
        rules: {
            "@stylistic/array-element-newline": [
                "error",
                {
                    consistent: true,
                    multiline: true,
                },
            ],
            "@stylistic/function-call-argument-newline": ["error", "consistent"],
            "@stylistic/function-call-spacing": ["error", "never"],
            "@stylistic/semi": ["error", "always"],
        },

    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
];
