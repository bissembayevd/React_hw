const KEY = "taskspace.tasks.v1";
const titles = [
  "Build my portfolio website",
  "Study React effects",
  "Finish database homework",
  "Go for a morning run",
  "Read a chapter of my book",
  "Practice my class presentation",
  "Review weekly study notes",
  "Plan meals for the week",
];
const seed = titles.map((title, i) => ({
  id: String(i + 1),
  title,
  description: [
    "Build an accessible home page and add my recent university projects.",
    "Review effect dependencies and cleanup, then practice a slow API request.",
    "Complete the SQL exercises and check the queries before submitting.",
    "Run an easy 3 km route and stretch afterwards.",
    "Read one chapter and note the ideas I want to remember.",
    "Rehearse my slides aloud and keep the presentation under ten minutes.",
    "Summarize this week's lectures and mark topics that need more practice.",
    "Choose simple meals and write a grocery list for the week.",
  ][i],
  status: [
    "In Progress",
    "In Progress",
    "To Do",
    "Completed",
    "To Do",
    "In Progress",
    "Completed",
    "To Do",
  ][i],
  priority: ["High", "Medium", "High", "Low", "Medium", "Medium", "Low", "Low"][
    i
  ],
  category: [
    "Development",
    "Learning",
    "Assignment",
    "Exercise",
    "Personal",
    "University",
    "Learning",
    "Personal",
  ][i],
  createdDate: new Date().toISOString(),
  completedAt: [3, 6].includes(i)
    ? new Date(Date.now() - i * 3600000).toISOString()
    : null,
  dueDate: `2026-10-${String(23 + i).padStart(2, "0")}`,
}));
let config = { minDelay: 350, maxDelay: 1000, errorChance: 0.01 };
let next = null;
const plans = new Map();
const pending = new Set();
let revision = 0;
export function configureApi(changes) {
  config = { ...config, ...changes };
}
export function planNextRequest(options) {
  next = options;
}
export function planTaskRequest(id, options) {
  plans.set(String(id), options);
}
export function getRevision() {
  return revision;
}
function read() {
  const raw = localStorage.getItem(KEY);
  if (raw === null) {
    localStorage.setItem(KEY, JSON.stringify(seed));
    return structuredClone(seed);
  }
  const data = JSON.parse(raw);
  if (!Array.isArray(data))
    throw new Error("Saved tasks could not be read. Check browser storage.");
  // Upgrade existing data in place: keep tasks, IDs, dates, and statuses.
  const personal = data.map(({ assignee, ...task }) => task);
  if (data.some((task) => Object.hasOwn(task, "assignee"))) {
    localStorage.setItem(KEY, JSON.stringify(personal));
  }
  return personal;
}
function save(tasks) {
  localStorage.setItem(KEY, JSON.stringify(tasks));
  revision++;
}
async function request(work, taskId) {
  const options = (taskId && plans.get(String(taskId))) || next || {};
  if (taskId && plans.has(String(taskId))) plans.delete(String(taskId));
  else next = null;
  const delay =
    options.delay ??
    config.minDelay + Math.random() * (config.maxDelay - config.minDelay);
  await new Promise((resolve) => setTimeout(resolve, delay));
  if (options.fail ?? Math.random() < config.errorChance)
    throw new Error("The request failed. Please try again.");
  return structuredClone(work());
}
function validate(data) {
  if (typeof data.title !== "string" || !data.title.trim())
    throw new Error("A task name is required.");
  if (data.title.trim().length > 160)
    throw new Error("Use a title of 160 characters or fewer.");
  if (
    data.description != null &&
    (typeof data.description !== "string" || data.description.length > 4000)
  )
    throw new Error("Use a description of 4000 characters or fewer.");
  if (
    data.category != null &&
    (typeof data.category !== "string" || data.category.length > 80)
  )
    throw new Error("Use a category of 80 characters or fewer.");
  if (data.dueDate) {
    const parsed = new Date(`${data.dueDate}T00:00:00Z`);
    if (
      typeof data.dueDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data.dueDate) ||
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== data.dueDate
    )
      throw new Error("Enter a valid due date.");
  }
  if (
    !["To Do", "In Progress", "Completed"].includes(data.status) ||
    !["Low", "Medium", "High"].includes(data.priority)
  )
    throw new Error("Invalid status or priority.");
  return {
    id: data.id,
    title: data.title.trim(),
    description: data.description || "",
    category: data.category || "Personal",
    priority: data.priority,
    status: data.status,
    createdDate: data.createdDate,
    completedAt: data.completedAt || null,
    dueDate: data.dueDate || "",
  };
}
function mutate(id, work) {
  if (pending.has(id))
    return Promise.reject(new Error("This task already has a pending change."));
  pending.add(id);
  // Read and write together AFTER the delay. No asynchronous gap can lose another mutation.
  return request(work, id).finally(() => pending.delete(id));
}
export function getTasks() {
  return request(read);
}
export function getTaskById(id) {
  return request(() => {
    const task = read().find((t) => t.id === String(id));
    if (!task) throw new Error("Task not found.");
    return task;
  }, String(id));
}
export function createTask(data) {
  return request(() => {
    const task = validate({
      ...data,
      status: "To Do",
      completedAt: null,
      id: crypto.randomUUID(),
      createdDate: new Date().toISOString(),
    });
    const tasks = read();
    save([...tasks, task]);
    return task;
  });
}
export function updateTask(id, changes) {
  id = String(id);
  return mutate(id, () => {
    const tasks = read();
    const index = tasks.findIndex((t) => t.id === id);
    if (index < 0) throw new Error("Task not found.");
    const workflow = ["To Do", "In Progress", "Completed"];
    const currentStatus = tasks[index].status;
    if (
      changes.status !== undefined &&
      changes.status !== currentStatus &&
      changes.status !== workflow[workflow.indexOf(currentStatus) + 1]
    ) {
      throw new Error("Follow the workflow: To Do → In Progress → Completed.");
    }
    tasks[index] = validate({
      ...tasks[index],
      ...changes,
      id,
      createdDate: tasks[index].createdDate,
      completedAt:
        changes.status === "Completed" && currentStatus !== "Completed"
          ? new Date().toISOString()
          : tasks[index].completedAt || null,
    });
    save(tasks);
    return tasks[index];
  });
}
export function deleteTask(id) {
  id = String(id);
  return mutate(id, () => {
    const tasks = read();
    if (!tasks.some((t) => t.id === id)) throw new Error("Task not found.");
    save(tasks.filter((t) => t.id !== id));
    return id;
  });
}
export function completeTask(id) {
  return updateTask(id, { status: "Completed" });
}
