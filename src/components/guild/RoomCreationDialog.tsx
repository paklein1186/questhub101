import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { AudiencePicker } from "./AudiencePicker";
import { type AudienceType } from "@/lib/permissions";
import { translateAudienceType } from "@/lib/entityLabels";
import type { EntityRole } from "@/hooks/useEntityRoles";

interface RoomCreationDialogProps {
  roles: EntityRole[];
  onSubmit: (room: {
    name: string;
    description?: string;
    audience_type: AudienceType;
    allowed_role_ids?: string[];
    can_post_audience_type: AudienceType;
    can_reply_audience_type: AudienceType;
    can_manage_audience_type: "ADMINS_ONLY" | "SELECTED_ROLES";
    can_manage_role_ids?: string[];
  }) => void;
}

export function RoomCreationDialog({ roles, onSubmit }: RoomCreationDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [audienceType, setAudienceType] = useState<AudienceType>("MEMBERS");
  const [allowedRoleIds, setAllowedRoleIds] = useState<string[]>([]);
  const [canPostType, setCanPostType] = useState<AudienceType>("MEMBERS");
  const [canReplyType, setCanReplyType] = useState<AudienceType>("MEMBERS");
  const [canManageType, setCanManageType] = useState<"ADMINS_ONLY" | "SELECTED_ROLES">("ADMINS_ONLY");
  const [canManageRoleIds, setCanManageRoleIds] = useState<string[]>([]);

  const reset = () => {
    setName(""); setDescription(""); setAudienceType("MEMBERS");
    setAllowedRoleIds([]); setCanPostType("MEMBERS"); setCanReplyType("MEMBERS");
    setCanManageType("ADMINS_ONLY"); setCanManageRoleIds([]);
  };

  const summary = [
    `${t("roomCreation.summaryView")}: ${translateAudienceType(audienceType, t)}`,
    `${t("roomCreation.summaryPost")}: ${translateAudienceType(canPostType, t)}`,
    `${t("roomCreation.summaryReply")}: ${translateAudienceType(canReplyType, t)}`,
    `${t("roomCreation.summaryManage")}: ${translateAudienceType(canManageType, t)}`,
  ].join(" · ");

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" /> {t("roomCreation.newRoom")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("roomCreation.createRoomTitle")}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">{t("roomCreation.roomNameLabel")}</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("roomCreation.roomNamePlaceholder")} maxLength={60} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t("roomCreation.descriptionLabel")}</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none min-h-[60px]" maxLength={200} />
          </div>

          <AudiencePicker label={t("roomCreation.whoCanSee")} value={audienceType} onChange={setAudienceType} roles={roles} selectedRoleIds={allowedRoleIds} onRoleIdsChange={setAllowedRoleIds} />
          <AudiencePicker label={t("roomCreation.whoCanPost")} value={canPostType} onChange={setCanPostType} roles={roles} selectedRoleIds={allowedRoleIds} onRoleIdsChange={setAllowedRoleIds} />
          <AudiencePicker label={t("roomCreation.whoCanReply")} value={canReplyType} onChange={setCanReplyType} roles={roles} selectedRoleIds={allowedRoleIds} onRoleIdsChange={setAllowedRoleIds} />
          <AudiencePicker
            label={t("roomCreation.whoCanManage")}
            value={canManageType}
            onChange={(v) => setCanManageType(v as "ADMINS_ONLY" | "SELECTED_ROLES")}
            allowedTypes={["ADMINS_ONLY", "SELECTED_ROLES"]}
            roles={roles}
            selectedRoleIds={canManageRoleIds}
            onRoleIdsChange={setCanManageRoleIds}
          />

          <div className="rounded-lg bg-muted/50 border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground font-medium">{t("roomCreation.summary")}</p>
            <p className="text-xs text-foreground mt-0.5">{summary}</p>
          </div>

          <Button
            onClick={() => {
              onSubmit({
                name, description,
                audience_type: audienceType,
                allowed_role_ids: allowedRoleIds,
                can_post_audience_type: canPostType,
                can_reply_audience_type: canReplyType,
                can_manage_audience_type: canManageType,
                can_manage_role_ids: canManageRoleIds,
              });
              setOpen(false);
              reset();
            }}
            disabled={!name.trim()}
            className="w-full"
          >
            {t("roomCreation.createRoomButton")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
