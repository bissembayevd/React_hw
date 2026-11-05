import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Info,
  LayoutDashboard,
  ListTodo,
  CircleDashed,
  CircleCheck,
  LogIn,
} from "lucide-react";
export default function NavBar({ onNavigate }) {
  const location = useLocation();
  const status = new URLSearchParams(location.search).get("status");
  const items = [
    [Home, "Home", "/"],
    [LayoutDashboard, "Dashboard", "/dashboard"],
    [ListTodo, "All Tasks", "/tasks"],
    [CircleDashed, "In Progress", "/tasks?status=In+Progress"],
    [CircleCheck, "Completed", "/tasks?status=Completed"],
    [Info, "About", "/about"],
    [LogIn, "Login", "/login"],
  ];
  return (
    <nav aria-label="Main navigation">
      {items.map(([Icon, label, to]) => {
        const active = to.startsWith("/tasks")
          ? location.pathname === "/tasks" &&
            (label === "All Tasks"
              ? !status || status === "To Do"
              : status === label)
          : location.pathname === to;
        return (
          <NavLink
            key={label}
            to={to}
            end
            onClick={onNavigate}
            className={`nav-item ${active ? "active" : ""}`}
            aria-current={active ? "page" : "false"}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
