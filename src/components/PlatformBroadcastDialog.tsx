import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Megaphone, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

export function PlatformBroadcastDialog() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<{ total: number; sent: number; failed: number } | null>(null);
  const { session } = useAuth();
  const { toast } = useToast();

  const senderLabel = "changethegame Platform";

  const handleSend = async () => {
    if (!content.trim() || !session?.user?.id) return;
    setSending(true);
    setProgress(0);
    setStats(null);

    const userId = session.user.id;

    try {
      // Fetch all user IDs except the sender
      const { data: allProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id")
        .neq("id", userId);

      if (profilesError) throw profilesError;
      if (!allProfiles || allProfiles.length === 0) {
        toast({ title: "No users found", description: "There are no other users on the platform.", variant: "destructive" });
        setSending(false);
        return;
      }

      const recipientIds = allProfiles.map((p) => p.id);
      const total = recipientIds.length;
      let sent = 0;
      let failed = 0;

      // Send in batches of 5 for reasonable speed
      const BATCH_SIZE = 5;
      for (let i = 0; i < recipientIds.length; i += BATCH_SIZE) {
        const batch = recipientIds.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (recipientId) => {
            try {
              // Create conversation
              const { data: conv, error: convError } = await supabase
                .from("conversations")
                .insert({
                  title: subject.trim() || `Message from ${senderLabel}`,
                  is_group: false,
                  created_by: userId,
                  sender_label: senderLabel,
                  sender_entity_type: "platform",
                  sender_entity_id: null,
                } as any)
                .select("id")
                .single();

              if (convError || !conv) { failed++; return; }

              // Add participants
              const allIds = [...new Set([userId, recipientId])];
              await supabase
                .from("conversation_participants")
                .insert(allIds.map((uid) => ({ conversation_id: conv.id, user_id: uid })));

              // Send message
              const { data: msg } = await supabase
                .from("direct_messages")
                .insert({
                  conversation_id: conv.id,
                  sender_id: userId,
                  content: content.trim(),
                  sender_label: senderLabel,
                } as any)
                .select("id")
                .single();

              // Update conversation timestamp
              await supabase
                .from("conversations")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", conv.id);

              // Trigger notification (fire-and-forget)
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
                    content: content.trim(),
                    senderLabel,
                  }),
                }
              ).catch(() => {});

              sent++;
            } catch {
              failed++;
            }
          })
        );

        setProgress(Math.round(((sent + failed) / total) * 100));
        setStats({ total, sent, failed });
      }

      toast({
        title: "Broadcast complete",
        description: `Message delivered to ${sent} user${sent !== 1 ? "s" : ""}${failed > 0 ? ` (${failed} failed)` : ""}.`,
      });

      setContent("");
      setSubject("");
      setSending(false);
      setProgress(0);
      setStats(null);
      setOpen(false);
    } catch (err: any) {
      toast({
        title: "Broadcast failed",
        description: err?.message ?? "An unexpected error occurred.",
        variant: "destructive",
      });
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!sending) setOpen(o); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Megaphone className="h-4 w-4" />
          Broadcast to all users
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Platform-wide broadcast
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Send an official message from <strong>{senderLabel}</strong> to every user on the platform.
          Each user will receive it in their inbox with an email notification.
        </p>

        <div className="space-y-3">
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
          <div>
            <Label htmlFor="broadcast-content" className="text-sm font-medium">
              Message
            </Label>
            <Textarea
              id="broadcast-content"
              placeholder="Write your announcement to all platform users…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="resize-none"
              disabled={sending}
            />
          </div>
        </div>

        {sending && (
          <div className="space-y-1.5">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Sending… {progress}%
              {stats && ` (${stats.sent} sent, ${stats.failed} failed of ${stats.total})`}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!content.trim() || sending}>
            {sending ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Broadcasting…</>
            ) : (
              <><Megaphone className="h-4 w-4 mr-1" /> Send to all users</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
