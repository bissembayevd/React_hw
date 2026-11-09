import { useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { authErrorMessage } from "../services/auth.js";

export default function LogoutButton({ className, onLogout }) {
  const { logout } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await logout();
      onLogout?.();
    } catch (failure) {
      setError(authErrorMessage(failure, "Could not log out. Please try again."));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={submit} disabled={pending}>
        <LogOut size={18} />
        {pending ? "Logging out…" : "Logout"}
      </button>
      {error && <p className="inline-error" role="alert">{error}</p>}
    </>
  );
}
