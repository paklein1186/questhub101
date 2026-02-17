import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import {
  Users, Building2, Shield, MapPin, Sparkles, Compass,
  Loader2, Globe, Plus, CircleDot, Briefcase, Settings,
  ArrowRight, Hash, Rss, Trophy, Activity,
  LayoutDashboard,
} from "lucide-react";
import { useTabOrder } from "@/hooks/useTabOrder";
import { SortableTabsList, type TabDefinition } from "@/components/SortableTabsList";
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
import { PostTile } from "@/components/feed/PostTile";
import { FeedDisplayToggle, type FeedDisplayMode } from "@/components/feed/FeedDisplayToggle";
import { FeedSortControl, type FeedSortMode } from "@/components/feed/FeedSortControl";
import { usePostUpvotes } from "@/hooks/usePostUpvote";
import { sortPosts } from "@/lib/feedSort";
import LeaderboardTab from "@/components/LeaderboardTab";
import NetworkDashboardTab from "@/components/network/NetworkDashboardTab";
import TerritoryTopicLeaderboard from "@/components/network/TerritoryTopicLeaderboard";
import NetworkActivityTab from "@/components/network/NetworkActivityTab";
import {
  useMyGuildMemberships, useMyCompanyMemberships, useMyPodMemberships,
  usePeopleInOrbit, useMyTerritories, useMyTopics, useTerritoryActivity,
} from "@/hooks/useNetworkData";
import { FollowOnHoverButton, useFollowedUserIds } from "@/components/FollowOnHoverButton";

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

const NETWORK_DEFAULT_TABS = ["activity", "dashboard", "following", "overview", "people", "entities", "territories", "leaderboard"];

