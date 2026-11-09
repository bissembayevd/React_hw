import { Link } from "react-router-dom";
import PageHeading from "../components/PageHeading.jsx";
import TaskIllustration from "../components/TaskIllustration.jsx";
export default function Home() {
  return (
    <>
      <PageHeading
        title="A little progress, every day."
        subtitle="Your tasks, your priorities, a clearer day."
      />
      <section className="completion-panel welcome">
        <TaskIllustration />
        <h2>Welcome to TaskSpace</h2>
        <p>
          A calm place for your university tasks. Plan what matters, start with
          one task, and celebrate what you finish.
        </p>
        <div className="detail-actions">
          <Link className="button primary" to="/tasks">
            Explore tasks ↗
          </Link>
          <Link className="button" to="/dashboard">
            View dashboard
          </Link>
        </div>
      </section>
      <div className="overview-grid">
        <section className="completion-panel">
          <h2>Make room for your best work</h2>
          <p>
            Search your tasks, choose a priority, and keep the next step in
            focus.
          </p>
        </section>
        <section className="completion-panel">
          <h2>See your progress</h2>
          <p>
            Track completion, upcoming deadlines, and the work you have already
            finished.
          </p>
        </section>
      </div>
    </>
  );
}
