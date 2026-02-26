import { useSearchParams } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

const RevenueModelsPage = lazy(() => import("@/pages/RevenueModelsPage"));
const CreditEconomyPage = lazy(() => import("@/pages/CreditEconomyPage"));
const GovernancePage = lazy(() => import("@/pages/GovernancePage"));
const TrustGraphPage = lazy(() => import("@/pages/TrustGraphPage"));
const OpenValueNetworkPage = lazy(() => import("@/pages/OpenValueNetworkPage"));

const TABS = [
  { value: "revenue", labelKey: "hubs.tabs.revenue" },
  { value: "credits", labelKey: "hubs.tabs.credits" },
  { value: "trust", labelKey: "hubs.tabs.trustGraph" },
  { value: "governance", labelKey: "hubs.tabs.governance" },
  { value: "ovn", labelKey: "hubs.tabs.ovn" },
] as const;

export default function EcosystemHub() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "revenue";
  const { t } = useTranslation();

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">{t("hubs.ecosystem.title")}</h1>
        <p className="text-muted-foreground mb-6">{t("hubs.ecosystem.subtitle")}</p>
        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
          <TabsList className="flex-wrap h-auto gap-1 mb-6">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
                {t(tab.labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>
          <Suspense fallback={<div className="py-12 text-center text-muted-foreground text-sm">{t("common.loading")}</div>}>
            <TabsContent value="revenue"><RevenueModelsPage embedded /></TabsContent>
            <TabsContent value="credits"><CreditEconomyPage embedded /></TabsContent>
            <TabsContent value="trust"><TrustGraphPage embedded /></TabsContent>
            <TabsContent value="governance"><GovernancePage embedded /></TabsContent>
            <TabsContent value="ovn"><OpenValueNetworkPage embedded /></TabsContent>
          </Suspense>
        </Tabs>
      </div>
    </PageShell>
  );
}
