import { useState, useEffect } from "react";
import { Plus, Trash2, Tag, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useEntityRoles } from "@/hooks/useEntityRoles";

const PRESET_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#64748b",
];

interface EntityRolesManagerProps {
  entityType: "guild" | "company" | "pod";
  entityId: string;
  members: Array<{
    id: string;
    user_id: string;
    user?: { name?: string; avatar_url?: string };
  }>;
}

export function EntityRolesManager({ entityType, entityId, members }: EntityRolesManagerProps) {
  const {
    roles, ensureSourceRole, addRole, updateRole, deleteRole,
    assignRole, removeRoleAssignment, getRolesForUser,
  } = useEntityRoles(entityType, entityId);

  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  useEffect(() => {
    ensureSourceRole();
  }, [entityId]);

  const handleAdd = () => {
    if (!newRoleName.trim()) return;
    addRole(newRoleName, newRoleColor);
    setNewRoleName("");
    setNewRoleColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
  };

  const startEdit = (role: any) => {
    setEditingId(role.id);
    setEditName(role.name);
    setEditColor(role.color);
  };

  const saveEdit = (roleId: string) => {
    updateRole(roleId, editName, editColor);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Role definitions */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Tag className="h-4 w-4" /> Custom Roles
        </h3>
        <div className="space-y-2">
          {roles.map((role) => (
            <div key={role.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
              {editingId === role.id ? (
                <>
                  <div className="h-4 w-4 rounded-full shrink-0 cursor-pointer border border-border" style={{ backgroundColor: editColor }}>
                    <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="opacity-0 w-full h-full cursor-pointer" />
                  </div>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-sm flex-1" />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(role.id)}>
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                  <span className="text-sm font-medium flex-1">{role.name}</span>
                  {role.is_default && <Badge variant="outline" className="text-[10px] h-5">Default</Badge>}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(role)}>
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </Button>
                  {!role.is_default && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteRole(role.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new role */}
        <div className="flex items-center gap-2 mt-3">
          <div className="relative h-8 w-8 shrink-0">
            <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: newRoleColor }} />
            <input type="color" value={newRoleColor} onChange={(e) => setNewRoleColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
          <Input
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder="New role name…"
            className="h-8 text-sm flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button size="sm" variant="outline" onClick={handleAdd} disabled={!newRoleName.trim()} className="h-8">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setNewRoleColor(c)}
              className={`h-5 w-5 rounded-full border-2 transition-transform ${newRoleColor === c ? "border-foreground scale-110" : "border-transparent"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <Separator />

      {/* Assign roles to members */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Assign Roles to Members</h3>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <div className="space-y-3">
            {members.map((m) => {
              const userRoles = getRolesForUser(m.user_id);
              return (
                <div key={m.id} className="p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={m.user?.avatar_url} />
                      <AvatarFallback className="text-xs">{m.user?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{m.user?.name || "Unknown"}</span>
                    <div className="flex flex-wrap gap-1 ml-auto">
                      {userRoles.map((r) => (
                        <Badge key={r.id} className="text-[10px] h-5 text-white border-0" style={{ backgroundColor: r.color }}>
                          {r.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((role) => {
                      const hasRole = userRoles.some((r) => r.id === role.id);
                      return (
                        <label key={role.id} className="flex items-center gap-1.5 cursor-pointer text-xs">
                          <Checkbox
                            checked={hasRole}
                            onCheckedChange={(checked) => {
                              if (checked) assignRole(role.id, m.user_id);
                              else removeRoleAssignment(role.id, m.user_id);
                            }}
                          />
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: role.color }} />
                            {role.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
