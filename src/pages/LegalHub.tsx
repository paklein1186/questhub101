import { useSearchParams } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { lazy, Suspense } from "react";

const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));

const TABS = [
  { value: "privacy", label: "Privacy" },
  { value: "terms", label: "Terms" },
  { value: "contact", label: "Contact" },
] as const;

export default function LegalHub() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "privacy";

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">Legal & Contact</h1>
        <p className="text-muted-foreground mb-6">Privacy, terms and how to reach us.</p>
        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
          <TabsList className="flex-wrap h-auto gap-1 mb-6">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Suspense fallback={<div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>}>
            <TabsContent value="privacy"><PrivacyPage embedded /></TabsContent>
            <TabsContent value="terms"><TermsPage embedded /></TabsContent>
            <TabsContent value="contact"><ContactPage embedded /></TabsContent>
          </Suspense>
        </Tabs>
      </div>
    </PageShell>
  );
}
