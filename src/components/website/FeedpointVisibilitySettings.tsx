import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rss, Eye, EyeOff, Settings2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

/* ─── Types ─── */

type UnitType = "services" | "quests" | "guilds" | "partner_entities" | "posts";

type FeedpointMode = "none" | "all" | "custom";

const UNIT_TYPES: { key: UnitType; label: string; unitTable?: string }[] = [
  { key: "services", label: "Services", unitTable: "services" },
  { key: "quests", label: "Quests", unitTable: "quests" },
  { key: "guilds", label: "Guilds" },
  { key: "partner_entities", label: "Partner Entities" },
  { key: "posts", label: "Posts", unitTable: "feed_posts" },
];

interface Props {
  ownerType: "user" | "guild" | "company";
  ownerId: string;
}

/* ─── Helpers ─── */

function getOwnerConfig(ownerType: string) {
  if (ownerType === "user") return { table: "profiles", idCol: "user_id" };
  if (ownerType === "guild") return { table: "guilds", idCol: "id" };
  return { table: "companies", idCol: "id" };
}

function getOwnerField(ownerType: string, unitType: UnitType): string | null {
  if (unitType === "services") {
    return ownerType === "user" ? "provider_user_id" : ownerType === "guild" ? "provider_guild_id" : "company_id";
  }
  if (unitType === "quests") {
    return ownerType === "user" ? "created_by_user_id" : ownerType === "guild" ? "guild_id" : "company_id";
  }
  if (unitType === "posts") {
    return ownerType === "user" ? "author_user_id" : null;
  }
  return null;
}

/* ─── Component ─── */

