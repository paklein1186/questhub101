import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Users, Plus, Loader2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { GuildType } from "@/types/enums";
import { useGuilds, useCreateGuild } from "@/hooks/useSupabaseData";
import { isAdmin as checkIsGlobalAdmin } from "@/lib/admin";
import { ExploreFilters, ExploreFilterValues, defaultFilters } from "@/components/ExploreFilters";

export default function GuildsList({ bare }: { bare?: boolean }) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const [filters, setFilters] = useState<ExploreFilterValues>(defaultFilters);
  const [createOpen, setCreateOpen] = useState(false);
  const [gName, setGName] = useState("");
  const [gDesc, setGDesc] = useState("");
  const [gType, setGType] = useState<GuildType>(GuildType.GUILD);
  const [gDraft, setGDraft] = useState(false);

  const isAdm = checkIsGlobalAdmin(currentUser.email);
  const { data: guildsData, isLoading } = useGuilds();
  const createGuildMut = useCreateGuild();

  const allGuilds = guildsData ?? [];

  const filtered = allGuilds.filter((g) => {
    if (g.is_draft && !isAdm && g.created_by_user_id !== currentUser.id) return false;
    if (filters.topicIds.length > 0 && !g.guild_topics?.some((gt: any) => filters.topicIds.includes(gt.topic_id))) return false;
    if (filters.territoryIds.length > 0 && !g.guild_territories?.some((gt: any) => filters.territoryIds.includes(gt.territory_id))) return false;
    if (filters.guildType !== "all" && g.type !== filters.guildType) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!gName.trim()) return;
    try {
      await createGuildMut.mutateAsync({ name: gName, description: gDesc, type: gType, isDraft: gDraft });
      setCreateOpen(false);
      setGName(""); setGDesc(""); setGType(GuildType.GUILD); setGDraft(false);
      toast({ title: "Guild created!", description: `${gName} (pending approval)` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <PageShell bare={bare}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" /> Guilds
        </h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create Guild</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create a new Guild</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input value={gName} onChange={e => setGName(e.target.value)} placeholder="Guild name" maxLength={80} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Textarea value={gDesc} onChange={e => setGDesc(e.target.value)} placeholder="What is your guild about?" maxLength={500} className="resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select value={gType} onValueChange={v => setGType(v as GuildType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={GuildType.GUILD}>Guild</SelectItem>
                    <SelectItem value={GuildType.NETWORK}>Network</SelectItem>
                    <SelectItem value={GuildType.COLLECTIVE}>Collective</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Save as draft</label>
                <Switch checked={gDraft} onCheckedChange={setGDraft} />
              </div>
              <Button onClick={handleCreate} disabled={!gName.trim() || createGuildMut.isPending} className="w-full">
                {createGuildMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create Guild
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <ExploreFilters
          filters={filters}
          onChange={setFilters}
          config={{ showTopics: true, showTerritories: true, showGuildType: true }}
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((guild, i) => {
          const gTopics = guild.guild_topics?.map((gt: any) => gt.topics).filter(Boolean) ?? [];
          const gTerrs = guild.guild_territories?.map((gt: any) => gt.territories).filter(Boolean) ?? [];
          const memberCount = guild.guild_members?.length ?? 0;
          return (
            <motion.div key={guild.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/guilds/${guild.id}`} className="block rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all group">
                <div className="flex items-center gap-3 mb-3">
                  <img src={guild.logo_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${guild.name}`} className="h-12 w-12 rounded-lg" alt="" />
                  <div>
                    <h3 className="font-display font-semibold group-hover:text-primary transition-colors">{guild.name}</h3>
                    <span className="text-xs text-muted-foreground capitalize">{guild.type.toLowerCase()}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{guild.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {gTopics.map((t: any) => <Badge key={t.id} variant="secondary" className="text-xs">{t.name}</Badge>)}
                  {gTerrs.map((t: any) => <Badge key={t.id} variant="outline" className="text-xs">{t.name}</Badge>)}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> {memberCount} members
                </div>
              </Link>
            </motion.div>
          );
        })}
        {!isLoading && filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-12">No guilds match your filters.</p>}
      </div>
    </PageShell>
  );
}
