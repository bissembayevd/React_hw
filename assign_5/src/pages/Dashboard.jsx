import { useNavigate, useSearchParams } from "react-router-dom";
import { CircleCheck, CircleDashed, ListTodo, Flag } from "lucide-react";
import useTasks from "../hooks/useTasks.js";
import { priorities, statuses } from "../services/service.js";
import { summarize } from "../services/taskViews.js";
import PageHeading from "../components/PageHeading.jsx";
import RequestState from "../components/RequestState.jsx";
import ProductivityOverview from "../components/ProductivityOverview.jsx";
export default function Dashboard() {
  const { data, loading, error, reload } = useTasks();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const owner = params.get("owner") || "";
  const tasks = (data || []).filter(
    (task) => !owner || String(task.userId) === owner,
  );
  const summary = summarize(tasks);
  const owners = [
    ...new Map(
      (data || []).map((task) => [String(task.userId), task.owner]),
    ).entries(),
  ];
  const stats = [
    [ListTodo, "Total tasks", summary.total],
    [CircleDashed, "To Do", summary.todo],
    [Flag, "In Progress", summary.inProgress],
    [CircleCheck, "Completed", summary.completed],
  ];
  return (
    <>
      <PageHeading
        title="Dashboard"
        subtitle="Your progress, a little clearer."
      />
      <div className="dashboard-filter">
        <label>
          Workspace owner{" "}
          <select
            aria-label="Filter dashboard by owner"
            value={owner}
            onChange={(event) =>
              setParams(event.target.value ? { owner: event.target.value } : {})
            }
          >
            <option value="">All owners</option>
            {owners.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading || error ? (
        <RequestState
          loading={loading}
          error={error}
          onRetry={error ? reload : undefined}
        />
      ) : (
        <>
          <div className="stats dashboard-stats">
            {stats.map(([Icon, label, value]) => (
              <section className="stat" key={label}>
                <div>
                  {label}
                  <Icon size={18} />
                </div>
                <strong>{value}</strong>
                <p>
                  {label === "Completed"
                    ? `${summary.percentage}% of selected tasks`
                    : "In this workspace view"}
                </p>
              </section>
            ))}
          </div>
          <div className="overview-grid breakdowns">
            {[
              ["Tasks by status", statuses, "status"],
              ["Tasks by priority", priorities, "priority"],
            ].map(([title, values, field]) => (
              <section className="completion-panel" key={field}>
                <h2>{title}</h2>
                <ul className="breakdown-list">
                  {values.map((value) => {
                    const count = tasks.filter(
                      (task) => task[field] === value,
                    ).length;
                    return (
                      <li key={value}>
                        <span>{value}</span>
                        <progress
                          aria-label={`${value} tasks`}
                          max={Math.max(1, tasks.length)}
                          value={count}
                        />
                        <strong>{count}</strong>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
          <ProductivityOverview
            tasks={tasks}
            loading={loading}
            error={error}
            onReload={reload}
            onSelect={(id) =>
              navigate(`/tasks/${id}`, {
                state: { from: `/dashboard?${params}` },
              })
            }
            onViewAll={() => navigate("/tasks")}
          />
        </>
      )}
    </>
  );
}
