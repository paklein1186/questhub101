import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { FollowersDialog } from "@/components/FollowersDialog";

interface Props {
  topicId: string;
  topicName: string;
}

function TopicConnectedHumans({ topicId }: { topicId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: count = 0 } = useQuery({
    queryKey: ["topic-connected-humans", topicId],
    queryFn: async () => {
      const { count } = await supabase
        .from("user_topics")
        .select("id", { count: "exact", head: true })
        .eq("topic_id", topicId);
      return count || 0;
    },
    enabled: !!topicId,
  });

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className="rounded-lg border border-border bg-card p-4 text-center hover:border-primary/30 transition-all cursor-pointer"
      >
        <p className="text-2xl font-bold text-primary">{count}</p>
        <p className="text-sm text-muted-foreground">Connected Humans</p>
      </button>
      <FollowersDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        targetId={topicId}
        targetType="TOPIC"
        mode="followers"
      />
    </>
  );
}

function TopicFollowers({ topicId }: { topicId: string }) {
  const { data: count = 0 } = useQuery({
    queryKey: ["topic-followers", topicId],
    queryFn: async () => {
      const { count } = await supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("target_id", topicId)
        .eq("target_type", "TOPIC");
      return count || 0;
    },
    enabled: !!topicId,
  });

  return (
    <div className="rounded-lg border border-border bg-card p-4 text-center">
      <p className="text-2xl font-bold text-primary">{count}</p>
      <p className="text-sm text-muted-foreground">Followers</p>
    </div>
  );
}

function TopicEntityStats({ topicId }: { topicId: string }) {
  const { data } = useQuery({
    queryKey: ["topic-entity-stats", topicId],
    queryFn: async () => {
      const [quests, guilds, companies, services, courses] = await Promise.all([
        supabase.from("quest_topics").select("id", { count: "exact", head: true }).eq("topic_id", topicId),
        supabase.from("guild_topics").select("id", { count: "exact", head: true }).eq("topic_id", topicId),
        supabase.from("company_topics").select("id", { count: "exact", head: true }).eq("topic_id", topicId),
        supabase.from("service_topics").select("id", { count: "exact", head: true }).eq("topic_id", topicId),
        supabase.from("course_topics").select("id", { count: "exact", head: true }).eq("topic_id", topicId),
      ]);
      return {
        quests: quests.count || 0,
        guilds: guilds.count || 0,
        companies: companies.count || 0,
        services: services.count || 0,
        courses: courses.count || 0,
      };
    },
    enabled: !!topicId,
  });

  if (!data) return null;

  const stats = [
    { label: "Quests", value: data.quests },
    { label: "Guilds", value: data.guilds },
    { label: "Organizations", value: data.companies },
    { label: "Services", value: data.services },
    { label: "Courses", value: data.courses },
  ].filter(s => s.value > 0);

  if (stats.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <h3 className="font-display text-base font-semibold">Ecosystem Snapshot</h3>
      <div className="flex flex-wrap gap-2">
        {stats.map(s => (
          <Badge key={s.label} variant="outline" className="gap-1.5 py-1 px-2.5">
            <span className="font-semibold text-primary">{s.value}</span>
            <span>{s.label}</span>
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function TopicOverviewTab({ topicId, topicName }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2">
        <TopicConnectedHumans topicId={topicId} />
        <TopicFollowers topicId={topicId} />
      </div>
      <TopicEntityStats topicId={topicId} />
    </div>
  );
}
