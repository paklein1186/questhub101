import { useAuth } from "@/hooks/useAuth";
import LandingPage from "./LandingPage";
import HomeFeed from "./HomeFeed";

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) return null;

  if (!session) return <LandingPage />;

  return <HomeFeed />;
}
