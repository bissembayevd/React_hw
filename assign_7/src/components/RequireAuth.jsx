import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import RequestState from "./RequestState.jsx";

export default function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <RequestState loading message="Checking your session." />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
