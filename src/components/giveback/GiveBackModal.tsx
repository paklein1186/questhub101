import { useState, useEffect } from "react";
import { Heart, Users, Globe, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface GiveBackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Amount earned in this transaction (credits or equivalent) */
  earnedAmount?: number;
  serviceName?: string;
  bookingId?: string;
}

export function GiveBackModal({ open, onOpenChange, earnedAmount, serviceName, bookingId }: GiveBackModalProps) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { toast } = useToast();
  const qc = useQueryClient();

  const [targetType, setTargetType] = useState<"GUILD" | "PLATFORM">("PLATFORM");
  const [guildId, setGuildId] = useState<string>("");
  const [customAmount, setCustomAmount] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load user defaults
  const { data: defaults } = useQuery({
    queryKey: ["giveback-settings", userId],
    enabled: !!userId && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("default_give_back_target_type, default_give_back_guild_id")
        .eq("user_id", userId!)
        .single();
      return data;
    },
  });

  // Load user's guilds
  const { data: myGuilds = [] } = useQuery({
    queryKey: ["my-guilds-for-giveback", userId],
    enabled: !!userId && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("guild_members")
        .select("guild_id, guilds(id, name, logo_url)")
        .eq("user_id", userId!);
      return (data ?? []).map((m: any) => m.guilds).filter(Boolean);
    },
  });

  // Resolve guild name
  const selectedGuildName = myGuilds.find((g: any) => g.id === guildId)?.name;

  // Apply defaults when opening
  useEffect(() => {
    if (!open || !defaults) return;
    const d = defaults as any;
    if (d.default_give_back_target_type === "GUILD" && d.default_give_back_guild_id) {
      setTargetType("GUILD");
      setGuildId(d.default_give_back_guild_id);
    } else if (d.default_give_back_target_type === "PLATFORM") {
      setTargetType("PLATFORM");
      setGuildId("");
    } else {
      setTargetType("PLATFORM");
      setGuildId("");
    }
    setShowCustom(false);
    setCustomAmount("");
  }, [open, defaults]);

  const processGiveBack = async (amount: number) => {
    if (!userId || amount < 1) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("process_give_back", {
        _to_target_type: targetType,
        _to_guild_id: targetType === "GUILD" ? guildId : null,
        _amount_credits: amount,
        _booking_id: bookingId || null,
        _metadata: {
          reason: "GIVE_BACK_FROM_SERVICE_TRANSACTION",
          service_name: serviceName || null,
          auto_or_manual: "manual",
        },
      });
      if (error) throw error;
      toast({
        title: "Thank you for giving back! 💚",
        description: `${amount} credits sent to ${targetType === "GUILD" ? selectedGuildName || "guild" : "the platform"}.`,
      });
      qc.invalidateQueries({ queryKey: ["credit-transactions"] });
      qc.invalidateQueries({ queryKey: ["plan-limits"] });
      qc.invalidateQueries({ queryKey: ["giveback-history"] });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Give-back failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const presets = [5, 10, 20];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" /> Give back from this transaction?
          </DialogTitle>
          <DialogDescription>
            {earnedAmount != null && serviceName
              ? `You just earned ${earnedAmount} credits from "${serviceName}".`
              : "Would you like to give back some credits?"
            }
          </DialogDescription>
        </DialogHeader>

        {/* Recipient display & change */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Recipient:</span>
              <Badge variant="secondary" className="gap-1">
                {targetType === "GUILD" ? (
                  <><Users className="h-3 w-3" /> {selectedGuildName || "Guild"}</>
                ) : (
                  <><Globe className="h-3 w-3" /> Platform</>
                )}
              </Badge>
            </div>
          </div>

          {/* Change recipient */}
          <div className="flex items-center gap-2">
            <Select
              value={targetType === "GUILD" ? `guild:${guildId}` : "platform"}
              onValueChange={(v) => {
                if (v === "platform") {
                  setTargetType("PLATFORM");
                  setGuildId("");
                } else if (v.startsWith("guild:")) {
                  setTargetType("GUILD");
                  setGuildId(v.replace("guild:", ""));
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Change recipient…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="platform">
                  <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Platform</span>
                </SelectItem>
                {myGuilds.map((g: any) => (
                  <SelectItem key={g.id} value={`guild:${g.id}`}>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {g.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preset amounts */}
          <div className="flex gap-2 flex-wrap">
            {presets.map((amt) => (
              <Button
                key={amt}
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => processGiveBack(amt)}
                className="flex-1 min-w-[80px]"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Heart className="h-3 w-3 mr-1" />}
                Give {amt}
              </Button>
            ))}
          </div>

          {/* Custom amount */}
          {showCustom ? (
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                min={1}
                placeholder="Amount…"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="h-8 w-28"
              />
              <Button
                size="sm"
                disabled={loading || !customAmount || parseInt(customAmount) < 1}
                onClick={() => processGiveBack(parseInt(customAmount))}
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Give"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCustom(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button variant="link" size="sm" className="text-xs p-0 h-auto" onClick={() => setShowCustom(true)}>
              Custom amount…
            </Button>
          )}

          {/* Skip */}
          <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => onOpenChange(false)}>
            Skip this time
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
