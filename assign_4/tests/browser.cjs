const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.TASKSPACE_URL || "http://localhost:5173");
  await page.evaluate(async () => {
    const api = await import("/src/services/api.js");
    api.configureApi({ minDelay: 20, maxDelay: 20, errorChance: 0 });
  });
  await page.getByRole("link", { name: "View All Tasks", exact: true }).click();
  await page.getByRole("button", { name: "Reload", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Build my portfolio website",
      exact: true,
    })
    .waitFor();
  await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  assert.equal(
    await page
      .getByRole("dialog")
      .getByLabel("Assignee", { exact: true })
      .count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("dialog")
      .getByLabel("Status", { exact: true })
      .count(),
    0,
  );
  assert.equal(
    await page.getByRole("dialog").locator("input, textarea, select").count(),
    5,
  );
  await page
    .getByLabel("Title", { exact: true })
    .fill("Browser verification task");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Created through the real form");
  await page.getByLabel("Due date", { exact: true }).fill("2026-11-01");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await page
    .getByRole("button", { name: "Browser verification task", exact: true })
    .waitFor();
  await page.reload();
  await page.getByRole("link", { name: "View All Tasks", exact: true }).click();
  await page.evaluate(async () => {
    (await import("/src/services/api.js")).configureApi({
      minDelay: 20,
      maxDelay: 20,
      errorChance: 0,
    });
  });
  await page
    .getByRole("button", { name: "Browser verification task", exact: true })
    .click();
  assert.equal(
    await page.getByRole("dialog").getByText("To Do", { exact: true }).count(),
    1,
  );
  await page.getByRole("button", { name: "Edit task", exact: true }).click();
  assert.equal(
    await page
      .getByRole("dialog")
      .getByLabel("Assignee", { exact: true })
      .count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("dialog")
      .getByLabel("Status", { exact: true })
      .count(),
    0,
  );
  await page.getByLabel("Title", { exact: true }).fill("Browser edited task");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page
    .getByRole("heading", { name: "Browser edited task", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  // Controlled detail race: A finishes after B, B must remain selected.
  await page.evaluate(async () => {
    const api = await import("/src/services/api.js");
    api.planTaskRequest("1", { delay: 800, fail: false });
    api.planTaskRequest("2", { delay: 30, fail: false });
  });
  await page
    .getByRole("button", {
      name: "Build my portfolio website",
      exact: true,
    })
    .click();
  await page.getByText("Loading task details…", { exact: true }).waitFor();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Study React effects", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Study React effects", exact: true })
    .waitFor();
  await page.waitForTimeout(950);
  assert.equal(
    await page
      .getByRole("heading", { name: "Study React effects", exact: true })
      .count(),
    1,
  );
  await page.keyboard.press("Escape");
  // Completion targets A even after B becomes selected.
  await page
    .getByRole("button", { name: "Browser edited task", exact: true })
    .click();
  await page.getByRole("button", { name: "Start task", exact: true }).click();
  await page
    .getByRole("button", { name: "Mark completed", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("dialog")
      .getByText("In Progress", { exact: true })
      .count(),
    1,
  );
  await page.evaluate(async () => {
    const api = await import("/src/services/api.js");
    const tasks = await api.getTasks();
    const task = tasks.find((t) => t.title === "Browser edited task");
    api.planTaskRequest(task.id, { delay: 800, fail: false });
  });
  await page
    .getByRole("button", { name: "Mark completed", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Study React effects", exact: true })
    .click();
  await page.waitForTimeout(1100);
  assert.equal(
    await page
      .getByRole("heading", { name: "Study React effects", exact: true })
      .count(),
    1,
  );
  assert.equal(
    await page
      .getByRole("dialog")
      .getByText("In Progress", { exact: true })
      .count(),
    1,
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Browser edited task", exact: true })
    .click();
  await page.getByRole("button", { name: "Completed", exact: true }).waitFor();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("button", { name: "Yes, delete task", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(
    await page
      .getByRole("button", { name: "Browser edited task", exact: true })
      .count(),
    0,
  );
  // Errors and retry for list and details.
  await page.evaluate(async () => {
    (await import("/src/services/api.js")).planNextRequest({
      delay: 30,
      fail: true,
    });
  });
  await page.getByRole("button", { name: "Reload", exact: true }).click();
  await page.getByText("Couldn’t load your tasks", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page
    .getByRole("button", { name: "Study React effects", exact: true })
    .waitFor();
  await page.evaluate(async () => {
    (await import("/src/services/api.js")).planNextRequest({
      delay: 30,
      fail: true,
    });
  });
  await page
    .getByRole("button", { name: "Study React effects", exact: true })
    .click();
  await page.getByText("Couldn’t load this task", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page
    .getByRole("heading", { name: "Study React effects", exact: true })
    .waitFor();
  await page.keyboard.press("Escape");
  await page
    .getByLabel("Search tasks", { exact: true })
    .fill("no-matching-task-xyz");
  await page.getByText("No matching tasks", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Completed", exact: false })
    .filter({ has: page.locator("small") })
    .click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await page.waitForTimeout(300);
  await page
    .getByRole("button", { name: "Dismiss notification", exact: true })
    .click()
    .catch(() => {});
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
  await page.getByRole("link", { name: "View All Tasks", exact: true }).click();
  await page.getByLabel("Filter by priority").selectOption("High");
  assert.equal(
    await page
      .getByRole("button", { name: "Study React effects", exact: true })
      .count(),
    0,
  );
  await page.getByLabel("Filter by priority").selectOption("");
  await page.getByLabel("Filter by status").selectOption("Completed");
  assert.equal(
    await page
      .getByRole("button", { name: "Study React effects", exact: true })
      .count(),
    0,
  );
  await page.getByLabel("Filter by status").selectOption("");
  await page.getByLabel("Filter by status").selectOption("In Progress");
  assert.equal(
    await page
      .getByRole("button", { name: "Go for a morning run", exact: true })
      .count(),
    0,
  );
  await page.getByLabel("Filter by status").selectOption("");
  await page.evaluate(async () => {
    const api = await import("/src/services/api.js");
    for (const task of await api.getTasks()) await api.deleteTask(task.id);
  });
  await page.getByRole("button", { name: "Reload", exact: true }).click();
  await page.getByText("A fresh start", { exact: true }).waitFor();
  await page.reload();
  await page.getByRole("link", { name: "View All Tasks", exact: true }).click();
  await page.getByText("A fresh start", { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: browser CRUD, persistence, A/B race, stale closure, errors/retries, empty search, mobile navigation, no page overflow, no runtime errors.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
