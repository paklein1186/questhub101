import { ContentPageShell, ContentSection } from "@/components/ContentPageShell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import {
  User, Building2, Users, Coins, ListChecks, MapPin, CalendarDays, ArrowRightLeft, Sparkles, Vote,
} from "lucide-react";

const ICONS = [User, Building2, Users, Coins, ListChecks, MapPin, CalendarDays, ArrowRightLeft, Sparkles, Vote];

const AUDIENCE_COLORS: Record<string, string> = {
  Freelancers: "bg-primary/10 text-primary",
  Organizations: "bg-accent/50 text-accent-foreground",
  Collectives: "bg-secondary text-secondary-foreground",
  Communities: "bg-primary/15 text-primary",
  Everyone: "bg-muted text-muted-foreground",
  Territories: "bg-accent/30 text-accent-foreground",
  Citizens: "bg-secondary/80 text-secondary-foreground",
  "Ecosystem builders": "bg-primary/20 text-primary",
  "Co-owners": "bg-accent/40 text-accent-foreground",
};

export default function UseCasesPage({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const cases = t("useCasesPage.cases", { returnObjects: true }) as { title: string; audience: string; description: string; features: string[] }[];
  const whoForList = t("useCasesPage.whoForList", { returnObjects: true }) as string[];

  return (
    <ContentPageShell
      embedded={embedded}
      title={t("useCasesPage.title")}
      subtitle={t("useCasesPage.subtitle")}
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {Array.isArray(cases) && cases.map((uc, i) => {
          const Icon = ICONS[i];
          return (
            <Card key={i} className="p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-sm leading-tight">{uc.title}</h3>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${AUDIENCE_COLORS[uc.audience] || ""}`}>
                      {uc.audience}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{uc.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pl-11">
                {uc.features.map((f) => (
                  <Badge key={f} variant="secondary" className="text-[10px] font-normal">
                    {f}
                  </Badge>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <ContentSection title={t("useCasesPage.whoForTitle")}>
        <div className="flex flex-wrap gap-2">
          {Array.isArray(whoForList) && whoForList.map((who) => (
            <Badge key={who} className="text-xs px-3 py-1">
              {who}
            </Badge>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("useCasesPage.whoForDesc")}
        </p>
      </ContentSection>
    </ContentPageShell>
  );
}
