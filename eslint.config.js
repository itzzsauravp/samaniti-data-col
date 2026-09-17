import tsPlugin from "@typescript-eslint/eslint-plugin";
import prettierConfig from "eslint-config-prettier";

export default [
    {
        ignores: ["node_modules/**", "dist/**", "coverage/**", "storage/**", "src/web/**"],
    },
    ...tsPlugin.configs["flat/recommended"],
    prettierConfig,
    {
        rules: {
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },
];
