import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import LandingPage from "./LandingPage";
import HomeFeed from "./HomeFeed";

export default function Index() {
  const { session, user, loading } = useAuth();

  if (loading) return null;

  if (!session) return <LandingPage />;

  // Redirect to onboarding if not completed
  if (user && !user.hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <HomeFeed />;
}
