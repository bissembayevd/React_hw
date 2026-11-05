const BASE = "https://jsonplaceholder.typicode.com";
const KEY = "taskspace.assignment5.changes.v1";
const pending = new Set();
export const statuses = ["To Do", "In Progress", "Completed"];
export const priorities = ["Low", "Medium", "High"];
export async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? "Task not found."
        : `Request failed (${response.status}). Please try again.`,
    );
  return response.json();
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
    title: todo.title,
    status: todo.completed ? "Completed" : "To Do",
    priority: "Medium",
    category: "Personal",
    description: "",
    dueDate: "",
    createdDate: "",
    completedAt: null,
    userId: todo.userId,
    owner: user?.name || "Unassigned",
    username: user?.username || "",
    email: user?.email || "",
    company: user?.company?.name || "",
  };
}
export async function getTasks(signal) {
  const [todos, users] = await Promise.all([
    request("/todos", { signal }),
    request("/users", { signal }),
  ]);
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
  return [...tasks.values()].filter((task) => !saved.deleted.includes(task.id));
}
export async function getTaskById(id, signal) {
  if (!/^(?:[1-9]\d*|local-[a-f0-9-]{36})$/.test(id))
    throw new Error("Invalid task ID.");
  const saved = changes();
  if (saved.deleted.includes(id)) throw new Error("Task not found.");
  if (id.startsWith("local-")) {
    await request("/todos/1", { signal });
    if (!saved.tasks[id]) throw new Error("Task not found.");
    return saved.tasks[id];
  }
  const todo = await request(`/todos/${id}`, { signal });
  const user = await request(`/users/${todo.userId}`, { signal });
  return changes().tasks[id] || normalize(todo, user);
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
    await request("/todos", {
      method: "POST",
      body: JSON.stringify({
        title: task.title,
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
      task.id.startsWith("local-") ? "/todos" : `/todos/${task.id}`,
      {
        method: task.id.startsWith("local-") ? "POST" : "PATCH",
        body: JSON.stringify({
          title: updated.title,
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
