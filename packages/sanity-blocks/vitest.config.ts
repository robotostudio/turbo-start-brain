import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@workspace\/sanity-blocks$/,
        replacement: path.resolve(__dirname, "src/sanity-blocks.ts"),
      },
      {
        find: /^@workspace\/sanity-blocks\/(.*)$/,
        replacement: `${path.resolve(__dirname, "src")}/$1`,
      },
      {
        find: "@workspace/logger",
        replacement: path.resolve(__dirname, "../logger/src/index.ts"),
      },
      {
        find: "lucide-react/dynamic",
        replacement: path.resolve(
          __dirname,
          "src/internal/testing/lucide-react-dynamic.mock.tsx"
        ),
      },
      {
        find: "lucide-react",
        replacement: path.resolve(
          __dirname,
          "src/internal/testing/lucide-react.mock.tsx"
        ),
      },
      {
        find: "next/link",
        replacement: path.resolve(
          __dirname,
          "src/internal/testing/next-link.mock.tsx"
        ),
      },
    ],
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
