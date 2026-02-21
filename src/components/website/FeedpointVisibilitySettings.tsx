import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Rss, Eye, EyeOff, Settings2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ─── Types ─── */

type UnitType = "services" | "quests" | "guilds" | "partner_entities" | "posts";

type MassMode = "private" | "public" | "custom";

const UNIT_TYPES: { key: UnitType; label: string; unitTable?: string }[] = [
  { key: "services", label: "Services", unitTable: "services" },
  { key: "quests", label: "Quests", unitTable: "quests" },
  { key: "guilds", label: "Guilds" },
  { key: "partner_entities", label: "Partner Entities" },
  { key: "posts", label: "Posts", unitTable: "feed_posts" },
];

interface Props {
  ownerType: "user" | "guild" | "company" | "territory";
  ownerId: string;
}

/* ─── Helpers ─── */

function getOwnerConfig(ownerType: string) {
  if (ownerType === "user") return { table: "profiles", idCol: "user_id" };
  if (ownerType === "guild") return { table: "guilds", idCol: "id" };
  if (ownerType === "territory") return { table: "territories", idCol: "id" };
  return { table: "companies", idCol: "id" };
}

function getOwnerField(ownerType: string, unitType: UnitType): string | null {
  if (unitType === "services") {
    if (ownerType === "user") return "provider_user_id";
    if (ownerType === "guild") return "provider_guild_id";
    if (ownerType === "company") return "company_id";
    return null;
  }
  if (unitType === "quests") {
    if (ownerType === "user") return "created_by_user_id";
    if (ownerType === "guild") return "guild_id";
    if (ownerType === "company") return "company_id";
    return null;
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
  const [itemsByType, setItemsByType] = useState<Record<UnitType, any[]>>({
    services: [], quests: [], guilds: [], partner_entities: [], posts: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedType, setExpandedType] = useState<UnitType | null>(null);

  const loadItems = useCallback(async (unitType: UnitType) => {
    const ut = UNIT_TYPES.find(u => u.key === unitType);
    if (!ut?.unitTable) return [];
    const field = getOwnerField(ownerType, unitType);
    if (!field) return [];
    const titleField = unitType === "posts" ? "content" : "title";
    let query = (supabase as any)
      .from(ut.unitTable)
      .select(`id, ${titleField}, web_visibility_override`)
      .eq(field, ownerId);
    if (unitType !== "posts") {
      query = query.eq("is_deleted", false);
    }
    const { data } = await query.limit(200);
    return data || [];
  }, [ownerType, ownerId]);

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

      // Load all items for types that have tables
      const newItems: Record<UnitType, any[]> = { services: [], quests: [], guilds: [], partner_entities: [], posts: [] };
      for (const ut of UNIT_TYPES) {
        if (ut.unitTable) {
          newItems[ut.key] = await loadItems(ut.key);
        }
      }
      setItemsByType(newItems);
      setLoading(false);
    };
    load();
  }, [ownerId, ownerType, table, idCol, loadItems]);

  /* Compute mass mode for a unit type */
  const getMode = (unitType: UnitType): MassMode => {
    const items = itemsByType[unitType];
    if (!items || items.length === 0) {
      return defaults[unitType] ? "public" : "private";
    }
    const hasOverrides = items.some(i => i.web_visibility_override && i.web_visibility_override !== "inherit");
    if (hasOverrides) return "custom";
    return defaults[unitType] ? "public" : "private";
  };

  /* Set mass mode: Public or Private — reset all overrides */
  const handleSetMode = async (unitType: UnitType, mode: "private" | "public") => {
    setSaving(true);
    const isPublic = mode === "public";
    const newDefaults = { ...defaults, [unitType]: isPublic };
    setDefaults(newDefaults);

    const colName = `feedpoint_default_${unitType}`;
    await (supabase as any)
      .from(table)
      .update({ [colName]: isPublic })
      .eq(idCol, ownerId);

    // Reset all item overrides to "inherit"
    const ut = UNIT_TYPES.find(u => u.key === unitType);
    if (ut?.unitTable) {
      const field = getOwnerField(ownerType, unitType);
      if (field) {
        await (supabase as any)
          .from(ut.unitTable)
          .update({ web_visibility_override: "inherit" })
          .eq(field, ownerId)
          .neq("web_visibility_override", "inherit");
      }
    }

    // Update local state
    setItemsByType(prev => ({
      ...prev,
      [unitType]: prev[unitType].map(i => ({ ...i, web_visibility_override: "inherit" })),
    }));

    if (expandedType === unitType) setExpandedType(null);
    toast.success(`${UNIT_TYPES.find(u => u.key === unitType)?.label} visibility set to ${mode}`);
    setSaving(false);
  };

  /* Toggle individual item override */
  const handleItemToggle = async (unitType: UnitType, itemId: string, makeVisible: boolean) => {
    const ut = UNIT_TYPES.find(u => u.key === unitType);
    if (!ut?.unitTable) return;

    const defaultVisible = defaults[unitType];
    // If making visible and default is already visible → set inherit; otherwise force_visible
    // If hiding and default is hidden → set inherit; otherwise force_hidden
    let newOverride: string;
    if (makeVisible) {
      newOverride = defaultVisible ? "inherit" : "force_visible";
    } else {
      newOverride = defaultVisible ? "force_hidden" : "inherit";
    }

    await (supabase as any)
      .from(ut.unitTable)
      .update({ web_visibility_override: newOverride })
      .eq("id", itemId);

    setItemsByType(prev => ({
      ...prev,
      [unitType]: prev[unitType].map(i =>
        i.id === itemId ? { ...i, web_visibility_override: newOverride } : i
      ),
    }));
  };

  const getEffectiveVisibility = (item: any, unitType: UnitType): boolean => {
    const override = item.web_visibility_override || "inherit";
    if (override === "force_visible") return true;
    if (override === "force_hidden") return false;
    return defaults[unitType];
  };

  const getItemLabel = (item: any): string => {
    return item.title || item.name || (item.content ? item.content.slice(0, 60) + "…" : "Untitled");
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
          const items = itemsByType[ut.key];
          const isExpanded = expandedType === ut.key;

          return (
            <div key={ut.key} className="rounded-lg border border-border bg-background overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{ut.label}</span>
                    {mode === "custom" && (
                      <Badge variant="secondary" className="text-xs">Custom</Badge>
                    )}
                    {items.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({items.filter(i => getEffectiveVisibility(i, ut.key)).length}/{items.length} visible)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleSetMode(ut.key, "private")}
                    disabled={saving}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all ${
                      mode === "private"
                        ? "bg-destructive/10 text-destructive border-destructive/30"
                        : "border-border hover:border-foreground/50 text-muted-foreground"
                    }`}
                  >
                    <EyeOff className="h-3.5 w-3.5" /> Hide all
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetMode(ut.key, "public")}
                    disabled={saving}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all ${
                      mode === "public"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-foreground/50 text-muted-foreground"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" /> Show all
                  </button>
                  {mode === "custom" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedType(isExpanded ? null : ut.key)}
                      className="ml-auto"
                    >
                      <Settings2 className="h-3.5 w-3.5 mr-1" />
                      {isExpanded ? "Collapse" : "Manage items"}
                    </Button>
                  )}
                  {mode !== "custom" && ut.unitTable && items.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedType(isExpanded ? null : ut.key)}
                      className="ml-auto text-muted-foreground"
                    >
                      <Settings2 className="h-3.5 w-3.5 mr-1" />
                      {isExpanded ? "Collapse" : "Edit per item"}
                    </Button>
                  )}
                </div>

                {!ut.unitTable && (
                  <p className="text-xs text-muted-foreground mt-2">
                    This type doesn't support per-item overrides yet.
                  </p>
                )}
              </div>

              {/* Inline item management */}
              {isExpanded && ut.unitTable && (
                <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-1.5">
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No {ut.label.toLowerCase()} found.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground mb-2">
                        Default: <strong>{defaults[ut.key] ? "Show all" : "Hide all"}</strong>. Toggle individual items to override.
                      </p>
                      {items.map(item => {
                        const isVisible = getEffectiveVisibility(item, ut.key);
                        const override = item.web_visibility_override || "inherit";
                        const isOverridden = override !== "inherit";
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                              isOverridden ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                            }`}
                          >
                            <div className="min-w-0 flex-1 mr-3">
                              <p className="text-sm font-medium truncate">{getItemLabel(item)}</p>
                              {isOverridden && (
                                <p className="text-xs text-primary">
                                  Manually {isVisible ? "shown" : "hidden"}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {isVisible ? "Visible" : "Hidden"}
                              </span>
                              <Switch
                                checked={isVisible}
                                onCheckedChange={(checked) => handleItemToggle(ut.key, item.id, checked)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