function NetworkTabs({ tab, setTab, people, totalEntities, isLoading, loadingPeople, loadingGuilds, loadingPods, loadingCompanies, overviewSections, guildMemberships, companyMemberships, podMemberships, myTerritories, myTopics, territoryActivity, label, entitySub, setEntitySub, currentUser }: any) {
  const { orderedTabs, saveOrder, resetOrder, isCustomized } = useTabOrder("network_hub", NETWORK_DEFAULT_TABS);

  const { t } = useTranslation();
  const tabDefs: TabDefinition[] = [
    { value: "following", label: <><Rss className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">{t("tabs.following")}</span><span className="sm:hidden">{t("tabs.following")}</span></> },
    { value: "activity", label: <><Activity className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">{t("tabs.activity")}</span></> },
    { value: "overview", label: t("tabs.overview") },
    { value: "dashboard", label: <><LayoutDashboard className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Dashboard</span></> },
    { value: "people", label: <><Users className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">{t("tabs.people")} ({people.length})</span><span className="sm:hidden">{people.length}</span></> },
    { value: "entities", label: <><Briefcase className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">{t("tabs.entities")} ({totalEntities})</span><span className="sm:hidden">{totalEntities}</span></> },
    { value: "territories", label: <><MapPin className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">{t("tabs.territoriesAndTopics")}</span><span className="sm:hidden">{t("tabs.areas")}</span></> },
    { value: "leaderboard", label: <><Trophy className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">{t("tabs.leaderboard")}</span></> },
  ];

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <div className="group/tabs mb-6">
        <SortableTabsList
          tabs={tabDefs}
          orderedKeys={orderedTabs}
          onReorder={saveOrder}
          onReset={resetOrder}
          isCustomized={isCustomized}
        />
      </div>

      <TabsContent value="overview" className="mt-0 space-y-8">
        {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
        {!isLoading && overviewSections.map((section: string) => {
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

      <TabsContent value="dashboard" className="mt-0">
        <NetworkDashboardTab />
      </TabsContent>

      <TabsContent value="following" className="mt-0">
        <FollowingFeedTab />
      </TabsContent>

      <TabsContent value="people" className="mt-0">
        <PeopleTab people={people} loading={loadingPeople} />
      </TabsContent>

      <TabsContent value="entities" className="mt-0">
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {([
            ["all", "All", totalEntities],
            ["guilds", label("guild.label"), guildMemberships.length],
            ["pods", label("pod.label"), podMemberships.length],
            ["companies", "Traditional Organizations", companyMemberships.length],
          ] as [string, string, number][]).map(([key, lbl, count]) => (
            <Button key={key} variant={entitySub === key ? "default" : "outline"} size="sm" onClick={() => setEntitySub(key)} className="text-xs">{lbl} ({count})</Button>
          ))}
        </div>
        {(loadingGuilds || loadingPods || loadingCompanies) && (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        )}
        {!(loadingGuilds || loadingPods || loadingCompanies) && (
          <div className="space-y-8">
            {(entitySub === "all" || entitySub === "guilds") && <GuildsTab memberships={guildMemberships} loading={false} label={label} />}
            {(entitySub === "all" || entitySub === "pods") && <PodsTab memberships={podMemberships} loading={false} label={label} />}
            {(entitySub === "all" || entitySub === "companies") && <CompaniesTab memberships={companyMemberships} loading={false} />}
          </div>
        )}
      </TabsContent>

      <TabsContent value="territories" className="mt-0">
        <TerritoryTopicLeaderboard />
      </TabsContent>

      <TabsContent value="activity" className="mt-0">
        <NetworkActivityTab />
      </TabsContent>

      <TabsContent value="leaderboard" className="mt-0">
        <LeaderboardTab />
      </TabsContent>
    </Tabs>
  );
}

// ─── Main ────────────────────────────────────────────────────
export default function NetworkHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "following";
  const setTab = (t: string) => setSearchParams({ tab: t });
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
  const [entitySub, setEntitySub] = useState<"all" | "guilds" | "pods" | "companies">("all");
  const totalEntities = guildMemberships.length + podMemberships.length + companyMemberships.length;

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

      <NetworkTabs
        tab={tab}
        setTab={setTab}
        people={people}
        totalEntities={totalEntities}
        isLoading={isLoading}
        loadingPeople={loadingPeople}
        loadingGuilds={loadingGuilds}
        loadingPods={loadingPods}
        loadingCompanies={loadingCompanies}
        overviewSections={overviewSections}
        guildMemberships={guildMemberships}
        companyMemberships={companyMemberships}
        podMemberships={podMemberships}
        myTerritories={myTerritories}
        myTopics={myTopics}
        territoryActivity={territoryActivity}
        label={label}
        entitySub={entitySub}
        setEntitySub={setEntitySub}
        currentUser={currentUser}
      />
    </PageShell>
  );
}

// ─── Overview sections ──────────────────────────────────────
function OverviewPeople({ people }: { people: any[] }) {
  const top = people.slice(0, 6);
  const userIds = useMemo(() => top.map((p: any) => p.user_id), [top]);
  const { data: followedIds = new Set<string>() } = useFollowedUserIds(userIds);

  return (
    <div>
      <SectionHeader icon={Users} title="People in your orbit" count={people.length} seeMoreTo="/network?tab=people" />
      {top.length === 0 ? (
        <EmptyState icon={Users} message="Join guilds, organizations or quests to build your network." cta="Explore guilds" to="/explore?tab=entities" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {top.map((p, i) => <PersonCard key={p.user_id} person={p} index={i} isFollowed={followedIds.has(p.user_id)} />)}
        </div>
      )}
    </div>
  );
}

function OverviewGuilds({ memberships, label }: { memberships: any[]; label: (k: string) => string }) {
  const top = memberships.slice(0, 4);
  return (
    <div>
      <SectionHeader icon={Shield} title={`${label("guild.label")} in your orbit`} count={memberships.length} seeMoreTo="/network?tab=entities" />
      {top.length === 0 ? (
        <EmptyState icon={Shield} message={`You haven't joined any ${label("guild.label").toLowerCase()} yet.`} cta={`Explore ${label("guild.label").toLowerCase()}`} to="/explore?tab=entities" />
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
      <SectionHeader icon={Building2} title="Traditional Organizations in your orbit" count={memberships.length} seeMoreTo="/network?tab=entities" />
      {top.length === 0 ? (
        <EmptyState icon={Building2} message="No traditional organizations linked to your account." cta="Create one" to="/me/companies" />
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
      <SectionHeader icon={MapPin} title="Territories & Topics around you" seeMoreTo="/network?tab=territories" />
      {territories.length === 0 && topics.length === 0 ? (
        <EmptyState icon={MapPin} message="Add territories and topics in your profile settings." cta="Edit profile" to="/profile/edit" />
      ) : (
        <div className="space-y-3">
          {territories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {territories.map((t: any) => {
                const a = activity[t.territoryId];
                return (
                  <Link key={t.territoryId} to={`/territories/${t.territoryId}`} className="rounded-lg border border-border bg-card px-3 py-2 block hover:border-primary/40 transition-all">
                    <span className="text-sm font-medium flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-primary" />{t.territory?.name}</span>
                    {a && <span className="text-[10px] text-muted-foreground block mt-0.5">{a.guilds}g · {a.companies}c · {a.quests}q</span>}
                   </Link>
                );
              })}
            </div>
          )}
           {topics.length > 0 && (
             <div className="flex flex-wrap gap-1.5">
               {topics.map((t: any) => (
                  <Link key={t.id} to={`/explore?tab=houses&houses=${t.slug || t.id}`}>
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

  const userIds = useMemo(() => sorted.map((p: any) => p.user_id), [sorted]);
  const { data: followedIds = new Set<string>() } = useFollowedUserIds(userIds);

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
        <EmptyState icon={Users} message="Join guilds, organizations or quests to build your network." cta="Explore" to="/explore" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p, i) => <PersonCard key={p.user_id} person={p} index={i} isFollowed={followedIds.has(p.user_id)} />)}
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
          <SectionHeader icon={Building2} title="Traditional Organizations you manage" count={adminComps.length} />
          <div className="grid gap-3 md:grid-cols-2">
            {adminComps.map((m, i) => <CompanyCard key={m.companyId} membership={m} index={i} />)}
          </div>
        </div>
      )}

      {memberComps.length > 0 && (
        <div>
          <SectionHeader icon={Users} title="Traditional Organizations you belong to" count={memberComps.length} />
          <div className="grid gap-3 md:grid-cols-2">
            {memberComps.map((m, i) => <CompanyCard key={m.companyId} membership={m} index={i} />)}
          </div>
        </div>
      )}

      {memberships.length === 0 && (
        <EmptyState icon={Building2} message="No traditional organizations linked to your account." cta="Create one" to="/me/companies" />
      )}

      <div className="flex gap-2 pt-2">
        <Button size="sm" asChild><Link to="/me/companies"><Plus className="h-4 w-4 mr-1" /> Create organization</Link></Button>
        <Button size="sm" variant="outline" asChild><Link to="/explore?tab=companies">Explore organizations <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
      </div>
    </div>
  );
}

// ─── Pods tab ────────────────────────────────────────────────
function PodsTab({ memberships, loading, label }: { memberships: any[]; loading: boolean; label: (k: string) => string }) {
  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {memberships.length > 0 ? (
        <div>
          <SectionHeader icon={CircleDot} title={`${label("pod.label")} you belong to`} count={memberships.length} />
          <div className="grid gap-3 md:grid-cols-2">
            {memberships.map((m: any, i: number) => (
              <motion.div key={m.podId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/pods/${m.podId}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                   <h4 className="font-display font-semibold">{m.pod?.name ?? "Unnamed Pod"}</h4>
                  <Badge variant="secondary" className="text-[10px] capitalize mt-1">{m.role?.toLowerCase()}</Badge>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState icon={CircleDot} message={`You haven't joined any ${label("pod.label").toLowerCase()} yet.`} cta={`Explore ${label("pod.label").toLowerCase()}`} to="/explore?tab=pods" />
      )}

      <div className="pt-2">
        <Button variant="outline" asChild><Link to="/explore?tab=pods">Discover more {label("pod.label").toLowerCase()} <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
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
        <SectionHeader icon={Hash} title="Your topics" count={topics.length} />
        {topics.length === 0 ? (
          <EmptyState icon={Hash} message="Add topics in your profile settings." cta="Edit profile" to="/profile/edit" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {topics.map((t: any) => (
              <Link key={t.id} to={`/explore?tab=houses&houses=${t.slug || t.id}`}>
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
function PersonCard({ person, index, isFollowed = false }: { person: any; index: number; isFollowed?: boolean }) {
  const { sharedGuilds, sharedCompanies, sharedPods, sharedQuests } = person.shared;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
      <Link to={`/users/${person.user_id}`} className="relative group flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-all">
        <FollowOnHoverButton targetUserId={person.user_id} isFollowed={isFollowed} />
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
  { key: "SERVICE", label: "Services" },
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
  const currentUser = useCurrentUser();

  // Per-user display mode persistence
  const storageKey = currentUser?.id ? `following_display_${currentUser.id}` : null;
  const [displayMode, setDisplayMode] = useState<FeedDisplayMode>(() => {
    if (!storageKey) return "large";
    return (localStorage.getItem(storageKey) as FeedDisplayMode) || "large";
  });

  const handleDisplayChange = useCallback((mode: FeedDisplayMode) => {
    setDisplayMode(mode);
    if (storageKey) localStorage.setItem(storageKey, mode);
  }, [storageKey]);

  // Sync when user changes
  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey) as FeedDisplayMode | null;
      if (saved) setDisplayMode(saved);
    }
  }, [storageKey]);

  const { data: posts = [], isLoading } = useFollowingFeed(filter);

  const postIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const { data: myUpvotes = [] } = usePostUpvotes(postIds);
  const upvotedSet = useMemo(() => new Set(myUpvotes.map((u) => u.post_id)), [myUpvotes]);
  const sortedPosts = useMemo(() => sortPosts(posts, sortMode), [posts, sortMode]);

  const gridClass =
    displayMode === "list" ? "space-y-3" :
    displayMode === "small" ? "grid grid-cols-3 gap-2" :
    displayMode === "medium" ? "grid grid-cols-2 md:grid-cols-3 gap-3" :
    "grid grid-cols-2 gap-3";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <Rss className="h-5 w-5 text-primary" /> Your network feed
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Posts and updates from people and units you follow.
          </p>
        </div>
        <FeedDisplayToggle value={displayMode} onChange={handleDisplayChange} />
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
        <div className={gridClass}>
          {sortedPosts.map((post) =>
            displayMode === "list" ? (
              <PostCard key={post.id} post={post} hasUpvoted={upvotedSet.has(post.id)} />
            ) : (
              <PostTile key={post.id} post={post} hasUpvoted={upvotedSet.has(post.id)} size={displayMode} />
            )
          )}
        </div>
      )}
    </div>
  );
}
