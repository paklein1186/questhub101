import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Trees, UserPlus, Trash2, MapPin, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/* ─── Types ─── */
interface StewardEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  score: number;
  status: string;
  tags: string[] | null;
  created_at: string;
  from_profile?: { name: string; avatar_url: string | null } | null;
  to_territory?: { name: string; tier: string | null } | null;
}

/* ─── Main Component ─── */
export default function AdminStewardship() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAssign, setShowAssign] = useState(false);

  // Assign form state
  const [assignUserId, setAssignUserId] = useState("");
  const [assignTerritoryId, setAssignTerritoryId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Fetch all stewardship edges
  const { data: edges = [], isLoading } = useQuery({
    queryKey: ["admin-stewardship-edges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trust_edges")
        .select("id, from_node_id, to_node_id, score, status, tags, created_at")
        .eq("edge_type", "stewardship" as any)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      // Resolve profiles and territories
      const userIds = [...new Set((data || []).map((e: any) => e.from_node_id))];
      const territoryIds = [...new Set((data || []).map((e: any) => e.to_node_id))];

      const [profilesRes, territoriesRes] = await Promise.all([
        userIds.length > 0
          ? supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", userIds)
          : { data: [] },
        territoryIds.length > 0
          ? supabase.from("territories").select("id, name, tier").in("id", territoryIds)
          : { data: [] },
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
      const territoryMap = new Map((territoriesRes.data || []).map((t: any) => [t.id, t]));

      return (data || []).map((e: any) => ({
        ...e,
        from_profile: profileMap.get(e.from_node_id) || null,
        to_territory: territoryMap.get(e.to_node_id) || null,
      })) as StewardEdge[];
    },
  });

  // Filter
  const filtered = edges.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.from_profile?.name?.toLowerCase().includes(q) ||
      e.to_territory?.name?.toLowerCase().includes(q) ||
      e.from_node_id.toLowerCase().includes(q) ||
      e.to_node_id.toLowerCase().includes(q)
    );
  });

  // Revoke stewardship
  const handleRevoke = async (edgeId: string) => {
    const { error } = await supabase
      .from("trust_edges")
      .update({ status: "revoked" as any })
      .eq("id", edgeId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Stewardship revoked" });
      qc.invalidateQueries({ queryKey: ["admin-stewardship-edges"] });
    }
  };

  // Assign stewardship
  const handleAssign = async () => {
    if (!assignUserId.trim() || !assignTerritoryId.trim()) return;
    setAssigning(true);
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from("trust_edges")
        .select("id")
        .eq("from_node_id", assignUserId.trim())
        .eq("to_node_id", assignTerritoryId.trim())
        .eq("edge_type", "stewardship" as any)
        .eq("status", "active" as any)
        .maybeSingle();

      if (existing) {
        toast({ title: "Already a steward", description: "This user is already a steward of this territory.", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("trust_edges").insert({
        from_node_id: assignUserId.trim(),
        from_node_type: "user" as any,
        to_node_id: assignTerritoryId.trim(),
        to_node_type: "territory" as any,
        edge_type: "stewardship" as any,
        score: 1,
        tags: ["admin-assigned"],
        created_by: assignUserId.trim(),
        status: "active" as any,
        visibility: "public" as any,
      });

      if (error) throw error;
      toast({ title: "Stewardship assigned" });
      qc.invalidateQueries({ queryKey: ["admin-stewardship-edges"] });
      setShowAssign(false);
      setAssignUserId("");
      setAssignTerritoryId("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  const activeCount = edges.filter((e) => e.status === "active").length;
  const revokedCount = edges.filter((e) => e.status === "revoked").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <Trees className="h-5 w-5 text-primary" /> Stewardship Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View, assign, and revoke territory stewardship edges.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAssign(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Assign Steward
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{edges.length}</p>
            <p className="text-xs text-muted-foreground">Total Edges</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{revokedCount}</p>
            <p className="text-xs text-muted-foreground">Revoked</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by steward name, territory name, or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Steward</TableHead>
                <TableHead>Territory</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Since</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No stewardship edges found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((edge) => (
                  <TableRow key={edge.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {edge.from_profile?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono truncate max-w-[140px]">
                            {edge.from_node_id.slice(0, 8)}…
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {edge.to_territory?.name || "Unknown"}
                          </p>
                          {edge.to_territory?.tier && (
                            <p className="text-xs text-muted-foreground capitalize">{edge.to_territory.tier}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(edge.tags || []).map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={edge.status === "active" ? "default" : "destructive"} className="text-[10px]">
                        {edge.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(edge.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {edge.status === "active" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke stewardship?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will revoke {edge.from_profile?.name || "this user"}'s stewardship of {edge.to_territory?.name || "this territory"}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRevoke(edge.id)}>Revoke</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Stewardship</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs">User ID</Label>
              <Input
                placeholder="Paste user UUID"
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Territory ID</Label>
              <Input
                placeholder="Paste territory UUID"
                value={assignTerritoryId}
                onChange={(e) => setAssignTerritoryId(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={assigning || !assignUserId.trim() || !assignTerritoryId.trim()}>
              {assigning ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
