import { useState, useRef, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Megaphone, Loader2, Mail, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BroadcastAudiencePicker, type AudienceSegment } from "@/components/broadcast/BroadcastAudiencePicker";
import { BroadcastToolbar } from "@/components/broadcast/BroadcastToolbar";
import { BroadcastAttachment } from "@/components/broadcast/BroadcastAttachment";

const SENDER_LABEL = "changethegame Platform";

async function resolveRecipientIds(
  segments: AudienceSegment[],
  currentUserId: string
): Promise<string[]> {
  const idSets: Set<string>[] = [];

  for (const seg of segments) {
    switch (seg) {
      case "all": {
        const { data } = await supabase.from("profiles").select("id").neq("id", currentUserId);
        idSets.push(new Set((data ?? []).map((p) => p.id)));
        break;
      }
      case "guild_admins": {
        const { data } = await supabase
          .from("guild_members")
          .select("user_id")
          .eq("role", "ADMIN" as any);
        idSets.push(new Set((data ?? []).map((m) => m.user_id)));
        break;
      }
      case "company_admins": {
        const { data } = await supabase
          .from("company_members")
          .select("user_id")
          .eq("role", "admin");
        idSets.push(new Set((data ?? []).map((m) => m.user_id)));
        break;
      }
      case "org_reps": {
        const { data } = await supabase
          .from("companies")
          .select("contact_user_id")
          .not("contact_user_id", "is", null);
        idSets.push(new Set((data ?? []).filter((c) => c.contact_user_id).map((c) => c.contact_user_id!)));
        break;
      }
      case "shareholders_a": {
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .eq("is_cooperative_member", true)
          .gt("total_shares_a", 0);
        idSets.push(new Set((data ?? []).map((p) => p.id)));
        break;
      }
      case "shareholders_b": {
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .eq("is_cooperative_member", true)
          .gt("total_shares_b", 0);
        idSets.push(new Set((data ?? []).map((p) => p.id)));
        break;
      }
    }
  }

  // Union all sets, remove current user
  const union = new Set<string>();
  idSets.forEach((s) => s.forEach((id) => union.add(id)));
  union.delete(currentUserId);
  return Array.from(union);
}

