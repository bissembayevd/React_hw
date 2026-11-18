const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");

const mount = "/React_hw/assign_7/";
const root = path.resolve("dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

async function run() {
  let files = root;
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    const relative = url.pathname.slice(mount.length) || "index.html";
    const file = path.resolve(files, relative);
    if (!url.pathname.startsWith(mount) || !file.startsWith(files + path.sep)) {
      response.writeHead(404).end();
      return;
    }
    try {
      const body = await fs.readFile(file);
      response.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      }).end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}${mount}`;
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "taskspace-pwa-"));
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
      headless: process.env.PWA_INSTALL !== "1",
      viewport: { width: 320, height: 640 },
      isMobile: true,
      hasTouch: true,
    });
    let online = true;
    const todo = { id: 1, userId: 1, todo: "Offline test task", completed: false };
    const user = { id: 1, firstName: "Ada" };
    await context.route("https://dummyjson.com/**", async (route) => {
      if (!online) {
        await route.abort("internetdisconnected");
        return;
      }
      const url = new URL(route.request().url());
      const data = {
        "/todos": { todos: [todo] },
        "/users": { users: [user] },
        "/todos/1": todo,
        "/users/1": user,
      }[url.pathname];
      await route.fulfill({
        status: data ? 200 : 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        json: data || {},
      });
    });

    const page = await context.newPage();
    await page.goto(base);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    const manifestResponse = await context.request.get(`${base}manifest.json`);
    assert.equal(manifestResponse.ok(), true);
    const manifest = await manifestResponse.json();
    assert.equal(new URL(manifest.scope, base).href, base);
    assert.equal(new URL(manifest.start_url, base).href, `${base}#/`);
    for (const icon of manifest.icons) {
      const image = await context.request.get(new URL(icon.src, base).href);
      assert.equal(image.ok(), true);
      const bytes = await image.body();
      assert.equal(bytes.readUInt32BE(16), Number(icon.sizes.split("x")[0]));
      assert.equal(bytes.readUInt32BE(20), bytes.readUInt32BE(16));
    }

    const session = await context.newCDPSession(page);
    const installability = await session.send("Page.getInstallabilityErrors");
    assert.deepEqual(installability.installabilityErrors, []);
    if (process.env.PWA_INSTALL === "1") {
      const manifestId = new URL(manifest.id, base).href;
      await session.send("PWA.install", { manifestId, installUrlOrBundleUrl: base });
      const launched = await session.send("PWA.launch", { manifestId });
      assert.ok(launched.targetId);
      await session.send("PWA.uninstall", { manifestId });
      process.stdout.write("PASS PWA install and launch\n");
    }
    async function setOffline(offline) {
      await context.setOffline(offline);
      await session.send("Network.overrideNetworkState", {
        offline,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      });
      await page.waitForFunction((expected) => navigator.onLine === expected, !offline);
    }
    await page.goto(`${base}#/tasks`);
    await expect(page.locator(".task-title")).toHaveText(todo.todo);
    const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    assert.equal(await fits(), true);
    const search = page.getByRole("textbox", { name: "Search tasks" });
    await search.fill("no matching tasks");
    await expect(page.locator(".task-title")).toHaveCount(0);
    await search.fill("");
    await expect(page.locator(".task-title")).toHaveText(todo.todo);
    await page.getByRole("combobox", { name: "Filter by status" }).selectOption("To Do");
    await expect(page.locator(".task-title")).toHaveText(todo.todo);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page.locator(".dashboard-stats")).toBeVisible();
    assert.equal(await fits(), true);
    await page.setViewportSize({ width: 740, height: 320 });
    await page.goto(`${base}#/tasks`);
    await expect(page.locator(".task-title")).toHaveText(todo.todo);
    assert.equal(await fits(), true);
    await page.getByRole("button", { name: "New task" }).click();
    await expect(page.locator(".dialog")).toBeVisible();
    assert.equal(await fits(), true);
    await page.keyboard.press("Escape");
    await page.goto(`${base}#/tasks/1`);
    await expect(page.locator(".property")).toHaveCount(12);
    assert.equal(await fits(), true);
    await expect.poll(() => page.evaluate(async () =>
      (await (await caches.open("taskspace-assign7-public-v1")).keys()).length,
    )).toBe(4);

    online = false;
    await setOffline(true);
    await page.reload();
    await expect(page.locator(".property")).toHaveCount(12);
    await expect(page.getByText("Кешированные данные")).toBeVisible();
    await page.goto(`${base}#/tasks`);
    await expect(page.locator(".task-title")).toHaveText(todo.todo);
    await expect(page.getByText("Кешированные данные")).toBeVisible();
    await page.goto(`${base}#/tasks/2`);
    await expect(page.getByText("Data is unavailable.", { exact: false })).toBeVisible();
    await page.getByRole("link", { name: "Offline" }).click();
    await expect(page.getByRole("button", { name: "Retry Connection" })).toBeVisible();
    await page.goto(`${base}unavailable`);
    await expect(page.getByRole("heading", { name: "Unreachable page" })).toBeVisible();
    await page.getByRole("link", { name: "Open tasks" }).click();
    await expect(page.getByText("Кешированные данные")).toBeVisible();
    online = true;
    await setOffline(false);
    await expect(page.getByText("Кешированные данные")).toHaveCount(0);
    await expect(page.getByText("Online", { exact: true })).toBeVisible();
    await page.goto(`${base}#/offline`);
    await page.getByRole("button", { name: "Retry Connection" }).click();
    await expect(page.locator(".task-title")).toHaveText(todo.todo);

    if (process.env.PWA_NEXT_BUILD) {
      const documents = new Set();
      await session.send("Page.enable");
      session.on("Page.frameNavigated", ({ frame }) => {
        if (!frame.parentId) documents.add(frame.loaderId);
      });
      const shellPrefix = "taskspace-assign7-shell-";
      const getShellNames = () => page.evaluate(async (prefix) =>
        (await caches.keys()).filter((name) => name.startsWith(prefix)),
        shellPrefix,
      );
      const [oldShell] = await getShellNames();
      files = path.resolve(process.env.PWA_NEXT_BUILD);
      await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
      const update = page.getByRole("button", { name: "Обновить" });
      await expect(update).toBeVisible();
      assert.equal(documents.size, 0);
      const loaded = page.waitForEvent("load");
      await update.click();
      await loaded;
      await expect.poll(() => documents.size).toBe(1);
      await expect(page.locator(".task-title")).toHaveText(todo.todo);
      await expect(update).toHaveCount(0);
      assert.equal(documents.size, 1);
      const shells = await getShellNames();
      assert.equal(shells.length, 1);
      assert.notEqual(shells[0], oldShell);
      process.stdout.write("PASS PWA update between production builds\n");
    }
    process.stdout.write("PASS PWA installability, mobile, offline and reconnect checks\n");
  } finally {
    await context?.close();
    await fs.rm(profile, { recursive: true, force: true });
    server.close();
  }
}

run().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
