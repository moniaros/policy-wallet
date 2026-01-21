import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Enforce no explicit any types
      '@typescript-eslint/no-explicit-any': 'error',

      // Enforce no unused variables (allow _ prefix for intentionally unused)
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],

      // Warn on console.log (allow console.warn and console.error)
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Enforce const over let when variable is never reassigned
      'prefer-const': 'error',

      // Enforce === over ==
      'eqeqeq': ['error', 'always'],

      // Disallow var
      'no-var': 'error',
    }
  }
];

export default eslintConfig;
