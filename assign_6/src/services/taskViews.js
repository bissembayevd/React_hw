import { priorities, statuses } from "./service.js";
export const sorts = {
  newest: "Newest first",
  title: "Title A–Z",
  "title-desc": "Title Z–A",
  priority: "Priority: high first",
  due: "Due date: earliest",
};
export function readView(params) {
  const integer = (value, fallback) =>
    /^\d+$/.test(value || "") &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0
      ? Number(value)
      : fallback;
  return {
    search: params.get("q") || "",
    status: statuses.includes(params.get("status")) ? params.get("status") : "",
    priority: priorities.includes(params.get("priority"))
      ? params.get("priority")
      : "",
    sort: Object.hasOwn(sorts, params.get("sort"))
      ? params.get("sort")
      : "newest",
    page: integer(params.get("page"), 1),
    size: [10, 20, 50].includes(integer(params.get("size"), 10))
      ? integer(params.get("size"), 10)
      : 10,
  };
}
export function taskView(tasks, view) {
  const filtered = tasks.filter(
    (task) =>
      (!view.status || task.status === view.status) &&
      (!view.priority || task.priority === view.priority) &&
      `${task.title} ${task.category} ${task.owner}`
        .toLowerCase()
        .includes(view.search.trim().toLowerCase()),
  );
  filtered.sort((a, b) => {
    if (view.sort === "title")
      return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
    if (view.sort === "title-desc")
      return b.title.localeCompare(a.title) || a.id.localeCompare(b.id);
    if (view.sort === "priority")
      return (
        priorities.indexOf(b.priority) - priorities.indexOf(a.priority) ||
        a.title.localeCompare(b.title)
      );
    if (view.sort === "due")
      return (
        (a.dueDate || "9999").localeCompare(b.dueDate || "9999") ||
        a.title.localeCompare(b.title)
      );
    return (
      (Date.parse(b.createdDate) || 0) - (Date.parse(a.createdDate) || 0) ||
      Number(b.id) - Number(a.id) ||
      b.id.localeCompare(a.id)
    );
  });
  const pages = Math.max(1, Math.ceil(filtered.length / view.size));
  const page = Math.min(view.page, pages);
  return {
    tasks: filtered.slice((page - 1) * view.size, page * view.size),
    total: filtered.length,
    pages,
    page,
  };
}
export function summarize(tasks) {
  const count = (status) =>
    tasks.filter((task) => task.status === status).length;
  const completed = count("Completed");
  return {
    total: tasks.length,
    todo: count("To Do"),
    inProgress: count("In Progress"),
    completed,
    percentage: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
  };
}
