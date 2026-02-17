import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Bot, Plus, Sparkles, Search, Zap, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "intelligence", label: "Intelligence" },
  { value: "writing", label: "Writing" },
  { value: "strategy", label: "Strategy" },
  { value: "coaching", label: "Coaching" },
  { value: "general", label: "General" },
];

const CATEGORY_COLORS: Record<string, string> = {
  intelligence: "bg-blue-500/10 text-blue-600 border-blue-200",
  writing: "bg-purple-500/10 text-purple-600 border-purple-200",
  strategy: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  coaching: "bg-amber-500/10 text-amber-600 border-amber-200",
  general: "bg-muted text-muted-foreground border-border",
};

export default function AgentsMarketplace({ bare }: { bare?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents", category, search],
    queryFn: async () => {
      let q = supabase.from("agents").select("*").eq("is_published", true).order("is_featured", { ascending: false }).order("usage_count", { ascending: false });
      if (category !== "all") q = q.eq("category", category);
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: myHires } = useQuery({
    queryKey: ["my-agent-hires", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("agent_hires").select("agent_id").eq("user_id", user!.id).eq("status", "active");
      if (error) throw error;
      return new Set(data.map((h: any) => h.agent_id));
    },
  });

  const Wrapper = bare ? "div" : PageShell;

  return (
    <Wrapper>
      {!bare && (
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" /> AI Agents
          </h1>
          <p className="text-muted-foreground mt-1">Hire specialized AI assistants to accelerate your projects</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search agents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <Button key={c.value} variant={category === c.value ? "default" : "outline"} size="sm" onClick={() => setCategory(c.value)}>{c.label}</Button>
          ))}
        </div>
        {user && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Agent
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : !agents?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bot className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No agents found. Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent: any) => (
            <Card
              key={agent.id}
              className="p-5 hover:shadow-lg transition-shadow cursor-pointer group relative overflow-hidden"
              onClick={() => navigate(`/agents/${agent.id}`)}
            >
              {agent.is_featured && (
                <div className="absolute top-3 right-3">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                </div>
              )}
              <div className="flex items-start gap-3 mb-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{agent.name}</h3>
                  <Badge variant="outline" className={`text-[10px] mt-1 ${CATEGORY_COLORS[agent.category] || ""}`}>{agent.category}</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{agent.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
                  {agent.skills?.slice(0, 2).map((s: string) => (
                    <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                  ))}
                  {agent.skills?.length > 2 && <Badge variant="secondary" className="text-[10px]">+{agent.skills.length - 2}</Badge>}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3" /> {agent.cost_per_use} credits
                </div>
              </div>
              {myHires?.has(agent.id) && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />
              )}
            </Card>
          ))}
        </div>
      )}

      {user && <CreateAgentDialog open={createOpen} onOpenChange={setCreateOpen} userId={user.id} />}
    </Wrapper>
  );
}

function CreateAgentDialog({ open, onOpenChange, userId }: { open: boolean; onOpenChange: (v: boolean) => void; userId: string }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [skills, setSkills] = useState("");
  const [costPerUse, setCostPerUse] = useState("5");
  const [category, setCategory] = useState("general");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !systemPrompt.trim()) {
      toast.error("Name and system prompt are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("agents").insert({
      name: name.trim(),
      description: description.trim() || null,
      system_prompt: systemPrompt.trim(),
      skills: skills.split(",").map(s => s.trim()).filter(Boolean),
      cost_per_use: parseInt(costPerUse) || 5,
      category,
      creator_user_id: userId,
      is_published: true,
    } as any);
    setSaving(false);
    if (error) {
      toast.error("Failed to create agent");
      return;
    }
    toast.success("Agent created!");
    onOpenChange(false);
    setName(""); setDescription(""); setSystemPrompt(""); setSkills("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Create AI Agent</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Marketing Strategist" />
          </div>
          <div>
            <Label>Category</Label>
            <div className="flex gap-2 flex-wrap mt-1">
              {CATEGORIES.filter(c => c.value !== "all").map(c => (
                <Button key={c.value} variant={category === c.value ? "default" : "outline"} size="sm" onClick={() => setCategory(c.value)}>{c.label}</Button>
              ))}
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this agent do?" rows={2} />
          </div>
          <div>
            <Label>System Prompt *</Label>
            <Textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} placeholder="You are a..." rows={4} />
          </div>
          <div>
            <Label>Skills (comma-separated)</Label>
            <Input value={skills} onChange={e => setSkills(e.target.value)} placeholder="copywriting, strategy, analysis" />
          </div>
          <div>
            <Label>Cost per use (credits)</Label>
            <Input type="number" value={costPerUse} onChange={e => setCostPerUse(e.target.value)} min="1" />
          </div>
          <Button onClick={handleCreate} disabled={saving} className="w-full">
            {saving ? "Creating..." : "Create Agent"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
