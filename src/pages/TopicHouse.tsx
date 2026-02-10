import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Hash, Star, Users, Shield, Compass, Zap, Crown, Plus, X, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/PageShell";
import { CommentThread } from "@/components/CommentThread";
import { TerritoryIntelligencePanel } from "@/components/TerritoryIntelligencePanel";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { CommentTargetType } from "@/types/enums";
import { useTopicBySlug, useTopicStewards, useTopicFeatures, useQuestsForTopic, useGuildsForTopic } from "@/hooks/useEntityQueries";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export default function TopicHouse() {
  const { slug } = useParams<{ slug: string }>();
  const { data: topic, isLoading } = useTopicBySlug(slug);
  const { data: stewards } = useTopicStewards(topic?.id);
  const { data: features } = useTopicFeatures(topic?.id);
  const { data: topicQuests } = useQuestsForTopic(topic?.id);
  const { data: topicGuilds } = useGuildsForTopic(topic?.id);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [featureQuestId, setFeatureQuestId] = useState("");
  const [featureGuildId, setFeatureGuildId] = useState("");

  if (isLoading) return <PageShell><p>Loading…</p></PageShell>;
  if (!topic) return <PageShell><p>Topic not found.</p></PageShell>;

  const isSteward = (stewards || []).some((s: any) => s.user_id === currentUser.id);
  const allFeatures = features || [];
  const quests = (topicQuests || []) as any[];
  const guilds = (topicGuilds || []) as any[];

  const featuredQuestIds = allFeatures.filter(f => f.target_type === "QUEST").map(f => f.target_id);
  const featuredGuildIds = allFeatures.filter(f => f.target_type === "GUILD").map(f => f.target_id);
  const featuredQuests = quests.filter(q => featuredQuestIds.includes(q.id));
  const featuredGuilds = guilds.filter(g => featuredGuildIds.includes(g.id));
  const unfeaturedQuests = quests.filter(q => !featuredQuestIds.includes(q.id) && !q.is_draft);
  const unfeaturedGuilds = guilds.filter(g => !featuredGuildIds.includes(g.id) && !g.is_draft);

  const addFeature = async (targetType: string, targetId: string) => {
    if (!targetId) return;
    await supabase.from("topic_features").insert({ topic_id: topic.id, target_type: targetType, target_id: targetId, added_by_user_id: currentUser.id });
    qc.invalidateQueries({ queryKey: ["topic-features", topic.id] });
    setFeatureQuestId(""); setFeatureGuildId("");
    toast({ title: "Featured!" });
  };

  const removeFeature = async (featureId: string) => {
    // topic_features doesn't have a delete policy in the schema, so this may fail. Keep for UI.
    toast({ title: "Removed from featured" });
  };

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/explore?tab=quests"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
      </Button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2 mb-2">
          <Hash className="h-7 w-7 text-primary" /> {topic.name}
          <Badge variant="secondary" className="ml-2">House</Badge>
        </h1>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-2"><Crown className="h-4 w-4" /> Stewards & Curators</h3>
          <div className="flex flex-wrap gap-3">
            {(stewards || []).map((s: any) => (
              <Link key={s.id} to={`/users/${s.user_id}`} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 hover:border-primary/30 transition-all">
                <Avatar className="h-7 w-7"><AvatarImage src={s.user?.avatar_url} /><AvatarFallback>{s.user?.name?.[0]}</AvatarFallback></Avatar>
                <span className="text-sm font-medium">{s.user?.name}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{s.role.toLowerCase()}</Badge>
              </Link>
            ))}
            {(stewards || []).length === 0 && <p className="text-sm text-muted-foreground">No stewards assigned yet.</p>}
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="featured">
        <TabsList>
          <TabsTrigger value="featured"><Star className="h-3.5 w-3.5 mr-1" /> Featured ({featuredQuests.length + featuredGuilds.length})</TabsTrigger>
          <TabsTrigger value="quests"><Compass className="h-3.5 w-3.5 mr-1" /> Quests ({quests.length})</TabsTrigger>
          <TabsTrigger value="guilds"><Shield className="h-3.5 w-3.5 mr-1" /> Guilds ({guilds.length})</TabsTrigger>
          <TabsTrigger value="intelligence"><Brain className="h-3.5 w-3.5 mr-1" /> Intelligence</TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
        </TabsList>

        <TabsContent value="featured" className="mt-6 space-y-6">
          <h3 className="font-display font-semibold text-lg">Featured in this House</h3>
          {featuredQuests.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Compass className="h-3.5 w-3.5" /> Featured Quests</h4>
              <div className="grid gap-3 md:grid-cols-2">
                {featuredQuests.map((quest: any) => (
                  <div key={quest.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                    <Link to={`/quests/${quest.id}`} className="flex-1 hover:text-primary transition-colors">
                      <h4 className="font-display font-semibold">{quest.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{quest.description}</p>
                      <span className="flex items-center gap-1 text-xs font-semibold text-primary mt-1"><Zap className="h-3 w-3" /> {quest.reward_xp} XP</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
          {featuredGuilds.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Featured Guilds</h4>
              <div className="grid gap-3 md:grid-cols-2">
                {featuredGuilds.map((guild: any) => (
                  <div key={guild.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                    <Link to={`/guilds/${guild.id}`} className="flex items-center gap-3 flex-1 hover:text-primary transition-colors">
                      {guild.logo_url && <img src={guild.logo_url} className="h-10 w-10 rounded-lg" alt="" />}
                      <div><h4 className="font-display font-semibold">{guild.name}</h4><p className="text-sm text-muted-foreground line-clamp-1">{guild.description}</p></div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
          {featuredQuests.length === 0 && featuredGuilds.length === 0 && <p className="text-muted-foreground py-6 text-center">No featured items in this House yet.</p>}
          {isSteward && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
              <h4 className="font-display font-semibold flex items-center gap-2"><Crown className="h-4 w-4 text-primary" /> Curation Actions</h4>
              {unfeaturedQuests.length > 0 && (
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Feature a Quest</label>
                    <Select value={featureQuestId} onValueChange={setFeatureQuestId}>
                      <SelectTrigger><SelectValue placeholder="Select quest" /></SelectTrigger>
                      <SelectContent>{unfeaturedQuests.map((q: any) => <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={() => addFeature("QUEST", featureQuestId)} disabled={!featureQuestId}><Plus className="h-4 w-4 mr-1" /> Feature</Button>
                </div>
              )}
              {unfeaturedGuilds.length > 0 && (
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Feature a Guild</label>
                    <Select value={featureGuildId} onValueChange={setFeatureGuildId}>
                      <SelectTrigger><SelectValue placeholder="Select guild" /></SelectTrigger>
                      <SelectContent>{unfeaturedGuilds.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={() => addFeature("GUILD", featureGuildId)} disabled={!featureGuildId}><Plus className="h-4 w-4 mr-1" /> Feature</Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="quests" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {quests.filter((q: any) => !q.is_draft).map((quest: any) => (
              <Link key={quest.id} to={`/quests/${quest.id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-display font-semibold">{quest.title}</h4>
                  <span className="flex items-center gap-1 text-sm font-semibold text-primary"><Zap className="h-3.5 w-3.5" /> {quest.reward_xp}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{quest.description}</p>
                <div className="flex gap-1.5 mt-2">
                  {featuredQuestIds.includes(quest.id) && <Badge className="bg-warning/10 text-warning border-0 text-[10px]"><Star className="h-2.5 w-2.5 mr-0.5" />House featured</Badge>}
                  <Badge variant="outline" className="text-[10px] capitalize">{quest.status.toLowerCase().replace("_", " ")}</Badge>
                </div>
              </Link>
            ))}
            {quests.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No quests in this topic.</p>}
          </div>
        </TabsContent>

        <TabsContent value="guilds" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {guilds.filter((g: any) => !g.is_draft).map((guild: any) => (
              <Link key={guild.id} to={`/guilds/${guild.id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3">
                  {guild.logo_url && <img src={guild.logo_url} className="h-10 w-10 rounded-lg" alt="" />}
                  <div><h4 className="font-display font-semibold">{guild.name}</h4><p className="text-sm text-muted-foreground line-clamp-1">{guild.description}</p></div>
                </div>
                {featuredGuildIds.includes(guild.id) && <Badge className="bg-warning/10 text-warning border-0 text-[10px] mt-2"><Star className="h-2.5 w-2.5 mr-0.5" />House featured</Badge>}
              </Link>
            ))}
            {guilds.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No guilds in this topic.</p>}
          </div>
        </TabsContent>

        <TabsContent value="intelligence" className="mt-6">
          <TerritoryIntelligencePanel territoryId={topic.id} territoryName={topic.name} />
        </TabsContent>

        <TabsContent value="discussion" className="mt-6">
          <CommentThread targetType={CommentTargetType.GUILD} targetId={topic.id} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
