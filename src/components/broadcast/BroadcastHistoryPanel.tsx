import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Megaphone, ChevronDown, ChevronRight, Users, CheckCircle2, XCircle, Eye, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BroadcastRow {
  id: string;
  sender_label: string;
  sender_entity_type: string;
  subject: string | null;
  content: string;
  link_url: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  created_at: string;
}

interface RecipientRow {
  id: string;
  user_id: string;
  status: string;
  delivered_at: string | null;
  read_at: string | null;
  profile?: { name: string | null; email: string | null };
}

export function BroadcastHistoryPanel() {
  const { session } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewBroadcast, setPreviewBroadcast] = useState<BroadcastRow | null>(null);

  const { data: broadcasts, isLoading } = useQuery({
    queryKey: ["broadcast-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("broadcast_messages" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as unknown as BroadcastRow[];
    },
    enabled: !!session?.user?.id,
  });

  const { data: recipients } = useQuery({
    queryKey: ["broadcast-recipients", expandedId],
    queryFn: async () => {
      if (!expandedId) return [];
      const { data } = await supabase
        .from("broadcast_recipients" as any)
        .select("id, user_id, status, delivered_at, read_at")
        .eq("broadcast_id", expandedId)
        .order("status", { ascending: true });

      const rows = (data ?? []) as unknown as RecipientRow[];

      // Fetch profile names — column is "name", not "display_name"
      const userIds = rows.map((r) => r.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds);

        const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
        rows.forEach((r) => {
          r.profile = profileMap.get(r.user_id) as any;
        });
      }

      return rows;
    },
    enabled: !!expandedId,
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "sent": return <Badge variant="default" className="gap-1 text-xs"><CheckCircle2 className="h-3 w-3" /> Sent</Badge>;
      case "failed": return <Badge variant="destructive" className="gap-1 text-xs"><XCircle className="h-3 w-3" /> Failed</Badge>;
      default: return <Badge variant="secondary" className="gap-1 text-xs"><Clock className="h-3 w-3" /> Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!broadcasts?.length) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
        <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No broadcasts sent yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-primary" />
        Broadcast History
      </h3>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Subject / Content</TableHead>
              <TableHead>Sender</TableHead>
              <TableHead className="text-center">Recipients</TableHead>
              <TableHead className="text-center">Sent</TableHead>
              <TableHead className="text-center">Failed</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {broadcasts.map((b) => {
              const isExpanded = expandedId === b.id;
              return (
                <> 
                  <TableRow
                    key={b.id}
                    className="cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : b.id)}
                  >
                    <TableCell>
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      <span className="font-medium">{b.subject || b.content.slice(0, 60)}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{b.sender_label || b.sender_entity_type}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" />{b.total_recipients}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm text-primary font-medium">{b.total_sent}</TableCell>
                    <TableCell className="text-center text-sm text-destructive font-medium">{b.total_failed}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(b.created_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); setPreviewBroadcast(b); }}
                        title="View message"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${b.id}-detail`}>
                      <TableCell colSpan={8} className="bg-muted/30 p-0">
                        <ScrollArea className="max-h-80">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Recipient</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Delivered</TableHead>
                                <TableHead>Read</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {recipients?.map((r) => (
                                <TableRow key={r.id}>
                                  <TableCell className="text-sm font-medium">
                                    {r.profile?.name || r.user_id.slice(0, 8)}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {r.profile?.email || "—"}
                                  </TableCell>
                                  <TableCell>{statusBadge(r.status)}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {r.delivered_at ? format(new Date(r.delivered_at), "MMM d, HH:mm") : "—"}
                                  </TableCell>
                                  <TableCell>
                                    {r.read_at ? (
                                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                                        <Eye className="h-3 w-3" />
                                        {format(new Date(r.read_at), "MMM d, HH:mm")}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Not read</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {(!recipients || recipients.length === 0) && (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-4">
                                    Loading recipients…
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Message preview dialog */}
      <Dialog open={!!previewBroadcast} onOpenChange={(o) => { if (!o) setPreviewBroadcast(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              {previewBroadcast?.subject || "Broadcast Message"}
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground flex items-center gap-3">
            <span>From: {previewBroadcast?.sender_label}</span>
            <span>{previewBroadcast && format(new Date(previewBroadcast.created_at), "MMM d, yyyy · HH:mm")}</span>
            <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" />{previewBroadcast?.total_recipients}</Badge>
          </div>
          <ScrollArea className="flex-1 mt-3">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
              {previewBroadcast?.content}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
