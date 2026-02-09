import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, Users, Compass, ArrowLeft, Heart, Briefcase, Star,
  CircleDot, MapPin, Hash, Pencil, CheckCircle, AlertCircle, Plus, Clock, Euro, Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageShell } from "@/components/PageShell";
import { CommentThread } from "@/components/CommentThread";
import { CommentTargetType, FollowTargetType, GuildMemberRole, OnlineLocationType } from "@/types/enums";
import { useFollow } from "@/hooks/useFollow";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import type { Service } from "@/types";
import {
  getGuildById, getTopicsForGuild, getTerritoriesForGuild,
  getMembersForGuild, getQuestsForGuild, getUserById, getServicesForGuild,
  achievements as allAchievements, guildMembers, podMembers, pods, getQuestById,
  services,
} from "@/data/mock";
import { formatDistanceToNow } from "date-fns";

export default function GuildDetail() {
  const { id } = useParams<{ id: string }>();
  const guild = getGuildById(id!);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const { isFollowing, toggle: toggleFollow } = useFollow(FollowTargetType.GUILD, id!);
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);

  // Service creation form state
  const [createSvcOpen, setCreateSvcOpen] = useState(false);
  const [svcTitle, setSvcTitle] = useState("");
  const [svcDesc, setSvcDesc] = useState("");
  const [svcDuration, setSvcDuration] = useState("60");
  const [svcPrice, setSvcPrice] = useState("0");
  const [svcLocationType, setSvcLocationType] = useState<OnlineLocationType>(OnlineLocationType.JITSI);

  if (!guild) return <PageShell><p>Guild not found.</p></PageShell>;

  const topics = getTopicsForGuild(guild.id);
  const territories = getTerritoriesForGuild(guild.id);
  const members = getMembersForGuild(guild.id);
  const quests = getQuestsForGuild(guild.id);
  const guildServices = getServicesForGuild(guild.id);
  const creator = getUserById(guild.createdByUserId);

  // Is current user an admin of this guild?
  const currentMembership = guildMembers.find(
    (gm) => gm.guildId === guild.id && gm.userId === currentUser.id
  );
  const isAdmin = currentMembership?.role === GuildMemberRole.ADMIN;

  // Pods: pods where at least one PodMember is a GuildMember of this guild
  const guildMemberUserIds = new Set(members.map((m) => m.userId));
  const guildPods = pods.filter((pod) =>
    podMembers.some((pm) => pm.podId === pod.id && guildMemberUserIds.has(pm.userId))
  );

  // Achievements: from quests of this guild
  const guildQuestIds = new Set(quests.map((q) => q.id));
  const guildAchievements = allAchievements
    .filter((a) => guildQuestIds.has(a.questId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const createGuildService = () => {
    if (!svcTitle.trim()) return;
    const newSvc: Service = {
      id: `svc-${Date.now()}`,
      title: svcTitle.trim(),
      description: svcDesc.trim(),
      providerGuildId: guild.id,
      durationMinutes: Number(svcDuration) || 60,
      priceAmount: Number(svcPrice) || 0,
      priceCurrency: "EUR",
      onlineLocationType: svcLocationType,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    services.push(newSvc);
    setSvcTitle(""); setSvcDesc(""); setSvcDuration("60"); setSvcPrice("0");
    setSvcLocationType(OnlineLocationType.JITSI);
    setCreateSvcOpen(false);
    rerender();
    toast({ title: "Guild service created" });
  };

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/explore?tab=guilds"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Guilds</Link>
      </Button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-4 mb-3">
          <img src={guild.logoUrl} className="h-16 w-16 rounded-xl" alt="" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-bold">{guild.name}</h1>
              {guild.isApproved ? (
                <CheckCircle className="h-5 w-5 text-primary" />
              ) : (
                isAdmin && <Badge variant="outline" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" /> Pending approval</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Badge variant="secondary" className="capitalize">{guild.type.toLowerCase()}</Badge>
              <span>Created by <Link to={`/users/${creator?.id}`} className="text-primary hover:underline">{creator?.name}</Link></span>
            </div>
            <p className="text-muted-foreground max-w-2xl mt-2 line-clamp-2">{guild.description}</p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button size="sm" variant={isFollowing ? "outline" : "default"} onClick={toggleFollow}>
              <Heart className={`h-4 w-4 mr-1 ${isFollowing ? "fill-current" : ""}`} />
              {isFollowing ? "Unfollow" : "Follow"}
            </Button>
            {isAdmin && (
              <Button size="sm" variant="outline" asChild>
                <Link to={`/guilds/${guild.id}/edit`}><Pencil className="h-4 w-4 mr-1" /> Edit guild</Link>
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {topics.map((t) => (
            <Link key={t.id} to={`/topics/${t.slug}`}>
              <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80"><Hash className="h-3 w-3 mr-0.5" />{t.name}</Badge>
            </Link>
          ))}
          {territories.map((t) => (
            <Badge key={t.id} variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-0.5" />{t.name}</Badge>
          ))}
        </div>
      </motion.div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview"><Shield className="h-4 w-4 mr-1" /> Overview</TabsTrigger>
          <TabsTrigger value="members"><Users className="h-4 w-4 mr-1" /> Members ({members.length})</TabsTrigger>
          <TabsTrigger value="quests"><Compass className="h-4 w-4 mr-1" /> Quests ({quests.length})</TabsTrigger>
          {guildPods.length > 0 && <TabsTrigger value="pods"><CircleDot className="h-4 w-4 mr-1" /> Pods ({guildPods.length})</TabsTrigger>}
          <TabsTrigger value="services"><Briefcase className="h-4 w-4 mr-1" /> Services ({guildServices.length})</TabsTrigger>
          {guildAchievements.length > 0 && <TabsTrigger value="achievements"><Star className="h-4 w-4 mr-1" /> Achievements</TabsTrigger>}
          <TabsTrigger value="wall">Wall</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div>
            <h3 className="font-display font-semibold mb-2">About</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">{guild.description}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary">{members.length}</p>
              <p className="text-sm text-muted-foreground">Members</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary">{quests.length}</p>
              <p className="text-sm text-muted-foreground">Quests</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary">{guildServices.length}</p>
              <p className="text-sm text-muted-foreground">Services</p>
            </div>
          </div>
        </TabsContent>

        {/* Members */}
        <TabsContent value="members" className="mt-6">
          <div className="grid gap-3 md:grid-cols-2">
            {members.map((m) => (
              <Link
                key={m.id}
                to={`/users/${m.userId}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-all"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={m.user?.avatarUrl} />
                  <AvatarFallback>{m.user?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.user?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{m.role.toLowerCase()}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  Joined {formatDistanceToNow(new Date(m.joinedAt), { addSuffix: true })}
                </span>
              </Link>
            ))}
          </div>
        </TabsContent>

        {/* Quests */}
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
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="capitalize text-xs">{q.status.toLowerCase().replace("_", " ")}</Badge>
                <Badge variant="secondary" className="capitalize text-xs">{q.monetizationType.toLowerCase()}</Badge>
              </div>
            </Link>
          ))}
          {quests.length === 0 && <p className="text-muted-foreground">No quests yet.</p>}
        </TabsContent>

        {/* Pods */}
        {guildPods.length > 0 && (
          <TabsContent value="pods" className="mt-6 space-y-3">
            {guildPods.map((pod) => (
              <Link
                key={pod.id}
                to={`/pods/${pod.id}`}
                className="block rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-all"
              >
                <h4 className="font-display font-semibold">{pod.name}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs capitalize">{pod.type.toLowerCase().replace("_", " ")}</Badge>
                  {pod.questId && (
                    <Badge variant="outline" className="text-xs">{getQuestById(pod.questId)?.title ?? "Quest"}</Badge>
                  )}
                  {pod.startDate && <span className="text-xs text-muted-foreground">Starts {pod.startDate}</span>}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{pod.description}</p>
              </Link>
            ))}
          </TabsContent>
        )}

        {/* Services */}
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
                  <div className="flex items-center gap-2">
                    {svc.durationMinutes && <span className="text-xs text-muted-foreground">{svc.durationMinutes} min</span>}
                    {svc.priceAmount != null && (
                      <Badge className="bg-primary/10 text-primary border-0">
                        {svc.priceAmount === 0 ? "Free" : `€${svc.priceAmount}`}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{svc.description}</p>
              </Link>
            ))}
          </TabsContent>
        )}

        {/* Achievements */}
        {guildAchievements.length > 0 && (
          <TabsContent value="achievements" className="mt-6 space-y-3">
            {guildAchievements.map((a) => {
              const user = getUserById(a.userId);
              const quest = getQuestById(a.questId);
              return (
                <Link
                  key={a.id}
                  to={`/achievements/${a.id}`}
                  className="block rounded-lg border border-border bg-card p-4 hover:border-warning/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <Star className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-display font-semibold">{a.title}</h4>
                      {a.description && <p className="text-sm text-muted-foreground mt-0.5">{a.description}</p>}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        {user && <span>by <span className="text-foreground">{user.name}</span></span>}
                        {quest && <Badge variant="secondary" className="text-[10px]">{quest.title}</Badge>}
                        <span>{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </TabsContent>
        )}

        {/* Wall */}
        <TabsContent value="wall" className="mt-6">
          <CommentThread targetType={CommentTargetType.GUILD} targetId={guild.id} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
