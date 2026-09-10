import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";
import { format } from "date-fns";

interface Props {
  guildId: string;
}

const TYPE_LABELS: Record<string, string> = {
  MEMBERSHIP_ENTRY: "Entry fee",
  MEMBERSHIP_MONTHLY: "Monthly fee",
  MEMBERSHIP_RENEWAL: "Monthly renewal",
};

export function GuildMembershipIncome({ guildId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["guild-income", guildId],
    queryFn: async () => {
      const [{ data: wallet }, { data: txs }] = await Promise.all([
        supabase.from("guild_wallets" as any).select("coins_balance, credits_balance").eq("guild_id", guildId).maybeSingle(),
        supabase
          .from("guild_credit_transactions" as any)
          .select("id, amount, currency, type, source, created_at, user_id")
          .eq("guild_id", guildId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const list = (txs as any[]) ?? [];
      const userIds = [...new Set(list.map((t) => t.user_id).filter(Boolean))];
      let names = new Map<string, string>();
      if (userIds.length) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", userIds);
        names = new Map((profiles ?? []).map((p: any) => [p.user_id, p.name]));
      }
      return {
        coins: Number((wallet as any)?.coins_balance ?? 0),
        credits: Number((wallet as any)?.credits_balance ?? 0),
        list: list.map((t) => ({ ...t, name: names.get(t.user_id) ?? "A member" })),
      };
    },
  });

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wallet className="h-4 w-4" /> Membership income
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-2xl font-bold">🟩 {data?.coins ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Coins received</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-2xl font-bold">🔷 {data?.credits ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Credits received</p>
          </div>
        </div>

        {!data?.list?.length ? (
          <p className="text-xs text-muted-foreground">No membership payment received yet.</p>
        ) : (
          <div className="space-y-2">
            {data.list.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-sm border-b border-border/50 pb-1.5 last:border-0">
                <div className="min-w-0">
                  <p className="truncate">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t.created_at ? format(new Date(t.created_at), "d MMM yyyy") : ""}
                    {" · "}
                    <Badge variant="secondary" className="text-[9px]">{TYPE_LABELS[t.type] ?? t.type}</Badge>
                  </p>
                </div>
                <span className="font-medium whitespace-nowrap">
                  +{Number(t.amount)} {t.currency === "coins" ? "🟩" : "🔷"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
