import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Settings2, Trash2 } from "lucide-react";
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
import type { DiscussionRoom } from "@/hooks/useDiscussionRooms";

interface RoomSettingsDialogProps {
  room: DiscussionRoom;
  roles: EntityRole[];
  onUpdate: (roomId: string, updates: Partial<DiscussionRoom>) => void;
  onDelete: (roomId: string) => void;
}

export function RoomSettingsDialog({ room, roles, onUpdate, onDelete }: RoomSettingsDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description || "");
  const [audienceType, setAudienceType] = useState<AudienceType>(room.audience_type as AudienceType);
  const [allowedRoleIds, setAllowedRoleIds] = useState<string[]>(room.allowed_role_ids || []);
  const [canPostType, setCanPostType] = useState<AudienceType>(room.can_post_audience_type as AudienceType);
  const [canReplyType, setCanReplyType] = useState<AudienceType>(room.can_reply_audience_type as AudienceType);
  const [canManageType, setCanManageType] = useState<"ADMINS_ONLY" | "SELECTED_ROLES">(room.can_manage_audience_type as any);
  const [canManageRoleIds, setCanManageRoleIds] = useState<string[]>(room.can_manage_role_ids || []);

  const handleSave = () => {
    onUpdate(room.id, {
      name: name.trim(),
      description: description.trim() || null,
      audience_type: audienceType,
      allowed_role_ids: allowedRoleIds,
      can_post_audience_type: canPostType,
      can_reply_audience_type: canReplyType,
      can_manage_audience_type: canManageType,
      can_manage_role_ids: canManageRoleIds,
    });
    setOpen(false);
  };

  const summary = [
    `${t("roomCreation.summaryView")}: ${translateAudienceType(audienceType, t)}`,
    `${t("roomCreation.summaryPost")}: ${translateAudienceType(canPostType, t)}`,
    `${t("roomCreation.summaryReply")}: ${translateAudienceType(canReplyType, t)}`,
    `${t("roomCreation.summaryManage")}: ${translateAudienceType(canManageType, t)}`,
  ].join(" · ");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="ml-0.5 p-0.5 rounded hover:bg-muted/80 transition-colors opacity-60 hover:opacity-100"
          title={t("roomSettings.title")}
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        >
          <Settings2 className="h-3 w-3" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("roomSettings.dialogTitle", { name: room.name })}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">{t("roomCreation.roomNameLabel")}</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t("roomCreation.descriptionLabel")}</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none min-h-[60px]" maxLength={200} />
          </div>

          <AudiencePicker label={t("roomCreation.whoCanSee")} value={audienceType} onChange={setAudienceType} roles={roles} selectedRoleIds={allowedRoleIds} onRoleIdsChange={setAllowedRoleIds} />
          <AudiencePicker label={t("roomSettings.whoCanPost")} value={canPostType} onChange={setCanPostType} roles={roles} selectedRoleIds={allowedRoleIds} onRoleIdsChange={setAllowedRoleIds} />
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

          <Button onClick={handleSave} disabled={!name.trim()} className="w-full">
            {t("roomSettings.saveChanges")}
          </Button>

          {!room.is_default && (
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => {
                if (window.confirm(t("roomSettings.deleteConfirm", { name: room.name }))) {
                  onDelete(room.id);
                  setOpen(false);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("roomSettings.deleteRoom")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
