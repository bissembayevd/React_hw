import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import PageHeading from "../components/PageHeading.jsx";
import { taskListKey } from "../hooks/useTasks.js";

export default function Offline() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  function retry() {
    void queryClient.invalidateQueries({ queryKey: taskListKey });
    navigate("/tasks", { replace: true });
  }

  return (
    <>
      <PageHeading title="Offline" subtitle="Check your connection to load fresh data." />
      <div className="offline-actions">
        <button type="button" className="primary" onClick={retry}>
          Retry Connection
        </button>
        <Link className="button" to="/tasks">Open tasks</Link>
      </div>
    </>
  );
}
