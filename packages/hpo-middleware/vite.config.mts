import { builtinModules } from "node:module";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const root = fileURLToPath(new URL(".", import.meta.url));
const entry = fileURLToPath(new URL("src/index.ts", import.meta.url));

const nodeBuiltins = [
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
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
      external: [...nodeBuiltins, /^@threevl\/hpo-lib(\/|$)/],
    },
  },
});
