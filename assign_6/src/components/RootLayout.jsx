import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ChevronRight, ListTodo, Menu, UserRound } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import NavBar from "./NavBar.jsx";
export default function RootLayout() {
  const [mobile, setMobile] = useState(false);
  const location = useLocation();
  const { user, loading } = useAuth();
  const titles = {
    "/": "Home",
    "/tasks": "All Tasks",
    "/dashboard": "Dashboard",
    "/about": "About",
    "/login": "Login",
    "/signup": "Signup",
    "/profile": "Profile",
  };
  const title =
    titles[location.pathname] ||
    (location.pathname.startsWith("/tasks/")
      ? "Task details"
      : "Page not found");
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content").focus();
        }}
      >
        Skip to content
      </a>
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        id="workspace-navigation"
        className={`sidebar ${mobile ? "is-open" : ""}`}
      >
        <Link className="brand" to="/" onClick={() => setMobile(false)}>
          <span className="brand-mark">
            <ListTodo size={21} />
          </span>
          TaskSpace
        </Link>
        <div className="workspace-label">PERSONAL WORKSPACE</div>
        <NavBar onNavigate={() => setMobile(false)} />
        <div className="sidebar-note">
          <span className="note-icon">✦</span>
          <strong>A little progress, every day.</strong>
          <p>
            Make room for your best work.
            <br />
            One task at a time.
          </p>
          <Link to="/tasks?create=1" onClick={() => setMobile(false)}>
            Create a task ↗
          </Link>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-toggle"
              aria-label="Open navigation"
              aria-expanded={mobile}
              aria-controls="workspace-navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={19} />
            </button>
            <span>My workspace</span>
            <ChevronRight size={13} />
            <strong>{title}</strong>
          </div>
          {!loading && (user ? (
            <NavLink
              className="profile-link"
              to="/profile"
              onClick={() => setMobile(false)}
            >
              <UserRound size={16} />
              Profile
            </NavLink>
          ) : (
            <div className="guest-actions">
              <NavLink
                className="login-link"
                to="/login"
                onClick={() => setMobile(false)}
              >
                Log in
              </NavLink>
              <NavLink
                className="button primary"
                to="/signup"
                onClick={() => setMobile(false)}
              >
                Sign up
              </NavLink>
            </div>
          ))}
        </header>
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <div className="page-footnote">
          <span>✧</span>A clear space for a clearer mind.
        </div>
      </div>
    </div>
  );
}
