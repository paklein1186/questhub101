import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Check, Copy, UserPlus, Mail, Loader2, Send } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getInviteUrl, type ShareEntityType } from "@/lib/shareUrl";
import { UserSearchInput } from "@/components/UserSearchInput";
import { sendInviteNotification } from "@/lib/inviteNotification";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

type EntityType = "guild" | "pod" | "quest" | "company";

interface Props {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  /** User IDs to exclude from search (already members) */
  excludeUserIds?: string[];
}

export function InviteLinkButton({ entityType, entityId, entityName, excludeUserIds = [] }: Props) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<string[]>([]);
  const currentUser = useCurrentUser();
  const { toast } = useToast();

  const inviteUrl = getInviteUrl(entityType as ShareEntityType, entityId);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast({ title: "Link copied!", description: `Share this link to invite people to "${entityName}"` });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleUserSelect = async (selectedUser: { user_id: string; display_name: string | null }) => {
    if (invitedUsers.includes(selectedUser.user_id)) {
      toast({ title: "Already invited", variant: "default" });
      return;
    }

    const inviterName = currentUser.name || currentUser.email || "Someone";
    await sendInviteNotification({
      invitedUserId: selectedUser.user_id,
      inviterName,
      entityType,
      entityId,
      entityName,
    });

    setInvitedUsers((prev) => [...prev, selectedUser.user_id]);
    toast({
      title: "Invitation sent!",
      description: `${selectedUser.display_name || "User"} has been notified.`,
    });
  };

  const handleSendEmail = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }

    setSendingEmail(true);
    try {
      const inviterName = currentUser.name || currentUser.email || "Someone";
      const { error } = await supabase.functions.invoke("send-invite-email", {
        body: {
          email: trimmed,
          inviterName,
          entityType,
          entityId,
          entityName,
          inviteUrl,
        },
      });

      if (error) throw error;

      setEmailSent(true);
      setEmail("");
      toast({ title: "Email sent!", description: `Invitation sent to ${trimmed}` });
      setTimeout(() => setEmailSent(false), 3000);
    } catch (err) {
      logger.error("[InviteEmail] Failed:", err);
      toast({ title: "Failed to send email", description: "Please try again later.", variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <Link2 className="h-4 w-4 mr-1" /> Invite
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          {/* Section 1: Copy link */}
          <div>
            <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground" /> Share invite link
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Anyone with this link can view and join "{entityName}"
            </p>
            <div className="flex gap-2">
              <Input
                value={inviteUrl}
                readOnly
                className="text-xs h-8"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button size="sm" variant="secondary" className="shrink-0 h-8 w-8 p-0" onClick={copyToClipboard}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Section 2: Invite existing user */}
          <div>
            <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5 text-muted-foreground" /> Invite a member
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Search for an existing user to notify them
            </p>
            <UserSearchInput
              onSelect={handleUserSelect}
              placeholder="Search by name…"
              excludeUserIds={[...excludeUserIds, ...invitedUsers]}
            />
          </div>

          <Separator />

          {/* Section 3: Invite by email */}
          <div>
            <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Invite by email
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Send an invitation link to someone outside the platform
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="text-xs h-8"
                onKeyDown={(e) => e.key === "Enter" && handleSendEmail()}
              />
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0 h-8 w-8 p-0"
                onClick={handleSendEmail}
                disabled={sendingEmail || !email.trim()}
              >
                {sendingEmail ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : emailSent ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
