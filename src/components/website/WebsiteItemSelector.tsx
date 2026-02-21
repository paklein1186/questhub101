import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Props {
  itemType: "quest" | "service" | "guild";
  ownerType: string;
  ownerId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function WebsiteItemSelector({ itemType, ownerType, ownerId, selectedIds, onChange }: Props) {
  const { data: items, isLoading } = useQuery({
    queryKey: ["website-items", itemType, ownerType, ownerId],
    queryFn: async () => {
      if (itemType === "quest") {
        let filters: Record<string, string> = { is_deleted: "false" };
        if (ownerType === "user") filters["created_by_user_id"] = ownerId;
        if (ownerType === "guild") filters["guild_id"] = ownerId;
        const { data } = await supabase.from("quests").select("id, title").match(filters as any).order("created_at", { ascending: false }).limit(100);
        return (data || []).map((d: any) => ({ id: d.id, name: d.title }));
      }
      if (itemType === "service") {
        let filters: Record<string, string> = { is_deleted: "false" };
        if (ownerType === "user") filters["owner_user_id"] = ownerId;
        if (ownerType === "guild") filters["owner_guild_id"] = ownerId;
        const { data } = await supabase.from("services").select("id, title").match(filters as any).order("created_at", { ascending: false }).limit(100);
        return (data || []).map((d: any) => ({ id: d.id, name: d.title }));
      }
      if (itemType === "guild") {
        const { data } = await supabase.from("guilds").select("id, name").eq("is_deleted", false).order("created_at", { ascending: false }).limit(100);
        return (data || []).map((d: any) => ({ id: d.id, name: d.name }));
      }
      return [];
    },
  });

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading items…</p>;

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 bg-muted/50 rounded-md">
      <Label className="text-xs font-medium">Select {itemType}s</Label>
      {(!items || items.length === 0) && (
        <p className="text-xs text-muted-foreground">No {itemType}s found.</p>
      )}
      {(items || []).map((item: any) => (
        <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
          <Checkbox
            checked={selectedIds.includes(item.id)}
            onCheckedChange={() => toggle(item.id)}
          />
          <span className="truncate">{item.name}</span>
        </label>
      ))}
    </div>
  );
}
