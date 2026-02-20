import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Hash, Sparkles, ArrowLeft, Heart, Compass, Shield } from "lucide-react";
import { useTopicBySlug, useQuestsForTopic, useGuildsForTopic } from "@/hooks/useEntityQueries";
import { TopicOverviewTab } from "@/components/topic/TopicOverviewTab";
import { TopicEcosystemTab } from "@/components/topic/TopicEcosystemTab";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFollow } from "@/hooks/useFollow";
import { usePersona } from "@/hooks/usePersona";
import { FollowTargetType } from "@/types/enums";
import { cn } from "@/lib/utils";

export default function TopicHouse() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const { data: topic, isLoading } = useTopicBySlug(slug);
  const { data: topicQuests } = useQuestsForTopic(topic?.id);
  const { data: topicGuilds } = useGuildsForTopic(topic?.id);
  const currentUser = useCurrentUser();
  const { persona } = usePersona();
  const { isFollowing, toggle: toggleFollow, isLoading: followLoading } = useFollow(
    FollowTargetType.TOPIC,
    topic?.id ?? ""
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Hash className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Topic not found</p>
        <Link to="/explore" className="text-sm text-primary hover:underline">← Back to Explore</Link>
      </div>
    );
  }

  const isCreativeUniverse = persona === "CREATIVE";
  const TopicIcon = isCreativeUniverse ? Sparkles : Hash;
  const typeLabel = isCreativeUniverse ? "House" : "Topic";

  const quests = (topicQuests || []).filter((q: any) => !q.is_draft);
  const guilds = (topicGuilds || []).filter((g: any) => !g.is_draft);

  const setTab = (t: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (t === "overview") next.delete("tab"); else next.set("tab", t);
      return next;
    }, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Back link */}
        <button
          onClick={() => navigate("/explore?tab=houses")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <TopicIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-display font-bold text-foreground">{topic.name}</h1>
                <Badge variant="secondary" className="text-xs">{typeLabel}</Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {quests.length > 0 && (
                  <span className="flex items-center gap-1"><Compass className="h-3 w-3" /> {quests.length} quests</span>
                )}
                {guilds.length > 0 && (
                  <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {guilds.length} guilds</span>
                )}
              </div>
            </div>
            <div className="ml-auto shrink-0 flex items-center gap-2">
              <Button
                size="sm"
                variant={isFollowing ? "secondary" : "default"}
                onClick={toggleFollow}
                disabled={followLoading || !topic.id}
                className="gap-1.5"
              >
                <Heart className={cn("h-3.5 w-3.5", isFollowing && "fill-current")} />
                {isFollowing ? "Following" : "Follow"}
              </Button>
              <ShareLinkButton entityType="topic" entityId={topic.slug || topic.id} entityName={topic.name} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ecosystem">Ecosystem</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <TopicOverviewTab topicId={topic.id} topicName={topic.name} />
          </TabsContent>

          <TabsContent value="ecosystem" className="mt-6">
            <TopicEcosystemTab topicId={topic.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
