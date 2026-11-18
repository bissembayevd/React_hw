import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import LogoutButton from "./LogoutButton.jsx";
import {
  Home,
  Info,
  LayoutDashboard,
  ListTodo,
  CircleDashed,
  CircleCheck,
  UserRound,
} from "lucide-react";
export default function NavBar({ onNavigate }) {
  const location = useLocation();
  const { user, loading } = useAuth();
  const pathname = location.pathname.replace(/\/$/, "") || "/";
  const status = new URLSearchParams(location.search).get("status");
  const items = [
    [Home, "Home", "/"],
    [LayoutDashboard, "Dashboard", "/dashboard"],
    [ListTodo, "All Tasks", "/tasks"],
    [CircleDashed, "In Progress", "/tasks?status=In+Progress"],
    [CircleCheck, "Completed", "/tasks?status=Completed"],
    [Info, "About", "/about"],
  ];
  if (!loading && user) items.push([UserRound, "Profile", "/profile"]);
  return (
    <nav aria-label="Main navigation">
      {items.map(([Icon, label, to]) => {
        const active = to.startsWith("/tasks")
          ? pathname === "/tasks" &&
            (label === "All Tasks"
              ? !status || status === "To Do"
              : status === label)
          : pathname === to;
        return (
          <Link
            key={label}
            to={to}
            onClick={onNavigate}
            className={`nav-item ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        );
      })}
      {!loading && user && <LogoutButton className="nav-item" onLogout={onNavigate} />}
    </nav>
  );
}
