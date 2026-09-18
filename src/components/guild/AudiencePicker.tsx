import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AUDIENCE_ORDER, type AudienceType } from "@/lib/permissions";
import { translateAudienceType } from "@/lib/entityLabels";
import type { EntityRole } from "@/hooks/useEntityRoles";

interface AudiencePickerProps {
  label: string;
  value: AudienceType;
  onChange: (value: AudienceType) => void;
  /** Only show these audience types (defaults to all) */
  allowedTypes?: AudienceType[];
  /** When SELECTED_ROLES or ACTIVE_ROLES is chosen, show role multi-select */
  roles?: EntityRole[];
  selectedRoleIds?: string[];
  onRoleIdsChange?: (ids: string[]) => void;
}

export function AudiencePicker({
  label,
  value,
  onChange,
  allowedTypes,
  roles = [],
  selectedRoleIds = [],
  onRoleIdsChange,
}: AudiencePickerProps) {
  const { t } = useTranslation();
  const types = allowedTypes || AUDIENCE_ORDER;
  const showRoles = (value === "SELECTED_ROLES" || value === "ACTIVE_ROLES") && roles.length > 0;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium block">{label}</label>
      <Select value={value} onValueChange={(v) => onChange(v as AudienceType)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {types.map((audienceType) => (
            <SelectItem key={audienceType} value={audienceType}>
              {translateAudienceType(audienceType, t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showRoles && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {roles.map((r) => {
            const selected = selectedRoleIds.includes(r.id);
            return (
              <Badge
                key={r.id}
                variant={selected ? "default" : "outline"}
                className="cursor-pointer text-xs transition-all"
                style={
                  selected
                    ? { backgroundColor: r.color, color: "#fff", borderColor: r.color }
                    : { borderColor: r.color + "66", color: r.color }
                }
                onClick={() => {
                  if (!onRoleIdsChange) return;
                  onRoleIdsChange(
                    selected
                      ? selectedRoleIds.filter((id) => id !== r.id)
                      : [...selectedRoleIds, r.id]
                  );
                }}
              >
                {r.name}
              </Badge>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {value === "PUBLIC" && t("audiencePicker.hints.public")}
        {value === "FOLLOWERS" && t("audiencePicker.hints.followers")}
        {value === "MEMBERS" && t("audiencePicker.hints.members")}
        {value === "ACTIVE_ROLES" && t("audiencePicker.hints.activeRoles")}
        {value === "SELECTED_ROLES" && t("audiencePicker.hints.selectedRoles")}
        {value === "OPERATIONS_TEAM" && t("audiencePicker.hints.operationsTeam")}
        {value === "ADMINS_ONLY" && t("audiencePicker.hints.adminsOnly")}
      </p>
    </div>
  );
}
