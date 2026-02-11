import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Compass, Shield, CircleDot, Building2, GraduationCap, Briefcase } from "lucide-react";

interface Props {
  territoryId: string;
}

type EntitySection = {
  key: string;
  label: string;
  icon: React.ElementType;
  linkPrefix: string;
  items: { id: string; name: string; description?: string | null }[];
};

function useTerritoryEcosystem(territoryId: string) {
  return useQuery({
    queryKey: ["territory-ecosystem", territoryId],
    queryFn: async () => {
      const [quests, guilds, pods, companies, courses, services] = await Promise.all([
        supabase
          .from("quest_territories")
          .select("quest_id, quests(id, title, description, status)")
          .eq("territory_id", territoryId)
          .then(r => (r.data ?? []).map((d: any) => d.quests).filter(Boolean)),
        supabase
          .from("guild_territories")
          .select("guild_id, guilds(id, name, description)")
          .eq("territory_id", territoryId)
          .then(r => (r.data ?? []).map((d: any) => d.guilds).filter(Boolean)),
        supabase
          .from("pod_territories")
          .select("pod_id, pods(id, name, description)")
          .eq("territory_id", territoryId)
          .then(r => (r.data ?? []).map((d: any) => d.pods).filter(Boolean)),
        supabase
          .from("company_territories")
          .select("company_id, companies(id, name, description)")
          .eq("territory_id", territoryId)
          .then(r => (r.data ?? []).map((d: any) => d.companies).filter(Boolean)),
        supabase
          .from("course_territories")
          .select("course_id, courses(id, title, description)")
          .eq("territory_id", territoryId)
          .then(r => (r.data ?? []).map((d: any) => d.courses).filter(Boolean)),
        supabase
          .from("service_territories")
          .select("service_id, services(id, title, description)")
          .eq("territory_id", territoryId)
          .then(r => (r.data ?? []).map((d: any) => d.services).filter(Boolean)),
      ]);

      return { quests, guilds, pods, companies, courses, services };
    },
  });
}

export function TerritoryEcosystemTab({ territoryId }: Props) {
  const { data, isLoading } = useTerritoryEcosystem(territoryId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const sections: EntitySection[] = [
    {
      key: "quests",
      label: "Quests",
      icon: Compass,
      linkPrefix: "/quests",
      items: data.quests.map((q: any) => ({ id: q.id, name: q.title, description: q.description })),
    },
    {
      key: "guilds",
      label: "Guilds",
      icon: Shield,
      linkPrefix: "/guilds",
      items: data.guilds.map((g: any) => ({ id: g.id, name: g.name, description: g.description })),
    },
    {
      key: "pods",
      label: "Pods",
      icon: CircleDot,
      linkPrefix: "/pods",
      items: data.pods.map((p: any) => ({ id: p.id, name: p.name, description: p.description })),
    },
    {
      key: "companies",
      label: "Companies",
      icon: Building2,
      linkPrefix: "/companies",
      items: data.companies.map((c: any) => ({ id: c.id, name: c.name, description: c.description })),
    },
    {
      key: "courses",
      label: "Courses",
      icon: GraduationCap,
      linkPrefix: "/courses",
      items: data.courses.map((c: any) => ({ id: c.id, name: c.title, description: c.description })),
    },
    {
      key: "services",
      label: "Services",
      icon: Briefcase,
      linkPrefix: "/services",
      items: data.services.map((s: any) => ({ id: s.id, name: s.title, description: s.description })),
    },
  ].filter(s => s.items.length > 0);

  if (sections.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        No entities connected to this territory yet.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map(section => {
        const Icon = section.icon;
        return (
          <div key={section.key} className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
              <Badge variant="secondary" className="text-xs">{section.items.length}</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {section.items.map(item => (
                <Link key={item.id} to={`${section.linkPrefix}/${item.id}`}>
                  <Card className="p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
