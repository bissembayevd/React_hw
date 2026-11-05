const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const root = path.resolve("dist");
const mount = "/React_hw/assign_5/";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (!pathname.startsWith(mount)) {
      res.writeHead(404).end();
      return;
    }
    const file = path.resolve(
      root,
      pathname.slice(mount.length) || "index.html",
    );
    if (
      !file.startsWith(root + path.sep) &&
      file !== path.join(root, "index.html")
    ) {
      res.writeHead(403).end();
      return;
    }
    res
      .writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
      })
      .end(await fs.readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
const todos = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  userId: (i % 2) + 1,
  title: `Task ${String(i + 1).padStart(2, "0")}`,
  completed: i % 3 === 0,
}));
const users = [
  {
    id: 1,
    name: "Ada",
    username: "ada",
    email: "ada@example.com",
    company: { name: "Study" },
  },
  {
    id: 2,
    name: "Lin",
    username: "lin",
    email: "lin@example.com",
    company: { name: "Work" },
  },
];
async function run() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}${mount}`;
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  try {
    await page.goto(`${base}#/tasks`);
    await expect(page.locator(".task-card")).toHaveCount(10, {
      timeout: 30000,
    });
    await expect(page.locator(".result-count")).toHaveText("200 tasks");
    await page.locator(".task-title").first().click();
    await expect(page.locator(".property")).toHaveCount(12);
    await expect(
      page.locator(".property").filter({ hasText: "Owner" }).first(),
    ).toBeVisible();
    process.stdout.write(
      "PASS live API: list and enriched task details from real responses\n",
    );
    let fail = false;
    let slow = false;
    await context.route(
      "https://jsonplaceholder.typicode.com/**",
      async (route) => {
        const request = route.request();
        const pathname = new URL(request.url()).pathname;
        if (slow && pathname === "/todos/1")
          await new Promise((resolve) => setTimeout(resolve, 1200));
        if (fail && pathname === "/todos") {
          await route.fulfill({ status: 503, json: { error: "Unavailable" } });
          return;
        }
        let data = {};
        if (request.method() === "GET") {
          if (pathname === "/todos") data = todos;
          else if (pathname === "/users") data = users;
          else if (pathname.startsWith("/todos/"))
            data = todos.find(
              (todo) => todo.id === Number(pathname.split("/").at(-1)),
            );
          else
            data = users.find(
              (user) => user.id === Number(pathname.split("/").at(-1)),
            );
        }
        await route.fulfill({ status: data ? 200 : 404, json: data || {} });
      },
    );
    errors.length = 0;
    await page.goto(`${base}#/tasks`);
    await expect(page.locator(".task-card")).toHaveCount(10);
    await page.getByLabel("Tasks per page").selectOption("20");
    await expect(page.locator(".task-card")).toHaveCount(20);
    await expect(page).toHaveURL(/size=20/);
    await page.reload();
    await expect(page.getByLabel("Tasks per page")).toHaveValue("20");
    await page.getByLabel("Tasks per page").selectOption("10");
    const documentId = await page.evaluate(() => {
      window.documentId = crypto.randomUUID();
      return window.documentId;
    });
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await page.reload();
    await expect(page.getByText("Page 2 of 3", { exact: true })).toBeVisible();
    await page.getByLabel("Sort tasks").selectOption("title");
    await expect(page).not.toHaveURL(/page=2/);
    await expect(page.locator(".task-title").first()).toHaveText("Task 01");
    await page.getByLabel("Filter by status").selectOption("Completed");
    await expect(page.locator(".task-card")).toHaveCount(9);
    await page.getByLabel("Filter by priority").selectOption("High");
    await expect(
      page.getByRole("heading", { name: "No matching tasks" }),
    ).toBeVisible();
    await page.goBack();
    await expect(page.getByLabel("Filter by priority")).toHaveValue("");
    await expect(page.locator(".task-card")).toHaveCount(9);
    await page.goForward();
    await expect(
      page.getByRole("heading", { name: "No matching tasks" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(`${base}#/tasks`);
    await expect(page.getByLabel("Search tasks")).toHaveValue("");
    await expect(page.getByLabel("Filter by status")).toHaveValue("");
    await expect(page.getByLabel("Filter by priority")).toHaveValue("");
    await expect(page.locator(".task-card")).toHaveCount(10);
    await page.getByLabel("Search tasks").fill("Task 02");
    await expect(page).toHaveURL(`${base}#/tasks?q=Task+02`);
    await expect(page.locator(".task-card")).toHaveCount(1);
    await page.reload();
    await expect(page.getByLabel("Search tasks")).toHaveValue("Task 02");
    await page.locator(".task-title").click();
    await expect(page).toHaveURL(/tasks\/2$/);
    await expect(page.locator(".property")).toHaveCount(12);
    await page.getByRole("link", { name: "Back to tasks" }).click();
    await expect(page.getByLabel("Search tasks")).toHaveValue("Task 02");
    await page.getByRole("button", { name: "New task" }).click();
    await page
      .getByRole("textbox", { name: "Title", exact: true })
      .fill("My new task");
    await page.getByLabel("Description").fill("Browser verified description");
    await page.getByLabel("Priority", { exact: true }).selectOption("High");
    await page.getByLabel("Due date", { exact: true }).fill("2026-12-01");
    await page
      .getByRole("button", { name: "Create task", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "My new task", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "My new task", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start task", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Mark completed", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Mark completed", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Completed", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Edit task", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Title", exact: true })
      .fill("Edited task");
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Edited task", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("button", { name: "Yes, delete task", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "My Tasks", exact: true }),
    ).toBeVisible();
    await page.goto(`${base}#/tasks/abc`);
    await expect(
      page.getByText("Invalid task ID.", { exact: true }),
    ).toBeVisible();
    await page.goto(`${base}#/tasks/999`);
    await expect(
      page.getByText("Task not found.", { exact: true }),
    ).toBeVisible();
    errors.length = 0;
    slow = true;
    const firstTaskRequest = page.waitForRequest((request) =>
      request.url().endsWith("/todos/1"),
    );
    await page.goto(`${base}#/tasks/1`);
    await firstTaskRequest;
    await page.evaluate(() => {
      window.location.hash = "#/tasks/2";
    });
    await expect(
      page.getByRole("heading", { name: "Task 02", exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(1400);
    await expect(
      page.getByRole("heading", { name: "Task 02", exact: true }),
    ).toBeVisible();
    slow = false;
    fail = true;
    await page.goto(`${base}#/tasks`);
    await expect(page.getByRole("alert")).toContainText("503");
    fail = false;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page.locator(".task-card")).toHaveCount(10);
    errors.length = 0;
    const navigationId = await page.evaluate(() => {
      window.documentId = crypto.randomUUID();
      return window.documentId;
    });
    await page.getByRole("link", { name: "Dashboard", exact: true }).click();
    await expect(page.locator(".dashboard-stats .stat strong")).toHaveText([
      "25",
      "16",
      "0",
      "9",
    ]);
    await expect(
      page.getByRole("heading", { name: "Tasks by status", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Tasks by priority", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Filter dashboard by owner").selectOption("1");
    await expect(
      page.locator(".dashboard-stats .stat strong").first(),
    ).toHaveText("13");
    assert.equal(await page.evaluate(() => window.documentId), navigationId);
    await page.reload();
    await expect(page.getByLabel("Filter dashboard by owner")).toHaveValue("1");
    await page.getByRole("link", { name: "About", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "About TaskSpace", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Login", exact: true }).click();
    const storageBeforeLogin = await page.evaluate(() => ({
      local: JSON.stringify(localStorage),
      session: JSON.stringify(sessionStorage),
    }));
    await page
      .getByRole("button", { name: "Validate form", exact: true })
      .click();
    await expect(page.getByRole("alert")).toHaveText(
      "Enter a valid email address.",
    );
    await page.getByLabel("Email", { exact: true }).fill("dostyk@example.com");
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page
      .getByRole("button", { name: "Validate form", exact: true })
      .click();
    await expect(page.getByRole("alert")).toHaveText(
      "Enter a password with at least 8 characters.",
    );
    await page.getByLabel("Password", { exact: true }).fill("sample-password");
    await page
      .getByRole("button", { name: "Validate form", exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText(
      "Form validated. Account login is not connected.",
    );
    await expect(page).toHaveURL(/login$/);
    assert.deepEqual(
      await page.evaluate(() => ({
        local: JSON.stringify(localStorage),
        session: JSON.stringify(sessionStorage),
      })),
      storageBeforeLogin,
    );
    await page.goto(`${base}#/missing`);
    await expect(
      page.getByRole("heading", { name: "404 · Page not found", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Back to Home", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Welcome to TaskSpace", exact: true }),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await page.getByRole("link", { name: "All Tasks", exact: true }).click();
    await expect(page.locator(".task-card")).toHaveCount(10);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.getByRole("button", { name: "New task", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    const routes = [
      ["/", "A little progress, every day."],
      ["/about", "About TaskSpace"],
      ["/tasks/", "My Tasks"],
      ["/tasks/2", "Task 02"],
      ["/dashboard", "Dashboard"],
      ["/login", "Login"],
      ["/missing", "404 · Page not found"],
    ];
    for (const [route, heading] of routes) {
      await page.goto(`${base}#${route}`);
      await expect(
        page.getByRole("heading", { name: heading, exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole("heading", { name: heading, exact: true }),
      ).toBeVisible();
    }
    await page.goto(`${base}#/`);
    await expect(
      page.getByRole("img", {
        name: "A task planner with completed tasks and a growing plant",
      }),
    ).toBeVisible();
    assert.ok(documentId);
    assert.deepEqual(errors, []);
    process.stdout.write(
      "PASS browser: nested deployment, URL state, history, CRUD, persistence, details, invalid IDs, stale requests, retry, dashboard, login, 404, mobile and keyboard behavior\n",
    );
  } finally {
    await browser.close();
  }
}
run()
  .catch((error) => {
    process.stderr.write(`${error.stack}\n`);
    process.exitCode = 1;
  })
  .finally(() => server.close());
