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
            arrowParens: true,
            braceStyle: "1tbs",
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
            "@stylistic/member-delimiter-style": [
                "error",
                {
                    multiline: {
                        delimiter: "semi",
                        requireLast: true,
                    },
                    singleline: {
                        delimiter: "semi",
                        requireLast: false,
                    },
                    multilineDetection: "brackets",
                },
            ],
            "@stylistic/operator-linebreak": ["error", "after"],
            "@stylistic/semi": ["error", "always"],
        },

    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        // Special configuration for test files - placed last to override other configs
        files: ["tests/**/*.{js,mjs,cjs,ts}", "jest.config.js", "playwright.config.js"],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.jest,
                require: "readonly",
                module: "readonly",
                global: "readonly",
                process: "readonly",
                describe: "readonly",
                test: "readonly",
                it: "readonly",
                expect: "readonly",
                beforeEach: "readonly",
                afterEach: "readonly",
                beforeAll: "readonly",
                afterAll: "readonly",
                jest: "readonly",
            },
        },
        rules: {
            // Allow require() imports in tests (needed for CommonJS module loading)
            "@typescript-eslint/no-require-imports": "off",
            // Allow no-undef for Node.js and Jest globals
            "no-undef": "off",
            // Allow unused variables in tests (for mocking scenarios)
            "@typescript-eslint/no-unused-vars": "warn",
            // Allow unused expressions in test setup (for side effects)
            "@typescript-eslint/no-unused-expressions": "off",
        },
    },
];
