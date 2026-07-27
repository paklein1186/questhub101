import { lazy, Suspense, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight, Users, Swords, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UnitCoverImage } from "@/components/UnitCoverImage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useTerritoryLeaderboard } from "@/hooks/useNetworkLeaderboardData";

const TerritoryMapView = lazy(() =>
  import("@/components/network/TerritoryMapView").then((m) => ({ default: m.TerritoryMapView }))
);

interface ActiveEntity {
  id: string;
  name: string;
  logo_url: string | null;
  type: "GUILD" | "COMPANY";
  members: number;
  quests: number;
  score: number;
}

interface ActiveQuest {
  id: string;
  title: string;
  cover_image_url: string | null;
  participants: number;
  updates: number;
  score: number;
}

function useActiveEntities() {
  return useQuery<ActiveEntity[]>({
    queryKey: ["landing-active-entities"],
    staleTime: 300_000,
    queryFn: async () => {
      const [guildsRes, companiesRes] = await Promise.all([
        supabase
          .from("guilds")
          .select("id, name, logo_url")
          .eq("is_deleted", false)
          .eq("is_draft", false),
        supabase
          .from("companies")
          .select("id, name, logo_url")
          .eq("is_deleted", false),
      ]);

      const guilds = guildsRes.data ?? [];
      const companies = companiesRes.data ?? [];
      if (!guilds.length && !companies.length) return [];

      const [gMembers, cMembers, gQuests, cQuests] = await Promise.all([
        supabase.from("guild_members").select("guild_id"),
        supabase.from("company_members").select("company_id"),
        supabase.from("quests").select("guild_id").eq("is_deleted", false).eq("is_draft", false),
        supabase.from("quests").select("owner_id, owner_type").eq("is_deleted", false).eq("is_draft", false),
      ]);

      const tally = (rows: any[] | null, field: string) => {
        const m = new Map<string, number>();
        (rows ?? []).forEach((r) => {
          const v = r[field];
          if (v) m.set(v, (m.get(v) ?? 0) + 1);
        });
        return m;
      };

      const gm = tally(gMembers.data, "guild_id");
      const cm = tally(cMembers.data, "company_id");
      const gq = tally(gQuests.data, "guild_id");
      const cq = tally(
        (cQuests.data ?? []).filter((q: any) => q.owner_type === "COMPANY"),
        "owner_id"
      );

      const entities: ActiveEntity[] = [
        ...guilds.map((g) => ({
          id: g.id,
          name: g.name,
          logo_url: g.logo_url,
          type: "GUILD" as const,
          members: gm.get(g.id) ?? 0,
          quests: gq.get(g.id) ?? 0,
          score: (gm.get(g.id) ?? 0) * 2 + (gq.get(g.id) ?? 0) * 5,
        })),
        ...companies.map((c) => ({
          id: c.id,
          name: c.name,
          logo_url: c.logo_url,
          type: "COMPANY" as const,
          members: cm.get(c.id) ?? 0,
          quests: cq.get(c.id) ?? 0,
          score: (cm.get(c.id) ?? 0) * 2 + (cq.get(c.id) ?? 0) * 5,
        })),
      ];

      return entities
        .filter((e) => e.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
    },
  });
}

function useActiveQuests() {
  return useQuery<ActiveQuest[]>({
    queryKey: ["landing-active-quests"],
    staleTime: 300_000,
    queryFn: async () => {
      const { data: quests } = await supabase
        .from("quests")
        .select("id, title, cover_image_url")
        .eq("is_deleted", false)
        .eq("is_draft", false)
        .order("updated_at", { ascending: false })
        .limit(60);

      if (!quests?.length) return [];
      const ids = quests.map((q) => q.id);

      const [participants, updates] = await Promise.all([
        supabase.from("quest_participants").select("quest_id").in("quest_id", ids),
        supabase.from("quest_updates").select("quest_id").in("quest_id", ids),
      ]);

      const count = (rows: any[] | null, id: string) =>
        (rows ?? []).filter((r) => r.quest_id === id).length;

      return quests
        .map((q) => {
          const p = count(participants.data, q.id);
          const u = count(updates.data, q.id);
          return { ...q, participants: p, updates: u, score: p * 3 + u * 2 };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
    },
  });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-3">{children}</p>
  );
}

export function LandingLivingMapSection() {
  const { t } = useTranslation();
  const k = (s: string) => t(`landing.home.livingMap.${s}`);

  const { data: territories = [], isLoading: loadingT } = useTerritoryLeaderboard();
  const { data: entities = [], isLoading: loadingE } = useActiveEntities();
  const { data: quests = [], isLoading: loadingQ } = useActiveQuests();

  const topTerritories = useMemo(() => territories.slice(0, 15), [territories]);

  return (
    <section className="border-b border-border bg-muted/30">
      <div className="container px-5 sm:px-6 lg:px-8 py-14 md:py-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <SectionLabel>{k("label")}</SectionLabel>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{k("title")}</h2>
          <p className="mt-3 text-muted-foreground">{k("sub")}</p>
        </div>

        {/* Map */}
        {loadingT ? (
          <Skeleton className="h-[500px] w-full rounded-2xl" />
        ) : topTerritories.length > 0 ? (
          <Suspense fallback={<Skeleton className="h-[500px] w-full rounded-2xl" />}>
            <TerritoryMapView territories={topTerritories} scrollWheelZoom={false} />
          </Suspense>
        ) : null}

        {/* Clickable territory chips (map shapes can overlap) */}
        {topTerritories.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {topTerritories.map((t) => (
              <Link
                key={t.id}
                to={`/territories/${t.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs transition-colors hover:border-primary/40 hover:text-primary"
              >
                <MapPin className="h-3 w-3" /> {t.name}
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-4">
          <Link
            to="/territories"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <MapPin className="h-3.5 w-3.5" /> {k("mapCta")} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>


        {/* Entities gallery */}
        <div className="mt-16">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight">{k("entitiesTitle")}</h3>
              <p className="text-sm text-muted-foreground">{k("entitiesSub")}</p>
            </div>
            <Link to="/explore" className="text-sm text-primary hover:underline shrink-0">
              {k("seeAll")}
            </Link>
          </div>

          {loadingE ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : entities.length === 0 ? (
            <p className="text-sm text-muted-foreground">{k("empty")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {entities.map((e) => (
                <Link
                  key={`${e.type}-${e.id}`}
                  to={e.type === "GUILD" ? `/guilds/${e.id}` : `/companies/${e.id}`}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
                >
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarImage src={e.logo_url ?? undefined} alt={e.name} />
                    <AvatarFallback>{e.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{e.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" /> {e.members}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Swords className="h-3 w-3" /> {e.quests}
                      </span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Highlighted quests */}
        <div className="mt-14">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight">{k("questsTitle")}</h3>
              <p className="text-sm text-muted-foreground">{k("questsSub")}</p>
            </div>
            <Link to="/explore?tab=quests" className="text-sm text-primary hover:underline shrink-0">
              {k("seeAll")}
            </Link>
          </div>

          {loadingQ ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-52 rounded-2xl" />
              ))}
            </div>
          ) : quests.length === 0 ? (
            <p className="text-sm text-muted-foreground">{k("empty")}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quests.map((q) => (
                <Link
                  key={q.id}
                  to={`/quests/${q.id}`}
                  className="group block rounded-2xl border border-border bg-card overflow-hidden transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
                >
                  <UnitCoverImage
                    type="QUEST"
                    imageUrl={q.cover_image_url}
                    name={q.title}
                    height="h-32"
                  />
                  <div className="p-4">
                    <h4 className="font-display font-semibold text-sm line-clamp-2">{q.title}</h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-3 mt-2">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" /> {q.participants}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Swords className="h-3 w-3" /> {q.updates}
                      </span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
