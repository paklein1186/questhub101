import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Users, Building2, Shield, MapPin, Sparkles, Compass,
  Loader2, Globe, Plus, CircleDot, Briefcase, Settings,
  ArrowRight, Hash, Rss,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePersona } from "@/hooks/usePersona";
import { MatchmakerPanel } from "@/components/MatchmakerPanel";
import { useFollowingFeed } from "@/hooks/useFollowingFeed";
import { PostCard } from "@/components/feed/PostCard";
import { FeedSortControl, type FeedSortMode } from "@/components/feed/FeedSortControl";
import { usePostUpvotes } from "@/hooks/usePostUpvote";
import { sortPosts } from "@/lib/feedSort";
import {
  useMyGuildMemberships, useMyCompanyMemberships, useMyPodMemberships,
  usePeopleInOrbit, useMyTerritories, useMyTopics, useTerritoryActivity,
} from "@/hooks/useNetworkData";

function EmptyState({ icon: Icon, message, cta, to }: { icon: any; message: string; cta: string; to: string }) {
  return (
    <div className="text-center py-12 rounded-xl border border-dashed border-border">
      <Icon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-muted-foreground mb-3">{message}</p>
      <Button size="sm" asChild><Link to={to}><Plus className="h-4 w-4 mr-1" /> {cta}</Link></Button>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, count, seeMoreTo }: { icon: any; title: string; count?: number; seeMoreTo?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-display font-semibold flex items-center gap-2">
        <Icon className="h-4.5 w-4.5 text-primary" /> {title}
        {count != null && <Badge variant="secondary" className="text-[10px]">{count}</Badge>}
      </h3>
      {seeMoreTo && (
        <Button size="sm" variant="ghost" asChild className="text-xs">
          <Link to={seeMoreTo}>See more <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
        </Button>
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────
export default function NetworkHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const setTab = (t: string) => setSearchParams({ tab: t }, { replace: true });
  const currentUser = useCurrentUser();
  const { persona, label } = usePersona();

  const { data: guildMemberships = [], isLoading: loadingGuilds } = useMyGuildMemberships(currentUser.id);
  const { data: companyMemberships = [], isLoading: loadingCompanies } = useMyCompanyMemberships(currentUser.id);
  const { data: podMemberships = [], isLoading: loadingPods } = useMyPodMemberships(currentUser.id);
  const { data: people = [], isLoading: loadingPeople } = usePeopleInOrbit(currentUser.id);
  const { data: myTerritories = [], isLoading: loadingTerritories } = useMyTerritories(currentUser.id);
  const { data: myTopics = [], isLoading: loadingTopics } = useMyTopics(currentUser.id);

  const territoryIds = useMemo(() => myTerritories.map((t: any) => t.territoryId), [myTerritories]);
  const { data: territoryActivity = {} } = useTerritoryActivity(territoryIds);

  const isLoading = loadingGuilds || loadingCompanies || loadingPeople || loadingTerritories;

  // Persona-aware section ordering
  const overviewSections = useMemo(() => {
    const sections = ["people", "guilds", "companies", "territories", "ai"];
    if (persona === "IMPACT") return ["guilds", "companies", "territories", "people", "ai"];
    if (persona === "CREATIVE") return ["people", "guilds", "territories", "companies", "ai"];
    return sections;
  }, [persona]);

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Globe className="h-7 w-7 text-primary" /> My Network
        </h1>
        <p className="text-muted-foreground mt-1">Your ecosystem at a glance — people, organizations, and territories connected to you.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="following"><Rss className="h-3.5 w-3.5 mr-1" /> Following</TabsTrigger>
          <TabsTrigger value="people"><Users className="h-3.5 w-3.5 mr-1" /> People ({people.length})</TabsTrigger>
          <TabsTrigger value="guilds"><Shield className="h-3.5 w-3.5 mr-1" /> {label("guild.label")} ({guildMemberships.length})</TabsTrigger>
          <TabsTrigger value="companies"><Building2 className="h-3.5 w-3.5 mr-1" /> Companies ({companyMemberships.length})</TabsTrigger>
          <TabsTrigger value="territories"><MapPin className="h-3.5 w-3.5 mr-1" /> Territories & Houses</TabsTrigger>
        </TabsList>

        {/* ═══════════════ OVERVIEW ═══════════════ */}
        <TabsContent value="overview" className="mt-0 space-y-8">
          {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

          {!isLoading && overviewSections.map((section) => {
            if (section === "people") return <OverviewPeople key="people" people={people} />;
            if (section === "guilds") return <OverviewGuilds key="guilds" memberships={guildMemberships} label={label} />;
            if (section === "companies") return <OverviewCompanies key="companies" memberships={companyMemberships} />;
            if (section === "territories") return <OverviewTerritories key="territories" territories={myTerritories} topics={myTopics} activity={territoryActivity} />;
            if (section === "ai") return (
              <div key="ai">
                <SectionHeader icon={Sparkles} title="AI Suggestions" />
                <MatchmakerPanel matchType="user" userId={currentUser.id} />
              </div>
            );
            return null;
          })}
        </TabsContent>

        {/* ═══════════════ FOLLOWING FEED ═══════════════ */}
        <TabsContent value="following" className="mt-0">
          <FollowingFeedTab />
        </TabsContent>

        {/* ═══════════════ PEOPLE ═══════════════ */}
        <TabsContent value="people" className="mt-0">
          <PeopleTab people={people} loading={loadingPeople} />
        </TabsContent>

        {/* ═══════════════ GUILDS ═══════════════ */}
        <TabsContent value="guilds" className="mt-0">
          <GuildsTab memberships={guildMemberships} loading={loadingGuilds} label={label} />
        </TabsContent>

        {/* ═══════════════ COMPANIES ═══════════════ */}
        <TabsContent value="companies" className="mt-0">
          <CompaniesTab memberships={companyMemberships} loading={loadingCompanies} />
        </TabsContent>

        {/* ═══════════════ TERRITORIES & HOUSES ═══════════════ */}
        <TabsContent value="territories" className="mt-0">
          <TerritoriesTab territories={myTerritories} topics={myTopics} activity={territoryActivity} loadingT={loadingTerritories} loadingH={loadingTopics} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

// ─── Overview sections ──────────────────────────────────────
function OverviewPeople({ people }: { people: any[] }) {
  const top = people.slice(0, 6);
  return (
    <div>
      <SectionHeader icon={Users} title="People in your orbit" count={people.length} seeMoreTo="/network?tab=people" />
      {top.length === 0 ? (
        <EmptyState icon={Users} message="Join guilds, companies or quests to build your network." cta="Explore guilds" to="/explore?tab=guilds" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {top.map((p, i) => <PersonCard key={p.user_id} person={p} index={i} />)}
        </div>
      )}
    </div>
  );
}

function OverviewGuilds({ memberships, label }: { memberships: any[]; label: (k: string) => string }) {
  const top = memberships.slice(0, 4);
  return (
    <div>
      <SectionHeader icon={Shield} title={`${label("guild.label")} in your orbit`} count={memberships.length} seeMoreTo="/network?tab=guilds" />
      {top.length === 0 ? (
        <EmptyState icon={Shield} message={`You haven't joined any ${label("guild.label").toLowerCase()} yet.`} cta={`Explore ${label("guild.label").toLowerCase()}`} to="/explore?tab=guilds" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {top.map((m, i) => <GuildCard key={m.guildId} membership={m} index={i} />)}
        </div>
      )}
    </div>
  );
}

function OverviewCompanies({ memberships }: { memberships: any[] }) {
  const top = memberships.slice(0, 4);
  return (
    <div>
      <SectionHeader icon={Building2} title="Companies in your orbit" count={memberships.length} seeMoreTo="/network?tab=companies" />
      {top.length === 0 ? (
        <EmptyState icon={Building2} message="No companies linked to your account." cta="Create a company" to="/me/companies" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {top.map((m, i) => <CompanyCard key={m.companyId} membership={m} index={i} />)}
        </div>
      )}
    </div>
  );
}

function OverviewTerritories({ territories, topics, activity }: { territories: any[]; topics: any[]; activity: any }) {
  return (
    <div>
      <SectionHeader icon={MapPin} title="Territories & Houses around you" seeMoreTo="/network?tab=territories" />
      {territories.length === 0 && topics.length === 0 ? (
        <EmptyState icon={MapPin} message="Add territories and houses in your profile settings." cta="Edit profile" to="/profile/edit" />
      ) : (
        <div className="space-y-3">
          {territories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {territories.map((t: any) => {
                const a = activity[t.territoryId];
                return (
                  <div key={t.territoryId} className="rounded-lg border border-border bg-card px-3 py-2">
                    <span className="text-sm font-medium flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-primary" />{t.territory?.name}</span>
                    {a && <span className="text-[10px] text-muted-foreground block mt-0.5">{a.guilds}g · {a.companies}c · {a.quests}q</span>}
                  </div>
                );
              })}
            </div>
          )}
          {topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {topics.map((t: any) => (
                <Link key={t.id} to={`/topics/${t.slug}`}>
                  <Badge variant="outline" className="text-xs hover:border-primary/40 transition-colors"><Hash className="h-3 w-3 mr-0.5" />{t.name}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── People tab ──────────────────────────────────────────────
function PeopleTab({ people, loading }: { people: any[]; loading: boolean }) {
  const [sort, setSort] = useState<"interactions" | "recent">("interactions");

  const sorted = useMemo(() => {
    const arr = [...people];
    if (sort === "interactions") arr.sort((a, b) => b.totalShared - a.totalShared);
    return arr;
  }, [people, sort]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{people.length} people in your orbit</p>
        <div className="flex gap-1">
          <Button size="sm" variant={sort === "interactions" ? "default" : "outline"} onClick={() => setSort("interactions")} className="text-xs h-7">Most shared</Button>
          <Button size="sm" variant={sort === "recent" ? "default" : "outline"} onClick={() => setSort("recent")} className="text-xs h-7">Recent</Button>
        </div>
      </div>
      {sorted.length === 0 ? (
        <EmptyState icon={Users} message="Join guilds, companies or quests to build your network." cta="Explore" to="/explore" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p, i) => <PersonCard key={p.user_id} person={p} index={i} />)}
        </div>
      )}
    </div>
  );
}

// ─── Guilds tab ──────────────────────────────────────────────
function GuildsTab({ memberships, loading, label }: { memberships: any[]; loading: boolean; label: (k: string) => string }) {
  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const adminGuilds = memberships.filter(m => ["admin", "steward", "owner"].includes(m.role));
  const memberGuilds = memberships.filter(m => !["admin", "steward", "owner"].includes(m.role));

  return (
    <div className="space-y-6">
      {adminGuilds.length > 0 && (
        <div>
          <SectionHeader icon={Shield} title={`${label("guild.label")} you manage`} count={adminGuilds.length} />
          <div className="grid gap-3 md:grid-cols-2">
            {adminGuilds.map((m, i) => <GuildCard key={m.guildId} membership={m} index={i} />)}
          </div>
        </div>
      )}

      {memberGuilds.length > 0 && (
        <div>
          <SectionHeader icon={Users} title={`${label("guild.label")} you belong to`} count={memberGuilds.length} />
          <div className="grid gap-3 md:grid-cols-2">
            {memberGuilds.map((m, i) => <GuildCard key={m.guildId} membership={m} index={i} />)}
          </div>
        </div>
      )}

      {memberships.length === 0 && (
        <EmptyState icon={Shield} message={`You haven't joined any ${label("guild.label").toLowerCase()} yet.`} cta={`Explore ${label("guild.label").toLowerCase()}`} to="/explore?tab=guilds" />
      )}

      <div className="pt-2">
        <Button variant="outline" asChild><Link to="/explore?tab=guilds">Discover more {label("guild.label").toLowerCase()} <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
      </div>
    </div>
  );
}

// ─── Companies tab ───────────────────────────────────────────
function CompaniesTab({ memberships, loading }: { memberships: any[]; loading: boolean }) {
  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const adminComps = memberships.filter(m => ["admin", "owner"].includes(m.role));
  const memberComps = memberships.filter(m => !["admin", "owner"].includes(m.role));

  return (
    <div className="space-y-6">
      {adminComps.length > 0 && (
        <div>
          <SectionHeader icon={Building2} title="Companies you manage" count={adminComps.length} />
          <div className="grid gap-3 md:grid-cols-2">
            {adminComps.map((m, i) => <CompanyCard key={m.companyId} membership={m} index={i} />)}
          </div>
        </div>
      )}

      {memberComps.length > 0 && (
        <div>
          <SectionHeader icon={Users} title="Companies you belong to" count={memberComps.length} />
          <div className="grid gap-3 md:grid-cols-2">
            {memberComps.map((m, i) => <CompanyCard key={m.companyId} membership={m} index={i} />)}
          </div>
        </div>
      )}

      {memberships.length === 0 && (
        <EmptyState icon={Building2} message="No companies linked to your account." cta="Create a company" to="/me/companies" />
      )}

      <div className="flex gap-2 pt-2">
        <Button size="sm" asChild><Link to="/me/companies"><Plus className="h-4 w-4 mr-1" /> Create company</Link></Button>
        <Button size="sm" variant="outline" asChild><Link to="/explore?tab=companies">Explore companies <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
      </div>
    </div>
  );
}

// ─── Territories tab ─────────────────────────────────────────
function TerritoriesTab({ territories, topics, activity, loadingT, loadingH }: { territories: any[]; topics: any[]; activity: any; loadingT: boolean; loadingH: boolean }) {
  if (loadingT || loadingH) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-8">
      {/* Territories */}
      <div>
        <SectionHeader icon={MapPin} title="Your territories" count={territories.length} />
        {territories.length === 0 ? (
          <EmptyState icon={MapPin} message="Add territories in your profile settings." cta="Edit profile" to="/profile/edit" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {territories.map((t: any, i: number) => {
              const a = activity[t.territoryId] || { guilds: 0, companies: 0, quests: 0 };
              return (
                <motion.div key={t.territoryId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-display font-semibold">{t.territory?.name}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto capitalize">{t.attachmentType?.toLowerCase()}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-lg font-bold text-primary">{a.guilds}</p>
                      <p className="text-[10px] text-muted-foreground">Guilds</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-lg font-bold text-primary">{a.companies}</p>
                      <p className="text-[10px] text-muted-foreground">Companies</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-lg font-bold text-primary">{a.quests}</p>
                      <p className="text-[10px] text-muted-foreground">Quests</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Houses */}
      <div>
        <SectionHeader icon={Hash} title="Your houses (topics)" count={topics.length} />
        {topics.length === 0 ? (
          <EmptyState icon={Hash} message="Add houses (topics) in your profile settings." cta="Edit profile" to="/profile/edit" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {topics.map((t: any) => (
              <Link key={t.id} to={`/topics/${t.slug}`}>
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="rounded-lg border border-border bg-card px-4 py-2.5 hover:border-primary/30 transition-all">
                  <span className="text-sm font-medium flex items-center gap-1.5"><Hash className="h-3.5 w-3.5 text-primary" />{t.name}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared card components ──────────────────────────────────
function PersonCard({ person, index }: { person: any; index: number }) {
  const { sharedGuilds, sharedCompanies, sharedPods, sharedQuests } = person.shared;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
      <Link to={`/users/${person.user_id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-all">
        <Avatar className="h-10 w-10">
          <AvatarImage src={person.avatar_url} />
          <AvatarFallback>{person.name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{person.name}</p>
          {person.headline && <p className="text-xs text-muted-foreground truncate">{person.headline}</p>}
          <div className="flex flex-wrap gap-1 mt-1">
            {sharedGuilds > 0 && <Badge variant="secondary" className="text-[9px]">{sharedGuilds} guild{sharedGuilds > 1 ? "s" : ""}</Badge>}
            {sharedCompanies > 0 && <Badge variant="secondary" className="text-[9px]">{sharedCompanies} company</Badge>}
            {sharedPods > 0 && <Badge variant="secondary" className="text-[9px]">{sharedPods} pod{sharedPods > 1 ? "s" : ""}</Badge>}
            {sharedQuests > 0 && <Badge variant="secondary" className="text-[9px]">{sharedQuests} quest{sharedQuests > 1 ? "s" : ""}</Badge>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function GuildCard({ membership, index }: { membership: any; index: number }) {
  const g = membership.guild;
  const topics = (g?.guild_topics ?? []).map((gt: any) => gt.topics).filter(Boolean);
  const territories = (g?.guild_territories ?? []).map((gt: any) => gt.territories).filter(Boolean);
  const isAdmin = ["admin", "steward", "owner"].includes(membership.role);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <Link to={`/guilds/${g.id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
        <div className="flex items-center gap-3 mb-2">
          {g.logo_url && <Avatar className="h-10 w-10 rounded-lg"><AvatarImage src={g.logo_url} /><AvatarFallback>{g.name?.[0]}</AvatarFallback></Avatar>}
          <div className="flex-1 min-w-0">
            <h4 className="font-display font-semibold truncate">{g.name}</h4>
            <Badge variant={isAdmin ? "default" : "secondary"} className="text-[10px] capitalize">{membership.role}</Badge>
          </div>
        </div>
        {g.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{g.description}</p>}
        <div className="flex flex-wrap gap-1">
          {territories.slice(0, 2).map((t: any) => <Badge key={t.id} variant="outline" className="text-[9px]"><MapPin className="h-2.5 w-2.5 mr-0.5" />{t.name}</Badge>)}
          {topics.slice(0, 3).map((t: any) => <Badge key={t.id} variant="outline" className="text-[9px]"><Hash className="h-2.5 w-2.5 mr-0.5" />{t.name}</Badge>)}
        </div>
      </Link>
    </motion.div>
  );
}

function CompanyCard({ membership, index }: { membership: any; index: number }) {
  const c = membership.company;
  const territories = (c?.company_territories ?? []).map((ct: any) => ct.territories).filter(Boolean);
  const isAdmin = ["admin", "owner"].includes(membership.role);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <Link to={`/companies/${c.id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
        <div className="flex items-center gap-3 mb-2">
          {c.logo_url && <img src={c.logo_url} className="h-10 w-10 rounded-lg" alt="" />}
          <div className="flex-1 min-w-0">
            <h4 className="font-display font-semibold truncate">{c.name}</h4>
            <div className="flex items-center gap-1.5">
              <Badge variant={isAdmin ? "default" : "secondary"} className="text-[10px] capitalize">{membership.role}</Badge>
              {c.sector && <span className="text-xs text-muted-foreground">{c.sector}</span>}
            </div>
          </div>
          {isAdmin && (
            <Button size="sm" variant="ghost" asChild onClick={(e) => e.stopPropagation()}>
              <Link to={`/companies/${c.id}/settings`}><Settings className="h-4 w-4" /></Link>
            </Button>
          )}
        </div>
        {c.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{c.description}</p>}
        <div className="flex flex-wrap gap-1">
          {territories.slice(0, 3).map((t: any) => <Badge key={t.id} variant="outline" className="text-[9px]"><MapPin className="h-2.5 w-2.5 mr-0.5" />{t.name}</Badge>)}
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Following Feed Tab ──────────────────────────────────────
const FEED_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "USER", label: "People" },
  { key: "GUILD", label: "Guilds" },
  { key: "COMPANY", label: "Companies" },
  { key: "QUEST", label: "Quests" },
  { key: "POD", label: "Pods" },
  { key: "COURSE", label: "Courses" },
  { key: "EVENT", label: "Events" },
  { key: "TERRITORY", label: "Territories" },
] as const;

const contextRoute: Record<string, string> = {
  GUILD: "/guilds",
  COMPANY: "/companies",
  POD: "/pods",
  QUEST: "/quests",
  COURSE: "/courses",
  SERVICE: "/services",
  USER: "/users",
};

function FollowingFeedTab() {
  const [filter, setFilter] = useState("ALL");
  const [sortMode, setSortMode] = useState<FeedSortMode>("recent");
  const { data: posts = [], isLoading } = useFollowingFeed(filter);

  const postIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const { data: myUpvotes = [] } = usePostUpvotes(postIds);
  const upvotedSet = useMemo(() => new Set(myUpvotes.map((u) => u.post_id)), [myUpvotes]);
  const sortedPosts = useMemo(() => sortPosts(posts, sortMode), [posts, sortMode]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <Rss className="h-5 w-5 text-primary" /> Your network feed
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Posts and updates from people and units you follow.
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {FEED_FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            className="text-xs h-7"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Sort control */}
      {posts.length > 0 && (
        <div className="flex justify-end">
          <FeedSortControl value={sortMode} onChange={setSortMode} />
        </div>
      )}

      {/* Posts */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sortedPosts.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border space-y-3">
          <Rss className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-muted-foreground font-medium">
            {filter !== "ALL"
              ? "No posts matching this filter."
              : "Your network feed is quiet for now."}
          </p>
          <p className="text-sm text-muted-foreground">
            Start following people, guilds, companies or quests to see their updates here.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/explore/users">Explore people</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/explore?tab=guilds">Find guilds</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/explore?tab=quests">Discover quests</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedPosts.map((post) => {
            const ctxName = (post as any).contextName;
            const route = contextRoute[post.context_type];
            return (
              <div key={post.id}>
                {ctxName && route && (
                  <div className="text-xs text-muted-foreground mb-1 pl-12">
                    {post.context_type === "USER" ? "on profile of " : "in "}
                    <Link
                      to={`${route}/${post.context_id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {ctxName}
                    </Link>
                  </div>
                )}
                <PostCard post={post} hasUpvoted={upvotedSet.has(post.id)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
