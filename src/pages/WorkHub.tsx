import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, Link } from "react-router-dom";
import { Briefcase, FileEdit, Plus, CalendarDays, MoreHorizontal, ListTodo, Calendar, Lightbulb } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTabOrder } from "@/hooks/useTabOrder";
import { SortableTabsList, type TabDefinition } from "@/components/SortableTabsList";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePersona } from "@/hooks/usePersona";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Compass, CircleDot, Zap, Building2, Shield, Users } from "lucide-react";
import { useUserQuestParticipations, useUserPodMemberships, useUserServices, useMyDrafts, useUserGuildMemberships } from "@/hooks/useEntityQueries";
import { useMyCompanyMemberships } from "@/hooks/useNetworkData";
import MyBookings from "./MyBookings";
import MyRequests from "./MyRequests";
import MyAvailability from "./MyAvailability";
import MyCourses from "./MyCourses";
import { WorkTasksTab } from "@/components/work/WorkTasksTab";
import { WorkCalendarTab } from "@/components/work/WorkCalendarTab";

import questPattern from "@/assets/patterns/quest-pattern.jpg";
import guildPattern from "@/assets/patterns/guild-pattern.jpg";
import podPattern from "@/assets/patterns/pod-pattern.jpg";
import servicePattern from "@/assets/patterns/service-pattern.jpg";
import companyPattern from "@/assets/patterns/company-pattern.jpg";

