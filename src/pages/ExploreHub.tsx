import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Sparkles, Brain, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/PageShell";
import { MatchmakerPanel } from "@/components/MatchmakerPanel";
import { TerritoryExplorer } from "@/components/explore/TerritoryExplorer";
import { TerritoryBrowseSection } from "@/components/explore/TerritoryBrowseSection";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePersona } from "@/hooks/usePersona";
import { Button } from "@/components/ui/button";
import { ExploreFilters, ExploreFilterValues, defaultFilters } from "@/components/ExploreFilters";
import { useHouseFilter } from "@/hooks/useHouseFilter";
import GuildsList from "./GuildsList";
import QuestsMarketplace from "./QuestsMarketplace";
import PodsList from "./PodsList";
import ServicesMarketplace from "./ServicesMarketplace";
import CompaniesList from "./CompaniesList";
import CoursesExplore from "./CoursesExplore";
import ExploreUsers from "./ExploreUsers";
import ExploreHouses from "./ExploreHouses";

const VALID_TABS = ["quests", "entities", "services", "courses", "users", "houses", "territories", "matchmaker"];
const ENTITY_SUB = ["all", "guilds", "pods", "companies"] as const;
type EntitySub = typeof ENTITY_SUB[number];

export default function ExploreHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") || "";
  const isLegacyEntity = ["guilds", "pods", "companies"].includes(rawTab);
  const initialTab = VALID_TABS.includes(rawTab) ? rawTab : isLegacyEntity ? "entities" : "quests";
  const initialSub: EntitySub = isLegacyEntity ? (rawTab as EntitySub) : "all";

  const [tab, setTab] = useState(initialTab);
  const [entitySub, setEntitySub] = useState<EntitySub>(initialSub);
  const [entityFilters, setEntityFilters] = useState<ExploreFilterValues>(defaultFilters);
  const entityHf = useHouseFilter();
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
        <p className="text-muted-foreground mt-1">Discover {label("quest.label").toLowerCase()}, entities, {label("service.label_plural").toLowerCase()}, and people.</p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="quests" className="text-xs sm:text-sm">{label("quest.label")}</TabsTrigger>
          <TabsTrigger value="entities" className="text-xs sm:text-sm">Entities</TabsTrigger>
          <TabsTrigger value="services" className="text-xs sm:text-sm">{label("service.label_plural")}</TabsTrigger>
          <TabsTrigger value="courses" className="text-xs sm:text-sm">{label("course.label")}</TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
          <TabsTrigger value="houses" className="text-xs sm:text-sm">Topics</TabsTrigger>
          <TabsTrigger value="territories" className="text-xs sm:text-sm"><Brain className="h-3.5 w-3.5 mr-1" /> Territories</TabsTrigger>
          {currentUser.id && <TabsTrigger value="matchmaker" className="text-xs sm:text-sm"><Sparkles className="h-3.5 w-3.5 mr-1" /> Matchmaker</TabsTrigger>}
        </TabsList>

        <TabsContent value="quests">
          <div className="flex justify-end mb-4">
            <Button size="sm" asChild><Link to="/quests/new"><Plus className="h-4 w-4 mr-1" /> Create Quest</Link></Button>
          </div>
          <QuestsMarketplace bare />
        </TabsContent>

        <TabsContent value="entities">
          {/* Entity type chips + create */}
          <div className="flex items-center gap-2 mb-4 flex-wrap justify-between">
            <div className="flex items-center gap-2 flex-wrap">
            {([
              ["all", "All"],
              ["guilds", label("guild.label")],
              ["pods", label("pod.label")],
              ["companies", label("company.label")],
            ] as [EntitySub, string][]).map(([key, lbl]) => (
              <Button
                key={key}
                variant={entitySub === key ? "default" : "outline"}
                size="sm"
                onClick={() => setEntitySub(key)}
                className="text-xs"
              >
                {lbl}
              </Button>
            ))}
            </div>
            <Button size="sm" asChild>
              <Link to={entitySub === "companies" ? "/companies/info" : entitySub === "pods" ? "/guilds/new" : entitySub === "guilds" ? "/guilds/new" : "/guilds/new"}>
                <Plus className="h-4 w-4 mr-1" /> Create {entitySub === "all" ? "Entity" : entitySub === "guilds" ? label("guild.label") : entitySub === "pods" ? label("pod.label") : label("company.label")}
              </Link>
            </Button>
          </div>

          {/* Shared filter bar for all entity types */}
          <div className="mb-6">
            <ExploreFilters
              filters={entityFilters}
              onChange={setEntityFilters}
              config={{
                showTopics: true,
                showTerritories: true,
                showGuildType: entitySub === "all" || entitySub === "guilds",
                showPodType: entitySub === "all" || entitySub === "pods",
              }}
              houseFilter={{
                active: entityHf.houseFilterActive,
                onToggle: entityHf.setHouseFilterActive,
                hasHouses: entityHf.hasHouses,
                topicNames: entityHf.topicNames,
                myTopicIds: entityHf.myTopicIds,
              }}
              universeMode={entityHf.universeMode}
              onUniverseModeChange={entityHf.setUniverseMode}
            />
          </div>

          {/* Entity lists — filters handled above */}
          {(entitySub === "all" || entitySub === "guilds") && (
            <div className={entitySub === "all" ? "mb-8" : ""}>
              {entitySub === "all" && <h3 className="font-display font-semibold text-base mb-3">{label("guild.label")}</h3>}
              <GuildsList bare hideFilters externalFilters={entityFilters} externalHouseFilter={entityHf} />
            </div>
          )}
          {(entitySub === "all" || entitySub === "pods") && (
            <div className={entitySub === "all" ? "mb-8" : ""}>
              {entitySub === "all" && <h3 className="font-display font-semibold text-base mb-3">{label("pod.label")}</h3>}
              <PodsList bare hideFilters externalFilters={entityFilters} externalHouseFilter={entityHf} />
            </div>
          )}
          {(entitySub === "all" || entitySub === "companies") && (
            <div>
              {entitySub === "all" && <h3 className="font-display font-semibold text-base mb-3">{label("company.label")}</h3>}
              <CompaniesList bare hideFilters externalFilters={entityFilters} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="services">
          <div className="flex justify-end mb-4">
            <Button size="sm" asChild><Link to="/services/new"><Plus className="h-4 w-4 mr-1" /> Create Service</Link></Button>
          </div>
          <ServicesMarketplace bare />
        </TabsContent>
        <TabsContent value="courses">
          <div className="flex justify-end mb-4">
            <Button size="sm" asChild><Link to="/courses/new"><Plus className="h-4 w-4 mr-1" /> Create Course</Link></Button>
          </div>
          <CoursesExplore bare />
        </TabsContent>
        <TabsContent value="users"><ExploreUsers bare /></TabsContent>
        <TabsContent value="houses"><ExploreHouses bare /></TabsContent>
        <TabsContent value="territories" className="space-y-8">
          <TerritoryBrowseSection />
          <div className="border-t border-border pt-8">
            <TerritoryExplorer />
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
