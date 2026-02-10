import { useState } from "react";
import { Link } from "react-router-dom";
import { Users, Plus, Building2, Settings, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MyGuilds from "./MyGuilds";

function useMyFollows(userId: string) {
  return useQuery({
    queryKey: ["my-follows", userId],
    queryFn: async () => {
      if (!userId) return { users: [], guilds: [], quests: [] };
      const { data, error } = await supabase
        .from("follows")
        .select("id, target_id, target_type, created_at")
        .eq("follower_id", userId);
      if (error) throw error;

      const rows = data ?? [];
      const userIds = rows.filter((f) => f.target_type === "USER").map((f) => f.target_id);
      const guildIds = rows.filter((f) => f.target_type === "GUILD").map((f) => f.target_id);
      const questIds = rows.filter((f) => f.target_type === "QUEST").map((f) => f.target_id);

      const [usersRes, guildsRes, questsRes] = await Promise.all([
        userIds.length > 0
          ? supabase.from("profiles_public").select("user_id, name, avatar_url, headline").in("user_id", userIds)
          : { data: [] },
        guildIds.length > 0
          ? supabase.from("guilds").select("id, name, logo_url").in("id", guildIds).eq("is_deleted", false)
          : { data: [] },
        questIds.length > 0
          ? supabase.from("quests").select("id, title, status").in("id", questIds).eq("is_deleted", false)
          : { data: [] },
      ]);

      return {
        users: (usersRes.data ?? []).map((u) => ({ ...u, followId: rows.find((r) => r.target_id === u.user_id)?.id })),
        guilds: (guildsRes.data ?? []).map((g) => ({ ...g, followId: rows.find((r) => r.target_id === g.id)?.id })),
        quests: (questsRes.data ?? []).map((q) => ({ ...q, followId: rows.find((r) => r.target_id === q.id)?.id })),
      };
    },
    enabled: !!userId,
  });
}

function useMyCompaniesNetwork(userId: string) {
  return useQuery({
    queryKey: ["my-companies-network", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("company_members")
        .select("id, role, companies(id, name, logo_url, sector)")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((m) => m.companies).filter(Boolean);
    },
    enabled: !!userId,
  });
}

function useMyStewardships(userId: string) {
  return useQuery({
    queryKey: ["my-stewardships", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("topic_stewards")
        .select("id, role, topics(id, name, slug)")
        .eq("user_id", userId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export default function NetworkHub() {
  const [tab, setTab] = useState("guilds");
  const currentUser = useCurrentUser();

  const { data: follows, isLoading: loadingFollows } = useMyFollows(currentUser.id);
  const { data: myCompanies = [], isLoading: loadingCompanies } = useMyCompaniesNetwork(currentUser.id);
  const { data: myStewardships = [], isLoading: loadingStewardships } = useMyStewardships(currentUser.id);

  const followedUsers = follows?.users ?? [];
  const followedGuilds = follows?.guilds ?? [];
  const followedQuests = follows?.quests ?? [];

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Users className="h-7 w-7 text-primary" /> Network
        </h1>
        <p className="text-muted-foreground mt-1">Your guilds, companies, stewardships, and connections.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="guilds">My Guilds</TabsTrigger>
          <TabsTrigger value="companies">My Companies ({myCompanies.length})</TabsTrigger>
          <TabsTrigger value="stewardships">Stewardships ({myStewardships.length})</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
        </TabsList>

        <TabsContent value="guilds"><MyGuilds bare /></TabsContent>

        <TabsContent value="companies">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{myCompanies.length} {myCompanies.length === 1 ? "company" : "companies"} you manage</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link to="/me/companies">View all</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/me/companies"><Plus className="h-4 w-4 mr-1" /> Create Company</Link>
              </Button>
            </div>
          </div>
          {loadingCompanies && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
          {!loadingCompanies && myCompanies.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground mb-3">No companies linked to your account.</p>
              <Button size="sm" asChild>
                <Link to="/me/companies"><Plus className="h-4 w-4 mr-1" /> Create Company</Link>
              </Button>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {myCompanies.map((company: any, i: number) => (
              <motion.div key={company.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/companies/${company.id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-3">
                    {company.logo_url && <img src={company.logo_url} className="h-10 w-10 rounded-lg" alt="" />}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display font-semibold truncate">{company.name}</h4>
                      {company.sector && <span className="text-xs text-muted-foreground">{company.sector}</span>}
                    </div>
                    <Button size="sm" variant="ghost" asChild onClick={(e) => e.stopPropagation()}>
                      <Link to={`/companies/${company.id}/settings`}><Settings className="h-4 w-4" /></Link>
                    </Button>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stewardships">
          {loadingStewardships && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
          {!loadingStewardships && myStewardships.length === 0 && <p className="text-muted-foreground">You're not a steward for any topic yet.</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {myStewardships.map((ts: any, i: number) => (
              <motion.div key={ts.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/topics/${ts.topics?.slug}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                  <h4 className="font-display font-semibold">{ts.topics?.name}</h4>
                  <Badge variant="secondary" className="text-[10px] capitalize mt-2">
                    {ts.role === "STEWARD" ? "Steward" : "Curator"}
                  </Badge>
                </Link>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="following">
          {loadingFollows && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
          <div className="space-y-6">
            {followedUsers.length > 0 && (
              <section>
                <h3 className="font-display font-semibold mb-3">People ({followedUsers.length})</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {followedUsers.map((f: any, i: number) => (
                    <motion.div key={f.user_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Link to={`/users/${f.user_id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-all">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={f.avatar_url} />
                          <AvatarFallback>{f.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{f.name}</p>
                          {f.headline && <p className="text-xs text-muted-foreground">{f.headline}</p>}
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {followedGuilds.length > 0 && (
              <section>
                <h3 className="font-display font-semibold mb-3">Guilds ({followedGuilds.length})</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {followedGuilds.map((f: any, i: number) => (
                    <motion.div key={f.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Link to={`/guilds/${f.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-all">
                        <Avatar className="h-10 w-10 rounded-lg">
                          <AvatarImage src={f.logo_url} />
                          <AvatarFallback>{f.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium">{f.name}</p>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {followedQuests.length > 0 && (
              <section>
                <h3 className="font-display font-semibold mb-3">Quests ({followedQuests.length})</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {followedQuests.map((f: any, i: number) => (
                    <motion.div key={f.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Link to={`/quests/${f.id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                        <h4 className="font-display font-semibold">{f.title}</h4>
                        <Badge variant="outline" className="text-[10px] capitalize mt-1">{f.status?.toLowerCase().replace("_", " ")}</Badge>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {!loadingFollows && followedUsers.length === 0 && followedGuilds.length === 0 && followedQuests.length === 0 && (
              <p className="text-muted-foreground">You're not following anyone yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
