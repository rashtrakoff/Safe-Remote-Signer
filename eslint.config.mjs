import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_" },
            ],
            "@typescript-eslint/explicit-function-return-type": "warn",
            "@typescript-eslint/no-explicit-any": "warn",
            "no-console": "warn",
            "no-var": "error",
            "prefer-const": "error",
        },
    },
    {
        ignores: [
            "dist/",
            "node_modules/",
            "coverage/",
            "*.config.js",
            "*.config.mjs",
        ],
    }
);
