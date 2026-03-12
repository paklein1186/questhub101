import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft, Search, User, Users } from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { format } from "date-fns";

type TxFilter = "ALL" | "GIFT_SENT" | "GIFT_RECEIVED" | "PURCHASE" | "DEMURRAGE_FADE" | "INITIAL_GRANT" | "QUEST_REWARD" | "ADMIN_GRANT";

export function CreditTransfersMonitor() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TxFilter>("ALL");

  // Top balances
  const { data: topBalances = [], isLoading: loadingBalances } = useQuery({
    queryKey: ["admin-credit-balances"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, email, credits_balance, avatar_url")
        .order("credits_balance", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  // Recent transactions
  const { data: recentTx = [], isLoading: loadingTx } = useQuery({
    queryKey: ["admin-credit-transactions", typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("credit_transactions")
        .select("id, user_id, type, amount, source, related_entity_type, related_entity_id, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (typeFilter !== "ALL") {
        query = query.eq("type", typeFilter);
      }

      const { data } = await query;
      return data ?? [];
    },
    staleTime: 15_000,
  });

  // Profile lookup map for transaction display
  const userIds = [...new Set(recentTx.map(tx => tx.user_id))];
  const { data: profileMap = {} } = useQuery({
    queryKey: ["admin-profiles-for-tx", userIds.slice(0, 50).join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds.slice(0, 50));
      const map: Record<string, { name: string; email: string }> = {};
      (data ?? []).forEach(p => { map[p.user_id] = { name: p.name || "", email: p.email || "" }; });
      return map;
    },
    enabled: userIds.length > 0,
  });

  // Aggregate stats
  const totalCreditsInCirculation = topBalances.reduce((s, p) => s + (p.credits_balance || 0), 0);
  const filteredBalances = topBalances.filter(p =>
    !search || (p.name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredTx = recentTx.filter(tx => {
    if (!search) return true;
    const profile = profileMap[tx.user_id];
    return profile?.name?.toLowerCase().includes(search.toLowerCase()) ||
      profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
      tx.source?.toLowerCase().includes(search.toLowerCase());
  });

  const typeBadgeColor = (type: string) => {
    switch (type) {
      case "GIFT_SENT": return "destructive";
      case "GIFT_RECEIVED": return "default";
      case "PURCHASE": case "TOP_UP_PURCHASE": return "secondary";
      case "DEMURRAGE_FADE": return "outline";
      case "INITIAL_GRANT": case "ADMIN_GRANT": return "default";
      case "QUEST_REWARD": case "QUEST_REWARD_EARNED": return "default";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + Search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          Credit Transfers & Balances
        </h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search user…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 w-56"
            />
          </div>
          <Select value={typeFilter} onValueChange={v => setTypeFilter(v as TxFilter)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="GIFT_SENT">Transfers sent</SelectItem>
              <SelectItem value="GIFT_RECEIVED">Transfers received</SelectItem>
              <SelectItem value="PURCHASE">Purchases</SelectItem>
              <SelectItem value="DEMURRAGE_FADE">Demurrage</SelectItem>
              <SelectItem value="INITIAL_GRANT">Welcome bonus</SelectItem>
              <SelectItem value="QUEST_REWARD">Quest rewards</SelectItem>
              <SelectItem value="ADMIN_GRANT">Admin grants</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border-border/50 bg-muted/30">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <Coins className="h-5 w-5 text-primary" />
            <p className="text-xl font-bold">{loadingBalances ? "…" : totalCreditsInCirculation.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Total in circulation (top 50)</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-muted/30">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <Users className="h-5 w-5 text-blue-500" />
            <p className="text-xl font-bold">{loadingBalances ? "…" : topBalances.length}</p>
            <p className="text-[10px] text-muted-foreground">Users with balance</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-muted/30">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <ArrowRightLeft className="h-5 w-5 text-amber-500" />
            <p className="text-xl font-bold">{loadingTx ? "…" : recentTx.length}</p>
            <p className="text-[10px] text-muted-foreground">Recent transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* User Balances */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" /> User Balances
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[480px] overflow-y-auto">
              {loadingBalances ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
                </div>
              ) : filteredBalances.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">No users found</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 sticky top-0">
                      <th className="text-left p-3 font-medium">User</th>
                      <th className="text-right p-3 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBalances.map(p => (
                      <tr key={p.user_id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3">
                          <p className="font-medium truncate max-w-[180px]">{p.name || "—"}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{p.email}</p>
                        </td>
                        <td className="p-3 text-right font-mono font-semibold">
                          {(p.credits_balance || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transaction Log */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" /> Transaction Log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[480px] overflow-y-auto">
              {loadingTx ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
                </div>
              ) : filteredTx.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">No transactions found</p>
              ) : (
                <div className="divide-y">
                  {filteredTx.map(tx => {
                    const profile = profileMap[tx.user_id];
                    return (
                      <div key={tx.id} className="p-3 hover:bg-muted/30">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-xs truncate">{profile?.name || tx.user_id.slice(0, 8)}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{tx.source || tx.type.replace(/_/g, " ").toLowerCase()}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`font-mono text-sm font-semibold ${tx.amount > 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {tx.amount > 0 ? "+" : ""}{tx.amount}
                            </span>
                            <Badge variant={typeBadgeColor(tx.type) as any} className="text-[9px] px-1.5">
                              {tx.type.replace(/_/g, " ")}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-1">
                          {format(new Date(tx.created_at), "MMM d, HH:mm")}
                          {tx.related_entity_type && (
                            <span> · {tx.related_entity_type}</span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
