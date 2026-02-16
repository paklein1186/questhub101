import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { History, Undo2, Trash2, MessageSquare, FileText, Swords, Heart, UserPlus, Loader2, CheckSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ACTION_META: Record<string, { label: string; icon: typeof History; color: string; revertable?: boolean }> = {
  post_created: { label: "Created a post", icon: FileText, color: "text-blue-500", revertable: true },
  comment_created: { label: "Commented", icon: MessageSquare, color: "text-green-500", revertable: true },
  post_upvoted: { label: "Upvoted a post", icon: Heart, color: "text-pink-500", revertable: true },
  quest_joined: { label: "Joined a quest", icon: Swords, color: "text-orange-500", revertable: true },
  quest_highlighted: { label: "Highlighted a quest", icon: Swords, color: "text-yellow-500", revertable: true },
  guild_joined: { label: "Joined a guild", icon: UserPlus, color: "text-purple-500" },
  company_joined: { label: "Joined a company", icon: UserPlus, color: "text-indigo-500" },
  pod_joined: { label: "Joined a pod", icon: UserPlus, color: "text-teal-500" },
  followed: { label: "Followed", icon: Heart, color: "text-pink-400", revertable: true },
  course_enrolled: { label: "Enrolled in a course", icon: FileText, color: "text-cyan-500" },
  event_registered: { label: "Registered for an event", icon: FileText, color: "text-emerald-500" },
  quest_deleted: { label: "Deleted a quest", icon: Trash2, color: "text-red-500" },
  subtask_deleted: { label: "Deleted a subtask", icon: Trash2, color: "text-red-400" },
  subtask_completed: { label: "Completed a subtask", icon: CheckSquare, color: "text-green-600" },
};

export function ActivityHistoryTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reverting, setReverting] = useState<string | null>(null);

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["my-activity-history", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .eq("actor_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const revertAction = async (action: any) => {
    if (!user?.id) return;
    setReverting(action.id);
    try {
      switch (action.action_type) {
        case "post_created": {
          await supabase.from("feed_posts").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", action.target_id).eq("author_user_id", user.id);
          toast({ title: "Post deleted" });
          break;
        }
        case "comment_created": {
          const commentId = action.metadata?.comment_id || action.target_id;
          await supabase.from("comments").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", commentId).eq("author_id", user.id);
          toast({ title: "Comment deleted" });
          break;
        }
        case "post_upvoted": {
          await supabase.from("post_upvotes").delete().eq("post_id", action.target_id).eq("user_id", user.id);
          toast({ title: "Upvote removed" });
          break;
        }
        case "quest_joined": {
          await supabase.from("quest_participants").delete().eq("quest_id", action.target_id).eq("user_id", user.id);
          toast({ title: "Left quest" });
          break;
        }
        case "quest_highlighted": {
          await supabase.from("highlighted_quests").delete().eq("quest_id", action.target_id).eq("user_id", user.id);
          toast({ title: "Highlight removed" });
          break;
        }
        case "followed": {
          await supabase.from("follows").delete().eq("target_id", action.target_id).eq("follower_id", user.id);
          toast({ title: "Unfollowed" });
          break;
        }
        default:
          toast({ title: "Cannot revert this action", variant: "destructive" });
      }
      // Remove the activity_log entry itself
      await supabase.from("activity_log").delete().eq("id", action.id);
      qc.invalidateQueries({ queryKey: ["my-activity-history"] });
    } catch {
      toast({ title: "Revert failed", variant: "destructive" });
    } finally {
      setReverting(null);
    }
  };

  const meta = (type: string) => ACTION_META[type] || { label: type.replace(/_/g, " "), icon: History, color: "text-muted-foreground" };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> Activity History
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your recent content actions. You can undo some of them.
        </p>
      </div>

      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No activity recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {actions.map((a: any) => {
            const m = meta(a.action_type);
            const Icon = m.icon;
            const canRevert = !!(ACTION_META[a.action_type]?.revertable);
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <Icon className={`h-4 w-4 shrink-0 ${m.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.label}
                    {a.target_name && (
                      <span className="text-muted-foreground font-normal"> — {a.target_name}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
                {canRevert && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="shrink-0 text-destructive hover:text-destructive" disabled={reverting === a.id}>
                        {reverting === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                        <span className="ml-1 text-xs">Undo</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Undo this action?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will revert "{m.label}" on "{a.target_name || "this item"}". This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => revertAction(a)}>Confirm Undo</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {!canRevert && (
                  <Badge variant="outline" className="text-xs shrink-0">Permanent</Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
