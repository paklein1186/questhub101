import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2, Compass, Shield, Building2, GraduationCap, Briefcase,
  Users, Search, User,
} from "lucide-react";
import { FollowOnHoverButton, useFollowedUserIds } from "@/components/FollowOnHoverButton";

interface Props {
  topicId: string;
}

function useTopicEcosystem(topicId: string) {
  return useQuery({
    queryKey: ["topic-ecosystem", topicId],
    queryFn: async () => {
      const [quests, guilds, companies, services, courses] = await Promise.all([
        supabase
          .from("quest_topics")
          .select("quest_id, quests(id, title, description, status)")
          .eq("topic_id", topicId)
          .then(r => (r.data ?? []).map((d: any) => d.quests).filter(Boolean)),
        supabase
          .from("guild_topics")
          .select("guild_id, guilds(id, name, description, logo_url)")
          .eq("topic_id", topicId)
          .then(r => (r.data ?? []).map((d: any) => d.guilds).filter(Boolean)),
        supabase
          .from("company_topics")
          .select("company_id, companies(id, name, description, logo_url)")
          .eq("topic_id", topicId)
          .then(r => (r.data ?? []).map((d: any) => d.companies).filter(Boolean)),
        supabase
          .from("service_topics")
          .select("service_id, services(id, title, description)")
          .eq("topic_id", topicId)
          .then(r => (r.data ?? []).map((d: any) => d.services).filter(Boolean)),
        supabase
          .from("course_topics")
          .select("course_id, courses(id, title, description)")
          .eq("topic_id", topicId)
          .then(r => (r.data ?? []).map((d: any) => d.courses).filter(Boolean)),
      ]);
      return { quests, guilds, companies, services, courses };
    },
    enabled: !!topicId,
  });
}

function useTopicPeople(topicId: string) {
  return useQuery({
    queryKey: ["topic-people", topicId],
    queryFn: async () => {
      const { data: utData } = await supabase
        .from("user_topics")
        .select("user_id")
        .eq("topic_id", topicId);
      if (!utData?.length) return [];
      const userIds = utData.map(u => u.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, headline, persona_type")
        .in("user_id", userIds);
      return (profiles ?? []).filter((p: any) => p.name);
    },
    enabled: !!topicId,
  });
}

type EntitySection = {
  key: string;
  label: string;
  icon: React.ElementType;
  linkPrefix: string;
  nameField: string;
  items: any[];
};

export function TopicEcosystemTab({ topicId }: Props) {
  const { data: ecosystem, isLoading: ecosystemLoading } = useTopicEcosystem(topicId);
  const { data: people = [], isLoading: peopleLoading } = useTopicPeople(topicId);
  const [search, setSearch] = useState("");

  const peopleUserIds = useMemo(() => people.map((p: any) => p.user_id), [people]);
  const { data: followedIds = new Set<string>() } = useFollowedUserIds(peopleUserIds);

  const sections: EntitySection[] = useMemo(() => {
    if (!ecosystem) return [];
    return [
      { key: "quests", label: "Quests", icon: Compass, linkPrefix: "/quests/", nameField: "title", items: ecosystem.quests },
      { key: "guilds", label: "Guilds", icon: Shield, linkPrefix: "/guilds/", nameField: "name", items: ecosystem.guilds },
      { key: "companies", label: "Organizations", icon: Building2, linkPrefix: "/companies/", nameField: "name", items: ecosystem.companies },
      { key: "services", label: "Services", icon: Briefcase, linkPrefix: "/services/", nameField: "title", items: ecosystem.services },
      { key: "courses", label: "Courses", icon: GraduationCap, linkPrefix: "/courses/", nameField: "title", items: ecosystem.courses },
    ].filter(s => s.items.length > 0);
  }, [ecosystem]);

  const filteredPeople = useMemo(() => {
    if (search.trim().length < 2) return people;
    const q = search.trim().toLowerCase();
    return people.filter((p: any) =>
      p.name?.toLowerCase().includes(q) || p.headline?.toLowerCase().includes(q)
    );
  }, [people, search]);

  if (ecosystemLoading || peopleLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Entity sections */}
      {sections.map(section => (
        <div key={section.key} className="space-y-3">
          <h3 className="font-display text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <section.icon className="h-4 w-4" />
            {section.label}
            <Badge variant="outline" className="text-[10px] ml-1">{section.items.length}</Badge>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.items.map((item: any) => (
              <Link key={item.id} to={`${section.linkPrefix}${item.id}`}>
                <Card className="p-4 hover:border-primary/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    {item.logo_url && (
                      <img src={item.logo_url} className="h-9 w-9 rounded-lg object-cover" alt="" />
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-display font-semibold text-sm truncate">{item[section.nameField]}</h4>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* People section */}
      {people.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            People
            <Badge variant="outline" className="text-[10px] ml-1">{people.length}</Badge>
          </h3>

          {people.length > 6 && (
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search people…"
                className="pl-8 h-8 text-sm"
              />
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPeople.slice(0, 50).map((person: any) => (
              <Link key={person.user_id} to={`/users/${person.user_id}`}>
                <Card className="p-3 hover:border-primary/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={person.avatar_url} />
                      <AvatarFallback><User className="h-3.5 w-3.5" /></AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{person.name}</p>
                      {person.headline && (
                        <p className="text-xs text-muted-foreground truncate">{person.headline}</p>
                      )}
                    </div>
                    <FollowOnHoverButton
                      targetUserId={person.user_id}
                      isFollowed={followedIds instanceof Set ? followedIds.has(person.user_id) : false}
                    />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          {filteredPeople.length > 50 && (
            <p className="text-xs text-muted-foreground text-center">Showing 50 of {filteredPeople.length}</p>
          )}
        </div>
      )}

      {sections.length === 0 && people.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No entities connected to this topic yet.</p>
        </div>
      )}
    </div>
  );
}
