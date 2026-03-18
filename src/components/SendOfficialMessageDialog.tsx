import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface SendOfficialMessageDialogProps {
  recipientUserId: string;
  recipientName: string;
  /** "guild" for guild admins, "platform" for super admins */
  senderType: "guild" | "platform";
  /** Guild id (required if senderType is guild) */
  guildId?: string;
  /** Guild name (required if senderType is guild) */
  guildName?: string;
  /** Trigger button — if not provided a default Mail button is rendered */
  trigger?: React.ReactNode;
}

export function SendOfficialMessageDialog({
  recipientUserId,
  recipientName,
  senderType,
  guildId,
  guildName,
  trigger,
}: SendOfficialMessageDialogProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();

  const senderLabel =
    senderType === "guild" ? guildName ?? "Guild" : "changethegame Platform";

  const handleSend = async () => {
    if (!content.trim() || !session?.user?.id) return;
    setSending(true);

    try {
      const userId = session.user.id;

      // Create a new conversation specifically for this official message
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .insert({
          title: `Message from ${senderLabel}`,
          is_group: false,
          created_by: userId,
          sender_label: senderLabel,
          sender_entity_type: senderType,
          sender_entity_id: senderType === "guild" ? guildId : null,
        } as any)
        .select("id")
        .single();

      if (convError || !conv) throw convError ?? new Error("Failed to create conversation");

      // Add both sender and recipient as participants
      const allIds = [...new Set([userId, recipientUserId])];
      const { error: pError } = await supabase
        .from("conversation_participants")
        .insert(allIds.map((uid) => ({ conversation_id: conv.id, user_id: uid })));
      if (pError) throw pError;

      // Send the message with the official label
      const { data: msg, error: msgError } = await supabase
        .from("direct_messages")
        .insert({
          conversation_id: conv.id,
          sender_id: userId,
          content: content.trim(),
          sender_label: senderLabel,
        } as any)
        .select()
        .single();

      if (msgError) throw msgError;

      // Update conversation updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conv.id);

      // Trigger DM notification (which sends email too)
      try {
        const accessToken = session?.access_token;
        if (accessToken) {
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-dm-notification`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
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
          );
        }
      } catch (err) {
        console.error("Error triggering DM notification:", err);
      }

      toast({
        title: "Message sent",
        description: `Official message sent to ${recipientName} as ${senderLabel}`,
      });
      setContent("");
      setOpen(false);
    } catch (err: any) {
      toast({
        title: "Failed to send message",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="ghost" title={`Message as ${senderLabel}`}>
            <Mail className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Send message as {senderLabel}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This message will appear in <strong>{recipientName}</strong>'s inbox as an official message from <strong>{senderLabel}</strong>. They'll also receive an email notification.
        </p>
        <Textarea
          placeholder={`Write your message to ${recipientName}...`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          className="resize-none"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!content.trim() || sending}>
            <Mail className="h-4 w-4 mr-1" />
            {sending ? "Sending…" : "Send official message"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
