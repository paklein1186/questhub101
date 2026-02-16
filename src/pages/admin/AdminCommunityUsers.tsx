import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Users, ExternalLink } from "lucide-react";
import { SendOfficialMessageDialog } from "@/components/SendOfficialMessageDialog";

export default function AdminCommunityUsers() {
  const [search, setSearch] = useState("");

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
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">XP</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
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
                  <SendOfficialMessageDialog
                    recipientUserId={p.user_id}
                    recipientName={p.name || "User"}
                    senderType="platform"
                  />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
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
