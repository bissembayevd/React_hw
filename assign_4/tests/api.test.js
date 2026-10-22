import test from "node:test";
import assert from "node:assert/strict";
import * as api from "../src/services/api.js";
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};
api.configureApi({ minDelay: 0, maxDelay: 0, errorChance: 0 });
const draft = {
  title: "Test task",
  description: "Test description",
  category: "Assignment",
  priority: "High",
  status: "To Do",
  dueDate: "2026-11-01",
};
test("API CRUD, persistence, concurrency, and failures", async () => {
  const initial = await api.getTasks();
  assert.equal(initial.length, 8);
  const legacy = { ...initial[0], assignee: "Old user" };
  storage.set(
    "taskspace.tasks.v1",
    JSON.stringify([legacy, ...initial.slice(1)]),
  );
  const migrated = await api.getTaskById(legacy.id);
  assert.deepEqual(migrated, initial[0]);
  assert.equal(storage.get("taskspace.tasks.v1").includes("assignee"), false);
  const optionalDate = await api.createTask({ title: "Read", priority: "Low" });
  assert.equal(optionalDate.dueDate, "");
  await api.deleteTask(optionalDate.id);
  const created = await api.createTask({ ...draft, status: "Completed" });
  assert.equal(created.status, "To Do");
  assert.equal(Object.hasOwn(created, "assignee"), false);
  await assert.rejects(api.completeTask(created.id), /workflow/);
  assert.equal((await api.getTaskById(created.id)).status, "To Do");
  assert.equal((await api.getTaskById(created.id)).title, draft.title);
  const updated = await api.updateTask(created.id, { title: "Edited" });
  assert.equal(updated.title, "Edited");
  assert.equal(
    (await api.updateTask(created.id, { status: "In Progress" })).status,
    "In Progress",
  );
  await assert.rejects(
    api.updateTask(created.id, { status: "To Do" }),
    /workflow/,
  );
  assert.equal((await api.completeTask(created.id)).status, "Completed");
  await assert.rejects(
    api.updateTask(created.id, { status: "In Progress" }),
    /workflow/,
  );
  assert.ok(
    [...storage.values()].some((raw) =>
      JSON.parse(raw).some(
        (t) => t.id === created.id && t.status === "Completed",
      ),
    ),
  );
  const [a, b] = await Promise.all([
    api.createTask({ ...draft, title: "Concurrent A" }),
    api.createTask({ ...draft, title: "Concurrent B" }),
  ]);
  await Promise.all([
    api.updateTask(a.id, { title: "A saved" }),
    api.updateTask(b.id, { title: "B saved" }),
  ]);
  const after = await api.getTasks();
  assert.equal(after.find((t) => t.id === a.id).title, "A saved");
  assert.equal(after.find((t) => t.id === b.id).title, "B saved");
  api.planTaskRequest(a.id, { delay: 30, fail: false });
  const first = api.updateTask(a.id, { status: "In Progress" });
  await assert.rejects(api.deleteTask(a.id), /pending/);
  await first;
  api.planNextRequest({ delay: 0, fail: true });
  await assert.rejects(api.getTasks(), /failed/);
  await assert.rejects(api.createTask({ ...draft, title: " " }), /required/);
  await api.deleteTask(created.id);
  await assert.rejects(api.getTaskById(created.id), /not found/);
  await Promise.all([api.deleteTask(a.id), api.deleteTask(b.id)]);
  for (const task of await api.getTasks()) await api.deleteTask(task.id);
  assert.deepEqual(await api.getTasks(), []);
  assert.deepEqual(await api.getTasks(), []);
});

test("validation rejects invalid input without changing saved data", async () => {
  const before = await api.getTasks();
  for (const changes of [
    { title: "" },
    { title: "   " },
    { title: 42 },
    { title: "x".repeat(161) },
    { description: {} },
    { description: "x".repeat(4001) },
    { category: {} },
    { dueDate: "2026-02-30" },
    { dueDate: "2026-13-01" },
    { dueDate: "not-a-date" },
    { priority: "Urgent" },
  ])
    await assert.rejects(api.createTask({ ...draft, ...changes }));
  assert.deepEqual(await api.getTasks(), before);
  const valid = await api.createTask({
    ...draft,
    title: "  Personal task  ",
    dueDate: "2028-02-29",
  });
  assert.equal(valid.title, "Personal task");
  const edited = await api.updateTask(valid.id, {
    title: "New title",
    description: "New description",
    category: "Exercise",
    priority: "Low",
    dueDate: "2028-03-01",
    id: "wrong",
    createdDate: "wrong",
  });
  assert.equal(edited.id, valid.id);
  assert.equal(edited.createdDate, valid.createdDate);
  assert.deepEqual(await api.getTaskById(valid.id), edited);
});

