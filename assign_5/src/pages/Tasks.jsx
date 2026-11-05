import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, RotateCw, Search } from "lucide-react";
import useTasks from "../hooks/useTasks.js";
import { priorities, statuses } from "../services/service.js";
import { readView, sorts, taskView } from "../services/taskViews.js";
import PageHeading from "../components/PageHeading.jsx";
import RequestState from "../components/RequestState.jsx";
import TaskCard from "../components/TaskCard.jsx";
import TaskEditor from "../components/TaskEditor.jsx";
export default function Tasks() {
  const { data, loading, error, reload } = useTasks();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const view = readView(params);
  const result = taskView(data || [], view);
  const { page } = result;
  useEffect(() => {
    if (
      !loading &&
      !error &&
      params.get("page") &&
      params.get("page") !== String(page)
    ) {
      const next = new URLSearchParams(params);
      next.set("page", String(page));
      setParams(next, { replace: true });
    }
  }, [loading, error, page, params, setParams]);
  function change(name, value) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(name, value);
      else next.delete(name);
      if (name !== "page" && name !== "create") next.delete("page");
      return next;
    });
  }
  return (
    <>
      <PageHeading
        title="My Tasks"
        subtitle="A little structure for everything you want to do."
      >
        <button className="primary" onClick={() => change("create", "1")}>
          <Plus size={15} />
          New task
        </button>
      </PageHeading>
      <section className="database" aria-label="Task database">
        <div className="task-toolbar">
          <span className="result-count">
            {loading ? "Loading tasks…" : `${result.total} tasks`}
          </span>
          <button className="reload" disabled={loading} onClick={reload}>
            <RotateCw size={14} />
            Reload
          </button>
        </div>
        <div className="filters">
          <div className="search">
            <Search size={16} />
            <input
              aria-label="Search tasks"
              placeholder="Search tasks…"
              value={view.search}
              onChange={(event) => change("q", event.target.value)}
            />
          </div>
          <div className="filter-select">
            <select
              aria-label="Filter by status"
              value={view.status}
              onChange={(event) => change("status", event.target.value)}
            >
              <option value="">Status: All</option>
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="filter-select">
            <select
              aria-label="Filter by priority"
              value={view.priority}
              onChange={(event) => change("priority", event.target.value)}
            >
              <option value="">Priority: All</option>
              {priorities.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </div>
          <div className="filter-select">
            <select
              aria-label="Sort tasks"
              value={view.sort}
              onChange={(event) => change("sort", event.target.value)}
            >
              {Object.entries(sorts).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {loading || error ? (
          <RequestState
            loading={loading}
            error={error}
            onRetry={error ? reload : undefined}
          />
        ) : !result.total ? (
          <div className="empty">
            <Search size={25} />
            <h2>{data.length ? "No matching tasks" : "A fresh start"}</h2>
            <p>
              {data.length
                ? "Try another search or clear your filters."
                : "Create your first task and make a little progress."}
            </p>
            <button
              onClick={() =>
                data.length ? setParams({}) : change("create", "1")
              }
            >
              {data.length ? "Clear filters" : "Create a task"}
            </button>
          </div>
        ) : (
          <>
            <div className="task-card-list" aria-label="Tasks">
              <div className="task-list-heading" aria-hidden="true">
                <span>Task name</span>
                <span>Status</span>
                <span>Priority</span>
                <span>Category</span>
                <span>Due date</span>
                <span />
              </div>
              {result.tasks.map((task) => (
                <TaskCard key={task.id} task={task} from={`/tasks?${params}`} />
              ))}
            </div>
            <nav className="pagination" aria-label="Task pagination">
              <label>
                Per page{" "}
                <select
                  aria-label="Tasks per page"
                  value={view.size}
                  onChange={(event) => change("size", event.target.value)}
                >
                  {[10, 20, 50].map((size) => (
                    <option key={size}>{size}</option>
                  ))}
                </select>
              </label>
              <span aria-live="polite">
                Page {result.page} of {result.pages}
              </span>
              <button
                disabled={result.page === 1}
                onClick={() => change("page", String(result.page - 1))}
              >
                Previous
              </button>
              <button
                disabled={result.page === result.pages}
                onClick={() => change("page", String(result.page + 1))}
              >
                Next
              </button>
            </nav>
          </>
        )}
      </section>
      {params.get("create") === "1" && (
        <TaskEditor
          onClose={() => change("create", "")}
          onSaved={(task) => navigate(`/tasks/${task.id}`, { replace: true })}
        />
      )}
    </>
  );
}
