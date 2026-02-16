import { useState } from "react";
import { Briefcase, Share2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { AuthPromptDialog } from "@/components/AuthPromptDialog";
import { AddJobDialog } from "@/components/AddJobDialog";
import { useToast } from "@/hooks/use-toast";
import JobsExplore from "./JobsExplore";

export default function JobsPage() {
  const currentUser = useCurrentUser();
  const isGuest = !currentUser?.id;
  const { toast } = useToast();

  const [authOpen, setAuthOpen] = useState(false);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);

  const handleShare = () => {
    const url = "https://www.changethegame.xyz/jobs";
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: "Share this page with anyone." });
  };

  const handlePostJob = () => {
    if (isGuest) {
      setAuthOpen(true);
    } else {
      setJobDialogOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Briefcase className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-display font-bold">Job Board</h1>
              <p className="text-sm text-muted-foreground">Explore open positions in the ecosystem</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1" /> Share
            </Button>
            <Button size="sm" onClick={handlePostJob}>
              <Plus className="h-4 w-4 mr-1" /> Post a job
            </Button>
          </div>
        </div>

        <JobsExplore bare />
      </div>

      <AuthPromptDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        actionLabel="post a job"
      />
      {!isGuest && <AddJobDialog open={jobDialogOpen} onOpenChange={setJobDialogOpen} />}
    </div>
  );
}
