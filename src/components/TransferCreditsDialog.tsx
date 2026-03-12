import { useState } from "react";
import { Send, Loader2, Users, Shield } from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserSearchInput } from "@/components/UserSearchInput";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If set, we're transferring FROM a guild (guild→user) */
  sourceGuildId?: string;
  sourceGuildName?: string;
  currentBalance: number;
}

export function TransferCreditsDialog({
  open, onOpenChange, sourceGuildId, sourceGuildName, currentBalance,
}: Props) {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const [targetType, setTargetType] = useState<"user" | "guild">("user");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState("");
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  // Fetch guilds the user is a member of (for user→guild transfers)
  const { data: myGuilds = [] } = useQuery({
    queryKey: ["my-guilds-for-transfer", userId],
    enabled: !!userId && !sourceGuildId && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("guild_members")
        .select("guild_id, guilds(id, name)")
        .eq("user_id", userId!);
      return (data ?? []).map((m: any) => ({
        id: m.guild_id,
        name: m.guilds?.name || "Guild",
      }));
    },
  });

  const reset = () => {
    setSelectedUserId(null);
    setSelectedUserName("");
    setSelectedGuildId(null);
    setAmount("");
    setNote("");
    setTargetType("user");
  };

  const handleTransfer = async () => {
    const amt = parseInt(amount);
    if (!amt || amt < 1) {
      toast({ title: "Invalid amount", description: "Enter at least 1 Platform Credit.", variant: "destructive" });
      return;
    }
    if (amt > currentBalance) {
      toast({ title: "Insufficient Platform Credits", description: `You only have ${currentBalance} Platform Credits.`, variant: "destructive" });
      return;
    }

    const targetId = targetType === "user" ? selectedUserId : selectedGuildId;
    if (!targetId) {
      toast({ title: "No recipient selected", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.rpc("transfer_credits" as any, {
        _target_type: targetType,
        _target_id: targetId,
        _amount: amt,
        _note: note || null,
        _source_guild_id: sourceGuildId || null,
      });
      if (error) throw error;

      toast({ title: "Transfer complete", description: `${amt} Platform Credits sent successfully.` });
      queryClient.invalidateQueries({ queryKey: ["credit-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["unit-credit-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["credits-balance"] });
      queryClient.invalidateQueries({ queryKey: ["plan-limits"] });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Transfer failed", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // If source is a guild, only user targets allowed
  const isGuildSource = !!sourceGuildId;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            🔷 Transfer Platform Credits
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Source info */}
          <div className="rounded-lg bg-muted/50 border border-border p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              From: <strong>{isGuildSource ? sourceGuildName : "Your wallet"}</strong>
            </span>
            <span className="text-sm font-bold flex items-center gap-1">
              <CurrencyIcon currency="credits" className="h-4 w-4" /> {currentBalance}
            </span>
          </div>

          {/* Target type tabs (only if not guild source) */}
          {!isGuildSource ? (
            <Tabs value={targetType} onValueChange={(v) => setTargetType(v as "user" | "guild")}>
              <TabsList className="w-full">
                <TabsTrigger value="user" className="flex-1 gap-1">
                  <Users className="h-3.5 w-3.5" /> User
                </TabsTrigger>
                <TabsTrigger value="guild" className="flex-1 gap-1">
                  <Shield className="h-3.5 w-3.5" /> Guild
                </TabsTrigger>
              </TabsList>

              <TabsContent value="user" className="mt-3">
                <Label className="text-xs text-muted-foreground mb-1 block">Recipient</Label>
                <UserSearchInput
                  placeholder="Search for a user…"
                  excludeUserIds={userId ? [userId] : []}
                  onSelect={(u) => {
                    setSelectedUserId(u.user_id);
                    setSelectedUserName(u.display_name || "User");
                  }}
                />
                {selectedUserId && (
                  <p className="text-xs text-muted-foreground mt-1">Sending to: <strong>{selectedUserName}</strong></p>
                )}
              </TabsContent>

              <TabsContent value="guild" className="mt-3">
                <Label className="text-xs text-muted-foreground mb-1 block">Select guild</Label>
                <Select value={selectedGuildId || ""} onValueChange={setSelectedGuildId}>
                  <SelectTrigger><SelectValue placeholder="Choose a guild…" /></SelectTrigger>
                  <SelectContent>
                    {myGuilds.map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>
            </Tabs>
          ) : (
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Recipient (user)</Label>
              <UserSearchInput
                placeholder="Search for a user…"
                onSelect={(u) => {
                  setSelectedUserId(u.user_id);
                  setSelectedUserName(u.display_name || "User");
                }}
              />
              {selectedUserId && (
                <p className="text-xs text-muted-foreground mt-1">Sending to: <strong>{selectedUserName}</strong></p>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Amount</Label>
            <Input
              type="number"
              min={1}
              max={currentBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter Platform Credit amount"
            />
          </div>

          {/* Note */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a message…"
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleTransfer} disabled={sending || !amount}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Send {amount ? `${amount} Platform Credits` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
