import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Compass, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { CommentThread } from "@/components/CommentThread";
import { CommentTargetType } from "@/types/enums";
import { useAchievementById, usePublicProfile, useQuestById } from "@/hooks/useEntityQueries";
import { formatDistanceToNow } from "date-fns";

export default function AchievementDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: achievement, isLoading } = useAchievementById(id);
  const { data: user } = usePublicProfile(achievement?.user_id);
  const { data: quest } = useQuestById(achievement?.quest_id ?? undefined);

  if (isLoading) return <PageShell><p>Loading…</p></PageShell>;
  if (!achievement) return <PageShell><p>Achievement not found.</p></PageShell>;

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to={`/users/${achievement.user_id}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back to Profile</Link>
      </Button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-start gap-4 mb-4">
          <div className="h-14 w-14 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
            <Star className="h-7 w-7 text-warning" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">{achievement.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={user?.avatar_url ?? undefined} />
                  <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
                </Avatar>
                <Link to={`/users/${user?.user_id}`} className="hover:text-primary transition-colors">{user?.name}</Link>
              </div>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDistanceToNow(new Date(achievement.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {achievement.description && (
          <p className="text-muted-foreground max-w-2xl mb-4">{achievement.description}</p>
        )}

        {quest && (
          <div className="rounded-lg border border-border bg-card p-3 inline-flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" />
            <span className="text-sm">Quest:</span>
            <Link to={`/quests/${quest.id}`} className="text-sm font-medium hover:text-primary transition-colors">
              {quest.title}
            </Link>
            <Badge className="bg-primary/10 text-primary border-0 text-xs">{quest.reward_xp} XP</Badge>
          </div>
        )}
      </motion.div>

      <section>
        <h2 className="font-display text-lg font-semibold mb-3">Comments & Celebrations</h2>
        <CommentThread targetType={CommentTargetType.ACHIEVEMENT} targetId={achievement.id} />
      </section>
    </PageShell>
  );
}
