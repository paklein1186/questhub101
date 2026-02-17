import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Users, Shield, Building2, Landmark, Crown } from "lucide-react";

export type AudienceSegment =
  | "all"
  | "guild_admins"
  | "company_admins"
  | "org_reps"
  | "shareholders_a"
  | "shareholders_b";

interface SegmentOption {
  value: AudienceSegment;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const SEGMENTS: SegmentOption[] = [
  { value: "all", label: "All users", icon: <Users className="h-4 w-4" />, description: "Every registered user" },
  { value: "guild_admins", label: "Guild admins", icon: <Shield className="h-4 w-4" />, description: "Users with admin role in any guild" },
  { value: "company_admins", label: "Company admins", icon: <Building2 className="h-4 w-4" />, description: "Users with admin role in any company" },
  { value: "org_reps", label: "Organization reps", icon: <Landmark className="h-4 w-4" />, description: "Contact persons of traditional organizations" },
  { value: "shareholders_a", label: "Shareholders — Class A", icon: <Crown className="h-4 w-4" />, description: "Cooperative members with Class A shares" },
  { value: "shareholders_b", label: "Shareholders — Class B", icon: <Crown className="h-4 w-4" />, description: "Cooperative members with Class B shares" },
];

interface Props {
  selected: AudienceSegment[];
  onChange: (segments: AudienceSegment[]) => void;
  disabled?: boolean;
}

export function BroadcastAudiencePicker({ selected, onChange, disabled }: Props) {
  const toggle = (seg: AudienceSegment) => {
    if (seg === "all") {
      // Toggle "all" — deselect others
      onChange(selected.includes("all") ? [] : ["all"]);
      return;
    }
    // If picking specific, remove "all"
    let next = selected.filter((s) => s !== "all");
    if (next.includes(seg)) {
      next = next.filter((s) => s !== seg);
    } else {
      next.push(seg);
    }
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Audience</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SEGMENTS.map((seg) => (
          <label
            key={seg.value}
            className={`flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-colors ${
              selected.includes(seg.value) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
            } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
          >
            <Checkbox
              checked={selected.includes(seg.value)}
              onCheckedChange={() => toggle(seg.value)}
              disabled={disabled}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {seg.icon} {seg.label}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">{seg.description}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
