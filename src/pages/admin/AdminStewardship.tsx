import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Search, Trees, UserPlus, Trash2, MapPin, User, ChevronsUpDown, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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

/* ─── Searchable Combobox ─── */
function SearchCombobox({
  label,
  placeholder,
  items,
  value,
  onChange,
  renderItem,
}: {
  label: string;
  placeholder: string;
  items: { id: string; label: string; sub?: string }[];
  value: string;
  onChange: (id: string) => void;
  renderItem?: (item: { id: string; label: string; sub?: string }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.id === value);

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selected ? (
              <span className="truncate">{selected.label}{selected.sub ? ` — ${selected.sub}` : ""}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup className="max-h-[240px] overflow-auto">
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.sub || ""}`}
                    onSelect={() => {
                      onChange(item.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === item.id ? "opacity-100" : "opacity-0")} />
                    {renderItem ? renderItem(item) : (
                      <div>
                        <p className="text-sm">{item.label}</p>
                        {item.sub && <p className="text-xs text-muted-foreground">{item.sub}</p>}
                      </div>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
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

  // Fetch all profiles for combobox
  const { data: allProfiles = [] } = useQuery({
    queryKey: ["admin-all-profiles-short"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .order("name");
      return (data || []).map((p: any) => ({
        id: p.user_id,
        label: p.name || "Unnamed",
        sub: p.email,
      }));
    },
  });

  // Fetch all territories for combobox
  const { data: allTerritories = [] } = useQuery({
    queryKey: ["admin-all-territories-short"],
    queryFn: async () => {
      const { data } = await supabase
        .from("territories")
        .select("id, name, level")
        .eq("is_deleted", false)
        .order("name")
        .limit(2000);
      return (data || []).map((t: any) => ({
        id: t.id,
        label: t.name || "Unnamed",
        sub: t.level,
      }));
    },
  });

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
      return data || [];
    },
  });

  // Build lookup maps from already-fetched lists
  const profileMap = useMemo(
    () => new Map(allProfiles.map((p) => [p.id, p])),
    [allProfiles]
  );
  const territoryMap = useMemo(
    () => new Map(allTerritories.map((t) => [t.id, t])),
    [allTerritories]
  );

  const resolvedEdges: StewardEdge[] = useMemo(
    () =>
      edges.map((e: any) => ({
        ...e,
        from_profile: profileMap.has(e.from_node_id)
          ? { name: profileMap.get(e.from_node_id)!.label, avatar_url: null }
          : null,
        to_territory: territoryMap.has(e.to_node_id)
          ? { name: territoryMap.get(e.to_node_id)!.label, tier: territoryMap.get(e.to_node_id)!.sub || null }
          : null,
      })),
    [edges, profileMap, territoryMap]
  );

  // Filter
  const filtered = resolvedEdges.filter((e) => {
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
    if (!assignUserId || !assignTerritoryId) return;
    setAssigning(true);
    try {
      const { data: existing } = await supabase
        .from("trust_edges")
        .select("id")
        .eq("from_node_id", assignUserId)
        .eq("to_node_id", assignTerritoryId)
        .eq("edge_type", "stewardship" as any)
        .eq("status", "active" as any)
        .maybeSingle();

      if (existing) {
        toast({ title: "Already a steward", description: "This user is already a steward of this territory.", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("trust_edges").insert({
        from_node_id: assignUserId,
        from_node_type: "user" as any,
        to_node_id: assignTerritoryId,
        to_node_type: "territory" as any,
        edge_type: "stewardship" as any,
        score: 1,
        tags: ["admin-assigned"],
        created_by: assignUserId,
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

  const activeCount = resolvedEdges.filter((e) => e.status === "active").length;
  const revokedCount = resolvedEdges.filter((e) => e.status === "revoked").length;

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
            <p className="text-2xl font-bold text-foreground">{resolvedEdges.length}</p>
            <p className="text-xs text-muted-foreground">Total Edges</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{activeCount}</p>
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
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No stewardship edges found.</TableCell>
                </TableRow>
              ) : (
                filtered.map((edge) => (
                  <TableRow key={edge.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {edge.from_profile?.name || "Unknown user"}
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
                            {edge.to_territory?.name || (
                              <span className="text-muted-foreground italic">
                                ID: {edge.to_node_id.slice(0, 8)}… (not in territories table)
                              </span>
                            )}
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
            <SearchCombobox
              label="User"
              placeholder="Search by name or email…"
              items={allProfiles}
              value={assignUserId}
              onChange={setAssignUserId}
            />
            <SearchCombobox
              label="Territory"
              placeholder="Search by territory name…"
              items={allTerritories}
              value={assignTerritoryId}
              onChange={setAssignTerritoryId}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={assigning || !assignUserId || !assignTerritoryId}>
              {assigning ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
