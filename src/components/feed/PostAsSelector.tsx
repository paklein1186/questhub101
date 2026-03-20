/**
 * PostAsSelector — lets admins choose to post as themselves or as an entity they manage.
 * Returns { entityType, entityId, label, logoUrl } or null for personal posting.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Building2, User } from "lucide-react";

export interface PostAsEntity {
  entityType: "GUILD" | "COMPANY";
  entityId: string;
  label: string;
  logoUrl: string | null;
}

interface PostAsSelectorProps {
  value: PostAsEntity | null;
  onChange: (entity: PostAsEntity | null) => void;
  /** Optional: restrict to only entities associated with a quest */
  questId?: string;
}

export function PostAsSelector({ value, onChange, questId }: PostAsSelectorProps) {
  const currentUser = useCurrentUser();

  const { data: entities = [] } = useQuery({
    queryKey: ["post-as-entities", currentUser.id, questId],
    enabled: !!currentUser.id,
    queryFn: async () => {
      const results: PostAsEntity[] = [];

      // Fetch guilds user admins
      const { data: guildMemberships } = await supabase
        .from("guild_members")
        .select("guild_id, role, guilds:guild_id(id, name, logo_url, is_deleted)")
        .eq("user_id", currentUser.id)
        .in("role", ["ADMIN", "SOURCE"]);

      for (const m of (guildMemberships ?? []) as any[]) {
        if (m.guilds && !m.guilds.is_deleted) {
          results.push({
            entityType: "GUILD",
            entityId: m.guilds.id,
            label: m.guilds.name,
            logoUrl: m.guilds.logo_url,
          });
        }
      }

      // Fetch companies user admins
      const { data: companyMemberships } = await supabase
        .from("company_members")
        .select("company_id, role, companies:company_id(id, name, logo_url, is_deleted)")
        .eq("user_id", currentUser.id)
        .in("role", ["OWNER", "ADMIN"]);

      for (const m of (companyMemberships ?? []) as any[]) {
        if (m.companies && !m.companies.is_deleted) {
          results.push({
            entityType: "COMPANY",
            entityId: m.companies.id,
            label: m.companies.name,
            logoUrl: m.companies.logo_url,
          });
        }
      }

      return results;
    },
  });

  if (entities.length === 0) return null;

  const selectedKey = value ? `${value.entityType}:${value.entityId}` : "PERSONAL";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap">Post as</span>
      <Select
        value={selectedKey}
        onValueChange={(key) => {
          if (key === "PERSONAL") {
            onChange(null);
          } else {
            const entity = entities.find(e => `${e.entityType}:${e.entityId}` === key);
            onChange(entity ?? null);
          }
        }}
      >
        <SelectTrigger className="h-8 text-xs w-auto min-w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="PERSONAL">
            <div className="flex items-center gap-2">
              <Avatar className="h-4 w-4">
                <AvatarImage src={(currentUser as any).avatar_url ?? undefined} />
                <AvatarFallback className="text-[7px]"><User className="h-3 w-3" /></AvatarFallback>
              </Avatar>
              <span>{(currentUser as any).name || "Personal"}</span>
            </div>
          </SelectItem>
          {entities.map((e) => (
            <SelectItem key={`${e.entityType}:${e.entityId}`} value={`${e.entityType}:${e.entityId}`}>
              <div className="flex items-center gap-2">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={e.logoUrl ?? undefined} />
                  <AvatarFallback className="text-[7px]">
                    {e.entityType === "GUILD" ? <Shield className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                  </AvatarFallback>
                </Avatar>
                <span>{e.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
