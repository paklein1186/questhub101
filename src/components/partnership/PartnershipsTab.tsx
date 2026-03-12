import { useState } from "react";
import { Handshake, Send, Inbox, CheckCircle, XCircle, Clock, ExternalLink, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { usePartnershipsForEntity, usePartnerEntities, useUpdatePartnershipStatus } from "@/hooks/usePartnerships";
import { ProposePartnershipDialog } from "./ProposePartnershipDialog";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface Props {
  entityType: "GUILD" | "COMPANY";
  entityId: string;
  isAdmin: boolean;
}

export function PartnershipsTab({ entityType, entityId, isAdmin }: Props) {
  const { data: partnerships, isLoading } = usePartnershipsForEntity(entityType, entityId);
  const { data: entityMap } = usePartnerEntities(partnerships);
  const updateStatus = useUpdatePartnershipStatus();
  const { toast } = useToast();
  const [proposeOpen, setProposeOpen] = useState(false);

  const map = entityMap ?? {};

  const accepted = (partnerships ?? []).filter((p: any) => p.status === "ACCEPTED");
  const outgoing = (partnerships ?? []).filter(
    (p: any) => p.status === "PENDING" && p.from_entity_type === entityType && p.from_entity_id === entityId
  );
  const incoming = (partnerships ?? []).filter(
    (p: any) => p.status === "PENDING" && (p.to_entity_type === entityType && p.to_entity_id === entityId)
  );

  const getPartnerKey = (p: any) => {
    if (p.from_entity_type === entityType && p.from_entity_id === entityId) {
      return `${p.to_entity_type}:${p.to_entity_id}`;
    }
    return `${p.from_entity_type}:${p.from_entity_id}`;
  };

  const getPartnerLink = (p: any) => {
    const key = getPartnerKey(p);
    const [type, id] = key.split(":");
    return type === "GUILD" ? `/guilds/${id}` : `/companies/${id}`;
  };

  const handleAction = async (id: string, status: "ACCEPTED" | "DECLINED" | "CANCELLED") => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast({ title: status === "ACCEPTED" ? "Partnership accepted!" : status === "DECLINED" ? "Partnership declined" : "Request withdrawn" });

      // Notify requesting entity admins when accepted
      if (status === "ACCEPTED") {
        try {
          const partnership = (partnerships ?? []).find((p: any) => p.id === id);
          if (partnership) {
            const reqType = partnership.from_entity_type as "GUILD" | "COMPANY";
            const reqId = partnership.from_entity_id as string;
            const memberTable = reqType === "GUILD" ? "guild_members" : "company_members";
            const idCol = reqType === "GUILD" ? "guild_id" : "company_id";
            const { data: admins } = await supabase.from(memberTable as any).select("user_id, role").eq(idCol, reqId);
            const adminIds = (admins ?? [])
              .filter((m: any) => ["admin", "owner", "ADMIN", "OWNER"].includes(m.role))
              .map((m: any) => m.user_id);

            // Get accepting entity name
            const srcTable = entityType === "GUILD" ? "guilds" : "companies";
            const { data: srcEntity } = await supabase.from(srcTable).select("name").eq("id", entityId).maybeSingle();
            const srcName = (srcEntity as any)?.name ?? "A partner";
            const deepLink = reqType === "GUILD" ? `/guilds/${reqId}?tab=partners` : `/companies/${reqId}?tab=partners`;

            for (const adminId of adminIds) {
              await supabase.from("notifications").insert({
                user_id: adminId,
                type: "UNIT_PARTNERSHIP_ACCEPTED",
                title: "Partnership accepted!",
                body: `Your partnership with ${srcName} was accepted`,
                related_entity_type: reqType,
                related_entity_id: reqId,
                deep_link_url: deepLink,
              });
            }
          }
        } catch (e) {
          logger.warn("[partnership-notif] Failed to notify requesting admins", e);
        }
      }
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  const PartnerCard = ({ p, showActions }: { p: any; showActions?: "incoming" | "outgoing" }) => {
    const key = getPartnerKey(p);
    const entity = map[key];
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4 flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-lg">
            <AvatarImage src={entity?.logo_url ?? undefined} />
            <AvatarFallback className="rounded-lg">{entity?.name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <Link to={getPartnerLink(p)} className="text-sm font-medium hover:text-primary transition-colors truncate block">
              {entity?.name ?? "Unknown"}
            </Link>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="text-[10px]">{(entity?.type ?? "") === "COMPANY" ? "Trad. Org." : (entity?.type ?? "").toLowerCase()}</Badge>
              {p.partnership_type && p.partnership_type !== "ALLY" && (
                <Badge variant="secondary" className="text-[10px] capitalize">{p.partnership_type.toLowerCase()}</Badge>
              )}
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
              </span>
            </div>
            {p.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.notes}</p>}
          </div>
          {showActions === "incoming" && isAdmin && (
            <div className="flex gap-1.5 shrink-0">
              <Button size="sm" variant="default" onClick={() => handleAction(p.id, "ACCEPTED")} disabled={updateStatus.isPending}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleAction(p.id, "DECLINED")} disabled={updateStatus.isPending}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
              </Button>
            </div>
          )}
          {showActions === "outgoing" && isAdmin && (
            <Button size="sm" variant="ghost" onClick={() => handleAction(p.id, "CANCELLED")} disabled={updateStatus.isPending}>
              <X className="h-3.5 w-3.5 mr-1" /> Withdraw
            </Button>
          )}
          {!showActions && isAdmin && (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive shrink-0" onClick={() => handleAction(p.id, "CANCELLED")} disabled={updateStatus.isPending}>
              <X className="h-3.5 w-3.5 mr-1" /> End
            </Button>
          )}
          {!showActions && !isAdmin && (
            <Button size="icon" variant="ghost" asChild className="shrink-0">
              <Link to={getPartnerLink(p)}><ExternalLink className="h-4 w-4" /></Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Loading partnerships…</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <Handshake className="h-5 w-5 text-primary" /> Partnerships
        </h3>
        {isAdmin && (
          <Button size="sm" onClick={() => setProposeOpen(true)}>
            <Send className="h-4 w-4 mr-1" /> Propose a partnership
          </Button>
        )}
      </div>

      {/* Incoming requests */}
      {isAdmin && incoming.length > 0 && (
        <div>
          <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
            <Inbox className="h-4 w-4" /> Incoming requests ({incoming.length})
          </h4>
          <div className="space-y-2">
            {incoming.map((p: any) => <PartnerCard key={p.id} p={p} showActions="incoming" />)}
          </div>
        </div>
      )}

      {/* Outgoing requests */}
      {isAdmin && outgoing.length > 0 && (
        <div>
          <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
            <Clock className="h-4 w-4" /> Pending outgoing ({outgoing.length})
          </h4>
          <div className="space-y-2">
            {outgoing.map((p: any) => <PartnerCard key={p.id} p={p} showActions="outgoing" />)}
          </div>
        </div>
      )}

      {/* Active partners */}
      <div>
        <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
          <CheckCircle className="h-4 w-4 text-primary" /> Active partners ({accepted.length})
        </h4>
        {accepted.length > 0 ? (
          <div className="space-y-2">
            {accepted.map((p: any) => <PartnerCard key={p.id} p={p} />)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            {isAdmin
              ? "You don't have partners yet. Start by proposing a partnership."
              : "No partners yet."}
          </p>
        )}
      </div>

      {/* Propose dialog */}
      {isAdmin && (
        <ProposePartnershipDialog
          open={proposeOpen}
          onOpenChange={setProposeOpen}
          fromEntityType={entityType}
          fromEntityId={entityId}
        />
      )}
    </div>
  );
}
