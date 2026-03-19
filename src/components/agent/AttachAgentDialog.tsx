import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Search, Sparkles, Map, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

interface AttachAgentDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agentId: string;
  userId: string;
}

type TargetType = "quest" | "guild" | "territory";

export function AttachAgentDialog({ open, onOpenChange, agentId, userId }: AttachAgentDialogProps) {
  const [tab, setTab] = useState<TargetType>("quest");
  const [search, setSearch] = useState("");
  const [attaching, setAttaching] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: quests } = useQuery({
    queryKey: ["my-quests-for-attach", userId, search],
    enabled: open && tab === "quest",
    queryFn: async () => {
      let q = supabase.from("quests").select("id, title").eq("owner_id", userId).order("created_at", { ascending: false }).limit(20);
      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: guilds } = useQuery({
    queryKey: ["my-guilds-for-attach", userId, search],
    enabled: open && tab === "guild",
    queryFn: async () => {
      const { data } = await supabase
        .from("guild_members")
        .select("guild_id, guilds(id, name)")
        .eq("user_id", userId)
        .eq("role", "ADMIN");
      let results = (data || []).map((gm: any) => gm.guilds).filter(Boolean);
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        results = results.filter((g: any) => g.name?.toLowerCase().includes(s));
      }
      return results;
    },
  });

  const { data: territories } = useQuery({
    queryKey: ["my-territories-for-attach", userId, search],
    enabled: open && tab === "territory",
    queryFn: async () => {
      // Use territories where user is creator or admin via company membership
      const { data } = await supabase
        .from("territories")
        .select("id, name")
        .eq("created_by_user_id", userId)
        .limit(20);
      let results = data || [];
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        results = results.filter((t: any) => t.name?.toLowerCase().includes(s));
      }
      return results;
    },
  });

  const items = tab === "quest" ? quests : tab === "guild" ? guilds : territories;

  const attach = async (targetId: string) => {
    setAttaching(targetId);
    const { error } = await supabase.from("unit_agents" as any).insert({
      agent_id: agentId,
      unit_type: tab,
      unit_id: targetId,
      admitted_by_user_id: userId,
    } as any);
    setAttaching(null);
    if (error) {
      if (error.message.includes("duplicate")) {
        toast.info("Agent already attached");
      } else {
        toast.error("Failed to attach agent");
      }
      return;
    }
    toast.success("Agent attached!");
    qc.invalidateQueries({ queryKey: ["unit-agents"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Attach Agent to...</DialogTitle></DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as TargetType); setSearch(""); }}>
          <TabsList className="w-full">
            <TabsTrigger value="quest" className="flex-1">
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Quest
            </TabsTrigger>
            <TabsTrigger value="guild" className="flex-1">
              <Users className="h-3.5 w-3.5 mr-1" /> Guild
            </TabsTrigger>
            <TabsTrigger value="territory" className="flex-1">
              <Map className="h-3.5 w-3.5 mr-1" /> Territory
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${tab}s...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {!items?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No {tab}s found where you have admin access.
            </p>
          ) : (
            items.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => attach(item.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title || item.name}</p>
                </div>
                {attaching === item.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Badge variant="secondary" className="text-[10px] shrink-0">Attach</Badge>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
