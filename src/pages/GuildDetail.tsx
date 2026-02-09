import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Users, Compass, ArrowLeft, Heart, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { CommentThread } from "@/components/CommentThread";
import { CommentTargetType, FollowTargetType } from "@/types/enums";
import { useFollow } from "@/hooks/useFollow";
import {
  getGuildById, getTopicsForGuild, getTerritoriesForGuild,
  getMembersForGuild, getQuestsForGuild, getUserById, getServicesForGuild,
} from "@/data/mock";

export default function GuildDetail() {
  const { id } = useParams<{ id: string }>();
  const guild = getGuildById(id!);
  const { isFollowing, toggle: toggleFollow } = useFollow(FollowTargetType.GUILD, id!);
  if (!guild) return <PageShell><p>Guild not found.</p></PageShell>;

  const topics = getTopicsForGuild(guild.id);
  const territories = getTerritoriesForGuild(guild.id);
  const members = getMembersForGuild(guild.id);
  const quests = getQuestsForGuild(guild.id);
  const guildServices = getServicesForGuild(guild.id);
  const creator = getUserById(guild.createdByUserId);

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/guilds"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Guilds</Link>
      </Button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-4 mb-3">
          <img src={guild.logoUrl} className="h-16 w-16 rounded-xl" alt="" />
          <div>
            <h1 className="font-display text-3xl font-bold">{guild.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Badge variant="secondary" className="capitalize">{guild.type.toLowerCase()}</Badge>
              <span>Created by {creator?.name}</span>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground max-w-2xl">{guild.description}</p>
        <div className="flex items-center gap-3 mt-3">
          <Button size="sm" variant={isFollowing ? "outline" : "default"} onClick={toggleFollow}>
            <Heart className={`h-4 w-4 mr-1 ${isFollowing ? "fill-current" : ""}`} />
            {isFollowing ? "Unfollow guild" : "Follow guild"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {topics.map((t) => <Badge key={t.id} variant="secondary">{t.name}</Badge>)}
          {territories.map((t) => <Badge key={t.id} variant="outline">{t.name}</Badge>)}
        </div>
      </motion.div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview"><Shield className="h-4 w-4 mr-1" /> Overview</TabsTrigger>
          <TabsTrigger value="quests"><Compass className="h-4 w-4 mr-1" /> Quests</TabsTrigger>
          {guildServices.length > 0 && <TabsTrigger value="services"><Briefcase className="h-4 w-4 mr-1" /> Services</TabsTrigger>}
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" /> Members ({members.length})
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={m.user?.avatarUrl} />
                  <AvatarFallback>{m.user?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{m.user?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{m.role.toLowerCase()}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="quests" className="mt-6 space-y-3">
          {quests.map((q) => (
            <Link
              key={q.id}
              to={`/quests/${q.id}`}
              className="block rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-all"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-display font-semibold">{q.title}</h4>
                <Badge className="bg-primary/10 text-primary border-0">{q.rewardXp} XP</Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{q.description}</p>
              <Badge variant="outline" className="mt-2 capitalize text-xs">{q.status.toLowerCase().replace("_", " ")}</Badge>
            </Link>
          ))}
          {quests.length === 0 && <p className="text-muted-foreground">No quests yet.</p>}
        </TabsContent>

        {guildServices.length > 0 && (
          <TabsContent value="services" className="mt-6 space-y-3">
            {guildServices.map((svc) => (
              <Link
                key={svc.id}
                to={`/services/${svc.id}`}
                className="block rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-semibold">{svc.title}</h4>
                  {svc.priceAmount != null && (
                    <Badge className="bg-primary/10 text-primary border-0">
                      {svc.priceAmount === 0 ? "Free" : `€${svc.priceAmount}`}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{svc.description}</p>
              </Link>
            ))}
          </TabsContent>
        )}

        <TabsContent value="comments" className="mt-6">
          <CommentThread targetType={CommentTargetType.GUILD} targetId={guild.id} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
