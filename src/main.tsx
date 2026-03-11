import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";
import { initMonitoring, reportWebVitals } from "./lib/monitoring";

// Initialize error monitoring before React renders
initMonitoring();

createRoot(document.getElementById("root")!).render(<App />);

// Report Web Vitals after mount
reportWebVitals();
