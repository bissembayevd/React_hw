import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ListTodo,
  CircleDashed,
  CircleCheck,
  Plus,
  Search,
  RotateCw,
  PanelLeftClose,
  Menu,
  ChevronRight,
  ArrowUpRight,
  SlidersHorizontal,
  Check,
  Trash2,
  Pencil,
  X,
  FileText,
  CalendarDays,
  Flag,
  Tag,
  Hash,
  LoaderCircle,
} from "lucide-react";
import * as api from "../services/api.js";
import Dialog from "../components/Dialog.jsx";
import TaskForm from "../components/TaskForm.jsx";
import ProductivityOverview from "../components/ProductivityOverview.jsx";
import FocusedTaskList from "../components/FocusedTaskList.jsx";
const date = (value) =>
  !value
    ? "Not set"
    : new Date(
        value.length === 10 ? `${value}T12:00:00` : value,
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
function Badge({ value }) {
  return (
    <span className={`badge ${value.toLowerCase().replaceAll(" ", "-")}`}>
      <span className="dot" />
      {value}
    </span>
  );
}
export default function Dashboard() {
  const [tasks, setTasks] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  const [navigation, setNavigation] = useState("Dashboard"),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [priority, setPriority] = useState(""),
    [mobile, setMobile] = useState(false);
  const [selectedId, setSelectedId] = useState(null),
    [detail, setDetail] = useState(null),
    [detailLoading, setDetailLoading] = useState(false),
    [detailError, setDetailError] = useState(""),
    [detailReload, setDetailReload] = useState(0);
  const [editor, setEditor] = useState(null),
    [pending, setPending] = useState([]),
    [creating, setCreating] = useState(false),
    [notice, setNotice] = useState(null),
    [confirmation, setConfirmation] = useState(null);
  useEffect(() => {
    let current = true;
    const version = api.getRevision();
    setLoading(true);
    setError("");
    api
      .getTasks()
      .then((data) => {
        if (current && api.getRevision() === version) setTasks(data);
      })
      .catch((e) => {
        if (current) setError(e.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [reload]);
  useEffect(() => {
    let current = true;
    setDetail(null);
    setDetailError("");
    if (!selectedId) {
      setDetailLoading(false);
      return () => {
        current = false;
      };
    }
    const version = api.getRevision();
    setDetailLoading(true);
    api
      .getTaskById(selectedId)
      .then((task) => {
        if (current && api.getRevision() === version) setDetail(task);
      })
      .catch((e) => {
        if (current) setDetailError(e.message);
      })
      .finally(() => {
        if (current) setDetailLoading(false);
      });
    return () => {
      current = false;
    };
  }, [selectedId, detailReload]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  function navigate(name) {
    setNavigation(name);
    setStatus("");
    setSearch("");
    setPriority("");
    setMobile(false);
  }
  function closeDetails() {
    setSelectedId(null);
    setConfirmation(null);
  }
  async function mutate(kind, target, data) {
    const id = target?.id;
    const submittedEditor = editor;
    if ((id && pending.includes(id)) || (!id && creating)) return;
    if (id) setPending((p) => [...p, id]);
    else setCreating(true);
    try {
      const result =
        kind === "create"
          ? await api.createTask(data)
          : kind === "edit"
            ? await api.updateTask(id, data)
            : kind === "delete"
              ? await api.deleteTask(id)
              : kind === "start"
                ? await api.updateTask(id, { status: "In Progress" })
                : await api.completeTask(id);
      setTasks((items) =>
        kind === "delete"
          ? items.filter((t) => t.id !== id)
          : kind === "create"
            ? [...items, result]
            : items.map((t) => (t.id === id ? result : t)),
      );
      // Use the captured ID, never the task selected when this Promise settles.
      if (kind === "delete") {
        setSelectedId((current) => (current === id ? null : current));
        setDetail((current) => (current?.id === id ? null : current));
      } else if (id)
        setDetail((current) => (current?.id === id ? result : current));
      // A request may finish after its form was closed and a different one opened.
      if (kind === "create" || kind === "edit") {
        setEditor((current) => (current === submittedEditor ? null : current));
      }
      setConfirmation((current) => (current === id ? null : current));
      setNotice({
        type: "success",
        text: `Task ${kind === "create" ? "created" : kind === "edit" ? "updated" : kind === "delete" ? "deleted" : kind === "start" ? "started" : "completed"} successfully.`,
      });
      // Invalidate pre-mutation reads; fetch current data for any newly selected task.
      setReload((n) => n + 1);
      setDetailReload((n) => n + 1);
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      if (id) setPending((p) => p.filter((item) => item !== id));
      else setCreating(false);
    }
  }
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const inProgress = tasks.filter((t) => t.status === "In Progress").length;
  const visible = tasks.filter(
    (t) =>
      (navigation !== "In Progress" || t.status === "In Progress") &&
      (navigation !== "Completed" || t.status === "Completed") &&
      (navigation !== "All Tasks" ||
        ((!status || t.status === status) &&
          (!priority || t.priority === priority) &&
          `${t.title} ${t.category}`
            .toLowerCase()
            .includes(search.toLowerCase()))),
  );
  const busy = pending.includes(selectedId);
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        id="workspace-navigation"
        className={`sidebar ${mobile ? "is-open" : ""}`}
      >
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("Dashboard");
          }}
        >
          <span className="brand-mark">
            <ListTodo size={21} />
          </span>
          TaskSpace
        </a>
        <div className="workspace-label">PERSONAL WORKSPACE</div>
        <nav aria-label="Main navigation">
          {[
            [LayoutDashboard, "Dashboard"],
            [ListTodo, "All Tasks"],
            [CircleDashed, "In Progress"],
            [CircleCheck, "Completed"],
          ].map(([Icon, label]) => (
            <button
              key={label}
              className={`nav-item ${navigation === label ? "active" : ""}`}
              aria-current={navigation === label ? "page" : undefined}
              onClick={() => navigate(label)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === "All Tasks" ? (
                <small>{tasks.length}</small>
              ) : label === "In Progress" ? (
                <small>{inProgress}</small>
              ) : label === "Completed" ? (
                <small>{completed}</small>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-icon">✦</span>
          <strong>A little progress, every day.</strong>
          <p>
            Make room for your best work.
            <br />
            One task at a time.
          </p>
          <button onClick={() => setEditor({ mode: "create" })}>
            Create a task <ArrowUpRight size={14} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-toggle"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
              aria-expanded={mobile}
              aria-controls="workspace-navigation"
            >
              <Menu size={20} />
            </button>
            <PanelLeftClose size={17} className="desktop-icon" />
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{navigation}</strong>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="page-icon">
                <ListTodo size={29} strokeWidth={1.6} />
              </div>
              <h1>{navigation}</h1>
              <p>
                {
                  {
                    Dashboard: "Overview of your productivity",
                    "All Tasks": "Manage all your tasks in one place.",
                    "In Progress": "Tasks you’re working on right now.",
                    Completed: "Finished tasks and progress worth celebrating.",
                  }[navigation]
                }
              </p>
            </div>
            {(navigation === "Dashboard" || navigation === "All Tasks") && (
              <button
                className="primary"
                onClick={() => setEditor({ mode: "create" })}
              >
                <Plus size={16} />
                Add task
              </button>
            )}
          </div>
          {navigation === "Dashboard" && (
            <div className="stats">
              {[
                [
                  ListTodo,
                  "Total Tasks",
                  tasks.length,
                  "Everything in your workspace",
                  "neutral",
                ],
                [
                  CircleDashed,
                  "In Progress",
                  inProgress,
                  "A little closer to done",
                  "blue",
                ],
                [
                  CircleCheck,
                  "Completed",
                  completed,
                  "Progress worth celebrating",
                  "green",
                ],
              ].map(([Icon, label, count, caption, color]) => (
                <div className="stat" key={label}>
                  <div>
                    <span>{label}</span>
                    <Icon size={18} className={color} />
                  </div>
                  <strong>
                    {loading && !tasks.length ? "—" : count}
                    {label === "Completed" && tasks.length > 0 && (
                      <small>
                        {Math.round((completed / tasks.length) * 100)}% of all
                        tasks
                      </small>
                    )}
                  </strong>
                  <p>{caption}</p>
                </div>
              ))}
            </div>
          )}
          {navigation === "Dashboard" ? (
            <ProductivityOverview
              tasks={tasks}
              loading={loading}
              error={error}
              onReload={() => setReload((n) => n + 1)}
              onSelect={setSelectedId}
              onViewAll={() => navigate("All Tasks")}
            />
          ) : (
            <section className="database" aria-label="Task database">
              <div className="task-toolbar">
                <span className="result-count">
                  {visible.length} {visible.length === 1 ? "task" : "tasks"}
                </span>
                <button
                  className="reload"
                  disabled={loading}
                  onClick={() => setReload((n) => n + 1)}
                >
                  <RotateCw size={14} className={loading ? "spin" : ""} />
                  Reload
                </button>
              </div>
              {navigation === "All Tasks" && (
                <div className="filters">
                  <div className="search">
                    <Search size={16} />
                    <input
                      aria-label="Search tasks"
                      placeholder="Search tasks…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                      <button
                        className="icon-button"
                        aria-label="Clear search"
                        onClick={() => setSearch("")}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <div className="filter-select">
                    <SlidersHorizontal size={14} />
                    <select
                      aria-label="Filter by status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="">Status: All</option>
                      {["To Do", "In Progress", "Completed"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-select">
                    <Flag size={14} />
                    <select
                      aria-label="Filter by priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="">Priority: All</option>
                      {["High", "Medium", "Low"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              {error ? (
                <div className="empty" role="alert">
                  <CircleDashed />
                  <h3>Couldn’t load your tasks</h3>
                  <p>{error}</p>
                  <button onClick={() => setReload((n) => n + 1)}>
                    Try again
                  </button>
                </div>
              ) : loading && !tasks.length ? (
                <div className="empty" role="status">
                  <LoaderCircle className="spin" />
                  <h3>Getting your workspace ready…</h3>
                  <p>Loading your tasks from the simulated API.</p>
                </div>
              ) : (
                <>
                  {navigation === "All Tasks" ? (
                    <>
                      <div className="table-wrap" aria-busy={loading}>
                        <table>
                          <thead>
                            <tr>
                              <th>
                                <FileText size={13} />
                                Task name
                              </th>
                              <th>
                                <CircleDashed size={13} />
                                Status
                              </th>
                              <th>
                                <Flag size={13} />
                                Priority
                              </th>
                              <th>
                                <Tag size={13} />
                                Category
                              </th>
                              <th>
                                <CalendarDays size={13} />
                                Due date
                              </th>
                              <th>
                                <span className="sr-only">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {visible.map((task) => (
                              <tr key={task.id}>
                                <td>
                                  <button
                                    className="task-title"
                                    onClick={() => setSelectedId(task.id)}
                                  >
                                    <FileText size={16} />
                                    <span>{task.title}</span>
                                  </button>
                                </td>
                                <td>
                                  <Badge value={task.status} />
                                </td>
                                <td>
                                  <Badge value={task.priority} />
                                </td>
                                <td>
                                  <span className="category">
                                    {task.category}
                                  </span>
                                </td>
                                <td className="due-date">
                                  {date(task.dueDate)}
                                </td>
                                <td>
                                  <button
                                    className="icon-button row-open"
                                    aria-label={`Open ${task.title}`}
                                    onClick={() => setSelectedId(task.id)}
                                  >
                                    <ArrowUpRight size={15} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {!visible.length && (
                        <div className="empty">
                          <Search size={25} />
                          <h3>
                            {tasks.length
                              ? "No matching tasks"
                              : "A fresh start"}
                          </h3>
                          <p>
                            {tasks.length
                              ? "Try another search or clear your filters."
                              : "Create your first task and make a little progress."}
                          </p>
                          <button
                            onClick={() => {
                              if (tasks.length) {
                                setSearch("");
                                setStatus("");
                                setPriority("");
                                setNavigation("All Tasks");
                              } else setEditor({ mode: "create" });
                            }}
                          >
                            {tasks.length ? "Clear filters" : "Create a task"}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <FocusedTaskList
                      tasks={visible}
                      status={navigation}
                      loading={loading}
                      onSelect={setSelectedId}
                    />
                  )}
                </>
              )}
            </section>
          )}
          <div className="page-footnote">
            <span>✧</span> A clear space for a clearer mind.
          </div>
        </main>
      </div>
      {notice && (
        <div
          className={`toast ${notice.type}`}
          role={notice.type === "error" ? "alert" : "status"}
        >
          {notice.type === "error" ? (
            <CircleDashed size={18} />
          ) : (
            <CircleCheck size={18} />
          )}
          <span>{notice.text}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotice(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {editor ? (
        <Dialog
          title={editor.mode === "create" ? "Create a task" : "Edit task"}
          onClose={() => setEditor(null)}
        >
          {notice?.type === "error" && (
            <p className="inline-error" role="alert">
              {notice.text}
            </p>
          )}
          <TaskForm
            key={editor.task?.id || "create"}
            task={editor.task}
            pending={editor.task ? pending.includes(editor.task.id) : creating}
            onCancel={() => setEditor(null)}
            onSubmit={(data) => mutate(editor.mode, editor.task, data)}
          />
        </Dialog>
      ) : (
        selectedId && (
          <Dialog
            wide
            title={detail?.title || "Task details"}
            onClose={closeDetails}
          >
            {detailLoading ? (
              <div className="empty" role="status">
                <LoaderCircle className="spin" />
                <p>Loading task details…</p>
              </div>
            ) : detailError ? (
              <div className="empty" role="alert">
                <h3>Couldn’t load this task</h3>
                <p>{detailError}</p>
                <button onClick={() => setDetailReload((n) => n + 1)}>
                  Retry
                </button>
              </div>
            ) : (
              detail && (
                <>
                  <div className="properties">
                    {[
                      [Hash, "ID", detail.id],
                      [CircleDashed, "Status", <Badge value={detail.status} />],
                      [Flag, "Priority", <Badge value={detail.priority} />],
                      [Tag, "Category", detail.category],
                      [CalendarDays, "Created", date(detail.createdDate)],
                      [CalendarDays, "Due date", date(detail.dueDate)],
                    ].map(([Icon, name, value]) => (
                      <div className="property" key={name}>
                        <span>
                          <Icon size={15} />
                          {name}
                        </span>
                        <div>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="description">
                    <h3>Description</h3>
                    <p>{detail.description || "No description added."}</p>
                  </div>
                  <div className="detail-actions">
                    <button
                      disabled={busy}
                      onClick={() => setEditor({ mode: "edit", task: detail })}
                    >
                      <Pencil size={15} />
                      Edit task
                    </button>
                    <button
                      className="primary"
                      disabled={busy || detail.status === "Completed"}
                      onClick={() =>
                        mutate(
                          detail.status === "To Do" ? "start" : "complete",
                          detail,
                        )
                      }
                    >
                      <Check size={16} />
                      {busy
                        ? "Working…"
                        : detail.status === "Completed"
                          ? "Completed"
                          : detail.status === "To Do"
                            ? "Start task"
                            : "Mark completed"}
                    </button>
                    <button
                      className="danger"
                      disabled={busy}
                      onClick={() => setConfirmation(detail.id)}
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                  {confirmation === detail.id && (
                    <div className="delete-confirm" role="alert">
                      <p>Delete “{detail.title}”? This cannot be undone.</p>
                      <button
                        disabled={busy}
                        className="danger"
                        onClick={() => mutate("delete", detail)}
                      >
                        Yes, delete task
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => setConfirmation(null)}
                      >
                        Keep task
                      </button>
                    </div>
                  )}
                </>
              )
            )}
          </Dialog>
        )
      )}
    </div>
  );
}
