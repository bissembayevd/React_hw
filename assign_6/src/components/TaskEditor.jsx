import { useEffect, useState } from "react";
import Dialog from "./Dialog.jsx";
import TaskForm from "./TaskForm.jsx";
import useTaskMutations from "../hooks/useTaskMutations.js";
export default function TaskEditor({ task, onClose, onSaved }) {
  const { createTask, updateTask } = useTaskMutations();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [lifecycle] = useState(() => ({ active: true }));
  useEffect(() => {
    lifecycle.active = true;
    return () => {
      lifecycle.active = false;
    };
  }, [lifecycle]);
  async function submit(data) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const result = task
        ? await updateTask(task, data)
        : await createTask(data);
      if (lifecycle.active) onSaved(result);
    } catch (failure) {
      if (lifecycle.active) setError(failure.message);
    } finally {
      if (lifecycle.active) setPending(false);
    }
  }
  return (
    <Dialog
      title={task ? "Edit task" : "Create a task"}
      onClose={pending ? () => {} : onClose}
    >
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      <TaskForm
        task={task}
        onSubmit={submit}
        pending={pending}
        onCancel={pending ? () => {} : onClose}
      />
    </Dialog>
  );
}
