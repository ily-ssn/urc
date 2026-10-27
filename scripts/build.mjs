import { rm, cp, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import { pages, pageHtml } from "./pages.mjs";
await rm("dist", { recursive: true, force: true });
await cp("public", "dist", { recursive: true });
for (const key of Object.keys(pages))
  await writeFile(`dist/${key === "home" ? "index" : key}.html`, pageHtml(key));
await build({
  entryPoints: ["public/studio.js", "public/pass.js", "public/site.js"],
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
