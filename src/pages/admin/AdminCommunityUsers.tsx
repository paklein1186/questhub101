import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, ExternalLink, Trash2, Loader2 } from "lucide-react";
import { SendOfficialMessageDialog } from "@/components/SendOfficialMessageDialog";
import { useToast } from "@/hooks/use-toast";
import { useTableSort } from "@/hooks/useTableSort";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminCommunityUsers() {
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-community-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, email, avatar_url, role, xp, contribution_index, created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = profiles.filter(
    (p) =>
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const { sorted, sort, toggle } = useTableSort(filtered);

  const handleDeleteUser = async (userId: string, userName: string) => {
    setDeletingId(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: `User "${userName}" deleted successfully` });
      qc.invalidateQueries({ queryKey: ["admin-community-users"] });
    } catch (e: any) {
      toast({ title: "Failed to delete user", description: e.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" /> Users
      </h2>
      <Input
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead sortKey="name" currentKey={sort.key} direction={sort.direction} onSort={toggle}>Name</SortableTableHead>
              <SortableTableHead sortKey="email" currentKey={sort.key} direction={sort.direction} onSort={toggle}>Email</SortableTableHead>
              <SortableTableHead sortKey="role" currentKey={sort.key} direction={sort.direction} onSort={toggle}>Role</SortableTableHead>
              <SortableTableHead sortKey="xp" currentKey={sort.key} direction={sort.direction} onSort={toggle} className="text-right">XP</SortableTableHead>
              <SortableTableHead sortKey="created_at" currentKey={sort.key} direction={sort.direction} onSort={toggle}>Joined</SortableTableHead>
              <th className="h-12 px-4 w-20"></th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p) => (
              <TableRow key={p.user_id}>
                <TableCell className="font-medium">
                  <Link to={`/users/${p.user_id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                    {p.name}
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize text-xs">
                    {p.role?.toLowerCase().replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{p.xp}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <SendOfficialMessageDialog
                      recipientUserId={p.user_id}
                      recipientName={p.name || "User"}
                      senderType="platform"
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          {deletingId === p.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete user permanently?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove <strong>{p.name || p.email}</strong> from the authentication system and database. Their email will become available for re-registration. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteUser(p.user_id, p.name || p.email || "User")}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
