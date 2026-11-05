import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as service from "../src/services/service.js";
import { readView, taskView, summarize } from "../src/services/taskViews.js";
const originalFetch = globalThis.fetch;
const values = new Map();
const todos = [
  { id: 1, title: "Read notes", completed: false, userId: 1 },
  { id: 2, title: "Build portfolio", completed: true, userId: 2 },
];
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
beforeEach(() => {
  values.clear();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  globalThis.fetch = async (url, options) => {
    if (options.signal?.aborted)
      throw new DOMException("Aborted", "AbortError");
    const path = new URL(url).pathname;
    let data = {};
    if (!options.method) {
      if (path === "/todos") data = todos;
      else if (path === "/users") data = users;
      else if (path.startsWith("/todos/"))
        data = todos.find((item) => item.id === Number(path.split("/").at(-1)));
      else
        data = users.find((item) => item.id === Number(path.split("/").at(-1)));
    }
    return {
      ok: !!data,
      status: data ? 200 : 404,
      json: async () => structuredClone(data),
    };
  };
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});
test("remote tasks are enriched with owner details without invented dates", async () => {
  const tasks = await service.getTasks();
  assert.equal(tasks.length, 2);
  assert.equal(tasks[0].owner, "Ada");
  assert.equal(tasks[0].email, "ada@example.com");
  assert.equal(tasks[0].dueDate, "");
  assert.deepEqual(await service.getTaskById("1"), tasks[0]);
});
test("CRUD persists successful writes, protects workflow, and keeps IDs", async () => {
  const created = await service.createTask({
    title: "  New task  ",
    description: "Details",
    category: "Learning",
    priority: "High",
    dueDate: "2026-12-01",
  });
  assert.equal(created.title, "New task");
  assert.equal(created.status, "To Do");
  await assert.rejects(
    service.updateTask(created, { status: "Completed" }),
    /workflow/,
  );
  const started = await service.updateTask(created, { status: "In Progress" });
  const completed = await service.updateTask(started, { status: "Completed" });
  assert.ok(Date.parse(completed.completedAt));
  const edited = await service.updateTask(completed, {
    title: "Edited",
    id: "9",
    createdDate: "x",
  });
  assert.equal(edited.id, created.id);
  assert.equal(edited.createdDate, created.createdDate);
  assert.equal(edited.completedAt, completed.completedAt);
  assert.equal((await service.getTaskById(created.id)).title, "Edited");
  assert.equal((await service.getTasks()).length, 3);
  await service.deleteTask(edited);
  await assert.rejects(service.getTaskById(created.id), /not found/);
  assert.equal((await service.getTasks()).length, 2);
});
test("invalid input and failed writes preserve saved data", async () => {
  const [task] = await service.getTasks();
  await assert.rejects(service.updateTask(task, { title: " " }), /required/);
  await assert.rejects(
    service.updateTask(task, { dueDate: "2026-02-30" }),
    /valid due date/,
  );
  const before = [...values];
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  await assert.rejects(service.updateTask(task, { title: "Changed" }), /503/);
  await assert.rejects(service.deleteTask(task), /503/);
  assert.deepEqual([...values], before);
});
test("invalid IDs, missing tasks, cancellation, and corrupt storage are reported", async () => {
  await assert.rejects(service.getTaskById("abc"), /Invalid/);
  await assert.rejects(service.getTaskById("999"), /not found/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(service.getTasks(controller.signal), {
    name: "AbortError",
  });
  values.set("taskspace.assignment5.changes.v1", "bad json");
  await assert.rejects(service.getTasks());
  assert.equal(values.get("taskspace.assignment5.changes.v1"), "bad json");
});
test("same-task locks release after a failed request", async () => {
  const [task] = await service.getTasks();
  const fetch = globalThis.fetch;
  let reject;
  globalThis.fetch = () =>
    new Promise((_resolve, failure) => {
      reject = failure;
    });
  const pending = service.updateTask(task, { title: "Changed" });
  await assert.rejects(service.deleteTask(task), /pending/);
  reject(new Error("Offline"));
  await assert.rejects(pending, /Offline/);
  globalThis.fetch = fetch;
  assert.equal(
    (await service.updateTask(task, { title: "Recovered" })).title,
    "Recovered",
  );
});
test("URL parsing, two filters, sorting, page limits, and summaries", async () => {
  const tasks = await service.getTasks();
  const parsed = readView(
    new URLSearchParams(
      "q=portfolio&status=Completed&priority=Medium&sort=title&page=99&size=10",
    ),
  );
  const result = taskView(tasks, parsed);
  assert.equal(result.total, 1);
  assert.equal(result.page, 1);
  assert.equal(result.tasks[0].id, "2");
  assert.deepEqual(summarize(tasks), {
    total: 2,
    todo: 1,
    inProgress: 0,
    completed: 1,
    percentage: 50,
  });
  const invalid = readView(
    new URLSearchParams("page=-1&size=0&sort=bad&status=bad&priority=bad"),
  );
  assert.equal(invalid.page, 1);
  assert.equal(invalid.size, 10);
  assert.equal(invalid.sort, "newest");
  assert.equal(taskView(tasks, { ...invalid, sort: "title" }).tasks[0].id, "2");
  assert.equal(taskView(tasks, { ...invalid, search: "missing" }).total, 0);
});
test("all sorting modes and independent filters preserve pagination boundaries", async () => {
  const tasks = await service.getTasks();
  const extra = {
    ...tasks[0],
    id: "3",
    title: "Write report",
    status: "In Progress",
    priority: "High",
    dueDate: "2026-12-01",
    createdDate: "2026-11-05T10:00:00Z",
  };
  const data = [...tasks, extra];
  const view = readView(new URLSearchParams());
  assert.equal(taskView(data, { ...view, sort: "newest" }).tasks[0].id, "3");
  assert.equal(taskView(data, { ...view, sort: "title" }).tasks[0].id, "2");
  assert.equal(
    taskView(data, { ...view, sort: "title-desc" }).tasks[0].id,
    "3",
  );
  assert.equal(taskView(data, { ...view, sort: "priority" }).tasks[0].id, "3");
  assert.equal(taskView(data, { ...view, sort: "due" }).tasks[0].id, "3");
  assert.equal(taskView(data, { ...view, status: "In Progress" }).total, 1);
  assert.equal(taskView(data, { ...view, priority: "High" }).total, 1);
  assert.equal(
    taskView(data, { ...view, status: "Completed", priority: "High" }).total,
    0,
  );
  const many = Array.from({ length: 25 }, (_, index) => ({
    ...tasks[0],
    id: String(index + 1),
  }));
  const last = taskView(many, { ...view, page: 3 });
  assert.equal(last.tasks.length, 5);
  assert.equal(last.pages, 3);
  assert.equal(taskView(many, { ...view, size: 20 }).tasks.length, 20);
});
