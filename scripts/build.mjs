import { rm, cp } from "node:fs/promises";
import { build } from "esbuild";
await rm("dist", { recursive: true, force: true });
await cp("public", "dist", { recursive: true });
await build({
  entryPoints: ["public/studio.js", "public/pass.js", "public/explore.js"],
  outdir: "dist",
  bundle: true,
  splitting: true,
  format: "esm",
  target: ["safari16", "chrome110"],
  minify: true,
  chunkNames: "chunks/[name]-[hash]",
  logLevel: "warning",
});
console.log("URC built with local assets and bundled team/pass modules.");
