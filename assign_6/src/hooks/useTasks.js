import { useQuery } from "@tanstack/react-query";
import { getTasks } from "../services/service.js";

export const taskListKey = ["tasks", "list", { todosLimit: 0, usersLimit: 0 }];

export default function useTasks() {
  const query = useQuery({
    queryKey: taskListKey,
    queryFn: ({ signal }) => getTasks(signal),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    networkMode: "always",
    retry: false,
    refetchOnReconnect: true,
  });
  return {
    data: query.data,
    loading: query.isPending,
    refreshing: query.isFetching,
    error: query.error?.message || "",
    reload: () => query.refetch(),
  };
}
