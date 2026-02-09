import { useState } from "react";
import { Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { FollowTargetType, TopicStewardRole } from "@/types/enums";
import {
  follows, getUserById, getGuildById, getQuestById,
  companies, topicStewards, getTopicById,
} from "@/data/mock";
import MyGuilds from "./MyGuilds";

export default function NetworkHub() {
  const [tab, setTab] = useState("guilds");
  const currentUser = useCurrentUser();

  // People I follow
  const followedUsers = follows
    .filter((f) => f.followerId === currentUser.id && f.targetType === FollowTargetType.USER)
    .map((f) => ({ ...f, user: getUserById(f.targetId) }))
    .filter((f) => f.user);

  // Guilds I follow
  const followedGuilds = follows
    .filter((f) => f.followerId === currentUser.id && f.targetType === FollowTargetType.GUILD)
    .map((f) => ({ ...f, guild: getGuildById(f.targetId) }))
    .filter((f) => f.guild);

  // Quests I follow
  const followedQuests = follows
    .filter((f) => f.followerId === currentUser.id && f.targetType === FollowTargetType.QUEST)
    .map((f) => ({ ...f, quest: getQuestById(f.targetId) }))
    .filter((f) => f.quest);

  // My companies
  const myCompanies = companies.filter((c) => c.contactUserId === currentUser.id);

  // Stewardships
  const myStewardships = topicStewards
    .filter((ts) => ts.userId === currentUser.id)
    .map((ts) => ({ ...ts, topic: getTopicById(ts.topicId) }))
    .filter((ts) => ts.topic);

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Users className="h-7 w-7 text-primary" /> Network
        </h1>
        <p className="text-muted-foreground mt-1">Your guilds, companies, stewardships, and connections.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="guilds">My Guilds</TabsTrigger>
          <TabsTrigger value="companies">My Companies ({myCompanies.length})</TabsTrigger>
          <TabsTrigger value="stewardships">Stewardships ({myStewardships.length})</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
        </TabsList>

        <TabsContent value="guilds"><MyGuilds bare /></TabsContent>

        <TabsContent value="companies">
          {myCompanies.length === 0 && <p className="text-muted-foreground">No companies linked to your account.</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {myCompanies.map((company, i) => (
              <motion.div key={company.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/companies/${company.id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-3">
                    {company.logoUrl && <img src={company.logoUrl} className="h-10 w-10 rounded-lg" alt="" />}
                    <div>
                      <h4 className="font-display font-semibold">{company.name}</h4>
                      {company.sector && <span className="text-xs text-muted-foreground">{company.sector}</span>}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stewardships">
          {myStewardships.length === 0 && <p className="text-muted-foreground">You're not a steward for any topic yet.</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {myStewardships.map((ts, i) => (
              <motion.div key={ts.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/topics/${ts.topic!.slug}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                  <h4 className="font-display font-semibold">{ts.topic!.name}</h4>
                  <Badge variant="secondary" className="text-[10px] capitalize mt-2">
                    {ts.role === TopicStewardRole.STEWARD ? "Steward" : "Curator"}
                  </Badge>
                </Link>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="following">
          <div className="space-y-6">
            {followedUsers.length > 0 && (
              <section>
                <h3 className="font-display font-semibold mb-3">People ({followedUsers.length})</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {followedUsers.map((f, i) => (
                    <motion.div key={f.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Link to={`/users/${f.targetId}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-all">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={f.user!.avatarUrl} />
                          <AvatarFallback>{f.user!.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{f.user!.name}</p>
                          {f.user!.headline && <p className="text-xs text-muted-foreground">{f.user!.headline}</p>}
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {followedGuilds.length > 0 && (
              <section>
                <h3 className="font-display font-semibold mb-3">Guilds ({followedGuilds.length})</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {followedGuilds.map((f, i) => (
                    <motion.div key={f.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Link to={`/guilds/${f.targetId}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-all">
                        <Avatar className="h-10 w-10 rounded-lg">
                          <AvatarImage src={f.guild!.logoUrl} />
                          <AvatarFallback>{f.guild!.name[0]}</AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium">{f.guild!.name}</p>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {followedQuests.length > 0 && (
              <section>
                <h3 className="font-display font-semibold mb-3">Quests ({followedQuests.length})</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {followedQuests.map((f, i) => (
                    <motion.div key={f.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Link to={`/quests/${f.targetId}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                        <h4 className="font-display font-semibold">{f.quest!.title}</h4>
                        <Badge variant="outline" className="text-[10px] capitalize mt-1">{f.quest!.status.toLowerCase().replace("_", " ")}</Badge>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {followedUsers.length === 0 && followedGuilds.length === 0 && followedQuests.length === 0 && (
              <p className="text-muted-foreground">You're not following anyone yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
