import { useSearchParams } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

const ManifestoPage = lazy(() => import("@/pages/ManifestoPage"));
const CooperativeVenturePage = lazy(() => import("@/pages/CooperativeVenturePage"));
const WhatComesNextPage = lazy(() => import("@/pages/WhatComesNextPage"));
const UseCasesPage = lazy(() => import("@/pages/UseCasesPage"));
const ProductVisionPage = lazy(() => import("@/pages/ProductVisionPage"));

const TABS = [
  { value: "manifesto", labelKey: "hubs.tabs.manifesto" },
  { value: "cooperative", labelKey: "hubs.tabs.cooperative" },
  { value: "what-comes-next", labelKey: "hubs.tabs.whatComesNext" },
  { value: "use-cases", labelKey: "hubs.tabs.useCases" },
  { value: "features", labelKey: "hubs.tabs.features" },
] as const;

export default function VisionHub() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "manifesto";
  const { t } = useTranslation();

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">{t("hubs.vision.title")}</h1>
        <p className="text-muted-foreground mb-6">{t("hubs.vision.subtitle")}</p>
        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
          <TabsList className="flex-wrap h-auto gap-1 mb-6">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
                {t(tab.labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>
          <Suspense fallback={<div className="py-12 text-center text-muted-foreground text-sm">{t("common.loading")}</div>}>
            <TabsContent value="manifesto"><ManifestoPage embedded /></TabsContent>
            <TabsContent value="cooperative"><CooperativeVenturePage embedded /></TabsContent>
            <TabsContent value="what-comes-next"><WhatComesNextPage embedded /></TabsContent>
            <TabsContent value="use-cases"><UseCasesPage embedded /></TabsContent>
            <TabsContent value="features"><ProductVisionPage embedded /></TabsContent>
          </Suspense>
        </Tabs>
      </div>
    </PageShell>
  );
}
