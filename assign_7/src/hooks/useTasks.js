import { useQuery } from "@tanstack/react-query";
import { getTasks, isCachedResult } from "../services/service.js";

export const taskListKey = ["tasks", "list", { todosLimit: 0, usersLimit: 0 }];

export default function useTasks() {
  const query = useQuery({
    queryKey: taskListKey,
    queryFn: ({ signal }) => getTasks(signal),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    networkMode: "always",
    retry: false,
    refetchOnReconnect: "always",
    structuralSharing: false,
  });
  return {
    data: query.data,
    cached: isCachedResult(query.data),
    loading: query.isPending,
    refreshing: query.isFetching,
    error: query.error?.message || "",
    reload: () => query.refetch(),
  };
}
