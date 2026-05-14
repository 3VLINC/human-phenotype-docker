import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const root = fileURLToPath(new URL(".", import.meta.url));
const entry = fileURLToPath(new URL("src/index.ts", import.meta.url));

const external = [
  "express",
  /^express\//,
  "swagger-ui-express",
  /^swagger-ui-express\//,
  /^@threevl\/hpo-express(\/|$)/,
  /^@threevl\/hpo-lib(\/|$)/,
];

export default defineConfig({
  root,
  plugins: [
    dts({
      tsconfigPath: "tsconfig.json",
      rollupTypes: true,
      insertTypesEntry: true,
    }),
  ],
  build: {
    minify: false,
    target: "node18",
    lib: {
      entry,
      formats: ["cjs"],
      fileName: () => "index.js",
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external,
    },
  },
});
