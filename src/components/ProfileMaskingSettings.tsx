import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Search, EyeOff, Shield, CircleDot, Building2, Users, Compass } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MaskedItem {
  id: string;
  target_id: string;
  target_type: string;
  target_name: string | null;
}

const TYPE_ICONS: Record<string, any> = {
  GUILD: Shield,
  POD: CircleDot,
  COMPANY: Building2,
  USER: Users,
  QUEST: Compass,
};

const TYPE_LABELS: Record<string, string> = {
  GUILD: "Guild",
  POD: "Pod",
  COMPANY: "Organization",
  USER: "User",
  QUEST: "Quest",
};

export function ProfileMaskingSettings() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ id: string; type: string; name: string }[]>([]);

  const { data: maskedItems = [], isLoading } = useQuery({
    queryKey: ["profile-masked-items", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profile_masked_items")
        .select("id, target_id, target_type, target_name")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      return (data ?? []) as MaskedItem[];
    },
    enabled: !!userId,
  });

  const handleSearch = async () => {
    if (!search.trim() || search.trim().length < 2) return;
    setSearching(true);
    const term = `%${search.trim()}%`;

    const [guilds, pods, companies, users, quests] = await Promise.all([
      supabase.from("guilds").select("id, name").ilike("name", term).eq("is_deleted", false).limit(5),
      supabase.from("pods").select("id, name").ilike("name", term).eq("is_deleted", false).limit(5),
      supabase.from("companies").select("id, name").ilike("name", term).eq("is_deleted", false).limit(5),
      supabase.from("profiles_public").select("user_id, name").ilike("name", term).neq("user_id", userId!).limit(5),
      supabase.from("quests").select("id, title").ilike("title", term).eq("is_deleted", false).limit(5),
    ]);

    const merged: { id: string; type: string; name: string }[] = [];
    (guilds.data ?? []).forEach((g) => merged.push({ id: g.id, type: "GUILD", name: g.name }));
    (pods.data ?? []).forEach((p) => merged.push({ id: p.id, type: "POD", name: p.name }));
    (companies.data ?? []).forEach((c) => merged.push({ id: c.id, type: "COMPANY", name: c.name }));
    (users.data ?? []).forEach((u: any) => merged.push({ id: u.user_id, type: "USER", name: u.name }));
    (quests.data ?? []).forEach((q: any) => merged.push({ id: q.id, type: "QUEST", name: q.title }));

    // Filter out already masked
    const maskedSet = new Set(maskedItems.map((m) => `${m.target_type}:${m.target_id}`));
    setResults(merged.filter((r) => !maskedSet.has(`${r.type}:${r.id}`)));
    setSearching(false);
  };

  const addMask = async (item: { id: string; type: string; name: string }) => {
    if (!userId) return;
    const { error } = await supabase.from("profile_masked_items").insert({
      user_id: userId,
      target_id: item.id,
      target_type: item.type,
      target_name: item.name,
    } as any);
    if (error) {
      toast({ title: "Failed to add", description: error.message, variant: "destructive" });
      return;
    }
    setResults((r) => r.filter((x) => !(x.id === item.id && x.type === item.type)));
    qc.invalidateQueries({ queryKey: ["profile-masked-items"] });
    toast({ title: `${item.name} hidden from profile` });
  };

  const removeMask = async (item: MaskedItem) => {
    await supabase.from("profile_masked_items").delete().eq("id", item.id);
    qc.invalidateQueries({ queryKey: ["profile-masked-items"] });
    toast({ title: `${item.target_name || "Item"} visible again` });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Search for guilds, pods, organizations, quests, or users you want to hide from your public profile. 
        These will not appear in your profile stats, entities, or following lists for other visitors.
      </p>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch} disabled={searching || search.trim().length < 2}>
          Search
        </Button>
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {results.map((r) => {
            const Icon = TYPE_ICONS[r.type] || Shield;
            return (
              <div key={`${r.type}:${r.id}`} className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{r.name}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">{TYPE_LABELS[r.type]}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => addMask(r)} className="text-xs shrink-0">
                  <EyeOff className="h-3.5 w-3.5 mr-1" /> Hide
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Currently masked items */}
      {maskedItems.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Hidden items ({maskedItems.length})</h4>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {maskedItems.map((item) => {
              const Icon = TYPE_ICONS[item.target_type] || Shield;
              return (
                <div key={item.id} className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{item.target_name || item.target_id}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{TYPE_LABELS[item.target_type] || item.target_type}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeMask(item)} className="text-xs text-destructive hover:text-destructive shrink-0">
                    <X className="h-3.5 w-3.5 mr-1" /> Show
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isLoading && maskedItems.length === 0 && results.length === 0 && (
        <p className="text-xs text-muted-foreground">No items hidden yet. Use the search above to find items to hide.</p>
      )}
    </div>
  );
}
