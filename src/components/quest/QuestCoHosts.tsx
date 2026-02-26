import { useState } from "react";
import { Plus, X, Building2, Shield, Users2, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAcceptedPartners, useAddQuestCoHost, useRemoveQuestHost, type ResolvedHost } from "@/hooks/useQuestHosts";
import { toast } from "@/hooks/use-toast";

interface QuestCoHostsManagerProps {
  questId: string;
  primaryEntityType?: "GUILD" | "COMPANY";
  primaryEntityId?: string;
  hosts: ResolvedHost[];
  canManage: boolean;
}

export function QuestCoHostsManager({
  questId,
  primaryEntityType,
  primaryEntityId,
  hosts,
  canManage,
}: QuestCoHostsManagerProps) {
  const [open, setOpen] = useState(false);
  const { data: partners } = useAcceptedPartners(primaryEntityType, primaryEntityId);
  const addCoHost = useAddQuestCoHost();

  const existingEntityKeys = new Set(hosts.map(h => `${h.entity_type}:${h.entity_id}`));

  const availablePartners = (partners ?? []).filter(
    p => !existingEntityKeys.has(`${p.entityType}:${p.entityId}`)
  );

  const handleAdd = async (entityType: "GUILD" | "COMPANY", entityId: string) => {
    try {
      await addCoHost.mutateAsync({ questId, entityType, entityId });
      toast({ title: "Co-host added" });
    } catch (err: any) {
      toast({ title: "Failed to add co-host", description: err.message, variant: "destructive" });
    }
  };

  if (!canManage || !primaryEntityType || !primaryEntityId) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add co-host
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Co-host Partner</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Only accepted partners of the primary host can be added as co-hosts.
        </p>
        {availablePartners.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No available partners to add.</p>
            <p className="text-xs mt-1">Create partnerships first from your guild or company settings.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availablePartners.map(p => (
              <div key={`${p.entityType}:${p.entityId}`} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.logo_url ?? undefined} />
                    <AvatarFallback className="text-xs">{p.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {p.entityType === "GUILD" ? <Shield className="h-2.5 w-2.5 mr-0.5" /> : <Building2 className="h-2.5 w-2.5 mr-0.5" />}
                      {p.entityType === "GUILD" ? "Guild" : "Company"}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAdd(p.entityType, p.entityId)}
                  disabled={addCoHost.isPending}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Compact display-only component for quest detail "Hosted by" section */
export function QuestHostsDisplay({ hosts }: { hosts: ResolvedHost[] }) {
  const primary = hosts.find(h => h.role === "PRIMARY");
  const coHosts = hosts.filter(h => h.role === "CO_HOST");

  if (hosts.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap text-sm">
      {primary && (
        <a href={primary.entity_type === "GUILD" ? `/guilds/${primary.entity_id}` : `/companies/${primary.entity_id}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
          <Avatar className="h-5 w-5">
            <AvatarImage src={primary.logo_url ?? undefined} />
            <AvatarFallback className="text-[8px]">{primary.name[0]}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{primary.name}</span>
        </a>
      )}
      {coHosts.length > 0 && (
        <>
          <span className="text-muted-foreground text-xs">co-hosted with</span>
          {coHosts.map((h, i) => (
            <span key={h.id} className="inline-flex items-center gap-1">
              <a href={h.entity_type === "GUILD" ? `/guilds/${h.entity_id}` : `/companies/${h.entity_id}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={h.logo_url ?? undefined} />
                  <AvatarFallback className="text-[7px]">{h.name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">{h.name}</span>
              </a>
              {i < coHosts.length - 1 && <span className="text-muted-foreground">,</span>}
            </span>
          ))}
        </>
      )}
    </div>
  );
}
