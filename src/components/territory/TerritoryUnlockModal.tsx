import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sprout, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onClose: () => void;
  territory: { id: string; name: string; level: string; slug: string | null };
  currentUserXpLevel: number;
  currentUserId: string;
}

export function TerritoryUnlockModal({ open, onClose, territory, currentUserXpLevel, currentUserId }: Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const handleUnlock = async () => {
    setLoading(true);
    try {
      // Set user's territory_id to this territory
      const { error } = await supabase
        .from("profiles")
        .update({ territory_id: territory.id } as any)
        .eq("user_id", currentUserId);
      if (error) throw error;

      toast({ title: `🌱 You've pioneered ${territory.name}!`, description: "You're now the first member of this territory." });
      qc.invalidateQueries({ queryKey: ["territory-member-count"] });
      qc.invalidateQueries({ queryKey: ["territory-portal-stewards"] });
      onClose();
    } catch (err: any) {
      toast({ title: "Failed to unlock", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-amber-500" /> Pioneer {territory.name}
          </DialogTitle>
          <DialogDescription>
            Be the first to plant roots in this territory. You'll become its first member and can help set up its portal.
          </DialogDescription>
        </DialogHeader>
        <Button onClick={handleUnlock} disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sprout className="h-4 w-4 mr-1" />}
          Unlock Territory
        </Button>
      </DialogContent>
    </Dialog>
  );
}
