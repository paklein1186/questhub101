import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Coins, Shield, TrendingUp, Settings } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  guildId: string;
  guildName: string;
  isAdmin: boolean;
}

export function GuildMonetizationTab({ guildId, guildName, isAdmin }: Props) {
  const qc = useQueryClient();

  // Fetch guild settings
  const { data: guild, isLoading } = useQuery({
    queryKey: ["guild-monetization", guildId],
    queryFn: async () => {
      const { data } = await supabase
        .from("guilds")
        .select("allow_agent_crawling, allow_agent_subscription, value_factor")
        .eq("id", guildId)
        .single();
      return data;
    },
  });

  // Fetch agent usage for this guild (creator_id = guildId)
  const { data: revenueData } = useQuery({
    queryKey: ["guild-agent-revenue", guildId],
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: usage } = await supabase
        .from("agent_usage_records" as any)
        .select("agent_id, final_price, created_at")
        .eq("creator_type", "guild")
        .eq("creator_id", guildId)
        .gte("created_at", monthStart.toISOString());

      // Aggregate by agent
      const agentMap = new Map<string, { credits: number; count: number }>();
      let total = 0;
      (usage || []).forEach((r: any) => {
        const price = Number(r.final_price);
        total += price;
        const existing = agentMap.get(r.agent_id) || { credits: 0, count: 0 };
        existing.credits += price;
        existing.count += 1;
        agentMap.set(r.agent_id, existing);
      });

      // Get agent names
      const agentIds = Array.from(agentMap.keys());
      let agentNames = new Map<string, string>();
      if (agentIds.length > 0) {
        const { data: agents } = await supabase.from("agents").select("id, name").in("id", agentIds);
        agentNames = new Map((agents || []).map(a => [a.id, a.name]));
      }

      const topAgents = Array.from(agentMap.entries())
        .map(([id, data]) => ({ id, name: agentNames.get(id) || "Unknown", ...data }))
        .sort((a, b) => b.credits - a.credits);

      return { total, topAgents };
    },
  });

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from("guilds").update(updates).eq("id", guildId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings updated");
      qc.invalidateQueries({ queryKey: ["guild-monetization", guildId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Coins className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-primary">{revenueData?.total?.toFixed(0) || 0}</p>
            <p className="text-[10px] text-muted-foreground">Credits earned (last 30 days)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Bot className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{revenueData?.topAgents?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Active Agents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{guild?.value_factor || 1.0}×</p>
            <p className="text-[10px] text-muted-foreground">Value Factor</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Consuming Agents */}
      {revenueData?.topAgents && revenueData.topAgents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Top Consuming Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {revenueData.topAgents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{agent.name}</span>
                    <Badge variant="secondary" className="text-[9px]">{agent.count} actions</Badge>
                  </div>
                  <span className="font-medium">{agent.credits.toFixed(0)} credits</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings (admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" /> Agent Access Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="crawl-toggle" className="text-sm cursor-pointer">Allow Agents to Crawl Guild Pages</Label>
              <Switch
                id="crawl-toggle"
                checked={guild?.allow_agent_crawling ?? false}
                onCheckedChange={(v) => updateSettings.mutate({ allow_agent_crawling: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sub-toggle" className="text-sm cursor-pointer">Allow Agents to Access Private Materials</Label>
              <Switch
                id="sub-toggle"
                checked={guild?.allow_agent_subscription ?? false}
                onCheckedChange={(v) => updateSettings.mutate({ allow_agent_subscription: v })}
              />
            </div>

            <div>
              <Label className="text-sm">Value Factor</Label>
              <p className="text-[10px] text-muted-foreground mb-1">Higher = agent actions on your content cost more → you earn more</p>
              <Select
                value={String(guild?.value_factor || 1.0)}
                onValueChange={(v) => updateSettings.mutate({ value_factor: Number(v) })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5× (Low)</SelectItem>
                  <SelectItem value="1">1.0× (Default)</SelectItem>
                  <SelectItem value="2">2.0× (High)</SelectItem>
                  <SelectItem value="3">3.0× (Premium)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-muted-foreground border-t border-border pt-3 space-y-1">
              <p>• Max 100 pages/day/agent</p>
              <p>• Restricted content trust threshold: ≥60</p>
              <p>• Revenue split: 70% guild / 20% platform / 10% commons</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
