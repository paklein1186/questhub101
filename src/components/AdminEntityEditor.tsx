import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Eye, EyeOff, Archive, Trash2, RotateCcw, Search, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type EntityType = "profiles" | "guilds" | "companies" | "quests" | "services" | "courses" | "pods";

const ENTITY_CONFIG: Record<EntityType, { label: string; searchField: string; nameField: string }> = {
  profiles: { label: "Users", searchField: "name", nameField: "name" },
  guilds: { label: "Guilds", searchField: "name", nameField: "name" },
  companies: { label: "Companies", searchField: "name", nameField: "name" },
  quests: { label: "Quests", searchField: "title", nameField: "title" },
  services: { label: "Services", searchField: "title", nameField: "title" },
  courses: { label: "Courses", searchField: "title", nameField: "title" },
  pods: { label: "Pods", searchField: "name", nameField: "name" },
};

interface AdminEntityEditorProps {
  maskPII: boolean;
}

function maskString(str: string): string {
  if (!str || str.length <= 2) return "***";
  return str[0] + "*".repeat(Math.min(str.length - 2, 8)) + str[str.length - 1];
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***@hidden";
  return `${local?.[0] ?? "u"}***@${domain}`;
}

export function AdminEntityEditor({ maskPII }: AdminEntityEditorProps) {
  const [entityType, setEntityType] = useState<EntityType>("profiles");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const config = ENTITY_CONFIG[entityType];

  const doSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(entityType as any)
        .select("*")
        .ilike(config.searchField as any, `%${search}%` as any)
        .limit(20);
      if (error) throw error;
      setResults((data ?? []) as any[]);
      setSelectedRecord(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVisibility = async (record: any, status: "VISIBLE" | "HIDDEN" | "ARCHIVED") => {
    const isDeleteModel = "is_deleted" in record;
    try {
      if (status === "HIDDEN") {
        await supabase.from(entityType as any).update({ is_deleted: true, deleted_at: new Date().toISOString() } as any).eq("id", record.id ?? record.user_id);
      } else if (status === "VISIBLE") {
        await supabase.from(entityType as any).update({ is_deleted: false, deleted_at: null } as any).eq("id", record.id ?? record.user_id);
      }
      toast.success(`Status updated to ${status}`);
      doSearch();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const displayValue = (key: string, value: any) => {
    if (value === null || value === undefined) return <span className="text-muted-foreground italic">null</span>;
    if (maskPII && key === "email" && typeof value === "string") return maskEmail(value);
    if (maskPII && (key === "name" || key === "title") && typeof value === "string") return maskString(value);
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "object") return JSON.stringify(value).slice(0, 100);
    return String(value);
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2 items-end flex-wrap">
        <div>
          <Label className="text-xs mb-1 block">Entity type</Label>
          <Select value={entityType} onValueChange={(v) => { setEntityType(v as EntityType); setResults([]); setSelectedRecord(null); }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ENTITY_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs mb-1 block">Search by {config.searchField}</Label>
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${config.label}…`}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
            />
            <Button onClick={doSearch} disabled={loading} size="sm">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results list */}
      {results.length > 0 && (
        <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
          {results.map((r) => {
            const id = r.id ?? r.user_id;
            const name = r[config.nameField] ?? id;
            const isHidden = r.is_deleted === true;
            return (
              <button
                key={id}
                onClick={() => setSelectedRecord(r)}
                className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center gap-2 text-sm"
              >
                <span className="flex-1 truncate font-medium">
                  {maskPII ? maskString(name) : name}
                </span>
                {isHidden && <Badge variant="destructive" className="text-[10px]">Hidden</Badge>}
                <span className="text-xs text-muted-foreground font-mono">{String(id).slice(0, 8)}…</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Record detail / editor */}
      {selectedRecord && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              Record Editor
              <Badge variant="outline" className="ml-auto font-mono text-[10px]">
                {(selectedRecord.id ?? selectedRecord.user_id)?.slice(0, 12)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Visibility controls */}
            {"is_deleted" in selectedRecord && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={selectedRecord.is_deleted ? "default" : "outline"}
                  onClick={() => handleVisibility(selectedRecord, "VISIBLE")}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> Make Visible
                </Button>
                <Button
                  size="sm"
                  variant={selectedRecord.is_deleted ? "outline" : "destructive"}
                  onClick={() => handleVisibility(selectedRecord, "HIDDEN")}
                >
                  <EyeOff className="h-3.5 w-3.5 mr-1" /> Hide from Public
                </Button>
              </div>
            )}

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {Object.entries(selectedRecord).map(([key, value]) => (
                <div key={key} className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{key}</span>
                  <span className="text-sm break-all">{displayValue(key, value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
