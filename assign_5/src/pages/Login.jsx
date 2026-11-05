import { useState } from "react";
import { Link } from "react-router-dom";
import PageHeading from "../components/PageHeading.jsx";
export default function Login() {
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  function submit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email") || "").trim();
    const password = String(fields.get("password") || "");
    setSubmitted(false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.trim().length < 8) {
      setError("Enter a password with at least 8 characters.");
      return;
    }
    setError("");
    setSubmitted(true);
    event.currentTarget.reset();
  }
  return (
    <>
      <PageHeading
        title="Login"
        subtitle="Your workspace, one task at a time."
      />
      <section className="completion-panel profile-form">
        <h2>Welcome back</h2>
        <p>
          This demonstration form checks your input only. It does not sign you
          in, send credentials, or save an account. Use sample details.
        </p>
        {error && (
          <p id="login-error" className="inline-error" role="alert">
            {error}
          </p>
        )}
        {submitted && (
          <p className="success-message" role="status">
            Form validated. Account login is not connected.
          </p>
        )}
        <form
          onSubmit={submit}
          noValidate
          aria-describedby={error ? "login-error" : undefined}
        >
          <label>
            Email
            <input
              name="email"
              type="email"
              required
              maxLength={160}
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={160}
              autoComplete="current-password"
            />
          </label>
          <button className="primary">Validate form</button>
        </form>
        <Link className="back-link" to="/tasks">
          Continue to All Tasks
        </Link>
      </section>
    </>
  );
}
