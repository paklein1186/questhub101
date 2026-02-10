import { ShoppingBag } from "lucide-react";
import { ServicesSection } from "./tabs/ContentTabs";

export default function AdminContentServices() {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <ShoppingBag className="h-6 w-6 text-primary" /> Services
      </h2>
      <ServicesSection />
    </div>
  );
}
