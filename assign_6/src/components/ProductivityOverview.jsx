import {
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  CircleDashed,
  LoaderCircle,
  RotateCw,
} from "lucide-react";

function validDueDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
function displayDate(value) {
  return new Date(
    value.length === 10 ? `${value}T12:00:00` : value,
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
export default function ProductivityOverview({
  tasks,
  loading,
  error,
  onReload,
  onSelect,
  onViewAll,
}) {
  if (error)
    return (
      <section className="empty" role="alert">
        <CircleDashed />
        <h2>Couldn’t load your overview</h2>
        <p>{error}</p>
        <button onClick={onReload}>Try again</button>
      </section>
    );
  if (loading && !tasks.length)
    return (
      <section className="empty" role="status">
        <LoaderCircle className="spin" />
        <h2>Getting your overview ready…</h2>
        <p>Loading your tasks.</p>
      </section>
    );
  const completed = tasks.filter((task) => task.status === "Completed");
  const incomplete = tasks.filter((task) => task.status !== "Completed");
  const percentage = tasks.length
    ? Math.round((completed.length / tasks.length) * 100)
    : 0;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const deadlines = incomplete
    .filter((task) => validDueDate(task.dueDate))
    .sort(
      (a, b) =>
        a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title),
    )
    .slice(0, 5);
  const withoutDates = incomplete.filter(
    (task) => !validDueDate(task.dueDate),
  ).length;
  const completionTime = (task) =>
    Number.isFinite(Date.parse(task.completedAt))
      ? Date.parse(task.completedAt)
      : 0;
  const recent = [...completed]
    .sort(
      (a, b) =>
        completionTime(b) - completionTime(a) || a.title.localeCompare(b.title),
    )
    .slice(0, 5);
  return (
    <div className="overview" aria-busy={loading}>
      <section className="completion-panel" aria-labelledby="completion-title">
        <div className="overview-section-heading">
          <div>
            <h2 id="completion-title">Overall completion</h2>
            <p>
              {tasks.length
                ? `${completed.length} of ${tasks.length} tasks completed`
                : "A fresh start. Add your first task when you’re ready."}
            </p>
          </div>
          <strong className="completion-percentage">{percentage}%</strong>
        </div>
        <progress
          aria-label="Overall completion"
          value={percentage}
          max="100"
        />
        <div className="overview-actions">
          <a
            href="#all-tasks"
            onClick={(event) => {
              event.preventDefault();
              onViewAll();
            }}
          >
            View All Tasks <ArrowUpRight size={14} />
          </a>
          <button className="reload" disabled={loading} onClick={onReload}>
            <RotateCw size={14} className={loading ? "spin" : ""} />
            Reload
          </button>
        </div>
      </section>
      <div className="overview-grid">
        <section className="overview-section" aria-labelledby="deadlines-title">
          <header className="overview-section-heading">
            <div>
              <h2 id="deadlines-title">
                <CalendarDays size={17} />
                Upcoming Deadlines
              </h2>
              <p>Open tasks, ordered by due date.</p>
            </div>
            <span className="overview-count">{deadlines.length}</span>
          </header>
          {deadlines.length ? (
            <ul className="overview-task-list">
              {deadlines.map((task) => (
                <li key={task.id}>
                  <button
                    className="overview-task"
                    aria-label={task.title}
                    onClick={() => onSelect(task.id)}
                  >
                    <span className="overview-task-icon">
                      <CalendarDays size={16} />
                    </span>
                    <span className="overview-task-content">
                      <strong>{task.title}</strong>
                      <span className="overview-task-meta">
                        {task.category} <span>·</span> {task.status}
                      </span>
                      <span
                        className={`deadline-date ${task.dueDate < today ? "overdue" : ""}`}
                      >
                        {task.dueDate < today
                          ? "Overdue · "
                          : task.dueDate === today
                            ? "Due today · "
                            : "Due "}
                        {displayDate(task.dueDate)}
                      </span>
                    </span>
                    <ArrowUpRight size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overview-empty">
              <CalendarDays size={23} />
              <h3>No upcoming deadlines</h3>
              <p>
                {incomplete.length
                  ? "Add a due date to a task to see it here."
                  : "Nothing is waiting on a deadline. Enjoy the breathing room."}
              </p>
            </div>
          )}
          {withoutDates > 0 && (
            <p className="overview-section-note">
              {withoutDates} open{" "}
              {withoutDates === 1 ? "task has" : "tasks have"} no due date.
            </p>
          )}
        </section>
        <section className="overview-section" aria-labelledby="recent-title">
          <header className="overview-section-heading">
            <div>
              <h2 id="recent-title">
                <CircleCheck size={17} />
                Recently Completed
              </h2>
              <p>A little progress, worth celebrating.</p>
            </div>
            <span className="overview-count">{recent.length}</span>
          </header>
          {recent.length ? (
            <ul className="overview-task-list">
              {recent.map((task) => (
                <li key={task.id}>
                  <button
                    className="overview-task"
                    aria-label={task.title}
                    onClick={() => onSelect(task.id)}
                  >
                    <span className="overview-task-icon finished">
                      <CircleCheck size={16} />
                    </span>
                    <span className="overview-task-content">
                      <strong>{task.title}</strong>
                      <span className="overview-task-meta">
                        {task.category}
                      </span>
                      <span className="completed-date">
                        {completionTime(task)
                          ? `Completed ${displayDate(task.completedAt)}`
                          : "Completion date unavailable"}
                      </span>
                    </span>
                    <ArrowUpRight size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overview-empty">
              <CircleCheck size={23} />
              <h3>No completed tasks yet</h3>
              <p>
                Your finished tasks will appear here. One small step at a time.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
