import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Hash, Star, Users, Shield, Compass, Zap, Crown, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { TopicFeatureTargetType } from "@/types/enums";
import type { TopicFeature } from "@/types";
import {
  getTopicBySlug, getTopicById, getStewardsForTopic, getFeaturesForTopic, isTopicSteward,
  quests, guilds, questTopics, guildTopics,
  getQuestById, getGuildById, getUserById,
  topicFeatures as allTopicFeatures,
} from "@/data/mock";

export default function TopicHouse() {
  const { slug } = useParams<{ slug: string }>();
  const topic = getTopicBySlug(slug!);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const [, forceUpdate] = useState(0);
  const [featureQuestId, setFeatureQuestId] = useState("");
  const [featureGuildId, setFeatureGuildId] = useState("");

  if (!topic) return <PageShell><p>Topic not found.</p></PageShell>;

  const stewards = getStewardsForTopic(topic.id);
  const features = getFeaturesForTopic(topic.id);
  const isSteward = isTopicSteward(topic.id, currentUser.id);

  // All quests/guilds for this topic
  const topicQuests = questTopics.filter(qt => qt.topicId === topic.id).map(qt => quests.find(q => q.id === qt.questId)!).filter(Boolean);
  const topicGuilds = guildTopics.filter(gt => gt.topicId === topic.id).map(gt => guilds.find(g => g.id === gt.guildId)!).filter(Boolean);

  // Featured items
  const featuredQuestIds = features.filter(f => f.targetType === TopicFeatureTargetType.QUEST).map(f => f.targetId);
  const featuredGuildIds = features.filter(f => f.targetType === TopicFeatureTargetType.GUILD).map(f => f.targetId);
  const featuredQuests = featuredQuestIds.map(id => getQuestById(id)!).filter(Boolean);
  const featuredGuilds = featuredGuildIds.map(id => getGuildById(id)!).filter(Boolean);

  // Non-featured items for curation
  const unfeaturedQuests = topicQuests.filter(q => !featuredQuestIds.includes(q.id));
  const unfeaturedGuilds = topicGuilds.filter(g => !featuredGuildIds.includes(g.id));

  const addFeature = (targetType: TopicFeatureTargetType, targetId: string) => {
    if (!targetId) return;
    const tf: TopicFeature = {
      id: `tf-${Date.now()}`,
      topicId: topic.id,
      targetType,
      targetId,
      addedByUserId: currentUser.id,
      createdAt: new Date().toISOString(),
    };
    allTopicFeatures.push(tf);
    setFeatureQuestId("");
    setFeatureGuildId("");
    forceUpdate(n => n + 1);
    toast({ title: "Featured!", description: `Added to ${topic.name} featured items.` });
  };

  const removeFeature = (featureId: string) => {
    const idx = allTopicFeatures.findIndex(f => f.id === featureId);
    if (idx !== -1) allTopicFeatures.splice(idx, 1);
    forceUpdate(n => n + 1);
    toast({ title: "Removed from featured" });
  };

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
      </Button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2 mb-2">
          <Hash className="h-7 w-7 text-primary" /> {topic.name}
          <Badge variant="secondary" className="ml-2">House</Badge>
        </h1>

        {/* Stewards */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
            <Crown className="h-4 w-4" /> Stewards & Curators
          </h3>
          <div className="flex flex-wrap gap-3">
            {stewards.map(s => (
              <Link key={s.id} to={`/users/${s.userId}`} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 hover:border-primary/30 transition-all">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={s.user?.avatarUrl} />
                  <AvatarFallback>{s.user?.name?.[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{s.user?.name}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{s.role.toLowerCase()}</Badge>
              </Link>
            ))}
            {stewards.length === 0 && <p className="text-sm text-muted-foreground">No stewards assigned yet.</p>}
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="featured">
        <TabsList>
          <TabsTrigger value="featured"><Star className="h-3.5 w-3.5 mr-1" /> Featured ({featuredQuests.length + featuredGuilds.length})</TabsTrigger>
          <TabsTrigger value="quests"><Compass className="h-3.5 w-3.5 mr-1" /> Quests ({topicQuests.length})</TabsTrigger>
          <TabsTrigger value="guilds"><Shield className="h-3.5 w-3.5 mr-1" /> Guilds ({topicGuilds.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="featured" className="mt-6 space-y-6">
          <h3 className="font-display font-semibold text-lg">Featured in this House</h3>

          {/* Featured Quests */}
          {featuredQuests.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Compass className="h-3.5 w-3.5" /> Featured Quests</h4>
              <div className="grid gap-3 md:grid-cols-2">
                {featuredQuests.map(quest => {
                  const feature = features.find(f => f.targetType === TopicFeatureTargetType.QUEST && f.targetId === quest.id);
                  return (
                    <div key={quest.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                      <Link to={`/quests/${quest.id}`} className="flex-1 hover:text-primary transition-colors">
                        <h4 className="font-display font-semibold">{quest.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{quest.description}</p>
                        <span className="flex items-center gap-1 text-xs font-semibold text-primary mt-1"><Zap className="h-3 w-3" /> {quest.rewardXp} XP</span>
                      </Link>
                      {isSteward && feature && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => removeFeature(feature.id)}>
                          <X className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Featured Guilds */}
          {featuredGuilds.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Featured Guilds</h4>
              <div className="grid gap-3 md:grid-cols-2">
                {featuredGuilds.map(guild => {
                  const feature = features.find(f => f.targetType === TopicFeatureTargetType.GUILD && f.targetId === guild.id);
                  return (
                    <div key={guild.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                      <Link to={`/guilds/${guild.id}`} className="flex items-center gap-3 flex-1 hover:text-primary transition-colors">
                        {guild.logoUrl && <img src={guild.logoUrl} className="h-10 w-10 rounded-lg" alt="" />}
                        <div>
                          <h4 className="font-display font-semibold">{guild.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-1">{guild.description}</p>
                        </div>
                      </Link>
                      {isSteward && feature && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => removeFeature(feature.id)}>
                          <X className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {featuredQuests.length === 0 && featuredGuilds.length === 0 && (
            <p className="text-muted-foreground py-6 text-center">No featured items in this House yet.</p>
          )}

          {/* Steward curation actions */}
          {isSteward && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
              <h4 className="font-display font-semibold flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" /> Curation Actions
              </h4>
              {unfeaturedQuests.length > 0 && (
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Feature a Quest</label>
                    <Select value={featureQuestId} onValueChange={setFeatureQuestId}>
                      <SelectTrigger><SelectValue placeholder="Select quest" /></SelectTrigger>
                      <SelectContent>
                        {unfeaturedQuests.map(q => <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={() => addFeature(TopicFeatureTargetType.QUEST, featureQuestId)} disabled={!featureQuestId}>
                    <Plus className="h-4 w-4 mr-1" /> Feature
                  </Button>
                </div>
              )}
              {unfeaturedGuilds.length > 0 && (
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Feature a Guild</label>
                    <Select value={featureGuildId} onValueChange={setFeatureGuildId}>
                      <SelectTrigger><SelectValue placeholder="Select guild" /></SelectTrigger>
                      <SelectContent>
                        {unfeaturedGuilds.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={() => addFeature(TopicFeatureTargetType.GUILD, featureGuildId)} disabled={!featureGuildId}>
                    <Plus className="h-4 w-4 mr-1" /> Feature
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="quests" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {topicQuests.map(quest => (
              <Link key={quest.id} to={`/quests/${quest.id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-display font-semibold">{quest.title}</h4>
                  <span className="flex items-center gap-1 text-sm font-semibold text-primary"><Zap className="h-3.5 w-3.5" /> {quest.rewardXp}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{quest.description}</p>
                <div className="flex gap-1.5 mt-2">
                  {featuredQuestIds.includes(quest.id) && <Badge className="bg-warning/10 text-warning border-0 text-[10px]"><Star className="h-2.5 w-2.5 mr-0.5" />House featured</Badge>}
                  <Badge variant="outline" className="text-[10px] capitalize">{quest.status.toLowerCase().replace("_", " ")}</Badge>
                </div>
              </Link>
            ))}
            {topicQuests.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No quests in this topic.</p>}
          </div>
        </TabsContent>

        <TabsContent value="guilds" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {topicGuilds.map(guild => (
              <Link key={guild.id} to={`/guilds/${guild.id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3">
                  {guild.logoUrl && <img src={guild.logoUrl} className="h-10 w-10 rounded-lg" alt="" />}
                  <div>
                    <h4 className="font-display font-semibold">{guild.name}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-1">{guild.description}</p>
                  </div>
                </div>
                {featuredGuildIds.includes(guild.id) && (
                  <Badge className="bg-warning/10 text-warning border-0 text-[10px] mt-2"><Star className="h-2.5 w-2.5 mr-0.5" />House featured</Badge>
                )}
              </Link>
            ))}
            {topicGuilds.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No guilds in this topic.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
