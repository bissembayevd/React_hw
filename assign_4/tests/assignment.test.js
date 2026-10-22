import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
async function files(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = path.join(dir, entry.name);
    result.push(...(entry.isDirectory() ? await files(name) : [name]));
  }
  return result;
}
test("assignment restrictions: allowed hooks and storage boundary", async () => {
  for (const file of await files("src")) {
    if (!/\.[jt]sx?$/.test(file)) continue;
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      /\buse(?:Ref|Memo|Callback|Reducer|Context|LayoutEffect|Transition|DeferredValue)\b/,
      file,
    );
    if (!file.includes(`${path.sep}services${path.sep}`))
      assert.doesNotMatch(source, /\blocalStorage\b/, file);
    for (const match of source.matchAll(/\b(use[A-Z]\w*)\s*\(/g))
      assert.ok(
        ["useState", "useEffect"].includes(match[1]),
        `${file}: ${match[1]}`,
      );
  }
});
