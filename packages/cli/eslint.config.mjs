import { dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const compat = new FlatCompat({ baseDirectory: __dirname, recommendedConfig: js.configs.recommended });
export default [
  ...compat.config(require("@primer/config/eslint/preset")),
  {
    languageOptions: {
      globals: { process: "readonly", fetch: "readonly", Response: "readonly", console: "readonly" },
    },
  },
];
