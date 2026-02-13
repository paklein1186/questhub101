import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PostComposer } from "@/components/feed/PostComposer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Users, Building2, MessageSquare } from "lucide-react";

type Destination = {
  contextType: string;
  contextId?: string;
  label: string;
  icon: React.ReactNode;
};

export function DestinationPostComposer() {
  const currentUser = useCurrentUser();
  const userId = currentUser.id;

  // Fetch user's guilds
  const { data: myGuilds = [] } = useQuery({
    queryKey: ["my-guilds-for-post", userId],
    queryFn: async () => {
      const { data: memberships } = await supabase
        .from("guild_members").select("guild_id, role").eq("user_id", userId);
      if (!memberships?.length) return [];
      const guildIds = memberships.map((m) => m.guild_id);
      const { data: guilds } = await supabase
        .from("guilds").select("id, name, logo_url").in("id", guildIds).eq("is_deleted", false);
      return (guilds || []).map((g) => ({
        ...g,
        role: memberships.find((m) => m.guild_id === g.id)?.role,
      }));
    },
    enabled: !!userId,
  });

  // Fetch user's companies
  const { data: myCompanies = [] } = useQuery({
    queryKey: ["my-companies-for-post", userId],
    queryFn: async () => {
      const { data: memberships } = await supabase
        .from("company_members").select("company_id").eq("user_id", userId);
      if (!memberships?.length) return [];
      const ids = memberships.map((m) => m.company_id);
      const { data: companies } = await supabase
        .from("companies").select("id, name, logo_url").in("id", ids).eq("is_deleted", false);
      return companies || [];
    },
    enabled: !!userId,
  });

  const destinations: Destination[] = [
    { contextType: "USER", contextId: userId, label: "My Wall", icon: <User className="h-3.5 w-3.5" /> },
    ...myGuilds.map((g: any) => ({
      contextType: "GUILD",
      contextId: g.id,
      label: g.name,
      icon: <Users className="h-3.5 w-3.5" />,
    })),
    ...myCompanies.map((c: any) => ({
      contextType: "COMPANY",
      contextId: c.id,
      label: c.name,
      icon: <Building2 className="h-3.5 w-3.5" />,
    })),
  ];

  const [selectedIdx, setSelectedIdx] = useState("0");
  const selected = destinations[parseInt(selectedIdx)] || destinations[0];

  if (!userId) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Post to:</span>
        <Select value={selectedIdx} onValueChange={setSelectedIdx}>
          <SelectTrigger className="h-8 w-[220px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {destinations.map((d, i) => (
              <SelectItem key={`${d.contextType}-${d.contextId}`} value={String(i)}>
                <span className="flex items-center gap-2">
                  {d.icon}
                  <span className="truncate">{d.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selected && (
        <PostComposer
          key={`${selected.contextType}-${selected.contextId}`}
          contextType={selected.contextType}
          contextId={selected.contextId}
        />
      )}
    </div>
  );
}
