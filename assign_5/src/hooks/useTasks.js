import useRequest from "./useRequest.js";
import { getTasks } from "../services/service.js";
const load = (_key, signal) => getTasks(signal);
export default function useTasks() {
  return useRequest(load);
}
