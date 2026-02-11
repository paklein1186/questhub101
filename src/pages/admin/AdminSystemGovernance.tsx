import { useState } from "react";
import { Star, Crown, Users, Download, Settings } from "lucide-react";
import { GovernanceTab } from "./tabs/ContentTabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function CooperativeSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ["admin-coop-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cooperative_settings").select("*").order("key");
      return data ?? [];
    },
  });

  const getSetting = (key: string): any => {
    const found = settings.find((s: any) => s.key === key);
    return found?.value as any;
  };

  const updateSetting = async (key: string, value: any) => {
    await supabase.from("cooperative_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
    qc.invalidateQueries({ queryKey: ["admin-coop-settings"] });
    toast({ title: "Setting updated" });
  };

  const sharePrice = getSetting("share_price")?.amount ?? 10;
  const classAEnabled = getSetting("class_a_enabled")?.enabled !== false;
  const classBEnabled = getSetting("class_b_enabled")?.enabled !== false;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Share Price (€)</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              defaultValue={sharePrice}
              onBlur={(e) => updateSetting("share_price", { amount: Number(e.target.value), currency: "EUR" })}
              className="w-24"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Class A Shares</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Switch checked={classAEnabled} onCheckedChange={(v) => updateSetting("class_a_enabled", { enabled: v })} />
            <span className="text-sm text-muted-foreground">{classAEnabled ? "Enabled" : "Disabled"}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Class B Shares</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Switch checked={classBEnabled} onCheckedChange={(v) => updateSetting("class_b_enabled", { enabled: v })} />
            <span className="text-sm text-muted-foreground">{classBEnabled ? "Enabled" : "Disabled"}</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Voting Weight Formulas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Class A:</strong> log(1 + shares)</p>
          <p><strong>Class B:</strong> log(1 + shares) × 0.2</p>
          <p className="text-xs text-muted-foreground">Formulas are applied automatically via database trigger.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ShareholdersList() {
  const { data: shareholders = [] } = useQuery({
    queryKey: ["admin-shareholders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, email, total_shares_a, total_shares_b, governance_weight, is_cooperative_member")
        .eq("is_cooperative_member", true)
        .order("governance_weight", { ascending: false });
      return data ?? [];
    },
  });

  const exportCSV = () => {
    const headers = ["Name", "Email", "Class A", "Class B", "Weight"];
    const rows = shareholders.map((s: any) => [s.name, s.email, s.total_shares_a, s.total_shares_b, Number(s.governance_weight).toFixed(4)]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "shareholders.csv"; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{shareholders.length} shareholder(s)</p>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Class A</TableHead>
              <TableHead className="text-right">Class B</TableHead>
              <TableHead className="text-right">Weight</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shareholders.map((s: any) => (
              <TableRow key={s.user_id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{s.email}</TableCell>
                <TableCell className="text-right">{s.total_shares_a}</TableCell>
                <TableCell className="text-right">{s.total_shares_b}</TableCell>
                <TableCell className="text-right font-mono">{Number(s.governance_weight).toFixed(4)}</TableCell>
              </TableRow>
            ))}
            {shareholders.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No shareholders yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function AdminSystemGovernance() {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Star className="h-6 w-6 text-primary" /> Governance & Featured Content
      </h2>

      <Tabs defaultValue="governance">
        <TabsList>
          <TabsTrigger value="governance"><Star className="h-4 w-4 mr-1" /> Featured Content</TabsTrigger>
          <TabsTrigger value="cooperative"><Crown className="h-4 w-4 mr-1" /> Cooperative Settings</TabsTrigger>
          <TabsTrigger value="shareholders"><Users className="h-4 w-4 mr-1" /> Shareholders</TabsTrigger>
        </TabsList>

        <TabsContent value="governance" className="mt-4">
          <GovernanceTab />
        </TabsContent>

        <TabsContent value="cooperative" className="mt-4">
          <CooperativeSettings />
        </TabsContent>

        <TabsContent value="shareholders" className="mt-4">
          <ShareholdersList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
