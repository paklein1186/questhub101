/**
 * TerritoryGuestPortal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The "Portal" tab — a public-facing, guest-optimised landing experience.
 * Visible to anyone without an account or without being linked to this territory.
 *
 * Sections:
 *  1. Territory narrative / mission statement
 *  2. Live vitals snapshot (stats + health indicators)
 *  3. Featured active quests (CTA to join)
 *  4. Who lives / works here (public profiles, guilds)
 *  5. Sub-territories to explore
 *  6. Join / Register CTA
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Compass, Users, Shield, Leaf, Globe, ArrowRight, Zap,
  MapPin, ChevronRight, Sprout, Heart, Target,
} from "lucide-react";

/* ── Types ── */
interface TerritoryGuestPortalProps {
  territory: {
    id: string;
    name: string;
    level: string;
    summary?: string | null;
    stats?: Record<string, any> | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  memberCount: number;
  questCount: number;
  guildCount: number;
  naturalSystemCount: number;
  isAuthenticated: boolean;
  isAlreadyMember: boolean;
}

/* ── Hooks ── */
function useGuestPortalData(territoryId: string) {
  return useQuery({
    queryKey: ["territory-guest-portal", territoryId],
    queryFn: async () => {
      const [featuredQuestsRes, featuredPeopleRes, subTerritoriesRes, guildsRes] = await Promise.all([
        (supabase
          .from("quest_territories" as any)
          .select("quest_id, quests(id, title, description, quest_nature, xp_reward, status)") as any)
          .eq("territory_id", territoryId)
          .limit(3),

        (supabase
          .from("profiles")
          .select("user_id, name, avatar_url, headline, persona_type") as any)
          .eq("territory_id", territoryId)
          .limit(8),

        supabase
          .from("territories")
          .select("id, name, level, slug, stats")
          .eq("parent_id", territoryId)
          .eq("is_deleted", false)
          .order("name")
          .limit(8),

        supabase
          .from("guild_territories")
          .select("guild_id, guilds(id, name, description, avatar_url, member_count)")
          .eq("territory_id", territoryId)
          .limit(4),
      ]);

      const quests = (featuredQuestsRes.data ?? [])
        .map((r: any) => r.quests)
        .filter((q: any) => q && (q.status === "ACTIVE" || q.status === "OPEN" || q.status === "PUBLISHED"));

      const people = featuredPeopleRes.data ?? [];
      const subTerritories = subTerritoriesRes.data ?? [];
      const guilds = (guildsRes.data ?? []).map((r: any) => r.guilds).filter(Boolean);

      return { quests, people, subTerritories, guilds };
    },
    enabled: !!territoryId,
    staleTime: 120_000,
  });
}

/* ── Mini quest card ── */
function GuestQuestCard({ quest }: { quest: any }) {
  const natureColors: Record<string, string> = {
    IDEA: "text-yellow-500 bg-yellow-500/10",
    ACHIEVEMENT: "text-violet-500 bg-violet-500/10",
    ONGOING_PROJECT: "text-blue-500 bg-blue-500/10",
    MISSION: "text-red-500 bg-red-500/10",
  };
  const cls = quest.quest_nature ? natureColors[quest.quest_nature] : "text-primary bg-primary/10";

  return (
    <Link to={`/quests/${quest.id}`}>
      <Card className="group hover:border-primary/40 transition-all cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", cls)}>
              <Target className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {quest.title}
              </p>
              {quest.xp_reward > 0 && (
                <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                  <Zap className="h-3 w-3" /> {quest.xp_reward} XP
                </p>
              )}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/* ── Stat block ── */
function StatBlock({ value, label, icon: Icon, color }: {
  value: number | string;
  label: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-muted/40 border border-border/40">
      <Icon className={cn("h-5 w-5", color ?? "text-muted-foreground")} />
      <span className="text-2xl font-display font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
}

/* ── Main component ── */
export function TerritoryGuestPortal({
  territory,
  memberCount,
  questCount,
  guildCount,
  naturalSystemCount,
  isAuthenticated,
  isAlreadyMember,
}: TerritoryGuestPortalProps) {
  const navigate = useNavigate();
  const { data } = useGuestPortalData(territory.id);

  const isPristine = memberCount === 0 && questCount === 0;

  return (
    <div className="space-y-10">
      {/* ── Section 1: Narrative ── */}
      <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-muted/30 to-muted/10 p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-foreground mb-2">
              Welcome to {territory.name}
            </h2>
            {territory.summary ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{territory.summary}</p>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                This territory is part of the CTG regenerative network. Members here collaborate on quests,
                share resources, and care for local ecosystems.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Section 2: Live vitals ── */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Territory at a glance
        </h3>
        {isPristine ? (
          <div className="rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 p-6 text-center">
            <Sprout className="h-10 w-10 text-amber-500/60 mx-auto mb-3" />
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              This territory is waiting for its first pioneer
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              No one has claimed stewardship yet. Be the first to activate it.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBlock value={memberCount} label="Members" icon={Users} color="text-blue-500" />
            <StatBlock value={questCount} label="Quests" icon={Compass} color="text-violet-500" />
            <StatBlock value={guildCount} label="Guilds" icon={Shield} color="text-amber-500" />
            <StatBlock value={naturalSystemCount} label="Natural Systems" icon={Leaf} color="text-green-500" />
          </div>
        )}
      </section>

      {/* ── Location Map ── */}
      {territory.latitude && territory.longitude && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Location
          </h3>
          <div className="rounded-2xl border border-border/60 overflow-hidden" style={{ height: 260 }}>
            <MapContainer
              center={[territory.latitude, territory.longitude]}
              zoom={territory.level === "TOWN" || territory.level === "LOCALITY" ? 12 : territory.level === "PROVINCE" || territory.level === "REGION" ? 8 : 5}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
              attributionControl={false}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              <Marker
                position={[territory.latitude, territory.longitude]}
                icon={L.divIcon({
                  className: "",
                  html: `<div style="background: hsl(var(--primary)); width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.4);"></div>`,
                  iconSize: [14, 14],
                  iconAnchor: [7, 7],
                })}
              >
                <Popup>
                  <span className="text-xs font-medium">{territory.name}</span>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </section>
      )}

      {/* ── Section 3: Featured Quests ── */}
      {(data?.quests ?? []).length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Open Quests
            </h3>
            <Link
              to={`/territories/${territory.id}?tab=ecosystem`}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {data!.quests.map((q: any) => <GuestQuestCard key={q.id} quest={q} />)}
          </div>
        </section>
      )}

      {/* ── Section 4: People here ── */}
      {(data?.people ?? []).length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            People in {territory.name}
          </h3>
          <div className="flex flex-wrap gap-2">
            {data!.people.map((p: any) => (
              <Link
                key={p.user_id}
                to={`/users/${p.user_id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-muted/40 transition-all group"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={p.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">{p.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                    {p.name}
                  </p>
                  {p.headline && (
                    <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                      {p.headline}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Section 5: Guilds ── */}
      {(data?.guilds ?? []).length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Active Guilds
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data!.guilds.map((g: any) => (
              <Link key={g.id} to={`/guilds/${g.id}`}>
                <Card className="group hover:border-primary/40 transition-all cursor-pointer">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="h-9 w-9 rounded-lg">
                      <AvatarImage src={g.avatar_url ?? undefined} />
                      <AvatarFallback className="rounded-lg text-xs bg-amber-500/10 text-amber-600">
                        {g.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {g.name}
                      </p>
                      {g.member_count && (
                        <p className="text-[10px] text-muted-foreground">
                          {g.member_count} members
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 ml-auto shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Section 6: Sub-territories ── */}
      {(data?.subTerritories ?? []).length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Explore within {territory.name}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {data!.subTerritories.map((t: any) => (
              <Link
                key={t.id}
                to={`/territories/${t.slug ?? t.id}`}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-muted/30 transition-all group"
              >
                <MapPin className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                  {t.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Section 7: Join CTA ── */}
      {!isAlreadyMember && (
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-base font-display font-bold text-foreground mb-2">
            Join the {territory.name} community
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
            Connect with regenerative pioneers, contribute to quests, and help steward this territory's transition.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {isAuthenticated ? (
              <Button
                size="sm"
                onClick={() => navigate(`/settings?tab=territory&set=${territory.id}`)}
                className="gap-1.5"
              >
                <MapPin className="h-3.5 w-3.5" /> Set as my territory
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={() => navigate(`/signup?territory=${territory.id}`)}
                  className="gap-1.5"
                >
                  <Sprout className="h-3.5 w-3.5" /> Join CTG
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/login?redirect=/territories/${territory.id}`)}
                >
                  Sign in
                </Button>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
