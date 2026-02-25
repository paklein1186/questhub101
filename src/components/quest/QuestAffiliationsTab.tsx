import { useState } from "react";
import { Link2, X, Loader2, Shield, Building2, Plus, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Props {
  questId: string;
  quest: any;
}

interface Affiliation {
  id: string;
  entity_type: "GUILD" | "COMPANY";
  entity_id: string;
  status: string;
  name: string;
  logo_url: string | null;
}

export function QuestAffiliationsTab({ questId, quest }: Props) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [addEntityType, setAddEntityType] = useState<"GUILD" | "COMPANY">("GUILD");
  const [addEntityId, setAddEntityId] = useState<string>("");

  // Fetch current affiliations with resolved names
  const { data: affiliations = [], isLoading } = useQuery({
    queryKey: ["quest-affiliations", questId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_affiliations" as any)
        .select("id, entity_type, entity_id, status")
        .eq("quest_id", questId);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const results: Affiliation[] = [];
      for (const row of rows) {
        if (row.entity_type === "GUILD") {
          const { data: g } = await supabase.from("guilds").select("id, name, logo_url").eq("id", row.entity_id).maybeSingle();
          if (g) results.push({ id: row.id, entity_type: "GUILD", entity_id: g.id, status: row.status, name: g.name, logo_url: g.logo_url });
        } else {
          const { data: c } = await supabase.from("companies").select("id, name, logo_url").eq("id", row.entity_id).maybeSingle();
          if (c) results.push({ id: row.id, entity_type: "COMPANY", entity_id: c.id, status: row.status, name: c.name, logo_url: c.logo_url });
        }
      }
      return results;
    },
  });

  // Fetch guilds where current user is a member
  const { data: myGuilds = [] } = useQuery({
    queryKey: ["my-guilds-for-quest", currentUser.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guild_members")
        .select("guild_id, guilds!inner(id, name, logo_url, is_deleted)")
        .eq("user_id", currentUser.id);
      if (error) throw error;
      return (data ?? [])
        .filter((m: any) => !m.guilds?.is_deleted)
        .map((m: any) => ({ id: m.guilds.id, name: m.guilds.name, logo_url: m.guilds.logo_url }));
    },
    enabled: !!currentUser.id,
  });

  // Fetch companies where current user is a member
  const { data: myCompanies = [] } = useQuery({
    queryKey: ["my-companies-for-quest", currentUser.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members")
        .select("company_id, companies!inner(id, name, logo_url, is_deleted)")
        .eq("user_id", currentUser.id);
      if (error) throw error;
      return (data ?? [])
        .filter((m: any) => !m.companies?.is_deleted)
        .map((m: any) => ({ id: m.companies.id, name: m.companies.name, logo_url: m.companies.logo_url }));
    },
    enabled: !!currentUser.id,
  });

  const availableEntities = addEntityType === "GUILD"
    ? myGuilds.filter((g: any) => !affiliations.some(a => a.entity_type === "GUILD" && a.entity_id === g.id))
    : myCompanies.filter((c: any) => !affiliations.some(a => a.entity_type === "COMPANY" && a.entity_id === c.id));

  const addAffiliation = async () => {
    if (!addEntityId) return;
    setSaving(true);
    const { error } = await supabase.from("quest_affiliations" as any).insert({
      quest_id: questId,
      entity_type: addEntityType,
      entity_id: addEntityId,
      created_by_user_id: currentUser.id,
      status: "PENDING",
    } as any);
    if (error) {
      toast({ title: "Error sending request", description: error.message, variant: "destructive" });
    } else {
      qc.invalidateQueries({ queryKey: ["quest-affiliations", questId] });
      qc.invalidateQueries({ queryKey: ["quest", questId] });
      toast({ title: "Affiliation request sent", description: "The entity admins will review your request." });
      setAddEntityId("");
    }
    setSaving(false);
  };

  const removeAffiliation = async (affiliationId: string) => {
    setSaving(true);
    const { error } = await supabase.from("quest_affiliations" as any).delete().eq("id", affiliationId);
    if (error) {
      toast({ title: "Error removing affiliation", description: error.message, variant: "destructive" });
    } else {
      await syncLegacyIds();
      qc.invalidateQueries({ queryKey: ["quest-affiliations", questId] });
      qc.invalidateQueries({ queryKey: ["quest", questId] });
      toast({ title: "Affiliation removed" });
    }
    setSaving(false);
  };

  const syncLegacyIds = async () => {
    const { data: allAffs } = await supabase
      .from("quest_affiliations" as any)
      .select("entity_type, entity_id, status")
      .eq("quest_id", questId);
    const rows = (allAffs ?? []) as any[];
    const approved = rows.filter(r => r.status === "APPROVED");
    const firstGuild = approved.find(r => r.entity_type === "GUILD")?.entity_id || null;
    const firstCompany = approved.find(r => r.entity_type === "COMPANY")?.entity_id || null;
    await supabase.from("quests").update({
      guild_id: firstGuild,
      company_id: firstCompany,
    } as any).eq("id", questId);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-300"><Clock className="h-2.5 w-2.5" /> Pending</Badge>;
      case "APPROVED":
        return <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-300"><CheckCircle2 className="h-2.5 w-2.5" /> Approved</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="text-[10px] gap-1 text-destructive border-destructive/30"><XCircle className="h-2.5 w-2.5" /> Declined</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div>
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" /> Entity Affiliations
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Request to attach this quest to Guilds or Organizations. Entity admins must approve the request.
          </p>
        </div>

        {/* Current affiliations */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : affiliations.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No entities attached yet. This quest is independent.</p>
        ) : (
          <div className="space-y-2">
            {affiliations.map((aff) => (
              <div key={aff.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={aff.logo_url ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {aff.entity_type === "GUILD" ? <Shield className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{aff.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">
                        {aff.entity_type === "GUILD" ? "Guild" : "Organization"}
                      </Badge>
                      {statusBadge(aff.status)}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeAffiliation(aff.id)}
                  disabled={saving}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new affiliation */}
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-sm font-medium">Request affiliation</p>
          <div className="flex gap-2">
            <Select value={addEntityType} onValueChange={(v) => { setAddEntityType(v as "GUILD" | "COMPANY"); setAddEntityId(""); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GUILD">Guild</SelectItem>
                <SelectItem value="COMPANY">Organization</SelectItem>
              </SelectContent>
            </Select>
            <Select value={addEntityId} onValueChange={setAddEntityId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={`Select a ${addEntityType === "GUILD" ? "guild" : "organization"}…`} />
              </SelectTrigger>
              <SelectContent>
                {availableEntities.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
                {availableEntities.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">
                    {addEntityType === "GUILD" ? "No more guilds available" : "No more organizations available"}
                  </p>
                )}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={addAffiliation} disabled={saving || !addEntityId}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Send request
          </Button>
        </div>
      </div>
    </div>
  );
}
