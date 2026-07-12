import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import typescriptParser from "@typescript-eslint/parser";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";

export default [
    {
        ignores: [".next/**/*", "node_modules/**/*", "public/**/*", ".ds-sync/**/*", "ds-bundle/**/*", ".design-sync/.cache/**/*", "playwright-report/**/*", "test-results/**/*", "playwright/.auth/**/*"],
    },
    js.configs.recommended,
    {
        files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.mjs"],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaFeatures: { jsx: true },
                ecmaVersion: "latest",
                sourceType: "module",
            },
        },
        plugins: {
            "@typescript-eslint": typescriptPlugin,
            "react": reactPlugin,
            "react-hooks": hooksPlugin,
            "@next/next": nextPlugin,
        },
        rules: {
            // TypeScript rules
            ...typescriptPlugin.configs.recommended.rules,

            // React rules
            ...reactPlugin.configs.recommended.rules,
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",

            // Hooks rules
            ...hooksPlugin.configs.recommended.rules,

            // Next.js rules
            ...nextPlugin.configs.recommended.rules,
            "@next/next/no-img-element": "off",

            // Custom overrides
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "no-console": "off",
            "react/no-unescaped-entities": "off",
            "react-hooks/exhaustive-deps": "off",
            "no-undef": "off",
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/set-state-in-effect": "off",
            "react-hooks/purity": "off",
            "@typescript-eslint/no-require-imports": "off",
            "react/no-unknown-property": ["error", { "ignore": ["jsx", "global"] }],
            "no-case-declarations": "off",
        },
        settings: {
            react: {
                version: "detect",
            },
        },
    },
];
