import { useState } from "react";
import { Link2, X, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Props {
  questId: string;
  quest: any;
}

export function QuestAffiliationsTab({ questId, quest }: Props) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [selectedGuildId, setSelectedGuildId] = useState<string>(quest.guild_id || "");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(quest.company_id || "");

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

  const saveAffiliations = async () => {
    setSaving(true);
    const { error } = await supabase.from("quests").update({
      guild_id: selectedGuildId || null,
      company_id: selectedCompanyId || null,
    }).eq("id", questId);
    if (error) {
      toast({ title: "Error saving affiliations", description: error.message, variant: "destructive" });
    } else {
      qc.invalidateQueries({ queryKey: ["quest", questId] });
      qc.invalidateQueries({ queryKey: ["quest-settings", questId] });
      toast({ title: "Affiliations saved" });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div>
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" /> Entity Affiliations
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Attach this quest to a Guild or Organization so it appears on their profile.
          </p>
        </div>

        {/* Guild picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium block">Guild</label>
          <div className="flex items-center gap-2">
            <Select value={selectedGuildId} onValueChange={setSelectedGuildId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="No guild attached" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {myGuilds.map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedGuildId && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedGuildId("")}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {myGuilds.length === 0 && (
            <p className="text-xs text-muted-foreground">You are not a member of any guild yet.</p>
          )}
        </div>

        {/* Company picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium block">Traditional Organization</label>
          <div className="flex items-center gap-2">
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="No organization attached" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {myCompanies.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCompanyId && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedCompanyId("")}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {myCompanies.length === 0 && (
            <p className="text-xs text-muted-foreground">You are not a member of any organization yet.</p>
          )}
        </div>

        {/* Current affiliations display */}
        {(selectedGuildId || selectedCompanyId) && (
          <div className="flex flex-wrap gap-2">
            {selectedGuildId && (
              <Badge variant="secondary" className="gap-1">
                Guild: {myGuilds.find((g: any) => g.id === selectedGuildId)?.name || "Selected"}
              </Badge>
            )}
            {selectedCompanyId && (
              <Badge variant="secondary" className="gap-1">
                Org: {myCompanies.find((c: any) => c.id === selectedCompanyId)?.name || "Selected"}
              </Badge>
            )}
          </div>
        )}

        <Button size="sm" onClick={saveAffiliations} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save Affiliations
        </Button>
      </div>
    </div>
  );
}
