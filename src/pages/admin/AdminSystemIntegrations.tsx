import { Settings } from "lucide-react";

export default function AdminSystemIntegrations() {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" /> Integrations
      </h2>
      <p className="text-muted-foreground">Integration management (Stripe, email providers, etc.) coming soon.</p>
    </div>
  );
}
