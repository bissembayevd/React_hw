import {
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  CircleDashed,
} from "lucide-react";

export default function FocusedTaskList({ tasks, status, loading, onSelect }) {
  const isCompleted = status === "Completed";
  const Icon = isCompleted ? CircleCheck : CircleDashed;
  if (!tasks.length)
    return (
      <div className="empty">
        <Icon size={25} />
        <h3>
          {isCompleted ? "No completed tasks yet" : "No tasks in progress"}
        </h3>
        <p>
          {isCompleted
            ? "Tasks you finish will appear here."
            : "Start a task from All Tasks when you’re ready."}
        </p>
      </div>
    );
  return (
    <ul
      className="focused-task-list"
      aria-label={`${status} tasks`}
      aria-busy={loading}
    >
      {tasks.map((task) => (
        <li key={task.id}>
          <button
            className="focused-task"
            aria-label={task.title}
            onClick={() => onSelect(task.id)}
          >
            <span
              className={`focused-task-icon ${isCompleted ? "finished" : ""}`}
            >
              <Icon size={18} />
            </span>
            <span className="focused-task-content">
              <strong>{task.title}</strong>
              <span>
                {task.category}
                {task.dueDate && !Number.isNaN(Date.parse(task.dueDate)) ? (
                  <>
                    {" "}
                    <span className="focused-separator">·</span>{" "}
                    <CalendarDays size={12} />{" "}
                    {new Date(`${task.dueDate}T12:00:00`).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" },
                    )}
                  </>
                ) : null}
              </span>
            </span>
            <span className={`badge ${task.priority.toLowerCase()}`}>
              {task.priority}
            </span>
            <ArrowUpRight size={15} />
          </button>
        </li>
      ))}
    </ul>
  );
}
