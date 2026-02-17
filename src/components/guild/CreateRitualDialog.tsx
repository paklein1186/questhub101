import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Coffee, Heart, Landmark, Brain, GraduationCap, Zap, Scale,
  Telescope, Network, PartyPopper, Clock, Plus, Trash2, GripVertical,
  ArrowRight, ArrowLeft, Check,
} from "lucide-react";
import {
  RITUAL_SESSION_TYPES, RITUAL_FREQUENCIES, RITUAL_ACCESS_TYPES,
  GOVERNANCE_IMPACT_COLORS, type RitualSessionTypeKey, type ProgramSegment,
} from "@/lib/ritualConfig";

const ICONS: Record<string, any> = {
  Coffee, Heart, Landmark, Brain, GraduationCap, Zap, Scale, Telescope, Network, PartyPopper,
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  guildId?: string;
  questId?: string;
  onCreated: () => void;
}

export function CreateRitualDialog({ open, onOpenChange, guildId, questId, onCreated }: Props) {
  const entityId = guildId || questId || "";
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form state
  const [sessionType, setSessionType] = useState<RitualSessionTypeKey>("GUILD_ASSEMBLY");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("MONTHLY");
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [accessType, setAccessType] = useState("MEMBERS");
  const [accessRoles, setAccessRoles] = useState<string[]>([]);
  const [minXp, setMinXp] = useState(0);
  const [xpReward, setXpReward] = useState(5);
  const [facilitatorBonus, setFacilitatorBonus] = useState(10);
  const [creditReward, setCreditReward] = useState(0);
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [segments, setSegments] = useState<ProgramSegment[]>([]);

  // Fetch guild entity roles when access type is ROLES
  const { data: entityRoles = [] } = useQuery({
    queryKey: ["entity-roles", "guild", guildId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_roles")
        .select("id, name, color")
        .eq("entity_id", entityId)
        .eq("entity_type", questId ? "quest" : "guild")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const config = RITUAL_SESSION_TYPES[sessionType];

  const selectType = (type: RitualSessionTypeKey) => {
    setSessionType(type);
    const cfg = RITUAL_SESSION_TYPES[type];
    setTitle(cfg.label);
    setDescription(cfg.description);
    setDurationMinutes(cfg.defaultDuration);
    setXpReward(cfg.defaultXp);
    setFacilitatorBonus(cfg.facilitatorBonus);
    setSegments([...cfg.defaultProgram]);
    setStep(1);
  };

  const addSegment = () => {
    setSegments([...segments, { title: "", minutes: 10, role: null }]);
  };

  const removeSegment = (i: number) => {
    setSegments(segments.filter((_, idx) => idx !== i));
  };

  const updateSegment = (i: number, field: keyof ProgramSegment, value: any) => {
    const updated = [...segments];
    (updated[i] as any)[field] = value;
    setSegments(updated);
  };

  const toggleRole = (roleId: string) => {
    setAccessRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const insertData: any = {
      title: title.trim(),
      description: description.trim() || null,
      session_type: sessionType,
      frequency,
      duration_minutes: durationMinutes,
      access_type: accessType,
      access_roles: accessType === "ROLES" ? accessRoles : [],
      min_xp: accessType === "XP_THRESHOLD" ? minXp : null,
      program_segments: segments,
      xp_reward: xpReward,
      facilitator_xp_bonus: facilitatorBonus,
      credit_reward: creditReward || 0,
      recording_enabled: recordingEnabled,
      created_by_user_id: currentUser.id,
    };
    if (guildId) insertData.guild_id = guildId;
    if (questId) insertData.quest_id = questId;
    const { error } = await supabase.from("rituals").insert(insertData);
    setSaving(false);
    if (error) {
      toast({ title: "Failed to create ritual", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Ritual created" });
    setStep(0);
    setSessionType("GUILD_ASSEMBLY");
    setTitle(""); setDescription(""); setAccessRoles([]);
    onCreated();
  };

  const totalProgramMinutes = segments.reduce((s, seg) => s + (seg.minutes || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">
            {step === 0 ? "Choose Session Type" :
             step === 1 ? "Ritual Details" :
             step === 2 ? "Program Structure" :
             step === 3 ? "Access & Rewards" :
             "Review & Create"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          {/* Step 0: Type Selection */}
          {step === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.entries(RITUAL_SESSION_TYPES) as [RitualSessionTypeKey, typeof RITUAL_SESSION_TYPES[RitualSessionTypeKey]][]).map(([key, cfg]) => {
                const Icon = ICONS[cfg.icon] || Coffee;
                const impactClass = GOVERNANCE_IMPACT_COLORS[cfg.governanceImpact] || "";
                return (
                  <button
                    key={key}
                    onClick={() => selectType(key)}
                    className={`text-left rounded-xl border p-4 hover:border-primary/50 hover:shadow-sm transition-all ${sessionType === key ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{cfg.label}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{cfg.subtitle}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cfg.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px]">
                            <Clock className="h-2.5 w-2.5 mr-0.5" /> {cfg.defaultDuration}′
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] ${impactClass}`}>
                            {cfg.governanceImpact}
                          </Badge>
                          {cfg.defaultXp > 0 && (
                            <Badge variant="outline" className="text-[10px] text-primary">
                              +{cfg.defaultXp} XP
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 1: Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ritual name" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Purpose and context…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Frequency</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(RITUAL_FREQUENCIES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration (min)</Label>
                  <Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value) || 60)} min={15} max={300} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={recordingEnabled} onCheckedChange={setRecordingEnabled} />
                <Label>Enable recording</Label>
              </div>
            </div>
          )}

          {/* Step 2: Program */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Total: <span className="font-medium text-foreground">{totalProgramMinutes}′</span> / {durationMinutes}′ target
                </p>
                <Button size="sm" variant="outline" onClick={addSegment}>
                  <Plus className="h-3 w-3 mr-1" /> Add Segment
                </Button>
              </div>
              <div className="space-y-2">
                {segments.map((seg, i) => (
                  <Card key={i}>
                    <CardContent className="py-3 flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0 grid grid-cols-[1fr_80px_100px] gap-2 items-center">
                        <Input
                          value={seg.title}
                          onChange={(e) => updateSegment(i, "title", e.target.value)}
                          placeholder="Segment title"
                          className="text-sm h-8"
                        />
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={seg.minutes}
                            onChange={(e) => updateSegment(i, "minutes", Number(e.target.value) || 5)}
                            className="text-sm h-8 w-16"
                            min={1}
                          />
                          <span className="text-xs text-muted-foreground">′</span>
                        </div>
                        <Select value={seg.role || "none"} onValueChange={(v) => updateSegment(i, "role", v === "none" ? null : v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Everyone</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="facilitator">Facilitator</SelectItem>
                            <SelectItem value="presenter">Presenter</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeSegment(i)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Access & Rewards */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Access Level</Label>
                <Select value={accessType} onValueChange={(v) => { setAccessType(v); if (v !== "ROLES") setAccessRoles([]); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RITUAL_ACCESS_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label} — {v.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role selection when ROLES access type */}
              {accessType === "ROLES" && (
                <div className="space-y-2">
                  <Label>Select allowed roles</Label>
                  {entityRoles.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No custom roles defined for this guild. Create roles in the guild settings first.</p>
                  ) : (
                    <div className="space-y-2">
                      {entityRoles.map((role: any) => (
                        <label key={role.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                          <Checkbox
                            checked={accessRoles.includes(role.id)}
                            onCheckedChange={() => toggleRole(role.id)}
                          />
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: role.color || "hsl(var(--primary))" }}
                          />
                          <span className="text-sm">{role.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {accessType === "XP_THRESHOLD" && (
                <div>
                  <Label>Minimum XP Level</Label>
                  <Input type="number" value={minXp} onChange={(e) => setMinXp(Number(e.target.value))} min={0} max={15} />
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Attendance XP</Label>
                  <Input type="number" value={xpReward} onChange={(e) => setXpReward(Number(e.target.value))} min={0} max={50} />
                </div>
                <div>
                  <Label>Facilitator Bonus XP</Label>
                  <Input type="number" value={facilitatorBonus} onChange={(e) => setFacilitatorBonus(Number(e.target.value))} min={0} max={50} />
                </div>
                <div>
                  <Label>Credit Reward</Label>
                  <Input type="number" value={creditReward} onChange={(e) => setCreditReward(Number(e.target.value))} min={0} />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <Card>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {(() => { const Icon = ICONS[config.icon] || Coffee; return <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-6 w-6 text-primary" /></div>; })()}
                    <div>
                      <p className="font-display font-semibold text-lg">{title}</p>
                      <p className="text-xs text-muted-foreground">{config.label} · {config.subtitle}</p>
                    </div>
                  </div>
                  {description && <p className="text-sm text-muted-foreground">{description}</p>}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Frequency:</span> {RITUAL_FREQUENCIES[frequency as keyof typeof RITUAL_FREQUENCIES]?.label}</div>
                    <div><span className="text-muted-foreground">Duration:</span> {durationMinutes} min</div>
                    <div><span className="text-muted-foreground">Access:</span> {RITUAL_ACCESS_TYPES[accessType as keyof typeof RITUAL_ACCESS_TYPES]?.label}</div>
                    <div><span className="text-muted-foreground">Recording:</span> {recordingEnabled ? "Yes" : "No"}</div>
                  </div>
                  {accessType === "ROLES" && accessRoles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs text-muted-foreground">Roles:</span>
                      {accessRoles.map((roleId) => {
                        const role = entityRoles.find((r: any) => r.id === roleId);
                        return role ? (
                          <Badge key={roleId} variant="outline" className="text-[10px]">
                            <span className="w-2 h-2 rounded-full mr-1 inline-block" style={{ backgroundColor: role.color || "hsl(var(--primary))" }} />
                            {role.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline" className="text-primary">+{xpReward} XP attendance</Badge>
                    {facilitatorBonus > 0 && <Badge variant="outline">+{facilitatorBonus} XP facilitator</Badge>}
                    {creditReward > 0 && <Badge variant="outline">+{creditReward} credits</Badge>}
                  </div>
                  {segments.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-medium mb-2">Program ({segments.length} segments · {totalProgramMinutes}′)</p>
                      {segments.map((seg, i) => (
                        <div key={i} className="flex justify-between text-xs py-0.5">
                          <span>{seg.title}</span>
                          <span className="text-muted-foreground">{seg.minutes}′ {seg.role ? `(${seg.role})` : ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>

        {/* Navigation */}
        {step > 0 && (
          <div className="flex justify-between pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={saving}>
                <Check className="h-4 w-4 mr-1" /> {saving ? "Creating…" : "Create Ritual"}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