/** Small thumbnail with fallback pattern */
function Thumb({ src, fallback, alt }: { src?: string | null; fallback: string; alt: string }) {
  return (
    <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
      <img
        src={src || fallback}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}

export default function WorkHub() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "tasks";
  const setTab = (t: string) => setSearchParams({ tab: t });
  const [showMore, setShowMore] = useState(true);
  const tabsListRef = useRef<HTMLDivElement>(null);
  const currentUser = useCurrentUser();
  const { label } = usePersona();

  const { data: myQuests } = useUserQuestParticipations(currentUser.id || undefined);
  const { data: myPods } = useUserPodMemberships(currentUser.id || undefined);
  const { data: myServices } = useUserServices(currentUser.id || undefined);
  const { data: drafts } = useMyDrafts(currentUser.id || undefined);
  const { data: myGuilds } = useUserGuildMemberships(currentUser.id || undefined);
  const { data: myCompanies } = useMyCompanyMemberships(currentUser.id || "");

  const questsList = myQuests || [];
  const ideasList = questsList.filter((qp: any) => (qp.quests?.status as string) === "IDEA");
  const nonIdeaQuests = questsList.filter((qp: any) => (qp.quests?.status as string) !== "IDEA");
  const podsList = myPods || [];
  const servicesList = myServices || [];
  const guildsList = myGuilds || [];
  const companiesList = myCompanies || [];
  const teamsList = [...guildsList.map((g: any) => ({ ...g, _type: "guild" })), ...companiesList.map((c: any) => ({ ...c, _type: "company" })), ...podsList.map((p: any) => ({ ...p, _type: "pod" }))];
  const totalDrafts = (drafts?.quests?.length || 0) + (drafts?.guilds?.length || 0) + (drafts?.pods?.length || 0) + (drafts?.services?.length || 0);

  // Check if tabs are overflowing
  useEffect(() => {
    const checkOverflow = () => {
      if (tabsListRef.current) {
        setShowMore(tabsListRef.current.scrollWidth > tabsListRef.current.clientWidth);
      }
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, []);

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Briefcase className="h-7 w-7 text-primary" /> {t("work.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("work.subtitle")}</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        {(() => {
          const workTabs: TabDefinition[] = [
            { value: "tasks", label: <><ListTodo className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">{t("tabs.tasks")}</span></> },
            { value: "quests", label: <><span className="hidden sm:inline">{t("work.myQuests")}</span><span className="sm:hidden">{t("explore.quests")}</span> ({nonIdeaQuests.length})</> },
            { value: "ideas", label: <><Lightbulb className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Ideas</span> ({ideasList.length})</> },
            { value: "teams", label: <><span className="hidden sm:inline">{t("tabs.myEntities")}</span><span className="sm:hidden">{t("tabs.teams")}</span> ({teamsList.length})</> },
            { value: "services", label: <><span className="hidden sm:inline">{t("work.services")}</span><span className="sm:hidden">{t("tabs.services")}</span> ({servicesList.length})</> },
            { value: "bookings", label: t("tabs.bookings") },
            { value: "calendar", label: <><Calendar className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Calendar</span></> },
            { value: "drafts", label: <>{t("tabs.drafts")} ({totalDrafts})</> },
          ];
          return <WorkTabsListInner tabs={workTabs} />;
        })()}

        {/* ── Tasks ── */}
        <TabsContent value="tasks">
          <WorkTasksTab />
        </TabsContent>

        {/* ── Quests ── */}
        <TabsContent value="quests">
          {nonIdeaQuests.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Compass className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground mb-4">No quests yet. Start your first quest!</p>
              <Button asChild><Link to="/quests/new"><Plus className="h-4 w-4 mr-1" /> Create Quest</Link></Button>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {nonIdeaQuests.map((qp: any, i: number) => (
              <motion.div key={qp.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/quests/${qp.quest_id}`} className="flex gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                  <Thumb src={qp.quests?.cover_image_url} fallback={questPattern} alt={qp.quests?.title || "Quest"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-display font-semibold truncate">{qp.quests?.title}</h4>
                      <span className="flex items-center gap-1 text-xs font-semibold text-primary shrink-0"><Zap className="h-3 w-3" /> {qp.quests?.reward_xp}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px] capitalize">{qp.role.toLowerCase()}</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{qp.status.toLowerCase()}</Badge>
                      {qp.quests?.company_id && <Badge className="bg-accent text-accent-foreground border-0 text-[10px]"><Building2 className="h-2.5 w-2.5 mr-0.5" />Client</Badge>}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* ── Ideas ── */}
        <TabsContent value="ideas">
          {ideasList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Lightbulb className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground mb-4">No ideas yet. Create a quest with "Idea" status to get started!</p>
              <Button asChild><Link to="/quests/new"><Plus className="h-4 w-4 mr-1" /> Create Idea</Link></Button>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {ideasList.map((qp: any, i: number) => (
              <motion.div key={qp.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/quests/${qp.quest_id}`} className="flex gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 hover:border-amber-400/50 transition-all">
                  <Thumb src={qp.quests?.cover_image_url} fallback={questPattern} alt={qp.quests?.title || "Idea"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-display font-semibold truncate">{qp.quests?.title}</h4>
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-400/30 shrink-0 gap-1">
                        <Lightbulb className="h-2.5 w-2.5" /> Idea
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{qp.quests?.description}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* ── Pods ── */}
        <TabsContent value="teams">
          {teamsList.length === 0 && <p className="text-muted-foreground">No pods yet. Join a guild, organization, or pod to see them here.</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {teamsList.map((item: any, i: number) => {
              const isGuild = item._type === "guild";
              const isCompany = item._type === "company";
              const name = isGuild ? item.guilds?.name : isCompany ? item.company?.name : item.pods?.name;
              const id = isGuild ? item.guild_id : isCompany ? item.companyId : item.pod_id;
              const route = isGuild ? `/guilds/${id}` : isCompany ? `/companies/${id}` : `/pods/${id}`;
              const TypeIcon = isGuild ? Shield : isCompany ? Building2 : Users;
              const typeLabel = isGuild ? label("guild.label") : isCompany ? "Trad. Org" : label("pod.label");
              const role = isGuild ? item.role : isCompany ? item.role : item.role;
              const imgSrc = isGuild ? item.guilds?.logo_url : isCompany ? item.company?.logo_url : item.pods?.image_url;
              const fallback = isGuild ? guildPattern : isCompany ? companyPattern : podPattern;
              if (!name) return null;
              return (
                <motion.div key={`${item._type}-${id}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link to={route} className="flex gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                    <Thumb src={imgSrc} fallback={fallback} alt={name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <TypeIcon className="h-4 w-4 text-primary shrink-0" />
                        <h4 className="font-display font-semibold truncate">{name}</h4>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px]">{typeLabel}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{role?.toLowerCase()}</Badge>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Services ── */}
        <TabsContent value="services">
          {servicesList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CircleDot className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground mb-4">No active services. Offer your first service!</p>
              <Button asChild><Link to="/me"><Plus className="h-4 w-4 mr-1" /> Create Service</Link></Button>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {servicesList.map((svc: any, i: number) => (
              <motion.div key={svc.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/services/${svc.id}`} className="flex gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                  <Thumb src={svc.image_url} fallback={servicePattern} alt={svc.title} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between">
                      <h4 className="font-display font-semibold truncate">{svc.title}</h4>
                      {svc.price_amount != null && (
                        <Badge className="bg-primary/10 text-primary border-0 text-xs shrink-0">
                          {svc.price_amount === 0 ? "Free" : `€${svc.price_amount}`}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{svc.description}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* ── Drafts ── */}
        <TabsContent value="drafts">
          {totalDrafts === 0 && <p className="text-muted-foreground">No drafts.</p>}
          <div className="space-y-6">
            {(drafts?.quests || []).length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2"><FileEdit className="h-4 w-4" /> {t("tabs.questDrafts")}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {(drafts?.quests || []).map((q: any, i: number) => (
                    <motion.div key={q.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Link to={`/quests/${q.id}`} className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 hover:border-amber-500/50 transition-all">
                        <Thumb src={q.cover_image_url} fallback={questPattern} alt={q.title} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-display font-semibold truncate">{q.title}</h4>
                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30 shrink-0">Draft</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">{q.description}</p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            {(drafts?.guilds || []).length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2"><FileEdit className="h-4 w-4" /> {t("tabs.guildDrafts")}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {(drafts?.guilds || []).map((g: any, i: number) => (
                    <motion.div key={g.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Link to={`/guilds/${g.id}`} className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 hover:border-amber-500/50 transition-all">
                        <Thumb src={g.logo_url} fallback={guildPattern} alt={g.name} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-display font-semibold truncate">{g.name}</h4>
                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30 shrink-0">Draft</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">{g.description}</p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            {(drafts?.pods || []).length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2"><FileEdit className="h-4 w-4" /> {t("tabs.podDrafts")}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {(drafts?.pods || []).map((p: any, i: number) => (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Link to={`/pods/${p.id}`} className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 hover:border-amber-500/50 transition-all">
                        <Thumb src={p.image_url} fallback={podPattern} alt={p.name} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-display font-semibold truncate">{p.name}</h4>
                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30 shrink-0">Draft</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">{p.description}</p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            {(drafts?.services || []).length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2"><FileEdit className="h-4 w-4" /> {t("tabs.serviceDrafts")}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {(drafts?.services || []).map((s: any, i: number) => (
                    <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Link to={`/services/${s.id}`} className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 hover:border-amber-500/50 transition-all">
                        <Thumb src={s.image_url} fallback={servicePattern} alt={s.title} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-display font-semibold truncate">{s.title}</h4>
                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30 shrink-0">Draft</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">{s.description}</p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="courses"><MyCourses bare /></TabsContent>
        <TabsContent value="availability"><MyAvailability bare /></TabsContent>
        <TabsContent value="bookings"><MyBookings bare /></TabsContent>
        <TabsContent value="calendar"><WorkCalendarTab /></TabsContent>
        <TabsContent value="requests"><MyRequests bare /></TabsContent>
      </Tabs>
    </PageShell>
  );
}

const WORK_DEFAULT_TABS = ["tasks", "quests", "teams", "services", "bookings", "calendar", "drafts"];

function WorkTabsListInner({ tabs }: { tabs: TabDefinition[] }) {
  const { orderedTabs, saveOrder, resetOrder, isCustomized } = useTabOrder("work_hub", WORK_DEFAULT_TABS);
  return (
    <div className="group/tabs mb-6">
      <SortableTabsList tabs={tabs} orderedKeys={orderedTabs} onReorder={saveOrder} onReset={resetOrder} isCustomized={isCustomized} />
    </div>
  );
}
