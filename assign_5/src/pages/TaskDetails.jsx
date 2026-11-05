import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Check, Pencil, Trash2 } from "lucide-react";
import useRequest from "../hooks/useRequest.js";
import { deleteTask, getTaskById, updateTask } from "../services/service.js";
import PageHeading from "../components/PageHeading.jsx";
import RequestState from "../components/RequestState.jsx";
import Badge from "../components/Badge.jsx";
import TaskEditor from "../components/TaskEditor.jsx";
export default function TaskDetails() {
  const { id } = useParams();
  return <TaskContent key={id} id={id} />;
}
function TaskContent({ id }) {
  const { data: task, loading, error, reload } = useRequest(getTaskById, id);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState("");
  const [lifecycle] = useState(() => ({ active: true }));
  useEffect(() => {
    lifecycle.active = true;
    return () => {
      lifecycle.active = false;
    };
  }, [lifecycle]);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const back =
    typeof from === "string" &&
    /^\/(tasks(?:\?|$)|dashboard(?:\?|$))/.test(from)
      ? from
      : "/tasks";
  async function act(kind) {
    if (pending) return;
    setPending(true);
    setFailure("");
    try {
      if (kind === "delete") {
        await deleteTask(task);
        if (lifecycle.active) navigate(back, { replace: true });
      } else {
        await updateTask(task, {
          status: task.status === "To Do" ? "In Progress" : "Completed",
        });
        if (lifecycle.active) {
          setNotice("Task updated successfully.");
          reload();
        }
      }
    } catch (error) {
      if (lifecycle.active) setFailure(error.message);
    } finally {
      if (lifecycle.active) setPending(false);
    }
  }
  if (loading || error)
    return (
      <>
        <div className="detail-navigation">
          <Link className="back-link" to={back}>
            ← Back to tasks
          </Link>
          <Link className="back-link" to="/tasks">
            All Tasks
          </Link>
        </div>
        <RequestState
          loading={loading}
          error={error}
          onRetry={error ? reload : undefined}
        />
      </>
    );
  const details = [
    ["ID", task.id],
    ["Status", <Badge value={task.status} />],
    ["Priority", <Badge value={task.priority} />],
    ["Category", task.category],
    ["Owner", task.owner],
    ["Owner ID", task.userId],
    ["Username", task.username || "Not provided"],
    ["Email", task.email || "Not provided"],
    ["Company", task.company || "Not provided"],
    [
      "Created",
      task.createdDate
        ? new Date(task.createdDate).toLocaleString()
        : "Not provided by API",
    ],
    ["Due date", task.dueDate || "Not set"],
    [
      "Completed",
      task.completedAt
        ? new Date(task.completedAt).toLocaleString()
        : "Date not recorded",
    ],
  ];
  return (
    <>
      <div className="detail-navigation">
        <Link className="back-link" to={back}>
          ← Back to tasks
        </Link>
        <Link className="back-link" to="/tasks">
          All Tasks
        </Link>
      </div>
      <PageHeading title={task.title} subtitle="One task at a time." />
      <section className="completion-panel task-detail">
        {failure && (
          <p className="inline-error" role="alert">
            {failure}
          </p>
        )}
        {notice && (
          <p role="status" className="success-message">
            {notice}
          </p>
        )}
        <dl className="properties">
          {details.map(([label, value]) => (
            <div className="property" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="description">
          <h2>Description</h2>
          <p>{task.description || "No description added."}</p>
        </div>
        <div className="detail-actions">
          <button disabled={pending} onClick={() => setEditing(true)}>
            <Pencil size={15} />
            Edit task
          </button>
          <button
            className="primary"
            disabled={pending || task.status === "Completed"}
            onClick={() => act("status")}
          >
            <Check size={16} />
            {pending
              ? "Working…"
              : task.status === "Completed"
                ? "Completed"
                : task.status === "To Do"
                  ? "Start task"
                  : "Mark completed"}
          </button>
          <button
            className="danger"
            disabled={pending}
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
        {confirm && (
          <div className="delete-confirm" role="alert">
            <p>Delete “{task.title}”? This cannot be undone.</p>
            <button
              disabled={pending}
              className="danger"
              onClick={() => act("delete")}
            >
              Yes, delete task
            </button>
            <button disabled={pending} onClick={() => setConfirm(false)}>
              Keep task
            </button>
          </div>
        )}
      </section>
      {editing && (
        <TaskEditor
          task={task}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setNotice("Task updated successfully.");
            reload();
          }}
        />
      )}
    </>
  );
}
