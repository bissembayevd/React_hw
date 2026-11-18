import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import runServiceWorker from "./pwa/sw.js";

function serviceWorker() {
  return {
    name: "taskspace-service-worker",
    apply: "build",
    writeBundle(options) {
      const files = readdirSync(options.dir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name !== "sw.js")
        .map((entry) => resolve(entry.parentPath, entry.name))
        .sort();
      const paths = files.map((file) => file.slice(resolve(options.dir).length + 1).replaceAll("\\", "/"));
      const worker = runServiceWorker.toString();
      const hash = createHash("sha256").update(worker).update(JSON.stringify(paths));
      for (const file of files) hash.update(readFileSync(file));
      const version = hash.digest("hex").slice(0, 16);
      writeFileSync(resolve(options.dir, "sw.js"),
        `const BUILD_VERSION = ${JSON.stringify(version)};\nconst PRECACHE = ${JSON.stringify(paths)};\n${worker}\nrunServiceWorker(BUILD_VERSION, PRECACHE);\n`,
      );
    },
  };
}

export default defineConfig({
  base: "/React_hw/assign_7/",
  esbuild: { jsx: "automatic" },
  plugins: [serviceWorker()],
});
