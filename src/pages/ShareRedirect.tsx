import { useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

const ROUTE_MAP: Record<string, string> = {
  quest: "/quests",
  guild: "/guilds",
  service: "/services",
  company: "/companies",
  event: "/events",
  course: "/courses",
  profile: "/users",
  territory: "/territories",
  pod: "/pods",
  topic: "/topics",
};

/**
 * Fallback route for /share/:type/:id
 * When the _redirects proxy doesn't intercept (e.g. in SPA mode),
 * this component redirects the user to the correct app route.
 */
const ShareRedirect = (): null => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!type || !id) {
      navigate("/", { replace: true });
      return;
    }
    const basePath = ROUTE_MAP[type];
    if (!basePath) {
      navigate("/", { replace: true });
      return;
    }
    const ref = searchParams.get("ref");
    const qs = ref ? `?ref=${encodeURIComponent(ref)}` : "";
    navigate(`${basePath}/${id}${qs}`, { replace: true });
  }, [type, id, navigate, searchParams]);

  return null;
};

export default ShareRedirect;
