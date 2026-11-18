import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, authSetupError } from "../firebase.js";

function requireAuth() {
  if (!auth) throw new Error(authSetupError);
  return auth;
}

export async function login(email, password) {
  return signInWithEmailAndPassword(requireAuth(), email, password);
}

export async function signup(email, password) {
  return createUserWithEmailAndPassword(requireAuth(), email, password);
}

export async function loginWithGoogle() {
  return signInWithPopup(requireAuth(), new GoogleAuthProvider());
}

export async function logout() {
  return signOut(requireAuth());
}

const messages = {
  "auth/invalid-email": "Enter a valid email address.",
  "auth/invalid-credential": "The email or password is incorrect.",
  "auth/user-not-found": "The email or password is incorrect.",
  "auth/wrong-password": "The email or password is incorrect.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/email-already-in-use": "An account already uses this email address.",
  "auth/weak-password": "Choose a stronger password.",
  "auth/password-does-not-meet-requirements": "Your password does not meet the account security requirements.",
  "auth/popup-closed-by-user": "The Google sign-in window was closed. Try again.",
  "auth/popup-blocked": "Allow pop-ups for TaskSpace and try again.",
  "auth/network-request-failed": "Check your connection and try again.",
  "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
  "auth/unauthorized-domain": "This domain is not authorized for Firebase sign-in.",
  "auth/operation-not-allowed": "This sign-in method is not enabled for TaskSpace.",
  "auth/invalid-api-key": "Sign-in is unavailable. Check the Firebase configuration.",
  "auth/account-exists-with-different-credential": "Use the sign-in method already associated with this email.",
};

export function authErrorMessage(error, fallback) {
  return authSetupError || messages[error.code] || fallback;
}
