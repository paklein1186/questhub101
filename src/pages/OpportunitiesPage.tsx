import { useTranslation } from "react-i18next";
import { Compass } from "lucide-react";
import OpportunitiesExplore from "./OpportunitiesExplore";

export default function OpportunitiesPage() {
  const { t } = useTranslation();

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-3">
          <Compass className="h-7 w-7 text-primary" />
          {t("opportunities.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("opportunities.subtitle")}</p>
      </div>

      <OpportunitiesExplore bare />
    </div>
  );
}
