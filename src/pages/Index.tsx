import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import HomeFeed from "./HomeFeed";

export default function Index() {
  const { session, user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  // Unlogged visitors go to the persona selector
  if (!session) return <Navigate to="/welcome" replace />;

  // Redirect to onboarding if not completed
  if (user && !user.hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <HomeFeed />;
}
