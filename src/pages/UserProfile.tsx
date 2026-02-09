import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, Star, MapPin, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { CommentThread } from "@/components/CommentThread";
import { CommentTargetType } from "@/types/enums";
import {
  getUserById, users, achievements, userTopics, userTerritories,
  getTopicById, getTerritoryById,
} from "@/data/mock";

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const user = getUserById(id!);
  if (!user) return <PageShell><p>User not found.</p></PageShell>;

  const topics = userTopics.filter((ut) => ut.userId === user.id).map((ut) => getTopicById(ut.topicId)!).filter(Boolean);
  const territories = userTerritories.filter((ut) => ut.userId === user.id).map((ut) => getTerritoryById(ut.territoryId)!).filter(Boolean);
  const userAchievements = achievements.filter((a) => a.userId === user.id);

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
      </Button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-5 mb-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback className="text-2xl">{user.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-display text-3xl font-bold">{user.name}</h1>
            {user.headline && <p className="text-muted-foreground">{user.headline}</p>}
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="secondary" className="capitalize">{user.role.toLowerCase().replace("_", " ")}</Badge>
              <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                <Zap className="h-4 w-4" /> {user.xp} XP
              </span>
              <span className="text-sm text-muted-foreground">CI: {user.contributionIndex}</span>
            </div>
          </div>
        </div>
        {user.bio && <p className="text-muted-foreground max-w-2xl mb-4">{user.bio}</p>}

        <div className="flex flex-wrap gap-1.5 mb-2">
          {topics.map((t) => (
            <Badge key={t.id} variant="secondary" className="text-xs"><Hash className="h-3 w-3 mr-0.5" />{t.name}</Badge>
          ))}
          {territories.map((t) => (
            <Badge key={t.id} variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-0.5" />{t.name}</Badge>
          ))}
        </div>
      </motion.div>

      {/* Achievements */}
      {userAchievements.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <Star className="h-5 w-5 text-warning" /> Achievements
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {userAchievements.map((a) => (
              <div key={a.id} className="rounded-lg border border-border bg-card p-4">
                <h4 className="font-display font-semibold">{a.title}</h4>
                <p className="text-sm text-muted-foreground">{a.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Comments on this user's profile */}
      <section>
        <h2 className="font-display text-lg font-semibold mb-3">Wall</h2>
        <CommentThread targetType={CommentTargetType.USER} targetId={user.id} />
      </section>
    </PageShell>
  );
}
