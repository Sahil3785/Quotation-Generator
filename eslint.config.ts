import type { Linter } from "eslint";
import nextPlugin from "@next/eslint-plugin-next";

const config: Linter.Config = {
  extends: ["next/core-web-vitals", "eslint:recommended"],
  plugins: {
    "@next/next": nextPlugin,
  },
  rules: {
    "@next/next/no-html-link-for-pages": "off",
  },
};

export default config;
