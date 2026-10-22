const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const root = path.resolve("dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};
(async () => {
  // A local static host, including a GitHub Pages-style project subfolder.
  const server = http.createServer(async (req, res) => {
    try {
      let pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (pathname.startsWith("/taskspace/"))
        pathname = pathname.slice("/taskspace".length);
      const target = path.resolve(
        root,
        "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname),
      );
      if (!target.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      const data = await fs.readFile(target);
      res
        .writeHead(200, {
          "Content-Type":
            types[path.extname(target)] || "application/octet-stream",
        })
        .end(data);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({
    channel: process.env.TASKSPACE_BROWSER || "msedge",
    headless: true,
  });
  try {
    for (const mount of ["/", "/taskspace/"]) {
      const context = await browser.newContext();
      await context.addInitScript(() => {
        Math.random = () => 0.5;
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      page.on("response", (response) => {
        if (response.status() >= 400)
          errors.push(`${response.status()} ${response.url()}`);
      });
      await page.goto(`http://127.0.0.1:${server.address().port}${mount}`);
      await page
        .getByRole("heading", { name: "Dashboard", exact: true })
        .waitFor();
      await page.waitForTimeout(1200);
      if (
        await page
          .getByRole("button", { name: "Try again", exact: true })
          .count()
      ) {
        await page
          .getByRole("button", { name: "Try again", exact: true })
          .click();
      }
      await page
        .getByRole("button", {
          name: "Build my portfolio website",
          exact: true,
        })
        .waitFor();
      assert.equal(await page.locator("table").count(), 0);
      await page
        .getByRole("link", { name: "View All Tasks", exact: true })
        .click();
      await page.getByRole("button", { name: "Add task", exact: true }).click();
      await page
        .getByLabel("Title", { exact: true })
        .fill("Production smoke test");
      await page
        .getByRole("button", { name: "Create task", exact: true })
        .click();
      // Normal production retains its deliberate 1% failure simulation: retry if needed.
      await page.waitForTimeout(1200);
      if (await page.locator(".inline-error").count())
        await page
          .getByRole("button", { name: "Create task", exact: true })
          .click();
      await page
        .getByRole("button", { name: "Production smoke test", exact: true })
        .waitFor();
      await page.reload();
      await page
        .getByRole("link", { name: "View All Tasks", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Production smoke test", exact: true })
        .waitFor();
      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
      }
      await page.getByRole("button", { name: "Add task", exact: true }).click();
      const title = "A".repeat(160);
      await page.getByLabel("Title", { exact: true }).fill(title);
      // Ensure long form values fit a narrow viewport.
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await page
        .getByRole("button", { name: "Close dialog", exact: true })
        .click();
      assert.equal(
        await page
          .getByText(
            /Async lab|All changes saved locally|Alex Morgan|University workspace|Task 4 · Async React/,
          )
          .count(),
        0,
      );
      assert.deepEqual(errors, []);
      await context.close();
      console.log(
        `PASS: production at ${mount}: HTML/JS/CSS/favicon, creation, persistence, responsive layouts, no console/runtime/asset errors.`,
      );
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
