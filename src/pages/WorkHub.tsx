import { useState } from "react";
import { Briefcase } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Compass, CircleDot, Zap, Building2 } from "lucide-react";
import {
  questParticipants, getQuestById, podMembers, getPodById,
  getServicesForUser,
} from "@/data/mock";
import MyBookings from "./MyBookings";
import MyRequests from "./MyRequests";
import MyAvailability from "./MyAvailability";

export default function WorkHub() {
  const [tab, setTab] = useState("quests");
  const currentUser = useCurrentUser();

  // My quests
  const myQuests = questParticipants
    .filter((qp) => qp.userId === currentUser.id)
    .map((qp) => ({ ...qp, quest: getQuestById(qp.questId) }))
    .filter((qp) => qp.quest);

  // My pods
  const myPods = podMembers
    .filter((pm) => pm.userId === currentUser.id)
    .map((pm) => ({ ...pm, pod: getPodById(pm.podId) }))
    .filter((pm) => pm.pod);

  // My services
  const myServices = getServicesForUser(currentUser.id);

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Briefcase className="h-7 w-7 text-primary" /> Work
        </h1>
        <p className="text-muted-foreground mt-1">Your quests, pods, services, and bookings.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="quests">My Quests ({myQuests.length})</TabsTrigger>
          <TabsTrigger value="pods">My Pods ({myPods.length})</TabsTrigger>
          <TabsTrigger value="services">My Services ({myServices.length})</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="quests">
          {myQuests.length === 0 && <p className="text-muted-foreground">No quests yet.</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {myQuests.map((qp, i) => (
              <motion.div key={qp.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/quests/${qp.questId}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-display font-semibold">{qp.quest!.title}</h4>
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary"><Zap className="h-3 w-3" /> {qp.quest!.rewardXp}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px] capitalize">{qp.role.toLowerCase()}</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{qp.status.toLowerCase()}</Badge>
                    {qp.quest!.companyId && <Badge className="bg-accent text-accent-foreground border-0 text-[10px]"><Building2 className="h-2.5 w-2.5 mr-0.5" />Client</Badge>}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pods">
          {myPods.length === 0 && <p className="text-muted-foreground">No pods yet.</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {myPods.map((pm, i) => (
              <motion.div key={pm.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/pods/${pm.podId}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                  <h4 className="font-display font-semibold">{pm.pod!.name}</h4>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px] capitalize">{pm.role.toLowerCase()}</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{pm.pod!.type.toLowerCase().replace("_", " ")}</Badge>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="services">
          {myServices.length === 0 && <p className="text-muted-foreground">No active services.</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {myServices.map((svc, i) => (
              <motion.div key={svc.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/services/${svc.id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between">
                    <h4 className="font-display font-semibold">{svc.title}</h4>
                    {svc.priceAmount != null && (
                      <Badge className="bg-primary/10 text-primary border-0 text-xs">
                        {svc.priceAmount === 0 ? "Free" : `€${svc.priceAmount}`}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{svc.description}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bookings"><MyBookings bare /></TabsContent>
        <TabsContent value="requests"><MyRequests bare /></TabsContent>
      </Tabs>
    </PageShell>
  );
}
