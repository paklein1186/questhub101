/**
 * TerritoryStewardsSidebar.tsx
 * Sidebar widget displaying territory stewards with request stewardship functionality.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, UserPlus, Loader2, Check, Clock } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TerritoryStewardsSidebarProps {
  territoryId: string;
  territoryName: string;
  stewards: Array<{ user_id: string; name: string; avatar_url: string | null }>;
  isPioneerTerritory: boolean;
  userXpLevel: number;
}

export function TerritoryStewardsSidebar({
  territoryId,
  territoryName,
  stewards,
  isPioneerTerritory,
  userXpLevel,
}: TerritoryStewardsSidebarProps) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAuthenticated = !!currentUser.id;
  const isSteward = stewards.some(s => s.user_id === currentUser.id);
  const canRequest = isAuthenticated && !isSteward && !isPioneerTerritory && userXpLevel >= 2;

  // Check existing request
  const { data: existingRequest } = useQuery({
    queryKey: ["stewardship-request", territoryId, currentUser.id],
    enabled: canRequest,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await (supabase
        .from("stewardship_requests" as any)
        .select("id, status") as any)
        .eq("territory_id", territoryId)
        .eq("requester_user_id", currentUser.id)
        .eq("status", "pending")
        .maybeSingle();
      return data as { id: string; status: string } | null;
    },
  });

  // Pending requests for stewards to review
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["stewardship-pending-requests", territoryId],
    enabled: isSteward,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await (supabase
        .from("stewardship_requests" as any)
        .select("id, requester_user_id, created_at, note") as any)
        .eq("territory_id", territoryId)
        .eq("status", "pending");
      if (!data || data.length === 0) return [];
      const userIds = data.map((r: any) => r.requester_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));
      return data.map((r: any) => ({
        ...r,
        name: profileMap.get(r.requester_user_id)?.name ?? "Unknown",
        avatar_url: profileMap.get(r.requester_user_id)?.avatar_url ?? null,
      }));
    },
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase
        .from("stewardship_requests" as any)
        .insert({
          territory_id: territoryId,
          requester_user_id: currentUser.id,
        } as any) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Stewardship request sent", description: "A steward will review your request." });
      queryClient.invalidateQueries({ queryKey: ["stewardship-request", territoryId] });
    },
    onError: () => {
      toast({ title: "Failed to send request", variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ requestId, userId }: { requestId: string; userId: string }) => {
      // Approve: update request status
      const { error: updateError } = await (supabase
        .from("stewardship_requests" as any)
        .update({
          status: "approved",
          reviewed_by_user_id: currentUser.id,
          reviewed_at: new Date().toISOString(),
        } as any) as any)
        .eq("id", requestId);
      if (updateError) throw updateError;

      // Create stewardship trust edge
      const { error: edgeError } = await (supabase
        .from("trust_edges")
        .insert({
          from_node_id: userId,
          from_node_type: "profile" as any,
          to_node_id: territoryId,
          to_node_type: "territory" as any,
          edge_type: "stewardship" as any,
          created_by: currentUser.id,
          score: 1,
          tags: ["steward-approved"],
        }) as any);
      if (edgeError) throw edgeError;
    },
    onSuccess: () => {
      toast({ title: "Stewardship approved!" });
      queryClient.invalidateQueries({ queryKey: ["stewardship-pending-requests", territoryId] });
      queryClient.invalidateQueries({ queryKey: ["territory-portal-stewards", territoryId] });
    },
    onError: () => {
      toast({ title: "Failed to approve", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await (supabase
        .from("stewardship_requests" as any)
        .update({
          status: "rejected",
          reviewed_by_user_id: currentUser.id,
          reviewed_at: new Date().toISOString(),
        } as any) as any)
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Request rejected" });
      queryClient.invalidateQueries({ queryKey: ["stewardship-pending-requests", territoryId] });
    },
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Stewards</h3>
        {stewards.length > 0 && (
          <Badge variant="secondary" className="text-[10px] ml-auto">{stewards.length}</Badge>
        )}
      </div>

      {stewards.length === 0 ? (
        <p className="text-xs text-muted-foreground">No stewards yet. Pioneer this territory!</p>
      ) : (
        <div className="space-y-2">
          {stewards.map(s => (
            <Link
              key={s.user_id}
              to={`/profile/${s.user_id}`}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={s.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">{s.name?.charAt(0) ?? "?"}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-foreground truncate">{s.name}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Request stewardship button */}
      {canRequest && !existingRequest && (
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5 text-xs"
          onClick={() => requestMutation.mutate()}
          disabled={requestMutation.isPending}
        >
          {requestMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <UserPlus className="h-3 w-3" />
          )}
          Request Stewardship
        </Button>
      )}

      {existingRequest && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <Clock className="h-3 w-3" />
          Stewardship request pending
        </div>
      )}

      {!isAuthenticated && !isPioneerTerritory && stewards.length > 0 && (
        <p className="text-[11px] text-muted-foreground">Log in to request stewardship (Level 2+).</p>
      )}

      {/* Pending requests for stewards */}
      {isSteward && pendingRequests.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-[11px] font-medium text-muted-foreground">Pending requests</p>
          {pendingRequests.map((req: any) => (
            <div key={req.id} className="flex items-center gap-2 rounded-lg bg-muted/30 px-2 py-1.5">
              <Avatar className="h-6 w-6">
                <AvatarImage src={req.avatar_url ?? undefined} />
                <AvatarFallback className="text-[9px]">{req.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium truncate flex-1">{req.name}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                onClick={() => approveMutation.mutate({ requestId: req.id, userId: req.requester_user_id })}
                disabled={approveMutation.isPending}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
                onClick={() => rejectMutation.mutate(req.id)}
                disabled={rejectMutation.isPending}
              >
                ✕
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
