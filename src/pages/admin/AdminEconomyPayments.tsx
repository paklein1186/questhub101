import { Zap } from "lucide-react";

export default function AdminEconomyPayments() {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Zap className="h-6 w-6 text-primary" /> Payments & Revenue
      </h2>
      <p className="text-muted-foreground">Payments overview coming soon. Stripe integration data will be shown here.</p>
    </div>
  );
}
