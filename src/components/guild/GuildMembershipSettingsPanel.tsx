import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type MembershipStyle = "none" | "symbolic_supporter" | "core_members" | "cooperative_circle";

const PRESETS: Record<MembershipStyle, {
  entry_fee_credits: number;
  members_only_quests: boolean;
  members_only_events: boolean;
  members_only_voting: boolean;
  membership_benefits_text: string;
  membership_commitments_text: string;
}> = {
  none: {
    entry_fee_credits: 0,
    members_only_quests: false,
    members_only_events: false,
    members_only_voting: false,
    membership_benefits_text: "",
    membership_commitments_text: "",
  },
  symbolic_supporter: {
    entry_fee_credits: 20,
    members_only_quests: false,
    members_only_events: false,
    members_only_voting: false,
    membership_benefits_text: "You support the guild's work and appear as a supporter on our page.",
    membership_commitments_text: "You contribute a one-time entry fee to help us run activities.",
  },
  core_members: {
    entry_fee_credits: 100,
    members_only_quests: true,
    members_only_events: true,
    members_only_voting: true,
    membership_benefits_text: "You can create quests and events in this guild, vote on key decisions, and are listed as a core member.",
    membership_commitments_text: "You contribute an entry fee and commit to at least one contribution per year, plus our shared code of practice.",
  },
  cooperative_circle: {
    entry_fee_credits: 250,
    members_only_quests: true,
    members_only_events: true,
    members_only_voting: true,
    membership_benefits_text: "You join the cooperative circle: full participation in quests, events, and governance, with priority in residencies and strategic decisions.",
    membership_commitments_text: "You contribute a higher entry fee and commit to regular contributions, participation in assemblies, and shared responsibility.",
  },
};

interface Props {
  guild: any;
  guildId: string;
}