test("every failed API operation preserves stored data and releases mutation locks", async () => {
  const item = await api.createTask(draft);
  await api.updateTask(item.id, { status: "In Progress" });
  const snapshot = await api.getTasks();
  for (const action of [
    () => api.getTasks(),
    () => api.getTaskById(item.id),
    () => api.createTask(draft),
    () => api.updateTask(item.id, { title: "Should not save" }),
    () => api.completeTask(item.id),
    () => api.deleteTask(item.id),
  ]) {
    api.planNextRequest({ delay: 5, fail: true });
    const promise = action();
    assert.ok(promise instanceof Promise);
    await assert.rejects(promise, /failed/);
    assert.deepEqual(await api.getTasks(), snapshot);
  }
  assert.equal((await api.completeTask(item.id)).status, "Completed");
  await api.deleteTask(item.id);
});

test("out-of-order create, update, and delete preserve independent changes", async () => {
  const a = await api.createTask({ ...draft, title: "Slow A" });
  const b = await api.createTask({ ...draft, title: "Fast B" });
  api.planTaskRequest(a.id, { delay: 80, fail: false });
  api.planTaskRequest(b.id, { delay: 10, fail: false });
  const update = api.updateTask(a.id, { description: "Saved late" });
  const deletion = api.deleteTask(b.id);
  api.planNextRequest({ delay: 25, fail: false });
  const creation = api.createTask({ ...draft, title: "Concurrent C" });
  await assert.rejects(api.updateTask(a.id, { priority: "Low" }), /pending/);
  const [, , c] = await Promise.all([update, deletion, creation]);
  const tasks = await api.getTasks();
  assert.equal(tasks.find((t) => t.id === a.id).description, "Saved late");
  assert.equal(
    tasks.some((t) => t.id === b.id),
    false,
  );
  assert.equal(tasks.find((t) => t.id === c.id).title, "Concurrent C");
});

test("data persists across service instances and corrupt storage is preserved", async () => {
  const created = await api.createTask(draft);
  const fresh = await import("../src/services/api.js?fresh-audit");
  fresh.configureApi({ minDelay: 0, maxDelay: 0, errorChance: 0 });
  assert.deepEqual(await fresh.getTaskById(created.id), created);
  const previous = storage.get("taskspace.tasks.v1");
  try {
    for (const raw of ["broken-json", "{}"]) {
      storage.set("taskspace.tasks.v1", raw);
      await assert.rejects(api.getTasks());
      assert.equal(storage.get("taskspace.tasks.v1"), raw);
    }
    storage.set("taskspace.tasks.v1", previous);
    const setItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error("Storage full");
    };
    try {
      await assert.rejects(
        api.updateTask(created.id, { title: "Unsaved" }),
        /Storage full/,
      );
    } finally {
      localStorage.setItem = setItem;
    }
    assert.deepEqual(await api.getTaskById(created.id), created);
  } finally {
    storage.set("taskspace.tasks.v1", previous);
  }
});

test("random delay and failure configuration is honored", async () => {
  api.configureApi({ minDelay: 20, maxDelay: 20, errorChance: 1 });
  const start = Date.now();
  try {
    await assert.rejects(api.getTasks(), /failed/);
    assert.ok(Date.now() - start >= 15);
  } finally {
    api.configureApi({ minDelay: 0, maxDelay: 0, errorChance: 0 });
  }
});

test("completion timestamps are set only on successful completion and survive edits", async () => {
  const task = await api.createTask({
    ...draft,
    completedAt: "2000-01-01T00:00:00.000Z",
  });
  assert.equal(task.completedAt, null);
  const started = await api.updateTask(task.id, { status: "In Progress" });
  assert.equal(started.completedAt, null);
  api.planNextRequest({ delay: 0, fail: true });
  await assert.rejects(api.completeTask(task.id), /failed/);
  assert.equal((await api.getTaskById(task.id)).completedAt, null);
  const before = Date.now();
  const completed = await api.completeTask(task.id);
  assert.ok(Date.parse(completed.completedAt) >= before);
  const edited = await api.updateTask(task.id, {
    description: "Edited after completion",
    completedAt: "2000-01-01T00:00:00.000Z",
  });
  assert.equal(edited.completedAt, completed.completedAt);
  assert.equal(
    (await api.completeTask(task.id)).completedAt,
    completed.completedAt,
  );
  assert.equal(
    (await api.getTaskById(task.id)).completedAt,
    completed.completedAt,
  );
});
