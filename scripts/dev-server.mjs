import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const root = path.resolve("dist"),
  port = Number(process.env.PORT || 5200);
const settings = JSON.parse(await readFile("vercel.json", "utf8"));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".ttf": "font/ttf",
};
http
  .createServer(async (req, res) => {
    for (const h of settings.headers[0].headers) res.setHeader(h.key, h.value);
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (pathname.startsWith("/api/")) {
        const name = pathname.slice(5);
        if (
          ![
            "content",
            "register",
            "pass",
            "studio/config",
            "studio/invite",
          ].includes(name)
        ) {
          res.writeHead(404).end();
          return;
        }
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 16384) {
            res.writeHead(413).end();
            return;
          }
        }
        try {
          req.body = body ? JSON.parse(body) : {};
        } catch {
          res.writeHead(400).end();
          return;
        }
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (data) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        };
        const { default: handler } = await import(
          pathToFileURL(path.resolve("api", name + ".js"))
        );
        await handler(req, res);
        return;
      }
      let file =
        pathname === "/"
          ? "index.html"
          : /\.[a-z0-9]+$/i.test(pathname)
            ? pathname.slice(1)
            : /\/(events|gallery|impact|partners)(\/|$)/.test(pathname)
              ? "explore.html"
              : pathname.slice(1) + ".html";
      const resolved = path.resolve(root, file);
      if (!resolved.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      const data = await readFile(resolved);
      res.setHeader(
        "Content-Type",
        types[path.extname(file)] || "application/octet-stream",
      );
      if (file === "pass.html" || file === "studio.html") {
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Referrer-Policy", "no-referrer");
      }
      res.end(data);
    } catch (error) {
      res
        .writeHead(error.code === "ENOENT" ? 404 : 500, {
          "Content-Type": "text/plain",
        })
        .end(
          error.code === "ENOENT"
            ? "Page not found."
            : "This request could not be completed.",
        );
    }
  })
  .listen(port, "0.0.0.0", () =>
    console.log(`URC review server ready on port ${port}`),
  );
