const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const baseURL = process.env.TASKSPACE_URL || "http://localhost:5173";
const button = (page, name) => page.getByRole("button", { name, exact: true });
async function service(page, name, ...args) {
  return page.evaluate(
    async ({ name, args }) => {
      // Match the module the app actually imported, including any Vite HMR timestamp.
      const resource = performance
        .getEntriesByType("resource")
        .findLast((entry) =>
          new URL(entry.name).pathname.endsWith("/src/services/api.js"),
        );
      const api = await import(resource?.name || "/src/services/api.js");
      return api[name](...args);
    },
    { name, args },
  );
}
async function reload(page) {
  await button(page, "Reload").click();
  await button(page, "Reload").waitFor({ state: "visible" });
  await page.waitForFunction(() => !document.querySelector(".reload").disabled);
}
async function close(page) {
  await button(page, "Close dialog").click();
}
async function open(page, title) {
  await button(page, title).click();
  await page
    .getByRole("dialog")
    .getByRole("heading", { name: title, exact: true })
    .waitFor();
  await button(page, "Edit task").waitFor();
}
async function selected(page, title) {
  await page
    .getByRole("dialog")
    .getByRole("heading", { name: title, exact: true })
    .waitFor();
  assert.equal(await page.getByRole("dialog").count(), 1);
}
(async () => {
  const browser = await chromium.launch({
    channel: process.env.TASKSPACE_BROWSER || "msedge",
    headless: true,
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1050 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(baseURL);
    await service(page, "configureApi", {
      minDelay: 20,
      maxDelay: 20,
      errorChance: 0,
    });
    await page
      .getByRole("link", { name: "View All Tasks", exact: true })
      .click();
    await reload(page);
    const initial = await service(page, "getTasks");
    const [a, b, c] = initial;
    assert.equal(initial.length, 8);
    assert.equal(
      await page
        .getByText(
          /All changes saved locally|Alex Morgan|Personal account|University workspace|Task 4 · Async React|Async lab|Development only/,
        )
        .count(),
      0,
    );
    assert.equal(await page.locator(".brand svg").count(), 1);
    assert.equal(await page.locator(".brand").innerText(), "TaskSpace");

    // Exact requested race: A=5 seconds, B=200 ms, and A really finishes last.
    await service(page, "planTaskRequest", a.id, { delay: 5000, fail: false });
    await service(page, "planTaskRequest", b.id, { delay: 200, fail: false });
    await button(page, a.title).click();
    await page.getByText("Loading task details…", { exact: true }).waitFor();
    await close(page);
    await open(page, b.title);
    await page.waitForTimeout(5100);
    await selected(page, b.title);
    await close(page);
    console.log("PASS: exact A=5000ms / B=200ms race and cleanup.");

    for (const [task, delay] of [
      [a, 900],
      [b, 600],
      [c, 100],
    ]) {
      await service(page, "planTaskRequest", task.id, { delay, fail: false });
      await button(page, task.title).click();
      if (task !== c) await close(page);
    }
    await selected(page, c.title);
    await page.waitForTimeout(1100);
    await selected(page, c.title);
    await close(page);
    console.log("PASS: rapid switching among three tasks.");

    // Empty title is blocked by native validation; failure preserves the form and storage.
    await button(page, "Add task").click();
    assert.equal(
      await page.getByRole("dialog").locator("input,select,textarea").count(),
      5,
    );
    assert.equal(await page.getByLabel("Assignee", { exact: true }).count(), 0);
    assert.equal(
      await page
        .getByRole("dialog")
        .getByLabel("Status", { exact: true })
        .count(),
      0,
    );
    await button(page, "Create task").click();
    assert.equal(
      await page
        .getByLabel("Title", { exact: true })
        .evaluate((el) => el.validity.valueMissing),
      true,
    );
    await page.getByLabel("Title", { exact: true }).fill("Audit personal task");
    await page
      .getByLabel("Description", { exact: true })
      .fill("Audit description");
    await page.getByLabel("Category", { exact: true }).selectOption("Exercise");
    await page.getByLabel("Priority", { exact: true }).selectOption("High");
    await page.getByLabel("Due date", { exact: true }).fill("2026-12-01");
    await service(page, "planNextRequest", { delay: 120, fail: true });
    await button(page, "Create task").click();
    await page.locator(".inline-error").waitFor();
    assert.equal(
      (await service(page, "getTasks")).some(
        (t) => t.title === "Audit personal task",
      ),
      false,
    );
    await button(page, "Create task").click();
    await button(page, "Audit personal task").waitFor();
    await open(page, "Audit personal task");
    const created = (await service(page, "getTasks")).find(
      (t) => t.title === "Audit personal task",
    );
    assert.equal(created.status, "To Do");
    assert.equal(
      await page.getByRole("dialog").locator(".property").count(),
      6,
    );
    await page
      .getByRole("heading", { name: "Description", exact: true })
      .waitFor();
    await page
      .getByRole("dialog")
      .getByText("To Do", { exact: true })
      .waitFor();
    // Focus wraps in both directions and Escape returns focus to the opening task.
    await button(page, "Close dialog").focus();
    await page.keyboard.press("Shift+Tab");
    assert.equal(
      await page.evaluate(() => document.activeElement.textContent.trim()),
      "Delete",
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await button(page, "Close dialog").evaluate(
        (el) => el === document.activeElement,
      ),
      true,
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await button(page, "Audit personal task").evaluate(
        (el) => el === document.activeElement,
      ),
      true,
    );
    console.log(
      "PASS: validation, failed/successful creation, eight detail fields, and dialog keyboard behavior.",
    );

    // A failed status mutation never changes UI or storage; a pending one locks A.
    await open(page, created.title);
    await service(page, "planNextRequest", { delay: 120, fail: true });
    await button(page, "Start task").click();
    await page.locator(".toast.error").waitFor();
    assert.equal(
      (await service(page, "getTaskById", created.id)).status,
      "To Do",
    );
    await button(page, "Start task").waitFor();
    await service(page, "planTaskRequest", created.id, {
      delay: 900,
      fail: false,
    });
    await button(page, "Start task").click();
    assert.equal(await button(page, "Edit task").isDisabled(), true);
    assert.equal(await button(page, "Delete").isDisabled(), true);
    await close(page);
    await open(page, b.title);
    await page.waitForTimeout(1150);
    await selected(page, b.title);
    assert.equal(
      (await service(page, "getTaskById", created.id)).status,
      "In Progress",
    );
    assert.deepEqual(await service(page, "getTaskById", b.id), b);
    await close(page);
    await open(page, created.title);
    await button(page, "Mark completed").click();
    await button(page, "Completed").waitFor();
    assert.equal(
      (await service(page, "getTaskById", created.id)).status,
      "Completed",
    );
    await close(page);
    console.log(
      "PASS: failed status update, same-task action locks, captured ID, and full status workflow.",
    );

    // Edit every field, fail it, retry, then switch to B while the edit is pending.
    await open(page, created.title);
    await button(page, "Edit task").click();
    await page.getByLabel("Title", { exact: true }).fill("Audit edited task");
    await page
      .getByLabel("Description", { exact: true })
      .fill("All fields edited");
    await page.getByLabel("Category", { exact: true }).selectOption("Personal");
    await page.getByLabel("Priority", { exact: true }).selectOption("Low");
    await page.getByLabel("Due date", { exact: true }).fill("2026-12-02");
    await service(page, "planNextRequest", { delay: 120, fail: true });
    await button(page, "Save changes").click();
    await page.locator(".inline-error").waitFor();
    assert.equal(
      (await service(page, "getTaskById", created.id)).title,
      created.title,
    );
    await service(page, "planTaskRequest", created.id, {
      delay: 900,
      fail: false,
    });
    await button(page, "Save changes").click();
    assert.equal(
      await page.getByLabel("Title", { exact: true }).isDisabled(),
      true,
    );
    await close(page);
    await close(page);
    await open(page, b.title);
    await page.waitForTimeout(1150);
    await selected(page, b.title);
    const edited = await service(page, "getTaskById", created.id);
    assert.equal(edited.title, "Audit edited task");
    assert.equal(edited.description, "All fields edited");
    assert.equal(edited.category, "Personal");
    assert.equal(edited.priority, "Low");
    assert.equal(edited.dueDate, "2026-12-02");
    assert.deepEqual(await service(page, "getTaskById", b.id), b);
    await close(page);
    console.log(
      "PASS: edit failures, all five editable fields, and switching to B during an edit.",
    );

    // Delete failure leaves the task; successful delayed deletion must not close B.
    await open(page, edited.title);
    await button(page, "Delete").click();
    await service(page, "planNextRequest", { delay: 120, fail: true });
    await button(page, "Yes, delete task").click();
    await page.locator(".toast.error").waitFor();
    assert.equal(
      (await service(page, "getTaskById", created.id)).title,
      edited.title,
    );
    await service(page, "planTaskRequest", created.id, {
      delay: 900,
      fail: false,
    });
    await button(page, "Yes, delete task").click();
    await close(page);
    await open(page, b.title);
    await page.waitForTimeout(1150);
    await selected(page, b.title);
    assert.equal(
      (await service(page, "getTasks")).some((t) => t.id === created.id),
      false,
    );
    assert.deepEqual(await service(page, "getTaskById", b.id), b);
    await close(page);
    console.log("PASS: deletion failure and switching to B during deletion.");

    // Regression: finishing an old creation must not close a newly opened create form.
    await button(page, "Add task").click();
    await page
      .getByLabel("Title", { exact: true })
      .fill("Older pending creation");
    await service(page, "planNextRequest", { delay: 900, fail: false });
    await button(page, "Create task").click();
    await close(page);
    await button(page, "Add task").click();
    await page.waitForTimeout(1150);
    await page
      .getByRole("heading", { name: "Create a task", exact: true })
      .waitFor();
    assert.equal(
      await page.getByLabel("Title", { exact: true }).inputValue(),
      "",
    );
    await close(page);
    console.log(
      "PASS: an old creation response cannot close a newer form session.",
    );

    // Reload sees external service edits; browser refresh keeps persisted changes.
    await service(page, "updateTask", b.id, { description: "Reload proof" });
    await reload(page);
    await open(page, b.title);
    await page.getByText("Reload proof", { exact: true }).waitFor();
    await close(page);
    await page.reload();
    await page
      .getByRole("link", { name: "View All Tasks", exact: true })
      .click();
    await service(page, "configureApi", {
      minDelay: 20,
      maxDelay: 20,
      errorChance: 0,
    });
    await open(page, b.title);
    await page.getByText("Reload proof", { exact: true }).waitFor();
    await close(page);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
    }
    await button(page, "Open navigation").click();
    await button(page, "Dashboard").click();
    await page.waitForTimeout(300);
    console.log(
      "PASS: reload, persistence, desktop/tablet/mobile layout, and responsive navigation.",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: no console errors, runtime errors, or restored removed UI.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
