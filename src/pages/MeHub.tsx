import { Navigate } from "react-router-dom";

// Me Hub has been merged into the unified /me page (SettingsPage).
export default function MeHub() {
  return <Navigate to="/me" replace />;
}
