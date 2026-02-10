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

type EntityType = "guild" | "pod" | "company";

interface EntityJoinButtonProps {
  entityType: EntityType;
  entityId: string;
  joinPolicy: string; // OPEN | APPROVAL_REQUIRED | INVITE_ONLY
  applicationQuestions: string[];
  currentUserId: string;
  onJoined?: () => void;
}

const TABLE_MAP = {
  guild: { applications: "guild_applications", members: "guild_members", idCol: "guild_id", memberRole: "MEMBER" },
  pod: { applications: "pod_applications", members: "pod_members", idCol: "pod_id", memberRole: "MEMBER" },
  company: { applications: "company_applications", members: "company_members", idCol: "company_id", memberRole: "MEMBER" },
} as const;

const LABELS = {
  guild: "guild",
  pod: "pod",
  company: "company network",
};

export function EntityJoinButton({
  entityType,
  entityId,
  joinPolicy,
  applicationQuestions,
  currentUserId,
  onJoined,
}: EntityJoinButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pendingApp, setPendingApp] = useState(false);
  const [checkingApp, setCheckingApp] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);

  const cfg = TABLE_MAP[entityType];
  const label = LABELS[entityType];

  useEffect(() => {
    if (joinPolicy !== "APPROVAL_REQUIRED") {
      setCheckingApp(false);
      return;
    }
    (async () => {
      const { data } = await (supabase
        .from(cfg.applications as any)
        .select("id, status")
        .eq(cfg.idCol, entityId)
        .eq("applicant_user_id", currentUserId)
        .eq("status", "PENDING")
        .maybeSingle() as any);
      setPendingApp(!!data);
      setCheckingApp(false);
    })();
  }, [entityId, currentUserId, joinPolicy]);

  const handleOpenJoin = async () => {
    setLoading(true);
    const insertData: any = { [cfg.idCol]: entityId, user_id: currentUserId };
    if (entityType !== "company") insertData.role = cfg.memberRole;
    const { error } = await (supabase.from(cfg.members as any).insert(insertData) as any);
    setLoading(false);
    if (error) {
      toast({ title: "Failed to join", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Joined ${label}!` });
      onJoined?.();
    }
  };

  const handleSubmitApplication = async () => {
    setLoading(true);
    const answerPayload = applicationQuestions.map((q, i) => ({
      question: q,
      answer: answers[i] || "",
    }));
    const { error } = await supabase.from(cfg.applications).insert({
      [cfg.idCol]: entityId,
      applicant_user_id: currentUserId,
      answers: answerPayload,
      status: "PENDING",
    } as any);
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
      toast({ title: "Application submitted!", description: "Admins will review it." });
    }
  };

  if (checkingApp) return null;

  if (joinPolicy === "INVITE_ONLY") {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Lock className="h-4 w-4" />
        <span>Invite-only {label}</span>
      </div>
    );
  }

  if (joinPolicy === "APPROVAL_REQUIRED" && pendingApp) {
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" /> Application pending
      </Badge>
    );
  }

  if (joinPolicy === "APPROVAL_REQUIRED") {
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
              <DialogDescription>Answer the questions below. Admins will review your application.</DialogDescription>
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

  // OPEN
  return (
    <Button size="sm" variant="outline" onClick={handleOpenJoin} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
      Join {label}
    </Button>
  );
}