export function PlatformBroadcastDialog() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [audiences, setAudiences] = useState<AudienceSegment[]>(["all"]);
  const [attachment, setAttachment] = useState<{ url: string; name: string; size: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<{ total: number; sent: number; failed: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { session } = useAuth();
  const { toast } = useToast();

  const handleContentInsert = useCallback((newVal: string) => {
    setContent(newVal);
  }, []);

  const buildMessageBody = () => {
    let body = content.trim();
    if (linkUrl.trim()) {
      body += `\n\n🔗 [Read more](${linkUrl.trim()})`;
    }
    if (attachment) {
      body += `\n\n📎 [${attachment.name}](${attachment.url})`;
    }
    return body;
  };

  const handleSend = async () => {
    if (!content.trim() || !session?.user?.id || audiences.length === 0) return;
    setSending(true);
    setProgress(0);
    setStats(null);

    const userId = session.user.id;
    const messageBody = buildMessageBody();

    try {
      const recipientIds = await resolveRecipientIds(audiences, userId);

      if (recipientIds.length === 0) {
        toast({ title: "No recipients", description: "No users match the selected audience.", variant: "destructive" });
        setSending(false);
        return;
      }

      // Create broadcast record
      const { data: broadcast, error: broadcastErr } = await supabase
        .from("broadcast_messages" as any)
        .insert({
          sender_user_id: userId,
          sender_label: SENDER_LABEL,
          sender_entity_type: "platform",
          sender_entity_id: null,
          subject: subject.trim() || null,
          content: messageBody,
          link_url: linkUrl.trim() || null,
          attachment_url: attachment?.url || null,
          attachment_name: attachment?.name || null,
          audience_segments: audiences,
          total_recipients: recipientIds.length,
        })
        .select("id")
        .single();

      if (broadcastErr || !broadcast) throw broadcastErr;
      const broadcastId = (broadcast as any).id;

      // Pre-insert all recipients as pending
      const recipientRows = recipientIds.map((rid) => ({
        broadcast_id: broadcastId,
        user_id: rid,
        status: "pending",
      }));
      await supabase.from("broadcast_recipients" as any).insert(recipientRows);

      const total = recipientIds.length;
      let sent = 0;
      let failed = 0;
      const BATCH_SIZE = 5;

      for (let i = 0; i < recipientIds.length; i += BATCH_SIZE) {
        const batch = recipientIds.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (recipientId) => {
            try {
              const { data: conv, error: convError } = await supabase
                .from("conversations")
                .insert({
                  title: subject.trim() || `Message from ${SENDER_LABEL}`,
                  is_group: false,
                  created_by: userId,
                  sender_label: SENDER_LABEL,
                  sender_entity_type: "platform",
                  sender_entity_id: null,
                } as any)
                .select("id")
                .single();

              if (convError || !conv) { failed++; await supabase.from("broadcast_recipients" as any).update({ status: "failed" }).eq("broadcast_id", broadcastId).eq("user_id", recipientId); return; }

              const allIds = [...new Set([userId, recipientId])];
              await supabase
                .from("conversation_participants")
                .insert(allIds.map((uid) => ({ conversation_id: conv.id, user_id: uid })));

              const { data: msg } = await supabase
                .from("direct_messages")
                .insert({
                  conversation_id: conv.id,
                  sender_id: userId,
                  content: messageBody,
                  sender_label: SENDER_LABEL,
                } as any)
                .select("id")
                .single();

              await supabase
                .from("conversations")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", conv.id);

              // Mark recipient as sent
              await supabase
                .from("broadcast_recipients" as any)
                .update({ status: "sent", conversation_id: conv.id, delivered_at: new Date().toISOString() })
                .eq("broadcast_id", broadcastId)
                .eq("user_id", recipientId);

              fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-dm-notification`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    messageId: msg?.id,
                    conversationId: conv.id,
                    senderId: userId,
                    content: messageBody,
                    senderLabel: SENDER_LABEL,
                  }),
                }
              ).catch(() => {});

              sent++;
            } catch {
              failed++;
              await supabase.from("broadcast_recipients" as any).update({ status: "failed" }).eq("broadcast_id", broadcastId).eq("user_id", recipientId);
            }
          })
        );

        setProgress(Math.round(((sent + failed) / total) * 100));
        setStats({ total, sent, failed });
      }

      // Update broadcast totals
      await supabase
        .from("broadcast_messages" as any)
        .update({ total_sent: sent, total_failed: failed })
        .eq("id", broadcastId);

      toast({
        title: "Broadcast complete",
        description: `Message delivered to ${sent} user${sent !== 1 ? "s" : ""}${failed > 0 ? ` (${failed} failed)` : ""}.`,
      });

      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Broadcast failed", description: err?.message ?? "An unexpected error occurred.", variant: "destructive" });
      setSending(false);
    }
  };

  const resetForm = () => {
    setContent("");
    setSubject("");
    setLinkUrl("");
    setAudiences(["all"]);
    setAttachment(null);
    setSending(false);
    setProgress(0);
    setStats(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!sending) setOpen(o); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Megaphone className="h-4 w-4" />
          Broadcast to users
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Platform broadcast
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-2">
            <p className="text-sm text-muted-foreground">
              Send an official message from <strong>{SENDER_LABEL}</strong>.
              Each recipient receives it in their inbox with an email notification.
            </p>

            {/* Audience picker */}
            <BroadcastAudiencePicker selected={audiences} onChange={setAudiences} disabled={sending} />

            {/* Subject */}
            <div>
              <Label htmlFor="broadcast-subject" className="text-sm font-medium">
                Subject <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="broadcast-subject"
                placeholder="e.g. Important platform update"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sending}
              />
            </div>

            {/* Message with formatting toolbar */}
            <div>
              <Label htmlFor="broadcast-content" className="text-sm font-medium">
                Message
              </Label>
              <BroadcastToolbar textareaRef={textareaRef} disabled={sending} onInsert={handleContentInsert} />
              <Textarea
                ref={textareaRef}
                id="broadcast-content"
                placeholder="Write your announcement… (Markdown supported)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="resize-none mt-1.5 font-mono text-sm"
                disabled={sending}
              />
            </div>

            {/* URL */}
            <div>
              <Label htmlFor="broadcast-url" className="text-sm font-medium flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" /> Link URL <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="broadcast-url"
                type="url"
                placeholder="https://…"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                disabled={sending}
              />
            </div>

            {/* Attachment */}
            <BroadcastAttachment attachment={attachment} onAttach={setAttachment} disabled={sending} />

            {/* Progress */}
            {sending && (
              <div className="space-y-1.5">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Sending… {progress}%
                  {stats && ` (${stats.sent} sent, ${stats.failed} failed of ${stats.total})`}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!content.trim() || sending || audiences.length === 0}>
            {sending ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Broadcasting…</>
            ) : (
              <><Megaphone className="h-4 w-4 mr-1" /> Send broadcast</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
