import { Link } from "react-router-dom";
import { UserCircle, Pencil, Zap, Settings } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { userTopics, userTerritories, getTopicById, getTerritoryById } from "@/data/mock";

export default function MeHub() {
  const currentUser = useCurrentUser();
  const topics = userTopics.filter((ut) => ut.userId === currentUser.id).map((ut) => getTopicById(ut.topicId)!).filter(Boolean);
  const territories = userTerritories.filter((ut) => ut.userId === currentUser.id).map((ut) => getTerritoryById(ut.territoryId)!).filter(Boolean);

  return (
    <PageShell>
      <div className="max-w-lg mx-auto">
        <div className="flex flex-col items-center text-center mb-8">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={currentUser.avatarUrl} />
            <AvatarFallback className="text-3xl">{currentUser.name[0]}</AvatarFallback>
          </Avatar>
          <h1 className="font-display text-2xl font-bold">{currentUser.name}</h1>
          {currentUser.headline && <p className="text-muted-foreground mt-1">{currentUser.headline}</p>}
          <div className="flex items-center gap-3 mt-3">
            <Badge variant="secondary" className="capitalize">{currentUser.role.toLowerCase().replace("_", " ")}</Badge>
            <span className="flex items-center gap-1 text-sm font-semibold text-primary">
              <Zap className="h-4 w-4" /> {currentUser.xp} XP
            </span>
            <span className="text-sm text-muted-foreground">CI: {currentUser.contributionIndex}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {topics.map((t) => <Badge key={t.id} variant="secondary" className="text-xs">{t.name}</Badge>)}
            {territories.map((t) => <Badge key={t.id} variant="outline" className="text-xs">{t.name}</Badge>)}
          </div>
        </div>

        <div className="space-y-3">
          <Button asChild variant="outline" className="w-full justify-start h-12">
            <Link to={`/users/${currentUser.id}`}>
              <UserCircle className="h-5 w-5 mr-3" /> View my public profile
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start h-12">
            <Link to="/profile/edit">
              <Pencil className="h-5 w-5 mr-3" /> Edit profile
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start h-12">
            <Link to="/onboarding">
              <Settings className="h-5 w-5 mr-3" /> Onboarding / Settings
            </Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
