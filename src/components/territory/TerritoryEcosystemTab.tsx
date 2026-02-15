import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Compass, Shield, CircleDot, Building2, GraduationCap, Briefcase, Users, Search, User } from "lucide-react";

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

type TerritoryPerson = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  headline: string | null;
  persona_type: string;
  location: string | null;
};

const PERSONA_OPTIONS = [
  { value: "all", label: "All" },
  { value: "creative", label: "Creative" },
  { value: "impact", label: "Impact" },
  { value: "hybrid", label: "Hybrid" },
];

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

function useTerritoryPeople(territoryId: string) {
  return useQuery({
    queryKey: ["territory-people", territoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_territories")
        .select("user_id, profiles(user_id, name, avatar_url, headline, persona_type, location)")
        .eq("territory_id", territoryId);
      return (data ?? [])
        .map((d: any) => d.profiles)
        .filter((p: any) => p && p.name)
        .map((p: any) => ({
          user_id: p.user_id,
          name: p.name,
          avatar_url: p.avatar_url,
          headline: p.headline,
          persona_type: p.persona_type,
          location: p.location,
        })) as TerritoryPerson[];
    },
  });
}

function PeopleSection({ territoryId }: { territoryId: string }) {
  const { data: people = [], isLoading } = useTerritoryPeople(territoryId);
  const [search, setSearch] = useState("");
  const [personaFilter, setPersonaFilter] = useState("all");

  const filtered = people.filter((p) => {
    if (personaFilter !== "all" && p.persona_type !== personaFilter) return false;
    if (search.trim().length >= 2) {
      const q = search.trim().toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchHeadline = p.headline?.toLowerCase().includes(q);
      const matchLocation = p.location?.toLowerCase().includes(q);
      if (!matchName && !matchHeadline && !matchLocation) return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">People</h3>
        <Badge variant="secondary" className="text-xs">{people.length}</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, headline, location…"
            className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="flex gap-1">
          {PERSONA_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPersonaFilter(opt.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                personaFilter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          {people.length === 0 ? "No individuals connected to this territory yet." : "No matches found."}
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((person) => (
            <Link key={person.user_id} to={`/profile/${person.user_id}`}>
              <Card className="p-3 hover:bg-muted/50 transition-colors cursor-pointer flex items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={person.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {person.name[0]?.toUpperCase() || <User className="h-3.5 w-3.5" />}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{person.name}</p>
                  {person.headline && (
                    <p className="text-xs text-muted-foreground truncate">{person.headline}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                      {person.persona_type}
                    </Badge>
                    {person.location && (
                      <span className="text-[10px] text-muted-foreground truncate">{person.location}</span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
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

  return (
    <div className="space-y-8">
      {/* People section — always shown first */}
      <PeopleSection territoryId={territoryId} />

      {/* Entity sections */}
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

      {sections.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No entities connected to this territory yet.
        </div>
      )}
    </div>
  );
}
