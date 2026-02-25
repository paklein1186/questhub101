import { Heart, Users, Globe, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

/** User's personal give-back history for wallet/dashboard */
export function GiveBackHistory() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const { data: donations = [], isLoading } = useQuery({
    queryKey: ["giveback-history", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("gratitude_donations")
        .select("*, guilds:to_guild_id(name)")
        .eq("from_user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const totalCredits = donations.reduce((s: number, d: any) => s + (d.amount_credits ?? 0), 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" /> My Give-back Contributions
        </h3>
        <Badge variant="secondary" className="text-xs">{totalCredits} credits total • {donations.length} donations</Badge>
      </div>

      {donations.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No give-back contributions yet.</p>
      ) : (
        <div className="space-y-1">
          {donations.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                {d.to_target_type === "GUILD" ? (
                  <Users className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Globe className="h-4 w-4 text-primary shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {d.to_target_type === "GUILD" ? d.guilds?.name || "Guild" : "Platform"}
                  </p>
                  {d.metadata?.service_name && (
                    <p className="text-xs text-muted-foreground">From: {d.metadata.service_name}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">+{d.amount_credits}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(d.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Guild received give-backs (for guild admins) */
export function GuildGiveBackReceived({ guildId }: { guildId: string }) {
  const { data: donations = [], isLoading } = useQuery({
    queryKey: ["guild-giveback-received", guildId],
    enabled: !!guildId,
    queryFn: async () => {
      const { data } = await supabase
        .from("gratitude_donations")
        .select("*, profiles:from_user_id(name, avatar_url)")
        .eq("to_target_type", "GUILD")
        .eq("to_guild_id", guildId)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const totalCredits = donations.reduce((s: number, d: any) => s + (d.amount_credits ?? 0), 0);

  if (isLoading) {
    return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-base font-semibold flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" /> Give-back Received
        </h4>
        <Badge variant="secondary" className="text-xs">{totalCredits} credits</Badge>
      </div>
      {donations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No give-back contributions received yet.</p>
      ) : (
        <div className="space-y-1">
          {donations.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div>
                <p className="text-sm font-medium">{(d.profiles as any)?.name || "Member"}</p>
                {d.metadata?.service_name && (
                  <p className="text-xs text-muted-foreground">{d.metadata.service_name}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">+{d.amount_credits}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Admin platform give-back view */
export function PlatformGiveBackAdmin() {
  const { data: donations = [], isLoading } = useQuery({
    queryKey: ["platform-giveback-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("gratitude_donations")
        .select("*, profiles:from_user_id(name, avatar_url)")
        .eq("to_target_type", "PLATFORM")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const totalCredits = donations.reduce((s: number, d: any) => s + (d.amount_credits ?? 0), 0);

  if (isLoading) {
    return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-base font-semibold flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" /> Platform Give-back
        </h4>
        <Badge variant="secondary" className="text-xs">{totalCredits} credits total</Badge>
      </div>
      {donations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No give-back contributions to the platform yet.</p>
      ) : (
        <div className="space-y-1">
          {donations.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div>
                <p className="text-sm font-medium">{(d.profiles as any)?.name || "User"}</p>
                {d.metadata?.service_name && (
                  <p className="text-xs text-muted-foreground">{d.metadata.service_name}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">+{d.amount_credits}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
