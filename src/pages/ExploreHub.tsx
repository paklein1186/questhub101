import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Sparkles, Brain } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/PageShell";
import { MatchmakerPanel } from "@/components/MatchmakerPanel";
import { TerritoryExplorer } from "@/components/explore/TerritoryExplorer";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePersona } from "@/hooks/usePersona";
import GuildsList from "./GuildsList";
import QuestsMarketplace from "./QuestsMarketplace";
import PodsList from "./PodsList";
import ServicesMarketplace from "./ServicesMarketplace";
import CompaniesList from "./CompaniesList";
import CoursesExplore from "./CoursesExplore";
import ExploreUsers from "./ExploreUsers";
import ExploreHouses from "./ExploreHouses";

const VALID_TABS = ["quests", "guilds", "pods", "services", "companies", "courses", "users", "houses", "territories", "matchmaker"];

export default function ExploreHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get("tab") || "") ? searchParams.get("tab")! : "quests";
  const [tab, setTab] = useState(initialTab);
  const currentUser = useCurrentUser();
  const { label } = usePersona();



  const handleTabChange = (value: string) => {
    setTab(value);
    setSearchParams(value === "quests" ? {} : { tab: value }, { replace: true });
  };

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Search className="h-7 w-7 text-primary" /> {label("nav.explore")}
        </h1>
        <p className="text-muted-foreground mt-1">Discover {label("quest.label").toLowerCase()}, {label("guild.label").toLowerCase()}, {label("pod.label").toLowerCase()}, {label("service.label_plural").toLowerCase()}, and people.</p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="quests" className="text-xs sm:text-sm">{label("quest.label")}</TabsTrigger>
          <TabsTrigger value="guilds" className="text-xs sm:text-sm">{label("guild.label")}</TabsTrigger>
          <TabsTrigger value="pods" className="text-xs sm:text-sm">{label("pod.label")}</TabsTrigger>
          <TabsTrigger value="services" className="text-xs sm:text-sm">{label("service.label_plural")}</TabsTrigger>
          <TabsTrigger value="companies" className="text-xs sm:text-sm">{label("company.label")}</TabsTrigger>
          <TabsTrigger value="courses" className="text-xs sm:text-sm">{label("course.label")}</TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
          <TabsTrigger value="houses" className="text-xs sm:text-sm">Topics</TabsTrigger>
          <TabsTrigger value="territories" className="text-xs sm:text-sm"><Brain className="h-3.5 w-3.5 mr-1" /> Territories</TabsTrigger>
          {currentUser.id && <TabsTrigger value="matchmaker" className="text-xs sm:text-sm"><Sparkles className="h-3.5 w-3.5 mr-1" /> Matchmaker</TabsTrigger>}
        </TabsList>

        <TabsContent value="quests"><QuestsMarketplace bare /></TabsContent>
        <TabsContent value="guilds"><GuildsList bare /></TabsContent>
        <TabsContent value="pods"><PodsList bare /></TabsContent>
        <TabsContent value="services"><ServicesMarketplace bare /></TabsContent>
        <TabsContent value="companies"><CompaniesList bare /></TabsContent>
        <TabsContent value="courses"><CoursesExplore bare /></TabsContent>
        <TabsContent value="users"><ExploreUsers bare /></TabsContent>
        <TabsContent value="houses"><ExploreHouses bare /></TabsContent>
        <TabsContent value="territories">
          <TerritoryExplorer />
        </TabsContent>
        {currentUser.id && (
          <TabsContent value="matchmaker">
            <MatchmakerPanel matchType="user" userId={currentUser.id} />
          </TabsContent>
        )}
      </Tabs>
    </PageShell>
  );
}
