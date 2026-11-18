import { Link } from "react-router-dom";
import { ArrowUpRight, FileText } from "lucide-react";
import Badge from "./Badge.jsx";
export default function TaskCard({ task, from }) {
  return (
    <article className="task-card" aria-labelledby={`task-${task.id}`}>
      <Link
        id={`task-${task.id}`}
        className="task-title"
        to={`/tasks/${task.id}`}
        state={{ from }}
      >
        <FileText size={16} />
        <span>{task.title}</span>
      </Link>
      <div className="task-card-status">
        <span className="sr-only">Status: </span>
        <Badge value={task.status} />
      </div>
      <div className="task-card-priority">
        <span className="sr-only">Priority: </span>
        <Badge value={task.priority} />
      </div>
      <div className="task-card-category">
        <span className="sr-only">Category: </span>
        <span className="category">{task.category}</span>
      </div>
      <div className="due-date">
        <span className="sr-only">Due date: </span>
        {task.dueDate || "Not set"}
      </div>
      <Link
        className="icon-button task-card-open"
        to={`/tasks/${task.id}`}
        state={{ from }}
        aria-label={`Open ${task.title}`}
      >
        <ArrowUpRight size={15} />
      </Link>
    </article>
  );
}
