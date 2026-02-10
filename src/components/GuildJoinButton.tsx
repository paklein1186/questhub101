import { useState, useEffect } from "react";
import { UserPlus, Clock, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GuildJoinPolicy, GuildApplicationStatus } from "@/types/enums";

interface GuildJoinButtonProps {
  guildId: string;
  joinPolicy: GuildJoinPolicy;
  applicationQuestions: string[];
  currentUserId: string;
  onJoined?: () => void;
}

export function GuildJoinButton({
  guildId,
  joinPolicy,
  applicationQuestions,
  currentUserId,
  onJoined,
}: GuildJoinButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pendingApp, setPendingApp] = useState(false);
  const [checkingApp, setCheckingApp] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);

  // Check for existing pending application
  useEffect(() => {
    if (joinPolicy !== GuildJoinPolicy.APPROVAL_REQUIRED) {
      setCheckingApp(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("guild_applications")
        .select("id, status")
        .eq("guild_id", guildId)
        .eq("applicant_user_id", currentUserId)
        .eq("status", "PENDING")
        .maybeSingle();
      setPendingApp(!!data);
      setCheckingApp(false);
    })();
  }, [guildId, currentUserId, joinPolicy]);

  const handleOpenJoin = async () => {
    setLoading(true);
    const { error } = await supabase.from("guild_members").insert({
      guild_id: guildId,
      user_id: currentUserId,
      role: "MEMBER",
    });
    setLoading(false);
    if (error) {
      toast({ title: "Failed to join", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Joined guild!" });
      onJoined?.();
    }
  };

  const handleSubmitApplication = async () => {
    setLoading(true);
    const answerPayload = applicationQuestions.map((q, i) => ({
      question: q,
      answer: answers[i] || "",
    }));
    const { error } = await supabase.from("guild_applications").insert({
      guild_id: guildId,
      applicant_user_id: currentUserId,
      answers: answerPayload,
      status: "PENDING",
    });
    setLoading(false);
    if (error) {
      if (error.message?.includes("unique") || error.code === "23505") {
        toast({ title: "You already have a pending application", variant: "destructive" });
      } else {
        toast({ title: "Failed to submit", description: error.message, variant: "destructive" });
      }
    } else {
      setPendingApp(true);
      setApplyOpen(false);
      toast({ title: "Application submitted!", description: "Guild admins will review it." });
    }
  };

  if (checkingApp) return null;

  // INVITE_ONLY
  if (joinPolicy === GuildJoinPolicy.INVITE_ONLY) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Lock className="h-4 w-4" />
        <span>Invite-only guild</span>
      </div>
    );
  }

  // APPROVAL_REQUIRED with pending application
  if (joinPolicy === GuildJoinPolicy.APPROVAL_REQUIRED && pendingApp) {
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" /> Application pending
      </Badge>
    );
  }

  // APPROVAL_REQUIRED — show apply button
  if (joinPolicy === GuildJoinPolicy.APPROVAL_REQUIRED) {
    return (
      <>
        <Button size="sm" variant="outline" onClick={() => {
          setAnswers(applicationQuestions.map(() => ""));
          setApplyOpen(true);
        }}>
          <UserPlus className="h-4 w-4 mr-1" /> Apply to join
        </Button>

        <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Apply to join</DialogTitle>
              <DialogDescription>Answer the questions below. Guild admins will review your application.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {applicationQuestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No specific questions — just submit to apply.</p>
              ) : (
                applicationQuestions.map((q, i) => (
                  <div key={i}>
                    <label className="text-sm font-medium mb-1 block">{q}</label>
                    <Textarea
                      value={answers[i] || ""}
                      onChange={(e) => {
                        const next = [...answers];
                        next[i] = e.target.value;
                        setAnswers(next);
                      }}
                      placeholder="Your answer…"
                      maxLength={1000}
                      className="resize-none"
                    />
                  </div>
                ))
              )}
              <Button onClick={handleSubmitApplication} disabled={loading} className="w-full">
                {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Submit application
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // OPEN — immediate join
  return (
    <Button size="sm" variant="outline" onClick={handleOpenJoin} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
      Join Guild
    </Button>
  );
}
