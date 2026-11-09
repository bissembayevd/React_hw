import { Link } from "react-router-dom";
import PageHeading from "../components/PageHeading.jsx";
export default function NotFound() {
  return (
    <>
      <PageHeading
        title="404 · Page not found"
        subtitle="This page is no longer in your workspace."
      />
      <Link className="button primary" to="/">
        Back to Home
      </Link>
    </>
  );
}
