import { useState } from "react";
import { Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { AudiencePicker } from "./AudiencePicker";
import { AUDIENCE_LABELS, type AudienceType } from "@/lib/permissions";
import type { EntityRole } from "@/hooks/useEntityRoles";
import type { DiscussionRoom } from "@/hooks/useDiscussionRooms";

interface RoomSettingsDialogProps {
  room: DiscussionRoom;
  roles: EntityRole[];
  onUpdate: (roomId: string, updates: Partial<DiscussionRoom>) => void;
  onDelete: (roomId: string) => void;
}

export function RoomSettingsDialog({ room, roles, onUpdate, onDelete }: RoomSettingsDialogProps) {
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
    `View: ${AUDIENCE_LABELS[audienceType]}`,
    `Post: ${AUDIENCE_LABELS[canPostType]}`,
    `Reply: ${AUDIENCE_LABELS[canReplyType]}`,
    `Manage: ${AUDIENCE_LABELS[canManageType]}`,
  ].join(" · ");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="ml-0.5 p-0.5 rounded hover:bg-muted/80 transition-colors opacity-60 hover:opacity-100"
          title="Room settings"
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        >
          <Settings2 className="h-3 w-3" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Room Settings — #{room.name}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Room name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description (optional)</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none min-h-[60px]" maxLength={200} />
          </div>

          <AudiencePicker label="Who can see this room?" value={audienceType} onChange={setAudienceType} roles={roles} selectedRoleIds={allowedRoleIds} onRoleIdsChange={setAllowedRoleIds} />
          <AudiencePicker label="Who can post?" value={canPostType} onChange={setCanPostType} roles={roles} selectedRoleIds={allowedRoleIds} onRoleIdsChange={setAllowedRoleIds} />
          <AudiencePicker label="Who can reply?" value={canReplyType} onChange={setCanReplyType} roles={roles} selectedRoleIds={allowedRoleIds} onRoleIdsChange={setAllowedRoleIds} />
          <AudiencePicker
            label="Who can manage this room?"
            value={canManageType}
            onChange={(v) => setCanManageType(v as "ADMINS_ONLY" | "SELECTED_ROLES")}
            allowedTypes={["ADMINS_ONLY", "SELECTED_ROLES"]}
            roles={roles}
            selectedRoleIds={canManageRoleIds}
            onRoleIdsChange={setCanManageRoleIds}
          />

          <div className="rounded-lg bg-muted/50 border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground font-medium">Summary</p>
            <p className="text-xs text-foreground mt-0.5">{summary}</p>
          </div>

          <Button onClick={handleSave} disabled={!name.trim()} className="w-full">
            Save Changes
          </Button>

          {!room.is_default && (
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => {
                if (window.confirm(`Delete room "${room.name}"? All posts in this room will lose their room association.`)) {
                  onDelete(room.id);
                  setOpen(false);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Room
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
