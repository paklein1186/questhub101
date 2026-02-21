import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Globe, Tag, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ─── Fixed vocabularies ─── */

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private", desc: "Not visible on any public website" },
  { value: "unlisted", label: "Unlisted", desc: "Accessible via direct link only" },
  { value: "public", label: "Public", desc: "Visible on public websites" },
] as const;

const WEB_SCOPES = [
  { value: "personal_site", label: "Personal site", desc: "Individual user websites" },
  { value: "guild_site", label: "Guild site", desc: "Guild / organisation websites" },
  { value: "territory_site", label: "Territory site", desc: "Territorial entity websites" },
  { value: "program_site", label: "Program site", desc: "Program-level websites (Libra, Erasmus…)" },
] as const;

const PLACEMENT_TAGS = [
  { value: "flagship", label: "Flagship", desc: "Top 3–5 items on Home & first lines" },
  { value: "portfolio", label: "Portfolio", desc: "Past work to showcase on Projects page" },
  { value: "ongoing", label: "Ongoing", desc: "Currently active work" },
  { value: "secondary", label: "Secondary", desc: "Show on listing pages, not first in line" },
  { value: "archived", label: "Archived", desc: "Historical, hidden by default" },
  { value: "community", label: "Community", desc: "Show on Commons / Community sections" },
  { value: "program", label: "Program", desc: "Part of a named program" },
] as const;

const SCOPE_VALUES = WEB_SCOPES.map(s => s.value);
const TAG_VALUES = PLACEMENT_TAGS.map(t => t.value);

/* ─── Types ─── */

type EntityTable = "quests" | "services" | "guilds";

interface Props {
  entityId: string;
  entityTable: EntityTable;
  initialVisibility?: string;
  initialScopes?: string[];
  initialTags?: string[];
  initialFeaturedOrder?: number | null;
  onSaved?: () => void;
}

/* ─── Component ─── */

export function WebVisibilityEditor({
  entityId,
  entityTable,
  initialVisibility = "private",
  initialScopes = [],
  initialTags = [],
  initialFeaturedOrder = null,
  onSaved,
}: Props) {
  const [visibility, setVisibility] = useState(initialVisibility);
  const [scopes, setScopes] = useState<string[]>(initialScopes);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [featuredOrder, setFeaturedOrder] = useState(initialFeaturedOrder);
  const [saving, setSaving] = useState(false);

  const toggleScope = (v: string) =>
    setScopes(prev => prev.includes(v) ? prev.filter(s => s !== v) : [...prev, v]);

  const toggleTag = (v: string) =>
    setTags(prev => prev.includes(v) ? prev.filter(t => t !== v) : [...prev, v]);

  const flagshipCount = tags.filter(t => t === "flagship").length;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from(entityTable)
      .update({
        public_visibility: visibility,
        web_scopes: scopes,
        web_tags: tags,
        featured_order: featuredOrder,
      } as any)
      .eq("id", entityId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Web visibility saved");
      onSaved?.();
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div>
        <h3 className="font-display font-semibold flex items-center gap-2 text-base">
          <Globe className="h-4 w-4 text-primary" /> Web Visibility & Tags
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Control how this item appears on public CTG-powered websites.
        </p>
      </div>

      {/* Public visibility */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <Eye className="h-3.5 w-3.5" /> Public Visibility
        </Label>
        <Select value={visibility} onValueChange={setVisibility}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VISIBILITY_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="font-medium">{opt.label}</span>
                <span className="text-muted-foreground ml-2 text-xs">— {opt.desc}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Web Scopes */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <Globe className="h-3.5 w-3.5" /> Web Scopes
        </Label>
        <p className="text-xs text-muted-foreground">
          Who should be allowed to show this on their public website?
        </p>
        <div className="flex flex-wrap gap-2">
          {WEB_SCOPES.map(scope => {
            const active = scopes.includes(scope.value);
            return (
              <button
                key={scope.value}
                type="button"
                onClick={() => toggleScope(scope.value)}
                className={`px-3 py-1.5 rounded-full border text-sm transition-all ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-foreground/50 text-muted-foreground"
                }`}
                title={scope.desc}
              >
                {scope.label}
              </button>
            );
          })}
        </div>
        {scopes.length === 0 && visibility !== "private" && (
          <p className="text-xs text-amber-600">
            Tip: start with "Personal site" — you can widen later.
          </p>
        )}
      </div>

      {/* Web Tags */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <Tag className="h-3.5 w-3.5" /> Web Tags
        </Label>
        <p className="text-xs text-muted-foreground">
          How should this item be used/displayed on websites? (placement & status)
        </p>
        <div className="flex flex-wrap gap-2">
          {PLACEMENT_TAGS.map(tag => {
            const active = tags.includes(tag.value);
            return (
              <button
                key={tag.value}
                type="button"
                onClick={() => toggleTag(tag.value)}
                className={`px-3 py-1.5 rounded-full border text-sm transition-all ${
                  active
                    ? "bg-accent text-accent-foreground border-accent"
                    : "border-border hover:border-foreground/50 text-muted-foreground"
                }`}
                title={tag.desc}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {tags.length > 0 && tags.map(t => (
            <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
          ))}
        </div>
      </div>

      {/* Featured order */}
      {tags.includes("flagship") && (
        <div className="space-y-1">
          <Label className="text-sm font-medium">Featured Order</Label>
          <Input
            type="number"
            value={featuredOrder ?? ""}
            onChange={e => setFeaturedOrder(e.target.value ? parseInt(e.target.value) : null)}
            className="w-32"
            placeholder="Auto"
            min={0}
          />
          <p className="text-xs text-muted-foreground">Lower numbers appear first. Leave empty for auto.</p>
        </div>
      )}

      <Button variant="outline" size="sm" onClick={save} disabled={saving}>
        <Save className="h-3.5 w-3.5 mr-1" />
        {saving ? "Saving…" : "Save Web Settings"}
      </Button>
    </div>
  );
}

/* Export vocabularies for reuse */
export { WEB_SCOPES, PLACEMENT_TAGS, SCOPE_VALUES, TAG_VALUES };