export function FeedpointVisibilitySettings({ ownerType, ownerId }: Props) {
  const { table, idCol } = getOwnerConfig(ownerType);
  
  const [defaults, setDefaults] = useState<Record<UnitType, boolean>>({
    services: false, quests: false, guilds: false, partner_entities: false, posts: false,
  });
  const [overrideCounts, setOverrideCounts] = useState<Record<UnitType, number>>({
    services: 0, quests: 0, guilds: 0, partner_entities: 0, posts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [manageType, setManageType] = useState<UnitType | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from(table)
        .select("feedpoint_default_services, feedpoint_default_quests, feedpoint_default_guilds, feedpoint_default_partner_entities, feedpoint_default_posts")
        .eq(idCol, ownerId)
        .single();
      if (data) {
        setDefaults({
          services: data.feedpoint_default_services ?? false,
          quests: data.feedpoint_default_quests ?? false,
          guilds: data.feedpoint_default_guilds ?? false,
          partner_entities: data.feedpoint_default_partner_entities ?? false,
          posts: data.feedpoint_default_posts ?? false,
        });
      }
      const counts: Record<UnitType, number> = { services: 0, quests: 0, guilds: 0, partner_entities: 0, posts: 0 };
      for (const ut of UNIT_TYPES) {
        if (!ut.unitTable) continue;
        const field = getOwnerField(ownerType, ut.key);
        if (!field) continue;
        const { count } = await (supabase as any)
          .from(ut.unitTable)
          .select("id", { count: "exact", head: true })
          .eq(field, ownerId)
          .neq("web_visibility_override", "inherit");
        counts[ut.key] = count ?? 0;
      }
      setOverrideCounts(counts);
      setLoading(false);
    };
    load();
  }, [ownerId, ownerType, table, idCol]);

  const getMode = (unitType: UnitType): FeedpointMode => {
    if (overrideCounts[unitType] > 0) return "custom";
    return defaults[unitType] ? "all" : "none";
  };

  const handleSetMode = async (unitType: UnitType, mode: "none" | "all") => {
    const newDefaults = { ...defaults, [unitType]: mode === "all" };
    setDefaults(newDefaults);
    
    setSaving(true);
    const colName = `feedpoint_default_${unitType}`;
    const { error } = await (supabase as any)
      .from(table)
      .update({ [colName]: mode === "all" })
      .eq(idCol, ownerId);
    
    if (error) {
      toast.error(error.message);
    } else {
      const ut = UNIT_TYPES.find(u => u.key === unitType);
      if (ut?.unitTable && overrideCounts[unitType] > 0) {
        const field = getOwnerField(ownerType, unitType);
        if (field) {
          await (supabase as any)
            .from(ut.unitTable)
            .update({ web_visibility_override: "inherit" })
            .eq(field, ownerId)
            .neq("web_visibility_override", "inherit");
          setOverrideCounts(prev => ({ ...prev, [unitType]: 0 }));
        }
      }
      toast.success(`${unitType} visibility updated`);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div>
        <h3 className="font-display font-semibold flex items-center gap-2 text-base">
          <Rss className="h-4 w-4 text-primary" /> Website feedpoint visibility
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Decide which types of items appear on your external website via the site code. You can still adjust visibility item by item.
        </p>
      </div>

      <div className="space-y-3">
        {UNIT_TYPES.map(ut => {
          const mode = getMode(ut.key);
          return (
            <div key={ut.key} className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{ut.label}</span>
                  {mode === "custom" && (
                    <Badge variant="secondary" className="text-xs">Custom mix</Badge>
                  )}
                </div>
                {mode === "custom" && ut.unitTable && (
                  <Button variant="ghost" size="sm" onClick={() => setManageType(ut.key)}>
                    <Settings2 className="h-3.5 w-3.5 mr-1" /> Manage
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSetMode(ut.key, "none")}
                  disabled={saving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all ${
                    mode === "none"
                      ? "bg-destructive/10 text-destructive border-destructive/30"
                      : "border-border hover:border-foreground/50 text-muted-foreground"
                  }`}
                >
                  <EyeOff className="h-3.5 w-3.5" /> Hide all
                </button>
                <button
                  type="button"
                  onClick={() => handleSetMode(ut.key, "all")}
                  disabled={saving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all ${
                    mode === "all"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-foreground/50 text-muted-foreground"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" /> Show all
                </button>
                {mode === "custom" && (
                  <span className="flex items-center px-3 py-1.5 rounded-full border border-accent bg-accent/10 text-accent-foreground text-sm">
                    <Settings2 className="h-3.5 w-3.5 mr-1" /> Custom mix
                    <span className="text-xs text-muted-foreground ml-1">({overrideCounts[ut.key]} override{overrideCounts[ut.key] !== 1 ? "s" : ""})</span>
                  </span>
                )}
              </div>

              {!ut.unitTable && (
                <p className="text-xs text-muted-foreground mt-2">
                  This type doesn't support per-item overrides yet.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {manageType && (
        <ManageOverridesDialog
          ownerType={ownerType}
          ownerId={ownerId}
          unitType={manageType}
          defaultVisible={defaults[manageType]}
          onClose={() => {
            const closingType = manageType;
            setManageType(null);
            const ut = UNIT_TYPES.find(u => u.key === closingType);
            if (ut?.unitTable) {
              const field = getOwnerField(ownerType, closingType);
              if (field) {
                (supabase as any)
                  .from(ut.unitTable)
                  .select("id", { count: "exact", head: true })
                  .eq(field, ownerId)
                  .neq("web_visibility_override", "inherit")
                  .then(({ count }: any) => {
                    setOverrideCounts(prev => ({ ...prev, [closingType]: count ?? 0 }));
                  });
              }
            }
          }}
        />
      )}
    </div>
  );
}

/* ─── Manage Overrides Dialog ─── */

function ManageOverridesDialog({
  ownerType, ownerId, unitType, defaultVisible, onClose,
}: {
  ownerType: string; ownerId: string; unitType: UnitType; defaultVisible: boolean; onClose: () => void;
}) {
  const ut = UNIT_TYPES.find(u => u.key === unitType)!;
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!ut.unitTable) return;
      const field = getOwnerField(ownerType, unitType);
      if (!field) return;
      
      const titleField = unitType === "posts" ? "content" : "title";
      let query = (supabase as any)
        .from(ut.unitTable)
        .select(`id, ${titleField}, web_visibility_override`)
        .eq(field, ownerId);
      // Only add is_deleted filter for tables that have it
      if (unitType !== "posts") {
        query = query.eq("is_deleted", false);
      }
      const { data } = await query.limit(100);
      setItems(data || []);
      setLoading(false);
    };
    load();
  }, [ownerType, ownerId, unitType]);

  const updateOverride = async (itemId: string, override: string) => {
    if (!ut.unitTable) return;
    await (supabase as any)
      .from(ut.unitTable)
      .update({ web_visibility_override: override })
      .eq("id", itemId);
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, web_visibility_override: override } : i));
  };

  const getEffective = (item: any): boolean => {
    if (item.web_visibility_override === "force_visible") return true;
    if (item.web_visibility_override === "force_hidden") return false;
    return defaultVisible;
  };

  const getItemLabel = (item: any): string => {
    return item.title || item.name || (item.content ? item.content.slice(0, 60) + "…" : "Untitled");
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage {ut.label} visibility</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-3">
          Default: <strong>{defaultVisible ? "Show all" : "Hide all"}</strong>. Override individual items below.
        </p>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            You don't have any {ut.label.toLowerCase()} yet.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map(item => {
              const effective = getEffective(item);
              const overrideVal = item.web_visibility_override || "inherit";
              return (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-sm font-medium truncate">{getItemLabel(item)}</p>
                    <p className="text-xs text-muted-foreground">
                      {effective ? "✅ Visible" : "🚫 Hidden"}
                    </p>
                  </div>
                  <select
                    value={overrideVal}
                    onChange={e => updateOverride(item.id, e.target.value)}
                    className="text-xs border border-border rounded px-2 py-1 bg-background"
                  >
                    <option value="inherit">Inherit ({defaultVisible ? "visible" : "hidden"})</option>
                    <option value="force_visible">Always show</option>
                    <option value="force_hidden">Always hide</option>
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
