import { useState, useEffect } from "react";
import { Heart, Users, Globe, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function GiveBackSettingsSection() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { toast } = useToast();
  const qc = useQueryClient();

  const [targetType, setTargetType] = useState<"NONE" | "GUILD" | "PLATFORM">("NONE");
  const [guildId, setGuildId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Load current settings
  const { data: profile } = useQuery({
    queryKey: ["giveback-settings", userId],
    enabled: !!userId,
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
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("guild_members")
        .select("guild_id, guilds(id, name, logo_url)")
        .eq("user_id", userId!);
      return (data ?? []).map((m: any) => m.guilds).filter(Boolean);
    },
  });

  useEffect(() => {
    if (profile) {
      setTargetType((profile as any).default_give_back_target_type || "NONE");
      setGuildId((profile as any).default_give_back_guild_id || "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!userId) return;
    if (targetType === "GUILD" && !guildId) {
      toast({ title: "Please select a guild", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      default_give_back_target_type: targetType,
      default_give_back_guild_id: targetType === "GUILD" ? guildId : null,
    } as any).eq("user_id", userId);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Give-back preferences saved!" });
      qc.invalidateQueries({ queryKey: ["giveback-settings"] });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-1">
          <Heart className="h-5 w-5 text-primary" /> Give-back preferences
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose who you "give back" to when you receive revenue from services. You can still change this per transaction.
        </p>
      </div>

      <RadioGroup
        value={targetType}
        onValueChange={(v) => {
          setTargetType(v as any);
          if (v !== "GUILD") setGuildId("");
        }}
        className="space-y-2"
      >
        <div className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/30 transition-colors">
          <RadioGroupItem value="NONE" id="gb-none" />
          <Label htmlFor="gb-none" className="cursor-pointer flex-1">
            <p className="text-sm font-medium">None</p>
            <p className="text-xs text-muted-foreground">No default give-back</p>
          </Label>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/30 transition-colors">
          <RadioGroupItem value="GUILD" id="gb-guild" />
          <Label htmlFor="gb-guild" className="cursor-pointer flex-1">
            <p className="text-sm font-medium flex items-center gap-1"><Users className="h-3.5 w-3.5" /> One of my guilds</p>
            <p className="text-xs text-muted-foreground">Give back to a guild you belong to</p>
          </Label>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/30 transition-colors">
          <RadioGroupItem value="PLATFORM" id="gb-platform" />
          <Label htmlFor="gb-platform" className="cursor-pointer flex-1">
            <p className="text-sm font-medium flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> The platform</p>
            <p className="text-xs text-muted-foreground">Contribute to the ecosystem treasury</p>
          </Label>
        </div>
      </RadioGroup>

      {targetType === "GUILD" && (
        <div className="pl-8">
          <Label className="text-sm mb-1 block">Select guild</Label>
          <Select value={guildId} onValueChange={setGuildId}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Choose a guild…" />
            </SelectTrigger>
            <SelectContent>
              {myGuilds.map((g: any) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {myGuilds.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">You're not a member of any guild yet.</p>
          )}
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} size="sm">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
        Save preferences
      </Button>
    </div>
  );
}
