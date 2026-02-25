import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, Plus, TreePine, Droplets, Mountain, Sprout, Bug, Microscope, Link2, Search as SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLinkedNaturalSystems } from "@/hooks/useNaturalSystems";
import type { LinkedNaturalSystem, NsLinkType } from "@/types/naturalSystems";
import { KINGDOM_LABELS, SYSTEM_TYPE_LABELS } from "@/types/naturalSystems";
import { AddLinkNaturalSystemModal } from "./AddLinkNaturalSystemModal";

const KINGDOM_ICONS: Record<string, React.ReactNode> = {
  plants: <TreePine className="h-3.5 w-3.5" />,
  animals: <Bug className="h-3.5 w-3.5" />,
  fungi_lichens: <Sprout className="h-3.5 w-3.5" />,
  microorganisms: <Microscope className="h-3.5 w-3.5" />,
  multi_species_guild: <Leaf className="h-3.5 w-3.5" />,
};

const SYSTEM_TYPE_ICONS: Record<string, React.ReactNode> = {
  river_watershed: <Droplets className="h-3.5 w-3.5" />,
  mountain_slope: <Mountain className="h-3.5 w-3.5" />,
};

function NaturalSystemCard({ system }: { system: LinkedNaturalSystem }) {
  const navigate = useNavigate();
  const desc = system.description
    ? system.description.length > 120
      ? system.description.slice(0, 120) + "…"
      : system.description
    : null;

  return (
    <Card
      className="overflow-hidden hover:border-primary/30 transition-all cursor-pointer"
      onClick={() => navigate(`/natural-systems/${system.id}`)}
    >
      <div className="flex">
        {system.picture_url && (
          <div className="w-24 h-24 shrink-0">
            <img
              src={system.picture_url}
              alt={system.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <CardContent className="p-3 flex-1 min-w-0">
          <h4 className="font-display font-semibold text-sm truncate">{system.name}</h4>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge variant="outline" className="text-[10px] gap-1 py-0">
              {KINGDOM_ICONS[system.kingdom] || <Leaf className="h-3 w-3" />}
              {KINGDOM_LABELS[system.kingdom]}
            </Badge>
            <Badge variant="secondary" className="text-[10px] py-0">
              {SYSTEM_TYPE_LABELS[system.system_type]}
            </Badge>
          </div>
          {desc && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{desc}</p>}
          <div className="flex items-center gap-1.5 mt-1.5">
            {system.linked_via === "quest" && (
              <Badge className="text-[9px] bg-primary/10 text-primary border-0 py-0">
                <Link2 className="h-2.5 w-2.5 mr-0.5" /> via quests
              </Badge>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

interface LivingTabProps {
  linkedType: NsLinkType;
  linkedId: string;
  /** Pre-fill territory when creating from a territory page */
  defaultTerritoryId?: string;
}

export function LivingTab({ linkedType, linkedId, defaultTerritoryId }: LivingTabProps) {
  const { data: systems, isLoading } = useLinkedNaturalSystems(linkedType, linkedId);
  const [modalOpen, setModalOpen] = useState(false);

  const ecoQuestCount = systems?.filter((s) => s.linked_via === "quest").length ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <Leaf className="h-5 w-5 text-emerald-600" /> Connected Natural Systems
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ecosystems linked to this {linkedType === "entity" ? "guild" : linkedType}
          </p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add / Link
        </Button>
      </div>

      {/* ── Systems grid ── */}
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-border bg-muted animate-pulse" />
          ))}
        </div>
      ) : systems && systems.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {systems.map((s) => (
            <NaturalSystemCard key={s.id} system={s} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Leaf className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No natural systems linked yet.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add your first
          </Button>
        </div>
      )}

      {/* ── Impact stats ── */}
      {systems && systems.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="font-display font-semibold text-sm mb-3">Impact</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{systems.length}</p>
              <p className="text-xs text-muted-foreground">Natural Systems</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{ecoQuestCount}</p>
              <p className="text-xs text-muted-foreground">Linked via Quests</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">
                {systems.reduce((sum, s) => sum + (s.health_index ?? 0), 0) > 0
                  ? Math.round(systems.reduce((sum, s) => sum + (s.health_index ?? 0), 0) / systems.length)
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Avg Health Index</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      <AddLinkNaturalSystemModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        linkedType={linkedType}
        linkedId={linkedId}
        defaultTerritoryId={defaultTerritoryId}
      />
    </div>
  );
}
