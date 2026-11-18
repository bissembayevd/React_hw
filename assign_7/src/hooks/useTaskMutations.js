import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTask, deleteTask, updateTask } from "../services/service.js";
import { taskListKey } from "./useTasks.js";

export default function useTaskMutations() {
  const client = useQueryClient();
  async function onSuccess() {
    const filters = { queryKey: taskListKey };
    await client.cancelQueries(filters);
    await client.invalidateQueries(filters);
  }

  const create = useMutation({ mutationFn: createTask, onSuccess, networkMode: "always" });
  const update = useMutation({
    mutationFn: ({ task, data }) => updateTask(task, data),
    onSuccess,
    networkMode: "always",
  });
  const remove = useMutation({ mutationFn: deleteTask, onSuccess, networkMode: "always" });

  return {
    createTask: create.mutateAsync,
    updateTask: (task, data) => update.mutateAsync({ task, data }),
    deleteTask: remove.mutateAsync,
  };
}
