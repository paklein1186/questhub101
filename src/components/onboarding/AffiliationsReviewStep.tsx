import { useState } from "react";
import { Check, X, Pencil, Building2, Users, Hash, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { PersonaType } from "@/lib/personaLabels";
import { getLabel } from "@/lib/personaLabels";

export interface SuggestedAffiliation {
  name: string;
  matchedEntityId: string | null;
  matchedEntityType: "GUILD" | "COMPANY" | null;
  role: string | null;
  confidence: number;
  accepted: boolean;
}

export interface SuggestedHouse {
  topicId: string;
  topicName: string;
  reason: string;
  confidence: number;
  accepted: boolean;
}

export interface SuggestedService {
  title: string;
  description: string;
  tags: string[];
  accepted: boolean;
}

interface GuildInfo {
  id: string;
  name: string;
  join_policy: string;
}

interface Props {
  persona: PersonaType;
  affiliations: SuggestedAffiliation[];
  onAffiliationsChange: (affiliations: SuggestedAffiliation[]) => void;
  houses: SuggestedHouse[];
  onHousesChange: (houses: SuggestedHouse[]) => void;
  services: SuggestedService[];
  onServicesChange: (services: SuggestedService[]) => void;
  loading: boolean;
  guilds?: GuildInfo[];
}

export function AffiliationsReviewStep({
  persona,
  affiliations,
  onAffiliationsChange,
  houses,
  onHousesChange,
  services,
  onServicesChange,
  loading,
}: Props) {
  const [editingService, setEditingService] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTags, setEditTags] = useState("");

  const serviceLabel = getLabel("service.label_singular", persona);

  const title =
    persona === "CREATIVE"
      ? "Does this look like your world?"
      : persona === "IMPACT"
        ? "Is this aligned with your current work?"
        : "Is this a fair picture of your landscape?";

  const toggleAffiliation = (index: number) => {
    const updated = [...affiliations];
    updated[index] = { ...updated[index], accepted: !updated[index].accepted };
    onAffiliationsChange(updated);
  };

  const toggleHouse = (index: number) => {
    const updated = [...houses];
    updated[index] = { ...updated[index], accepted: !updated[index].accepted };
    onHousesChange(updated);
  };

  const toggleService = (index: number) => {
    const updated = [...services];
    updated[index] = { ...updated[index], accepted: !updated[index].accepted };
    onServicesChange(updated);
  };

  const startEditService = (index: number) => {
    const svc = services[index];
    setEditTitle(svc.title);
    setEditDesc(svc.description);
    setEditTags(svc.tags.join(", "));
    setEditingService(index);
  };

  const saveEditService = () => {
    if (editingService === null) return;
    const updated = [...services];
    updated[editingService] = {
      ...updated[editingService],
      title: editTitle,
      description: editDesc,
      tags: editTags.split(",").map(t => t.trim()).filter(Boolean),
      accepted: true,
    };
    onServicesChange(updated);
    setEditingService(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div>
          <h2 className="font-display text-xl font-bold">Analyzing your profile…</h2>
          <p className="text-sm text-muted-foreground mt-1">
            We're looking at your links and info to suggest relevant connections.
          </p>
        </div>
      </div>
    );
  }

  const hasAnySuggestions = affiliations.length > 0 || houses.length > 0 || services.length > 0;

  if (!hasAnySuggestions) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
        <Sparkles className="h-10 w-10 text-muted-foreground" />
        <div>
          <h2 className="font-display text-xl font-bold">No suggestions this time</h2>
          <p className="text-sm text-muted-foreground mt-1">
            We couldn't generate suggestions from the information provided. You can always add affiliations and services later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 overflow-y-auto max-h-[500px] pr-1">
      <div>
        <h2 className="font-display text-2xl font-bold">{title} ✨</h2>
        <p className="text-xs text-muted-foreground mt-1">
          These are only suggestions. Change or delete anything that doesn't feel right.
        </p>
      </div>

      {/* Affiliations */}
      {affiliations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-primary" /> Suggested Affiliations
          </h3>
          {affiliations.map((aff, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 rounded-xl border-2 p-3 transition-all",
                aff.accepted
                  ? "border-primary/40 bg-primary/5"
                  : "border-border opacity-60"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{aff.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[10px]">
                    {aff.matchedEntityType === "GUILD"
                      ? getLabel("guild.label_singular", persona)
                      : aff.matchedEntityType === "COMPANY"
                        ? getLabel("company.label_singular", persona)
                        : "New"}
                  </Badge>
                  {aff.role && (
                    <span className="text-xs text-muted-foreground">{aff.role}</span>
                  )}
                  {aff.matchedEntityId && (
                    <span className="text-[10px] text-primary">
                      ✓ Matches existing entity
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant={aff.accepted ? "default" : "outline"}
                size="sm"
                className="shrink-0 h-8 w-8 p-0"
                onClick={() => toggleAffiliation(i)}
              >
                {aff.accepted ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Houses */}
      {houses.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Hash className="h-4 w-4 text-primary" /> Additional {getLabel("houses.label", persona)}
          </h3>
          <p className="text-xs text-muted-foreground">
            We've looked at your links and roles and think these might also fit you.
          </p>
          {houses.map((house, i) => (
            <button
              key={i}
              onClick={() => toggleHouse(i)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
                house.accepted
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/30"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{house.topicName}</p>
                <p className="text-xs text-muted-foreground">{house.reason}</p>
              </div>
              {house.accepted && <Check className="h-4 w-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {/* Services */}
      {services.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" /> Suggested {getLabel("service.label", persona)}
          </h3>
          {services.map((svc, i) => (
            <div
              key={i}
              className={cn(
                "rounded-xl border-2 p-3 transition-all",
                svc.accepted
                  ? "border-primary/40 bg-primary/5"
                  : "border-border opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{svc.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{svc.description}</p>
                  {svc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {svc.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant={svc.accepted ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => toggleService(i)}
                >
                  {svc.accepted ? "Added as draft" : "Add as draft"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => startEditService(i)}
                >
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground italic pt-2">
        We won't publish anything without your confirmation. Draft {getLabel("service.label", persona).toLowerCase()} will be saved privately until you choose to publish them.
      </p>

      {/* Edit service dialog */}
      <Dialog open={editingService !== null} onOpenChange={(open) => !open && setEditingService(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {serviceLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={120} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} maxLength={500} className="min-h-[80px] resize-none text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tags (comma-separated)</label>
              <Input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="coaching, workshop, design" maxLength={200} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingService(null)}>Cancel</Button>
            <Button onClick={saveEditService}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
