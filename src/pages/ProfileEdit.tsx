import { Navigate } from "react-router-dom";

// Canonical profile editing lives in Settings → Profile & Identity tab.
// This page simply redirects there.
export default function ProfileEdit() {
  return <Navigate to="/me/settings?tab=profile" replace />;
}
