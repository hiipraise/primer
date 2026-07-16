"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type User = {
  id: string;
  email: string | null;
  name: string;
  avatar_url: string | null;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signingIn: boolean;
  signInError: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  clearSignInError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // Fetch the current user on mount (server-side session is persisted via httpOnly cookie)
  useEffect(() => {
    // Check for OAuth callback errors in the URL
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");
    if (authError) {
      setSignInError(
        authError === "auth_callback_failed"
          ? "Sign-in could not be completed. Please try again."
          : `Authentication error: ${authError}`
      );
      // Clean the URL without reloading
      window.history.replaceState({}, "", window.location.pathname);
    }

    fetch("/api/auth/user")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user ?? null);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const signIn = useCallback(async () => {
    setSignInError(null);
    setSigningIn(true);
    try {
      const res = await fetch("/api/auth/signin");
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Sign-in failed" }));
        throw new Error(err.error ?? "Sign-in failed");
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No OAuth URL returned");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start sign-in";
      setSignInError(message);
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    window.location.href = "/api/auth/signout";
  }, []);

  const clearSignInError = useCallback(() => setSignInError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
        signInError,
        signingIn,
        clearSignInError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
