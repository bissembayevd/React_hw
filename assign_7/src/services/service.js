const BASE = "https://dummyjson.com";
const KEY = "taskspace.assignment5.changes.v1";
const pending = new Set();
const cachedResults = new WeakSet();
export const isCachedResult = (data) => cachedResults.has(data);

export const statuses = ["To Do", "In Progress", "Completed"];
export const priorities = ["Low", "Medium", "High"];
export async function request(path, options = {}) {
  const { onCacheHit, ...init } = options;
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "omit",
    headers: { "Content-Type": "application/json", ...init.headers },
  }).catch((error) => {
    if (!(error instanceof TypeError)) throw error;
    throw new Error("Connection unavailable. Check your connection and try again.");
  });
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? "Task not found."
        : response.headers?.get("X-TaskSpace-Cache") === "miss"
          ? "Data is unavailable. Check your connection and try again."
          : `Request failed (${response.status}). Please try again.`,
    );
  const data = await response.json();
  if (response.headers?.get("X-TaskSpace-Cache") === "hit") onCacheHit?.();
  return data;
}
function changes() {
  const data = JSON.parse(
    localStorage.getItem(KEY) || '{"tasks":{},"deleted":[]}',
  );
  if (
    !data ||
    typeof data.tasks !== "object" ||
    !data.tasks ||
    !Array.isArray(data.deleted)
  )
    throw new Error("Saved changes could not be read. Check browser storage.");
  return data;
}
function normalize(todo, user) {
  return {
    id: String(todo.id),
    title: todo.todo,
    status: todo.completed ? "Completed" : "To Do",
    priority: "Medium",
    category: "Personal",
    description: "",
    dueDate: "",
    createdDate: "",
    completedAt: null,
    userId: todo.userId,
    owner:
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      "Unassigned",
    username: user?.username || "",
    email: user?.email || "",
    company: user?.company?.name || "",
  };
}
export async function getTasks(signal) {
  let cached = false;
  const onCacheHit = () => { cached = true; };
  const [taskData, userData] = await Promise.all([
    request("/todos?limit=0", { signal, onCacheHit }),
    request("/users?limit=0", { signal, onCacheHit }),
  ]);
  const todos = taskData.todos;
  const users = userData.users;
  if (!Array.isArray(todos) || !Array.isArray(users))
    throw new Error("The API returned invalid task data.");
  const saved = changes();
  const tasks = new Map(
    todos.map((todo) => [
      String(todo.id),
      normalize(
        todo,
        users.find((user) => user.id === todo.userId),
      ),
    ]),
  );
  for (const [id, task] of Object.entries(saved.tasks)) tasks.set(id, task);
  const result = [...tasks.values()].filter((task) => !saved.deleted.includes(task.id));
  if (cached) cachedResults.add(result);
  return result;
}
export async function getTaskById(id, signal) {
  if (!/^(?:[1-9]\d*|local-[a-f0-9-]{36})$/.test(id))
    throw new Error("Invalid task ID.");
  const saved = changes();
  if (saved.deleted.includes(id)) throw new Error("Task not found.");
  if (id.startsWith("local-")) {
    if (!saved.tasks[id]) throw new Error("Task not found.");
    return saved.tasks[id];
  }
  let cached = false;
  const onCacheHit = () => { cached = true; };
  const todo = await request(`/todos/${id}`, { signal, onCacheHit });
  const user = await request(`/users/${todo.userId}`, { signal, onCacheHit });
  const edited = changes().tasks[id];
  const task = edited || normalize(todo, user);
  if (cached && !edited) cachedResults.add(task);
  return task;
}
function validate(task) {
  if (typeof task.title !== "string" || !task.title.trim())
    throw new Error("A task name is required.");
  if (task.title.trim().length > 160)
    throw new Error("Use a title of 160 characters or fewer.");
  if (typeof task.description !== "string" || task.description.length > 4000)
    throw new Error("Use a description of 4000 characters or fewer.");
  if (typeof task.category !== "string" || task.category.length > 80)
    throw new Error("Use a category of 80 characters or fewer.");
  if (!statuses.includes(task.status) || !priorities.includes(task.priority))
    throw new Error("Invalid status or priority.");
  if (
    task.dueDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) ||
      !Number.isFinite(Date.parse(`${task.dueDate}T00:00:00Z`)) ||
      new Date(`${task.dueDate}T00:00:00Z`).toISOString().slice(0, 10) !==
        task.dueDate)
  )
    throw new Error("Enter a valid due date.");
  return {
    ...task,
    title: task.title.trim(),
    category: task.category || "Personal",
  };
}
async function mutate(id, work) {
  if (pending.has(id))
    throw new Error("This task already has a pending change.");
  pending.add(id);
  try {
    return await work();
  } finally {
    pending.delete(id);
  }
}
function save(task, deleted = false) {
  const saved = changes();
  if (deleted) {
    saved.deleted = [...new Set([...saved.deleted, task.id])];
    delete saved.tasks[task.id];
  } else saved.tasks[task.id] = task;
  localStorage.setItem(KEY, JSON.stringify(saved));
}
export function createTask(data) {
  return mutate("create", async () => {
    const task = validate({
      ...data,
      id: `local-${crypto.randomUUID()}`,
      status: "To Do",
      createdDate: new Date().toISOString(),
      completedAt: null,
      userId: 1,
      owner: "My workspace",
      username: "",
      email: "",
      company: "",
    });
    await request("/todos/add", {
      method: "POST",
      body: JSON.stringify({
        todo: task.title,
        completed: false,
        userId: task.userId,
      }),
    });
    save(task);
    return task;
  });
}
export function updateTask(task, data) {
  return mutate(task.id, async () => {
    if (
      data.status !== undefined &&
      data.status !== task.status &&
      statuses[statuses.indexOf(task.status) + 1] !== data.status
    )
      throw new Error("Follow the workflow: To Do → In Progress → Completed.");
    const updated = validate({
      ...task,
      title: data.title ?? task.title,
      description: data.description ?? task.description,
      priority: data.priority ?? task.priority,
      category: data.category ?? task.category,
      dueDate: data.dueDate ?? task.dueDate,
      status: data.status ?? task.status,
      completedAt:
        data.status === "Completed" && task.status !== "Completed"
          ? new Date().toISOString()
          : task.completedAt,
    });
    await request(
      task.id.startsWith("local-") ? "/todos/add" : `/todos/${task.id}`,
      {
        method: task.id.startsWith("local-") ? "POST" : "PATCH",
        body: JSON.stringify({
          todo: updated.title,
          completed: updated.status === "Completed",
          userId: task.userId,
        }),
      },
    );
    save(updated);
    return updated;
  });
}
export function deleteTask(task) {
  return mutate(task.id, async () => {
    await request(`/todos/${task.id.startsWith("local-") ? "1" : task.id}`, {
      method: "DELETE",
    });
    save(task, true);
    return task.id;
  });
}
