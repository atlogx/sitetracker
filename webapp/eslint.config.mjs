import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import nextPlugin from "@next/eslint-plugin-next";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "next-env.d.ts",
      "*.config.js",
      "*.config.ts",
      ".vercel/**",
      "coverage/**",
      // Nuxt artifacts (phantom files) - completely ignore
      ".nuxt/**",
      "plugins/**/*",
      "composables/**/*", 
      "server/api/**/*",
      "app/**/*",
      "app/app.vue",
      "plugins/css.client.ts",
      "plugins/pinia.client.ts",
      "composables/useSupabaseClient.ts",
      "server/api/companies/index.post.ts",
      "server/api/projects/index.post.ts",
      "scripts/check-schema.js",
      "scripts/pre-deploy.js",
      "src/app/suivi/page.tsx",
      // Scripts and other artifacts
      "scripts/**",
      "*.lock",
      "*.log",
      ".cache/**",
      ".turbo/**",
      "*.tsbuildinfo",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      "@next/next": nextPlugin
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-require-imports": "off",
      "prefer-const": "off"
    },
    settings: {
      "import/resolver": {
        "typescript": {
          "project": "./tsconfig.json"
        },
        "node": {
          "extensions": [".js", ".jsx", ".ts", ".tsx"]
        }
      }
    }
  },
];

export default eslintConfig;
