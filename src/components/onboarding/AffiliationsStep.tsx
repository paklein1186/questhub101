import { useState } from "react";
import { Globe, Linkedin, Link2, Building2, Users, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PersonaType } from "@/lib/personaLabels";
import { getLabel } from "@/lib/personaLabels";

export interface AffiliationLink {
  website: string;
  linkedin: string;
  other: string;
}

export interface ManualAffiliation {
  name: string;
  role: string;
}

interface Props {
  persona: PersonaType;
  links: AffiliationLink;
  onLinksChange: (links: AffiliationLink) => void;
  manualAffiliations: ManualAffiliation[];
  onAffiliationsChange: (affiliations: ManualAffiliation[]) => void;
  existingGuilds: Array<{ id: string; name: string }>;
  existingCompanies: Array<{ id: string; name: string }>;
  selectedEntityIds: string[];
  onToggleEntity: (id: string) => void;
}

export function AffiliationsStep({
  persona,
  links,
  onLinksChange,
  manualAffiliations,
  onAffiliationsChange,
  existingGuilds,
  existingCompanies,
  selectedEntityIds,
  onToggleEntity,
}: Props) {
  const [entitySearch, setEntitySearch] = useState("");
  const guildLabel = getLabel("guild.label", persona);
  const companyLabel = getLabel("company.label", persona);

  const stepTitle =
    persona === "CREATIVE"
      ? "Your circles & work"
      : persona === "IMPACT"
        ? "Your organizations & missions"
        : "Your affiliations & work";

  const addAffiliation = () => {
    onAffiliationsChange([...manualAffiliations, { name: "", role: "" }]);
  };

  const removeAffiliation = (index: number) => {
    onAffiliationsChange(manualAffiliations.filter((_, i) => i !== index));
  };

  const updateAffiliation = (index: number, field: keyof ManualAffiliation, value: string) => {
    const updated = [...manualAffiliations];
    updated[index] = { ...updated[index], [field]: value };
    onAffiliationsChange(updated);
  };

  const filteredEntities = [...existingGuilds.map(g => ({ ...g, type: "guild" as const })), ...existingCompanies.map(c => ({ ...c, type: "company" as const }))]
    .filter(e => !entitySearch || e.name.toLowerCase().includes(entitySearch.toLowerCase()))
    .slice(0, 12);

  return (
    <div className="space-y-5 overflow-y-auto max-h-[500px] pr-1">
      <div>
        <h2 className="font-display text-2xl font-bold">{stepTitle} 🔗</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Where can we learn more about you?
        </p>
      </div>

      {/* Part A: Links */}
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          (Optional) Add 1–3 links. We'll use them to suggest affiliations, Houses, and possible {persona === "CREATIVE" ? "skill sessions" : "services"} you could offer. You will be able to edit everything before it's saved.
        </p>

        <div>
          <label className="text-sm font-medium mb-1 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Website / Portfolio
          </label>
          <Input
            value={links.website}
            onChange={(e) => onLinksChange({ ...links, website: e.target.value })}
            placeholder="https://yoursite.com"
            maxLength={500}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 flex items-center gap-1.5">
            <Linkedin className="h-3.5 w-3.5" /> LinkedIn
          </label>
          <Input
            value={links.linkedin}
            onChange={(e) => onLinksChange({ ...links, linkedin: e.target.value })}
            placeholder="https://linkedin.com/in/…"
            maxLength={500}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5" /> Other link (Instagram, GitHub, portfolio…)
          </label>
          <Input
            value={links.other}
            onChange={(e) => onLinksChange({ ...links, other: e.target.value })}
            placeholder="https://instagram.com/… or github.com/…"
            maxLength={500}
          />
        </div>
      </div>

      {/* Part B: Manual affiliations */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div>
          <p className="text-sm font-medium">
            Are you already part of any {persona === "CREATIVE" ? "traditional organization, collective, or studio" : "traditional organization, guild, or collective"}?
          </p>
        </div>

        {manualAffiliations.map((aff, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-1 space-y-1.5">
              <Input
                value={aff.name}
                onChange={(e) => updateAffiliation(i, "name", e.target.value)}
                placeholder={persona === "CREATIVE" ? "Studio / Collective name" : "Organization name"}
                maxLength={200}
              />
              <Input
                value={aff.role}
                onChange={(e) => updateAffiliation(i, "role", e.target.value)}
                placeholder="Your role there"
                maxLength={100}
              />
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 mt-1" onClick={() => removeAffiliation(i)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addAffiliation} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Add affiliation
        </Button>
      </div>

      {/* Part C: Search existing entities */}
      <div className="space-y-3 pt-2 border-t border-border">
        <p className="text-sm font-medium">
          Search for your {guildLabel.toLowerCase()} or {companyLabel.toLowerCase()} on the platform
        </p>
        <Input
          value={entitySearch}
          onChange={(e) => setEntitySearch(e.target.value)}
          placeholder="Search by name…"
          maxLength={100}
        />
        {filteredEntities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {filteredEntities.map((e) => (
              <button
                key={e.id}
                onClick={() => onToggleEntity(e.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-xs font-medium transition-all flex items-center gap-1",
                  selectedEntityIds.includes(e.id)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/40"
                )}
              >
                {e.type === "guild" ? <Users className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                {e.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground italic">
        We only use your links to suggest relevant info for your profile here. You stay in control and can edit or discard anything.
      </p>
    </div>
  );
}
