import { ContentPageShell, ContentSection } from "@/components/ContentPageShell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import {
  User, Users, Swords, MapPin, Network, Coins, Sparkles, Shield, Heart,
} from "lucide-react";

const PILLAR_ICONS = [User, Users, Swords, MapPin, Network, Coins];
const GOV_ICONS = [Shield, Sparkles, Coins, Heart, Users, MapPin];

export default function ProductVisionPage({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const visionItems = t("productVisionPage.visionItems", { returnObjects: true }) as string[];
  const pillars = t("productVisionPage.pillars", { returnObjects: true }) as { title: string; description: string; aiFeatures: string[]; goal: string }[];
  const aiRoleItems = t("productVisionPage.aiRoleItems", { returnObjects: true }) as string[];
  const governanceItems = t("productVisionPage.governanceItems", { returnObjects: true }) as { label: string }[];
  const promiseItems = t("productVisionPage.promiseItems", { returnObjects: true }) as string[];

  return (
    <ContentPageShell
      embedded={embedded}
      title={t("productVisionPage.title")}
      subtitle={t("productVisionPage.subtitle")}
    >
      {/* Ambition */}
      <ContentSection title={t("productVisionPage.ambitionTitle")}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("productVisionPage.ambitionP1")}
        </p>
        <p className="text-sm text-muted-foreground mt-2 italic">
          {t("productVisionPage.ambitionP2")}
        </p>
        <p className="text-sm font-semibold mt-2">
          👉 {t("productVisionPage.ambitionP3")}
        </p>
      </ContentSection>

      {/* Vision */}
      <ContentSection title={t("productVisionPage.visionTitle")}>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-5">
          {Array.isArray(visionItems) && visionItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </ContentSection>

      {/* Six Pillars */}
      <ContentSection title={t("productVisionPage.pillarsTitle")}>
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.isArray(pillars) && pillars.map((p, i) => {
            const Icon = PILLAR_ICONS[i];
            return (
              <Card key={i} className="p-5 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display font-bold text-sm leading-tight">{p.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                <ul className="space-y-1 pl-4">
                  {p.aiFeatures.map((f) => (
                    <li key={f} className="text-xs text-muted-foreground list-disc">{f}</li>
                  ))}
                </ul>
                <p className="text-xs font-semibold text-primary">🎯 {p.goal}</p>
              </Card>
            );
          })}
        </div>
      </ContentSection>

      {/* AI Role */}
      <ContentSection title={t("productVisionPage.aiRoleTitle")}>
        <div className="flex flex-wrap gap-2 mb-3">
          {Array.isArray(aiRoleItems) && aiRoleItems.map((item) => (
            <Badge key={item} variant="secondary" className="text-xs font-normal">
              {item}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground italic">
          🎯 {t("productVisionPage.aiRoleGoal")}
        </p>
      </ContentSection>

      {/* Governance */}
      <ContentSection title={t("productVisionPage.governanceTitle")}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.isArray(governanceItems) && governanceItems.map((g, i) => {
            const I = GOV_ICONS[i];
            return (
              <div key={i} className="flex items-center gap-2 rounded-lg border p-2.5">
                <I className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground">{g.label}</span>
              </div>
            );
          })}
        </div>
      </ContentSection>

      {/* Promise */}
      <ContentSection title={t("productVisionPage.promiseTitle")}>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          {t("productVisionPage.promiseDesc")}
        </p>
        <div className="flex flex-wrap gap-2">
          {Array.isArray(promiseItems) && promiseItems.map((p) => (
            <Badge key={p} className="text-xs px-3 py-1">{p}</Badge>
          ))}
        </div>
      </ContentSection>
    </ContentPageShell>
  );
}
