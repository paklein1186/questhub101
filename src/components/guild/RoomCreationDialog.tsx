import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { AudiencePicker } from "./AudiencePicker";
import { AUDIENCE_LABELS, type AudienceType } from "@/lib/permissions";
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
    `View: ${AUDIENCE_LABELS[audienceType]}`,
    `Post: ${AUDIENCE_LABELS[canPostType]}`,
    `Reply: ${AUDIENCE_LABELS[canReplyType]}`,
    `Manage: ${AUDIENCE_LABELS[canManageType]}`,
  ].join(" · ");

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" /> New Room
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Discussion Room</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Room name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Strategy, Design, Announcements" maxLength={60} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description (optional)</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none min-h-[60px]" maxLength={200} />
          </div>

          <AudiencePicker label="Who can see this room?" value={audienceType} onChange={setAudienceType} roles={roles} selectedRoleIds={allowedRoleIds} onRoleIdsChange={setAllowedRoleIds} />
          <AudiencePicker label="Who can post (create threads)?" value={canPostType} onChange={setCanPostType} roles={roles} selectedRoleIds={allowedRoleIds} onRoleIdsChange={setAllowedRoleIds} />
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
            Create Room
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
