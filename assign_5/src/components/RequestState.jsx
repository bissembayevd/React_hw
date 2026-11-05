import { CircleDashed, LoaderCircle } from "lucide-react";
export default function RequestState({ loading, error, onRetry }) {
  return (
    <section className="empty" role={error ? "alert" : "status"}>
      {loading ? <LoaderCircle className="spin" /> : <CircleDashed />}
      <h2>
        {loading ? "Getting your workspace ready…" : "Couldn’t load this page"}
      </h2>
      <p>{loading ? "Loading your tasks." : error}</p>
      {onRetry && <button onClick={onRetry}>Try again</button>}
    </section>
  );
}