export function GuildMembershipSettingsPanel({ guild, guildId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [enableMembership, setEnableMembership] = useState<boolean>(guild.enable_membership ?? false);
  const [membershipStyle, setMembershipStyle] = useState<MembershipStyle>((guild.membership_style as MembershipStyle) ?? "none");
  const [entryFee, setEntryFee] = useState<number>(guild.entry_fee_credits ?? 0);
  const [membersOnlyQuests, setMembersOnlyQuests] = useState<boolean>(guild.members_only_quests ?? false);
  const [membersOnlyEvents, setMembersOnlyEvents] = useState<boolean>(guild.members_only_events ?? false);
  const [membersOnlyVoting, setMembersOnlyVoting] = useState<boolean>(guild.members_only_voting ?? false);
  const [benefitsText, setBenefitsText] = useState<string>(guild.membership_benefits_text ?? "");
  const [commitmentsText, setCommitmentsText] = useState<string>(guild.membership_commitments_text ?? "");

  // Advanced
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [redistributionPercent, setRedistributionPercent] = useState<number>(guild.redistribution_percent ?? 50);
  const [xpBonus, setXpBonus] = useState<number>(guild.member_xp_bonus_percent ?? 0);
  const [durationMonths, setDurationMonths] = useState<string>(guild.membership_duration_months?.toString() ?? "");

  const applyPreset = (style: MembershipStyle) => {
    if (style === "none") return;
    const p = PRESETS[style];
    setEntryFee(p.entry_fee_credits);
    setMembersOnlyQuests(p.members_only_quests);
    setMembersOnlyEvents(p.members_only_events);
    setMembersOnlyVoting(p.members_only_voting);
    // Only overwrite text if currently empty or matches previous preset
    if (!benefitsText || Object.values(PRESETS).some((pr) => pr.membership_benefits_text === benefitsText)) {
      setBenefitsText(p.membership_benefits_text);
    }
    if (!commitmentsText || Object.values(PRESETS).some((pr) => pr.membership_commitments_text === commitmentsText)) {
      setCommitmentsText(p.membership_commitments_text);
    }
  };

  const handleStyleChange = (val: MembershipStyle) => {
    setMembershipStyle(val);
    if (enableMembership) applyPreset(val);
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from("guilds")
      .update({
        enable_membership: enableMembership,
        membership_style: membershipStyle,
        entry_fee_credits: entryFee || null,
        members_only_quests: membersOnlyQuests,
        members_only_events: membersOnlyEvents,
        members_only_voting: membersOnlyVoting,
        membership_benefits_text: benefitsText || null,
        membership_commitments_text: commitmentsText || null,
        redistribution_percent: redistributionPercent,
        member_xp_bonus_percent: xpBonus,
        membership_duration_months: durationMonths ? parseInt(durationMonths) : null,
      } as any)
      .eq("id", guildId);

    if (error) {
      toast({ title: "Failed to save membership settings", variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["guild-settings", guildId] });
    qc.invalidateQueries({ queryKey: ["guild", guildId] });
    toast({ title: "Membership settings saved!" });
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h3 className="text-lg font-semibold mb-1">Membership & Contributions</h3>
        <p className="text-sm text-muted-foreground">
          Optional. Turn this on if you want a member layer in your guild.
        </p>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div>
          <Label className="text-sm font-medium">Enable membership</Label>
          <p className="text-xs text-muted-foreground">Adds a membership system to this guild</p>
        </div>
        <Switch checked={enableMembership} onCheckedChange={setEnableMembership} />
      </div>

      {enableMembership && (
        <>
          {/* Membership style */}
          <div>
            <Label className="text-sm font-medium mb-1 block">Membership style</Label>
            <Select value={membershipStyle} onValueChange={(v) => handleStyleChange(v as MembershipStyle)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No membership</SelectItem>
                <SelectItem value="symbolic_supporter">Symbolic supporters</SelectItem>
                <SelectItem value="core_members">Core members</SelectItem>
                <SelectItem value="cooperative_circle">Cooperative circle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Entry fee */}
          <div>
            <Label className="text-sm font-medium mb-1 block">Entry fee (credits)</Label>
            <p className="text-xs text-muted-foreground mb-2">One-time entry fee in credits to become a member.</p>
            <Input
              type="number"
              min={0}
              value={entryFee}
              onChange={(e) => setEntryFee(parseInt(e.target.value) || 0)}
            />
          </div>

          {/* Gating checkboxes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={membersOnlyQuests}
                onCheckedChange={(v) => setMembersOnlyQuests(!!v)}
              />
              <Label className="text-sm">Only members can create quests in this guild</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={membersOnlyEvents}
                onCheckedChange={(v) => setMembersOnlyEvents(!!v)}
              />
              <Label className="text-sm">Only members can create events in this guild</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={membersOnlyVoting}
                onCheckedChange={(v) => setMembersOnlyVoting(!!v)}
              />
              <Label className="text-sm">Only members can participate in guild voting and governance</Label>
            </div>
          </div>

          {/* Benefits & commitments */}
          <div>
            <Label className="text-sm font-medium mb-1 block">What members get</Label>
            <Textarea
              value={benefitsText}
              onChange={(e) => setBenefitsText(e.target.value)}
              rows={3}
              className="resize-none"
              placeholder="Describe what members get..."
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1 block">What members commit to</Label>
            <Textarea
              value={commitmentsText}
              onChange={(e) => setCommitmentsText(e.target.value)}
              rows={3}
              className="resize-none"
              placeholder="Describe what members commit to..."
            />
          </div>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showAdvanced ? "Hide advanced options" : "Show advanced options"}
          </button>

          {showAdvanced && (
            <div className="space-y-4 pl-2 border-l-2 border-primary/20">
              <div>
                <Label className="text-sm font-medium mb-1 block">
                  🌱 $CTG Redistribution ({redistributionPercent}%)
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Percent of quest-earned $CTG redistributed to the guild pool
                </p>
                <Slider
                  value={[redistributionPercent]}
                  onValueChange={(v) => setRedistributionPercent(v[0])}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">XP bonus for members (%)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  XP bonus for members in guild-related quests (may be implemented gradually)
                </p>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={xpBonus}
                  onChange={(e) => setXpBonus(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">Membership duration (months)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  If empty, membership does not expire automatically.
                </p>
                <Input
                  type="number"
                  min={1}
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  placeholder="No expiry"
                />
              </div>
            </div>
          )}
        </>
      )}

      <Button onClick={handleSave} className="w-full">
        <Save className="h-4 w-4 mr-2" /> Save membership settings
      </Button>
    </div>
  );
}
