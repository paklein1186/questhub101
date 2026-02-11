import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import HomeFeed from "./HomeFeed";

export default function Index() {
  const { session, user, loading } = useAuth();

  if (loading) return null;

  // Unlogged visitors go to the persona selector
  if (!session) return <Navigate to="/welcome" replace />;

  // Redirect to onboarding if not completed
  if (user && !user.hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <HomeFeed />;
}
