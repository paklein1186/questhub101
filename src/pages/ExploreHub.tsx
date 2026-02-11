import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Sparkles, Brain } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/PageShell";
import { MatchmakerPanel } from "@/components/MatchmakerPanel";
import { TerritoryIntelligencePanel } from "@/components/TerritoryIntelligencePanel";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePersona } from "@/hooks/usePersona";
import { useTerritories } from "@/hooks/useSupabaseData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const { data: territories } = useTerritories();
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>("");

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
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="quests">{label("quest.label")}</TabsTrigger>
          <TabsTrigger value="guilds">{label("guild.label")}</TabsTrigger>
          <TabsTrigger value="pods">{label("pod.label")}</TabsTrigger>
          <TabsTrigger value="services">{label("service.label_plural")}</TabsTrigger>
          <TabsTrigger value="companies">{label("company.label")}</TabsTrigger>
          <TabsTrigger value="courses">{label("course.label")}</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="houses">Houses</TabsTrigger>
          <TabsTrigger value="territories"><Brain className="h-3.5 w-3.5 mr-1" /> Territories</TabsTrigger>
          {currentUser.id && <TabsTrigger value="matchmaker"><Sparkles className="h-3.5 w-3.5 mr-1" /> Matchmaker</TabsTrigger>}
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
          <div className="space-y-4">
            <div className="max-w-xs">
              <label className="text-sm font-medium mb-1 block">Select a territory</label>
              <Select value={selectedTerritoryId} onValueChange={setSelectedTerritoryId}>
                <SelectTrigger><SelectValue placeholder="Choose territory..." /></SelectTrigger>
                <SelectContent>
                  {(territories ?? []).map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedTerritoryId ? (
              <TerritoryIntelligencePanel
                territoryId={selectedTerritoryId}
                territoryName={(territories ?? []).find((t: any) => t.id === selectedTerritoryId)?.name}
              />
            ) : (
              <div className="text-center py-16 rounded-xl border border-dashed border-border bg-muted/20">
                <Brain className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-display font-semibold text-lg">Select a territory to analyze</p>
                <p className="text-sm text-muted-foreground mt-1">
                  AI will summarize quests, guilds, gaps, and suggest collaborations.
                </p>
              </div>
            )}
          </div>
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
