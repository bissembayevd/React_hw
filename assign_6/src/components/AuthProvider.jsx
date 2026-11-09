import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, authSetupError } from "../firebase.js";
import { AuthContext } from "../hooks/useAuth.js";
import { login, loginWithGoogle, logout, signup } from "../services/auth.js";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, authSetupError, login, loginWithGoogle, logout, signup }}
    >
      {children}
    </AuthContext.Provider>
  );
}
