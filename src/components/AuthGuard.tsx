import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

/** Redirects to /login if user is not authenticated */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!session) return <Navigate to="/error/login-required" replace />;
  return <>{children}</>;
}

/** Redirects authenticated users away from login/signup */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { session, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (session) {
    // Check for a redirect URL stored in sessionStorage (e.g. from invite links)
    const storedRedirect = sessionStorage.getItem("postAuthRedirect");
    if (storedRedirect) {
      sessionStorage.removeItem("postAuthRedirect");
      return <Navigate to={storedRedirect} replace />;
    }

    if (user && !user.hasCompletedOnboarding) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
