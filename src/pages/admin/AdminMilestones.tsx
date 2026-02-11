import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Trophy, Pencil, Save, X, ToggleLeft, ToggleRight,
  Users, BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MilestoneRow {
  id: string;
  code: string;
  title: string;
  description: string | null;
  reward_type: string;
  reward_amount: number;
  persona_visibility: string;
  is_enabled: boolean;
  sort_order: number;
  icon: string;
}

interface MilestoneStats {
  milestone_id: string;
  completed_count: number;
}

export default function AdminMilestones() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: milestones = [] } = useQuery({
    queryKey: ["admin-milestones"],
    queryFn: async () => {
      const { data } = await supabase
        .from("milestones")
        .select("*")
        .order("sort_order");
      return (data ?? []) as MilestoneRow[];
    },
  });

  // Completion stats
  const { data: stats = [] } = useQuery({
    queryKey: ["admin-milestone-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_milestones")
        .select("milestone_id")
        .not("completed_at", "is", null);
      if (!data) return [];
      const counts = new Map<string, number>();
      data.forEach((r: any) => {
        counts.set(r.milestone_id, (counts.get(r.milestone_id) ?? 0) + 1);
      });
      return [...counts.entries()].map(([milestone_id, completed_count]) => ({
        milestone_id,
        completed_count,
      })) as MilestoneStats[];
    },
  });

  // Total users count
  const { data: totalUsers = 0 } = useQuery({
    queryKey: ["admin-total-users-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const getCompletionCount = (id: string) =>
    stats.find((s) => s.milestone_id === id)?.completed_count ?? 0;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editRewardAmount, setEditRewardAmount] = useState(0);
  const [editRewardType, setEditRewardType] = useState("NONE");

  const startEdit = (m: MilestoneRow) => {
    setEditingId(m.id);
    setEditTitle(m.title);
    setEditRewardAmount(m.reward_amount);
    setEditRewardType(m.reward_type);
  };

  const saveEdit = async (id: string) => {
    await supabase
      .from("milestones")
      .update({
        title: editTitle,
        reward_amount: editRewardAmount,
        reward_type: editRewardType,
      })
      .eq("id", id);
    setEditingId(null);
    toast({ title: "Milestone updated" });
    qc.invalidateQueries({ queryKey: ["admin-milestones"] });
  };

  const toggleEnabled = async (m: MilestoneRow) => {
    await supabase
      .from("milestones")
      .update({ is_enabled: !m.is_enabled })
      .eq("id", m.id);
    toast({ title: m.is_enabled ? "Milestone disabled" : "Milestone enabled" });
    qc.invalidateQueries({ queryKey: ["admin-milestones"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" /> Milestones Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage milestone definitions, rewards, and view completion rates.
          </p>
        </div>
        <Badge variant="secondary" className="text-xs gap-1.5">
          <Users className="h-3.5 w-3.5" /> {totalUsers} users
        </Badge>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Reward</TableHead>
              <TableHead>Persona</TableHead>
              <TableHead className="text-right">
                <span className="flex items-center gap-1 justify-end">
                  <BarChart3 className="h-3.5 w-3.5" /> Completions
                </span>
              </TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones.map((m) => {
              const count = getCompletionCount(m.id);
              const rate = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
              const isEditing = editingId === m.id;

              return (
                <TableRow key={m.id} className={!m.is_enabled ? "opacity-50" : ""}>
                  <TableCell><span className="text-lg">{m.icon}</span></TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <span className="font-medium text-sm">{m.title}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{m.code}</code>
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Select value={editRewardType} onValueChange={setEditRewardType}>
                          <SelectTrigger className="w-24 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="XP">XP</SelectItem>
                            <SelectItem value="CREDITS">Credits</SelectItem>
                            <SelectItem value="BADGE">Badge</SelectItem>
                            <SelectItem value="NONE">None</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={editRewardAmount}
                          onChange={(e) => setEditRewardAmount(Number(e.target.value))}
                          className="w-16 h-8 text-xs"
                        />
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        {m.reward_type === "NONE" ? "—" : `${m.reward_amount} ${m.reward_type}`}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {m.persona_visibility.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-medium">{count}</span>
                    <span className="text-xs text-muted-foreground ml-1">({rate}%)</span>
                  </TableCell>
                  <TableCell>
                    <Switch checked={m.is_enabled} onCheckedChange={() => toggleEnabled(m)} />
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEdit(m.id)}>
                          <Save className="h-3.5 w-3.5 text-primary" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
