import { useState } from "react";
import { Briefcase, FileEdit, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePersona } from "@/hooks/usePersona";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Compass, CircleDot, Zap, Building2 } from "lucide-react";
import { useUserQuestParticipations, useUserPodMemberships, useUserServices, useMyDrafts } from "@/hooks/useEntityQueries";
import MyBookings from "./MyBookings";
import MyRequests from "./MyRequests";
import MyAvailability from "./MyAvailability";
import MyCourses from "./MyCourses";

export default function WorkHub() {
  const [tab, setTab] = useState("quests");
  const currentUser = useCurrentUser();
  const { label } = usePersona();

  const { data: myQuests } = useUserQuestParticipations(currentUser.id || undefined);
  const { data: myPods } = useUserPodMemberships(currentUser.id || undefined);
  const { data: myServices } = useUserServices(currentUser.id || undefined);
  const { data: drafts } = useMyDrafts(currentUser.id || undefined);

  const questsList = myQuests || [];
  const podsList = myPods || [];
  const servicesList = myServices || [];
  const totalDrafts = (drafts?.quests?.length || 0) + (drafts?.guilds?.length || 0) + (drafts?.pods?.length || 0) + (drafts?.services?.length || 0);

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Briefcase className="h-7 w-7 text-primary" /> {label("nav.work")}
        </h1>
        <p className="text-muted-foreground mt-1">Your {label("quest.label").toLowerCase()}, {label("pod.label").toLowerCase()}, {label("service.label_plural").toLowerCase()}, and bookings.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="quests">My {label("quest.label")} ({questsList.length})</TabsTrigger>
          <TabsTrigger value="pods">My {label("pod.label")} ({podsList.length})</TabsTrigger>
          <TabsTrigger value="services">{label("service.my_label")} ({servicesList.length})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({totalDrafts})</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="quests">
          {questsList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Compass className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground mb-4">No quests yet. Start your first quest!</p>
              <Button asChild><Link to="/quests/new"><Plus className="h-4 w-4 mr-1" /> Create Quest</Link></Button>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {questsList.map((qp: any, i: number) => (
              <motion.div key={qp.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/quests/${qp.quest_id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-display font-semibold">{qp.quests?.title}</h4>
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary"><Zap className="h-3 w-3" /> {qp.quests?.reward_xp}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px] capitalize">{qp.role.toLowerCase()}</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{qp.status.toLowerCase()}</Badge>
                    {qp.quests?.company_id && <Badge className="bg-accent text-accent-foreground border-0 text-[10px]"><Building2 className="h-2.5 w-2.5 mr-0.5" />Client</Badge>}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pods">
          {podsList.length === 0 && <p className="text-muted-foreground">No pods yet.</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {podsList.map((pm: any, i: number) => (
              <motion.div key={pm.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/pods/${pm.pod_id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                  <h4 className="font-display font-semibold">{pm.pods?.name}</h4>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px] capitalize">{pm.role.toLowerCase()}</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{pm.pods?.type?.toLowerCase().replace("_", " ")}</Badge>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </TabsContent>

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
                <Link to={`/services/${svc.id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between">
                    <h4 className="font-display font-semibold">{svc.title}</h4>
                    {svc.price_amount != null && (
                      <Badge className="bg-primary/10 text-primary border-0 text-xs">
                        {svc.price_amount === 0 ? "Free" : `€${svc.price_amount}`}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{svc.description}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="drafts">
          {totalDrafts === 0 && <p className="text-muted-foreground">No drafts.</p>}
          <div className="space-y-6">
            {(drafts?.quests || []).length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2"><FileEdit className="h-4 w-4" /> Quest Drafts</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {(drafts?.quests || []).map((q: any, i: number) => (
                    <motion.div key={q.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Link to={`/quests/${q.id}`} className="block rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 hover:border-amber-500/50 transition-all">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-display font-semibold">{q.title}</h4>
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">Draft</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{q.description}</p>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            {(drafts?.guilds || []).length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2"><FileEdit className="h-4 w-4" /> Guild Drafts</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {(drafts?.guilds || []).map((g: any, i: number) => (
                    <motion.div key={g.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Link to={`/guilds/${g.id}`} className="block rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 hover:border-amber-500/50 transition-all">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-display font-semibold">{g.name}</h4>
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">Draft</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{g.description}</p>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            {(drafts?.pods || []).length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2"><FileEdit className="h-4 w-4" /> Pod Drafts</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {(drafts?.pods || []).map((p: any, i: number) => (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Link to={`/pods/${p.id}`} className="block rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 hover:border-amber-500/50 transition-all">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-display font-semibold">{p.name}</h4>
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">Draft</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{p.description}</p>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            {(drafts?.services || []).length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2"><FileEdit className="h-4 w-4" /> Service Drafts</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {(drafts?.services || []).map((s: any, i: number) => (
                    <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Link to={`/services/${s.id}`} className="block rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 hover:border-amber-500/50 transition-all">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-display font-semibold">{s.title}</h4>
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">Draft</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{s.description}</p>
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
        <TabsContent value="requests"><MyRequests bare /></TabsContent>
      </Tabs>
    </PageShell>
  );
}
