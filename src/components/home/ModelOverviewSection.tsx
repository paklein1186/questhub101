import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPin, ArrowRight, Coins, Network, Compass, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTerritoryLeaderboard } from "@/hooks/useNetworkLeaderboardData";

const TerritoryMapView = lazy(() =>
  import("@/components/network/TerritoryMapView").then((m) => ({ default: m.TerritoryMapView }))
);

const CARDS = [
  { key: "economy", icon: Coins, to: "/ecosystem?tab=revenue" },
  { key: "trust", icon: Network, to: "/ecosystem?tab=governance" },
  { key: "vision", icon: Compass, to: "/vision?tab=manifesto" },
  { key: "useCases", icon: Layers, to: "/vision?tab=use-cases" },
] as const;

/**
 * Condensed "what is this model" visual + explainer for the authenticated
 * dashboard — the live territory map plus deep links into the fuller
 * Vision/Écosystème hubs, instead of duplicating their full content here.
 */
export function ModelOverviewSection() {
  const { t } = useTranslation();
  const { data: territories = [], isLoading } = useTerritoryLeaderboard();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">{t("home.modelOverview.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("home.modelOverview.subtitle")}</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-[500px] w-full rounded-2xl" />
      ) : territories.length > 0 ? (
        <Suspense fallback={<Skeleton className="h-[500px] w-full rounded-2xl" />}>
          <TerritoryMapView territories={territories} scrollWheelZoom={false} />
        </Suspense>
      ) : null}

      <div className="text-center">
        <Link to="/territories" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <MapPin className="h-3.5 w-3.5" /> {t("home.modelOverview.mapCta")} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map(({ key, icon: Icon, to }) => (
          <Link
            key={key}
            to={to}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{t(`home.modelOverview.cards.${key}.title`)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t(`home.modelOverview.cards.${key}.subtitle`)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
