import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ChevronRight, ListTodo, LogIn, Menu } from "lucide-react";
import NavBar from "./NavBar.jsx";
export default function RootLayout() {
  const [mobile, setMobile] = useState(false);
  const location = useLocation();
  const titles = {
    "/": "Home",
    "/tasks": "All Tasks",
    "/dashboard": "Dashboard",
    "/about": "About",
    "/login": "Login",
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
          <Link
            className="login-link"
            to="/login"
            aria-current={location.pathname === "/login" ? "page" : undefined}
            onClick={() => setMobile(false)}
          >
            <LogIn size={16} />
            Login
          </Link>
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
