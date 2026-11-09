import { useAuth } from "../hooks/useAuth.js";
import LogoutButton from "../components/LogoutButton.jsx";
import PageHeading from "../components/PageHeading.jsx";

export default function Profile() {
  const { user } = useAuth();
  return (
    <>
      <PageHeading title="Profile" subtitle="Your TaskSpace account." />
      <section className="completion-panel profile-form">
        <h2>Account details</h2>
        <dl className="properties account-properties">
          <div className="property"><dt>Email</dt><dd>{user.email || "Not provided"}</dd></div>
          <div className="property"><dt>UID</dt><dd>{user.uid}</dd></div>
        </dl>
        <LogoutButton className="primary" />
      </section>
    </>
  );
}
