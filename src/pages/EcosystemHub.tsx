import { useSearchParams } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { lazy, Suspense } from "react";

const RevenueModelsPage = lazy(() => import("@/pages/RevenueModelsPage"));
const CreditEconomyPage = lazy(() => import("@/pages/CreditEconomyPage"));
const GovernancePage = lazy(() => import("@/pages/GovernancePage"));

const TABS = [
  { value: "revenue", label: "Revenue Models" },
  { value: "credits", label: "Credit Economy" },
  { value: "governance", label: "Governance" },
] as const;

export default function EcosystemHub() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "revenue";

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">Ecosystem</h1>
        <p className="text-muted-foreground mb-6">How value circulates and governance works.</p>
        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
          <TabsList className="flex-wrap h-auto gap-1 mb-6">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Suspense fallback={<div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>}>
            <TabsContent value="revenue"><RevenueModelsPage embedded /></TabsContent>
            <TabsContent value="credits"><CreditEconomyPage embedded /></TabsContent>
            <TabsContent value="governance"><GovernancePage embedded /></TabsContent>
          </Suspense>
        </Tabs>
      </div>
    </PageShell>
  );
}
