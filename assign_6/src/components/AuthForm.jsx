import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { authErrorMessage } from "../services/auth.js";
import PageHeading from "./PageHeading.jsx";
import RequestState from "./RequestState.jsx";

export default function AuthForm({ registering = false }) {
  const { user, loading, authSetupError, login, loginWithGoogle, signup } = useAuth();
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const title = registering ? "Signup" : "Login";

  async function run(kind, action) {
    if (pending) return;
    setError("");
    setPending(kind);
    try {
      await action();
    } catch (failure) {
      setError(authErrorMessage(failure, "Authentication failed. Please try again."));
    } finally {
      setPending("");
    }
  }

  function submit(event) {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email") || "").trim();
    const password = String(fields.get("password") || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
    } else if (!password) {
      setError("Enter your password.");
    } else if (registering && password.length < 8) {
      setError("Enter a password with at least 8 characters.");
    } else if (registering && password !== fields.get("confirmation")) {
      setError("Passwords do not match.");
    } else {
      void run("email", () => (registering ? signup : login)(email, password));
    }
  }

  if (loading) return <RequestState loading message="Checking your session." />;
  if (user) return <Navigate to="/profile" replace />;
  return (
    <>
      <PageHeading title={title} subtitle="Your workspace, one task at a time." />
      <section className="completion-panel profile-form">
        <h2>{registering ? "Create your account" : "Welcome back"}</h2>
        {authSetupError && <p role="status">{authSetupError}</p>}
        {error && <p id="auth-error" className="inline-error" role="alert">{error}</p>}
        <form onSubmit={submit} noValidate aria-describedby={error ? "auth-error" : undefined} aria-busy={Boolean(pending)}>
          <label>
            Email
            <input name="email" type="email" required maxLength={160} autoComplete="email" disabled={Boolean(pending)} />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={registering ? 8 : undefined}
              maxLength={160}
              autoComplete={registering ? "new-password" : "current-password"}
              disabled={Boolean(pending)}
            />
          </label>
          {registering && (
            <label>
              Confirm password
              <input name="confirmation" type="password" required maxLength={160} autoComplete="new-password" disabled={Boolean(pending)} />
            </label>
          )}
          <div className="detail-actions">
            <button type="submit" className="primary" disabled={Boolean(pending)}>
              {pending === "email" ? "Working…" : registering ? "Create account" : "Login"}
            </button>
            {!registering && (
              <button type="button" disabled={Boolean(pending)} onClick={() => run("google", loginWithGoogle)}>
                {pending === "google" ? "Opening Google…" : "Continue with Google"}
              </button>
            )}
          </div>
        </form>
        <Link className="back-link" to={registering ? "/login" : "/signup"}>
          {registering ? "Already have an account? Login" : "Need an account? Signup"}
        </Link>
        <Link className="back-link" to="/tasks">Continue to All Tasks</Link>
      </section>
    </>
  );
}
