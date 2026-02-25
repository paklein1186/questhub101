import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2, Compass, Shield, CircleDot, Building2, GraduationCap,
  Briefcase, Users, Swords, MapPin, Leaf,
} from "lucide-react";

interface Props {
  naturalSystemId: string;
}

type EntityItem = { id: string; name: string; description?: string | null; avatar?: string | null };

function SectionCard({ icon: Icon, label, items, linkPrefix }: {
  icon: React.ElementType;
  label: string;
  items: EntityItem[];
  linkPrefix: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="font-display text-sm font-semibold flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" /> {label}
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{items.length}</Badge>
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <Link key={item.id} to={`${linkPrefix}/${item.id}`}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-3 flex items-center gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={item.avatar || undefined} />
                  <AvatarFallback className="text-[10px]">{item.name?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  {item.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{item.description}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function NsEcosystemTab({ naturalSystemId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["ns-ecosystem", naturalSystemId],
    enabled: !!naturalSystemId,
    staleTime: 60_000,
    queryFn: async () => {
      // Fetch all links for this natural system
      const { data: links, error } = await supabase
        .from("natural_system_links" as any)
        .select("*")
        .eq("natural_system_id", naturalSystemId);
      if (error) throw error;

      const allLinks = (links || []) as any[];
      const userIds = allLinks.filter(l => l.linked_type === "user").map(l => l.linked_id);
      const entityIds = allLinks.filter(l => l.linked_type === "entity").map(l => l.linked_id);
      const questIds = allLinks.filter(l => l.linked_type === "quest").map(l => l.linked_id);
      const territoryIds = allLinks.filter(l => l.linked_type === "territory").map(l => l.linked_id);

      // Fetch all related data in parallel
      const [profiles, guilds, companies, quests, territories] = await Promise.all([
        userIds.length > 0
          ? supabase.from("profiles").select("user_id, name, avatar_url, headline").in("user_id", userIds).then(r => r.data || [])
          : [],
        entityIds.length > 0
          ? supabase.from("guilds").select("id, name, logo_url, description").in("id", entityIds).then(r => r.data || [])
          : [],
        entityIds.length > 0
          ? supabase.from("companies").select("id, name, logo_url, description").in("id", entityIds).then(r => r.data || [])
          : [],
        questIds.length > 0
          ? supabase.from("quests").select("id, title, description, status").in("id", questIds).eq("is_deleted", false).then(r => r.data || [])
          : [],
        territoryIds.length > 0
          ? supabase.from("territories").select("id, name, level").in("id", territoryIds).then(r => r.data || [])
          : [],
      ]);

      // Also fetch quests linked via natural_system_id
      const { data: nsQuests } = await supabase
        .from("quests" as any)
        .select("id, title, description, status")
        .eq("natural_system_id", naturalSystemId)
        .eq("is_deleted", false);

      // Merge quests, deduplicate
      const allQuests = [...(quests as any[]), ...((nsQuests || []) as any[])];
      const uniqueQuests = Array.from(new Map(allQuests.map(q => [q.id, q])).values());

      // Determine which entity IDs are guilds vs companies
      const guildIdSet = new Set((guilds as any[]).map(g => g.id));
      const remainingEntityIds = entityIds.filter(id => !guildIdSet.has(id));
      
      return {
        profiles: profiles as any[],
        guilds: guilds as any[],
        companies: (companies as any[]).filter(c => remainingEntityIds.includes(c.id) || entityIds.includes(c.id)),
        quests: uniqueQuests,
        territories: territories as any[],
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const hasContent = data.profiles.length > 0 || data.guilds.length > 0 ||
    data.companies.length > 0 || data.quests.length > 0 || data.territories.length > 0;

  if (!hasContent) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Leaf className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No connected entities yet</p>
        <p className="text-xs mt-1">Link territories, quests, guilds, and people to this natural system.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Territories */}
      {data.territories.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display text-sm font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Territories
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{data.territories.length}</Badge>
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.territories.map((t: any) => (
              <Link key={t.id} to={`/territories/${t.id}`}>
                <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted/50">
                  <MapPin className="h-3 w-3" /> {t.name}
                  {t.level && <span className="text-muted-foreground text-[9px]">({t.level.toLowerCase()})</span>}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quests */}
      <SectionCard
        icon={Compass}
        label="Quests"
        linkPrefix="/quests"
        items={data.quests.map((q: any) => ({ id: q.id, name: q.title, description: q.description }))}
      />

      {/* Guilds */}
      <SectionCard
        icon={Swords}
        label="Guilds"
        linkPrefix="/guilds"
        items={data.guilds.map((g: any) => ({ id: g.id, name: g.name, description: g.description, avatar: g.logo_url }))}
      />

      {/* Companies */}
      <SectionCard
        icon={Building2}
        label="Organizations"
        linkPrefix="/companies"
        items={data.companies.map((c: any) => ({ id: c.id, name: c.name, description: c.description, avatar: c.logo_url }))}
      />

      {/* People */}
      {data.profiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Connected People
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{data.profiles.length}</Badge>
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {data.profiles.map((p: any) => (
              <Link key={p.user_id} to={`/users/${p.user_id}`}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={p.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">{p.name?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      {p.headline && <p className="text-[11px] text-muted-foreground truncate">{p.headline}</p>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
