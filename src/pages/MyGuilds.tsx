import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Users, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUserGuildMemberships } from "@/hooks/useEntityQueries";

export default function MyGuilds({ bare }: { bare?: boolean }) {
  const currentUser = useCurrentUser();
  const { data: memberships = [], isLoading } = useUserGuildMemberships(currentUser.id);

  const adminGuilds = memberships.filter((gm) => gm.role === "ADMIN");
  const memberGuilds = memberships.filter((gm) => gm.role === "MEMBER");

  const renderGuild = (gm: typeof memberships[0], i: number) => {
    const guild = gm.guilds as any;
    if (!guild) return null;
    return (
      <motion.div key={gm.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
        <Link
          to={`/guilds/${guild.id}`}
          className="block rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all"
        >
          <div className="flex items-center gap-3 mb-2">
            <Avatar className="h-12 w-12 rounded-lg">
              <AvatarImage src={guild.logo_url} />
              <AvatarFallback>{guild.name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-display font-semibold">{guild.name}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Member
          </div>
        </Link>
      </motion.div>
    );
  };

  return (
    <PageShell bare={bare}>
      {!bare && (
        <>
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
          </Button>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2 mb-8">
            <Shield className="h-7 w-7 text-primary" /> My Guilds
          </h1>
        </>
      )}

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      {!isLoading && memberships.length === 0 && (
        <p className="text-muted-foreground">You haven't joined any guilds yet. <Link to="/explore?tab=guilds" className="text-primary hover:underline">Browse guilds</Link></p>
      )}

      {adminGuilds.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display text-lg font-semibold mb-3">I am Admin ({adminGuilds.length})</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {adminGuilds.map((gm, i) => renderGuild(gm, i))}
          </div>
        </section>
      )}

      {memberGuilds.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold mb-3">I am Member ({memberGuilds.length})</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {memberGuilds.map((gm, i) => renderGuild(gm, i))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
