import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const sourceFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "service-worker.js",
  "assets/icon.svg"
];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png"
};

await rm("dist", { recursive: true, force: true });
await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });

const assets = {};
for (const file of sourceFiles) {
  const buffer = await readFile(file);
  const route = `/${file}`;
  assets[route] = {
    contentType: mimeTypes[extname(file)] || "application/octet-stream",
    body: buffer.toString("base64")
  };
}

assets["/"] = assets["/index.html"];

const server = `const assets = ${JSON.stringify(assets)};

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function headersFor(asset) {
  const headers = new Headers({
    "content-type": asset.contentType,
    "cache-control": asset.contentType.startsWith("text/html")
      ? "no-cache"
      : "public, max-age=31536000, immutable"
  });

  if (asset.contentType.includes("javascript") || asset.contentType.includes("manifest")) {
    headers.set("cache-control", "no-cache");
  }

  return headers;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) {
      pathname += "index.html";
    }

    const asset = assets[pathname] || (pathname.includes(".") ? null : assets["/index.html"]);
    if (!asset) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(decodeBase64(asset.body), {
      headers: headersFor(asset)
    });
  }
};
`;

await writeFile(join("dist", "server", "index.js"), server);
await writeFile(
  join("dist", ".openai", "hosting.json"),
  JSON.stringify({
    project_id: "appgprj_6a592d3a99c4819197f0d2dd19917d17"
  }, null, 2)
);
