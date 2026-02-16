import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface BroadcastMessageDialogProps {
  /** Array of member user IDs to message (excludes current user) */
  recipientIds: string[];
  /** Total member count shown in UI */
  recipientCount: number;
  guildId: string;
  guildName: string;
  trigger?: React.ReactNode;
}

export function BroadcastMessageDialog({
  recipientIds,
  recipientCount,
  guildId,
  guildName,
  trigger,
}: BroadcastMessageDialogProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const { session } = useAuth();
  const { toast } = useToast();

  const senderLabel = guildName;

  const handleSend = async () => {
    if (!content.trim() || !session?.user?.id || recipientIds.length === 0) return;
    setSending(true);
    setProgress(0);

    const userId = session.user.id;
    let sent = 0;
    let failed = 0;

    for (const recipientId of recipientIds) {
      try {
        // Create conversation
        const { data: conv, error: convError } = await supabase
          .from("conversations")
          .insert({
            title: `Message from ${senderLabel}`,
            is_group: false,
            created_by: userId,
            sender_label: senderLabel,
            sender_entity_type: "guild",
            sender_entity_id: guildId,
          } as any)
          .select("id")
          .single();

        if (convError || !conv) { failed++; continue; }

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

      setProgress(Math.round(((sent + failed) / recipientIds.length) * 100));
    }

    toast({
      title: "Broadcast sent",
      description: `Message delivered to ${sent} member${sent !== 1 ? "s" : ""}${failed > 0 ? ` (${failed} failed)` : ""} as ${senderLabel}.`,
    });

    setContent("");
    setSending(false);
    setProgress(0);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!sending) setOpen(o); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline">
            <Megaphone className="h-4 w-4 mr-1.5" />
            Message all members
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Broadcast to all members
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This message will be sent as an official message from <strong>{senderLabel}</strong> to{" "}
          <strong>{recipientCount} member{recipientCount !== 1 ? "s" : ""}</strong>. Each member receives it in their inbox.
        </p>
        <Textarea
          placeholder={`Write your announcement to all ${senderLabel} members...`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          className="resize-none"
          disabled={sending}
        />
        {sending && (
          <div className="space-y-1.5">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Sending… {progress}%
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!content.trim() || sending}>
            {sending ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Sending…</>
            ) : (
              <><Megaphone className="h-4 w-4 mr-1" /> Send to {recipientCount} member{recipientCount !== 1 ? "s" : ""}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
