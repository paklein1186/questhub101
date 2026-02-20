import { useState } from "react";
import { Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEntityRoles, type EntityRole, type EntityMemberRole } from "@/hooks/useEntityRoles";

interface SourceRoleTransferProps {
  entityType: string;
  entityId: string;
  members: Array<{ user_id: string; user?: { name?: string; avatar_url?: string } }>;
  currentUserId: string;
}

export function SourceRoleTransfer({ entityType, entityId, members, currentUserId }: SourceRoleTransferProps) {
  const { toast } = useToast();
  const { roles, memberRoles, assignRole, removeRoleAssignment, invalidate } = useEntityRoles(entityType, entityId);
  const [open, setOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const sourceRole = roles.find((r) => r.is_default && r.name === "Source");
  if (!sourceRole) return null;

  const currentSourceAssignment = memberRoles.find((mr) => mr.entity_role_id === sourceRole.id);
  const currentSourceUserId = currentSourceAssignment?.user_id;
  const currentSourceMember = members.find((m) => m.user_id === currentSourceUserId);

  const transferSource = async (newUserId: string) => {
    setTransferring(true);
    try {
      // Remove from current holder
      if (currentSourceAssignment) {
        await supabase
          .from("entity_member_roles")
          .delete()
          .eq("id", currentSourceAssignment.id);
      }
      // Assign to new user
      await supabase.from("entity_member_roles").insert({
        entity_role_id: sourceRole.id,
        user_id: newUserId,
      } as any);
      invalidate();
      toast({ title: "Source role transferred!" });
      setOpen(false);
    } catch {
      toast({ title: "Failed to transfer", variant: "destructive" });
    } finally {
      setTransferring(false);
    }
  };

  const eligibleMembers = members.filter((m) => m.user_id !== currentSourceUserId);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Crown className="h-5 w-5 text-amber-500" />
        <h4 className="font-display font-semibold">Source Role</h4>
      </div>
      <p className="text-sm text-muted-foreground">
        The Source role represents the founding leader. It grants admin-level override permissions across all rooms and decisions.
      </p>
      {currentSourceMember ? (
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={currentSourceMember.user?.avatar_url} />
            <AvatarFallback>{currentSourceMember.user?.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">{currentSourceMember.user?.name || "Unknown"}</p>
            <p className="text-xs text-muted-foreground">Current Source</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-amber-600">No Source assigned yet.</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <ArrowRight className="h-4 w-4 mr-1" /> Transfer Source Role
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Transfer Source Role</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Select a member to become the new Source. This action is reversible.
          </p>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {eligibleMembers.map((m) => (
              <button
                key={m.user_id}
                onClick={() => transferSource(m.user_id)}
                disabled={transferring}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-all text-left"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={m.user?.avatar_url} />
                  <AvatarFallback>{m.user?.name?.[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{m.user?.name || "Unknown"}</span>
              </button>
            ))}
            {eligibleMembers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No other members to transfer to.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
