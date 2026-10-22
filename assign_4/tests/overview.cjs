const { chromium } = require("playwright");
const assert = require("node:assert/strict");
async function service(page, name, ...args) {
  return page.evaluate(
    async ({ name, args }) => {
      const resource = performance
        .getEntriesByType("resource")
        .findLast((e) =>
          new URL(e.name).pathname.endsWith("/src/services/api.js"),
        );
      return (await import(resource?.name || "/src/services/api.js"))[name](
        ...args,
      );
    },
    { name, args },
  );
}
const button = (page, name) => page.getByRole("button", { name, exact: true });
async function reload(page) {
  await button(page, "Reload").click();
  await page.waitForFunction(
    () => !document.querySelector(".reload")?.disabled,
  );
}
async function navigate(page, name) {
  const menu = button(page, "Open navigation");
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: new RegExp("^" + name) })
    .click();
  await page.getByRole("heading", { name, exact: true, level: 1 }).waitFor();
  assert.equal(
    await page.locator('nav [aria-current="page"] > span').textContent(),
    name,
  );
  assert.equal(
    await page.locator(".stat").count(),
    name === "Dashboard" ? 3 : 0,
  );
  assert.equal(await page.getByRole("tab").count(), 0);
  assert.equal(
    await page.locator(".filters").count(),
    name === "All Tasks" ? 1 : 0,
  );
  assert.equal(
    await page.locator("table").count(),
    name === "All Tasks" ? 1 : 0,
  );
}
(async () => {
  const browser = await chromium.launch({
    channel: process.env.TASKSPACE_BROWSER || "msedge",
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(process.env.TASKSPACE_URL || "http://localhost:5173");
    await service(page, "configureApi", {
      minDelay: 20,
      maxDelay: 20,
      errorChance: 0,
    });
    await page
      .getByRole("heading", { name: "Dashboard", level: 1, exact: true })
      .waitFor();
    await page
      .getByText("Overview of your productivity", { exact: true })
      .waitFor();
    await page
      .getByRole("progressbar", { name: "Overall completion" })
      .waitFor();
    assert.equal(await page.locator("table").count(), 0);
    assert.equal(
      await page.getByLabel("Search tasks", { exact: true }).count(),
      0,
    );
    // Every page has a distinct layout, and old filters cannot hide focused tasks.
    await navigate(page, "All Tasks");
    assert.equal(await page.locator("table tbody tr").count(), 8);
    await page.screenshot({
      path: "artifacts/all-tasks-desktop.png",
      fullPage: true,
    });
    await page.getByLabel("Search tasks").fill("nothing-matches");
    await page.getByLabel("Filter by status").selectOption("To Do");
    await page.getByLabel("Filter by priority").selectOption("High");
    await navigate(page, "In Progress");
    assert.equal(await page.locator(".focused-task-list li").count(), 3);
    await page.screenshot({
      path: "artifacts/in-progress-desktop.png",
      fullPage: true,
    });
    await service(page, "planTaskRequest", "1", { delay: 300, fail: false });
    await button(page, "Build my portfolio website").click();
    await page.getByText("Loading task details…", { exact: true }).waitFor();
    await button(page, "Edit task").waitFor();
    await button(page, "Close dialog").click();
    await navigate(page, "Completed");
    assert.equal(await page.locator(".focused-task-list li").count(), 2);
    await button(page, "Go for a morning run").click();
    await button(page, "Completed").waitFor();
    await button(page, "Close dialog").click();
    await page.screenshot({
      path: "artifacts/completed-desktop.png",
      fullPage: true,
    });
    await navigate(page, "All Tasks");
    assert.equal(await page.getByLabel("Search tasks").inputValue(), "");
    assert.equal(await page.getByLabel("Filter by status").inputValue(), "");
    assert.equal(await page.getByLabel("Filter by priority").inputValue(), "");
    assert.equal(await page.locator("table tbody tr").count(), 8);
    await navigate(page, "Dashboard");
    for (const task of await service(page, "getTasks"))
      await service(page, "deleteTask", task.id);
    await reload(page);
    assert.equal(
      await page.getByRole("progressbar").getAttribute("value"),
      "0",
    );
    await page.getByText("No upcoming deadlines", { exact: true }).waitFor();
    await page.getByText("No completed tasks yet", { exact: true }).waitFor();
    const draft = {
      title: "Without a date",
      description: "Personal overview fixture",
      category: "Personal",
      priority: "Medium",
      dueDate: "",
    };
    await service(page, "createTask", draft);
    await reload(page);
    await page
      .getByText("1 open task has no due date.", { exact: true })
      .waitFor();
    const deadlines = [];
    for (let i = 0; i < 7; i++)
      deadlines.push(
        await service(page, "createTask", {
          ...draft,
          title: `Deadline ${i}`,
          dueDate: i === 0 ? "2000-01-01" : `2099-01-0${i}`,
        }),
      );
    const finished = [];
    for (let i = 0; i < 6; i++) {
      const task = await service(page, "createTask", {
        ...draft,
        title: `Finished ${i}`,
        dueDate: "2099-12-31",
      });
      await service(page, "updateTask", task.id, { status: "In Progress" });
      finished.push(await service(page, "completeTask", task.id));
    }
    await reload(page);
    const upcoming = page.getByRole("region", {
      name: "Upcoming Deadlines",
      exact: true,
    });
    const recent = page.getByRole("region", {
      name: "Recently Completed",
      exact: true,
    });
    assert.deepEqual(
      await upcoming.locator(".overview-task strong").allTextContents(),
      deadlines.slice(0, 5).map((t) => t.title),
    );
    assert.deepEqual(
      await recent.locator(".overview-task strong").allTextContents(),
      finished
        .slice()
        .reverse()
        .slice(0, 5)
        .map((t) => t.title),
    );
    assert.equal(
      await page.getByRole("progressbar").getAttribute("value"),
      "43",
    );
    await upcoming.getByText(/Overdue/).waitFor();
    await page.getByText("6 of 14 tasks completed", { exact: true }).waitFor();
    // Upcoming details still use a separate delayed API read, then retry a failure.
    await service(page, "planTaskRequest", deadlines[0].id, {
      delay: 500,
      fail: false,
    });
    await button(page, deadlines[0].title).click();
    await page.getByText("Loading task details…", { exact: true }).waitFor();
    await button(page, "Edit task").waitFor();
    await button(page, "Close dialog").click();
    await service(page, "planTaskRequest", finished[5].id, {
      delay: 30,
      fail: true,
    });
    await button(page, finished[5].title).click();
    await page.getByText("Couldn’t load this task", { exact: true }).waitFor();
    await button(page, "Retry").click();
    await button(page, "Completed").waitFor();
    await button(page, "Close dialog").click();
    // Complete an upcoming task from the overview: count, percentage, and recent order update.
    await button(page, deadlines[0].title).click();
    await button(page, "Start task").click();
    await button(page, "Mark completed").click();
    await button(page, "Completed").waitFor();
    await button(page, "Close dialog").click();
    await page.getByText("7 of 14 tasks completed", { exact: true }).waitFor();
    assert.equal(
      await page.getByRole("progressbar").getAttribute("value"),
      "50",
    );
    assert.equal(
      await recent.locator(".overview-task strong").first().innerText(),
      deadlines[0].title,
    );
    assert.equal(
      await upcoming
        .getByRole("button", { name: deadlines[0].title, exact: true })
        .count(),
      0,
    );
    await page.screenshot({
      path: "artifacts/dashboard-desktop.png",
      fullPage: true,
    });
    // Real navigation, reset filters, and genuinely different content.
    await page
      .getByRole("link", { name: "View All Tasks", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "All Tasks", level: 1, exact: true })
      .waitFor();
    assert.equal(await page.locator("table tbody tr").count(), 14);
    assert.equal(await page.getByRole("progressbar").count(), 0);
    await page.getByLabel("Search tasks", { exact: true }).fill("no-matches");
    await navigate(page, "In Progress");
    assert.equal(await page.getByLabel("Search tasks").count(), 0);
    await page.getByText("No tasks in progress", { exact: true }).waitFor();
    await navigate(page, "Completed");
    assert.equal(await page.locator(".focused-task-list li").count(), 7);
    await navigate(page, "All Tasks");
    assert.equal(await page.locator("table tbody tr").count(), 14);
    await navigate(page, "Dashboard");
    assert.equal(await page.locator("table").count(), 0);
    // Overview-level failure and retry, not a stale empty overview.
    await service(page, "planNextRequest", { delay: 30, fail: true });
    await button(page, "Reload").click();
    await page
      .getByText("Couldn’t load your overview", { exact: true })
      .waitFor();
    await button(page, "Try again").click();
    await page.getByRole("progressbar").waitFor();
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
    }
    await page.screenshot({
      path: "artifacts/dashboard-mobile.png",
      fullPage: true,
    });
    await navigate(page, "All Tasks");
    assert.equal(await page.locator("table tbody tr").count(), 14);
    for (const width of [768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const name of [
        "Dashboard",
        "In Progress",
        "Completed",
        "All Tasks",
      ]) {
        await navigate(page, name);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
      }
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS: distinct Dashboard/All Tasks, all navigation items, dynamic counts/progress, nearest five deadlines, overdue/missing dates, latest five completions, async details/retry, live status updates, empty/error states, and responsive layouts.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
