import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, Compass, Shield, Leaf, ArrowRight, LogIn } from "lucide-react";

interface Props {
  territory: { id: string; name: string; level: string; summary?: string | null };
  memberCount: number;
  questCount: number;
  guildCount: number;
  naturalSystemCount: number;
  isAuthenticated: boolean;
  isAlreadyMember: boolean;
}

export function TerritoryGuestPortal({
  territory, memberCount, questCount, guildCount, naturalSystemCount,
  isAuthenticated, isAlreadyMember,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4">
        <h2 className="text-lg font-display font-semibold text-foreground">
          Welcome to {territory.name}
        </h2>
        {territory.summary && (
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{territory.summary}</p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          <span className="flex items-center gap-1"><Users className="h-4 w-4 text-blue-500" /> {memberCount} members</span>
          <span className="flex items-center gap-1"><Compass className="h-4 w-4 text-violet-500" /> {questCount} quests</span>
          <span className="flex items-center gap-1"><Shield className="h-4 w-4 text-amber-500" /> {guildCount} guilds</span>
          <span className="flex items-center gap-1"><Leaf className="h-4 w-4 text-green-500" /> {naturalSystemCount} natural systems</span>
        </div>

        {!isAuthenticated ? (
          <Button asChild>
            <Link to="/login"><LogIn className="h-4 w-4 mr-1" /> Sign in to join</Link>
          </Button>
        ) : !isAlreadyMember ? (
          <p className="text-xs text-muted-foreground">
            Add this territory to your profile to become a member.
          </p>
        ) : (
          <Badge variant="secondary">You're a member of this territory</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to={`/territories/${territory.id}?tab=ecosystem`}
          className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors group"
        >
          <h3 className="font-semibold text-sm flex items-center gap-2 group-hover:text-primary">
            <Compass className="h-4 w-4" /> Explore the Ecosystem
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Discover people, guilds, and quests in this territory.</p>
        </Link>
        <Link
          to={`/territories/${territory.id}?tab=living`}
          className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors group"
        >
          <h3 className="font-semibold text-sm flex items-center gap-2 group-hover:text-primary">
            <Leaf className="h-4 w-4" /> Living Systems
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Natural systems, stewardship, and ecological health.</p>
        </Link>
      </div>
    </div>
  );
}
