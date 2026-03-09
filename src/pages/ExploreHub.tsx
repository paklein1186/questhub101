import { useState, useMemo, createContext, useContext } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Sparkles, Brain, Plus, Briefcase, Users, BookOpen, Compass, Swords, Wrench, Tag, Map, Bot, Lightbulb, Target } from "lucide-react";
import { useGridDensity, type GridDensity } from "@/hooks/useGridDensity";
import { GridDensityToggle } from "@/components/explore/GridDensityToggle";
import { SectionBanner, HintTooltip, HINTS } from "@/components/onboarding/ContextualHint";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabOrder } from "@/hooks/useTabOrder";
import { SortableTabsList, type TabDefinition } from "@/components/SortableTabsList";
import { PageShell } from "@/components/PageShell";
import { MatchmakerPanel } from "@/components/MatchmakerPanel";
import { TerritoryExplorer } from "@/components/explore/TerritoryExplorer";
import { TerritoryBrowseSection } from "@/components/explore/TerritoryBrowseSection";
import { EntityCreationWizard } from "@/components/EntityCreationWizard";
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
import JobsExplore from "./JobsExplore";
import { AddJobDialog } from "@/components/AddJobDialog";
import AgentsMarketplace from "./AgentsMarketplace";

const VALID_TABS_AUTH = ["entities", "quests", "services", "agents", "jobs", "courses", "users", "houses", "territories", "matchmaker"];
const VALID_TABS_AUTH_CREATIVE = ["entities", "quests", "services", "agents", "courses", "users", "houses", "territories", "matchmaker"];
const VALID_TABS_GUEST = ["entities", "houses", "courses", "agents", "jobs", "territories"];
const VALID_TABS_GUEST_CREATIVE = ["entities", "houses", "courses", "agents", "territories"];
const ENTITY_SUB = ["all", "guilds", "pods", "companies"] as const;
type EntitySub = typeof ENTITY_SUB[number];

// Context to share grid density across explore subtabs
export const GridDensityContext = createContext<{ density: GridDensity; setDensity: (d: GridDensity) => void; gridClassName: string }>({
  density: "3",
  setDensity: () => {},
  gridClassName: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
});
export const useExploreGridDensity = () => useContext(GridDensityContext);

export default function ExploreHub() {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();
  const isGuest = !currentUser.id;
  const { persona, label } = usePersona();
  const isCreative = persona === "CREATIVE";
  const validTabs = isGuest
    ? (isCreative ? VALID_TABS_GUEST_CREATIVE : VALID_TABS_GUEST)
    : (isCreative ? VALID_TABS_AUTH_CREATIVE : VALID_TABS_AUTH);

  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") || "";
  const isLegacyEntity = ["guilds", "pods", "companies"].includes(rawTab);
  const initialTab = validTabs.includes(rawTab) ? rawTab : isLegacyEntity ? "entities" : "entities";
  const initialSub: EntitySub = isLegacyEntity ? (rawTab as EntitySub) : "all";

  const createParam = searchParams.get("create") as "guild" | "pod" | "company" | null;

  const tab = validTabs.includes(rawTab) ? rawTab : isLegacyEntity ? "entities" : "entities";
  const entitySubFromUrl = isLegacyEntity ? (rawTab as EntitySub) : "all";
  const [entitySub, setEntitySub] = useState<EntitySub>(entitySubFromUrl);
  const [entityFilters, setEntityFilters] = useState<ExploreFilterValues>(defaultFilters);
  const [wizardOpen, setWizardOpen] = useState(!!createParam);
  const [wizardKind] = useState<"guild" | "pod" | "company" | undefined>(createParam || undefined);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const entityHf = useHouseFilter();
  const gridDensity = useGridDensity();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <GridDensityContext.Provider value={gridDensity}>
    <PageShell>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Search className="h-7 w-7 text-primary" /> {t("explore.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("explore.discover", { items: `${t("explore.quests").toLowerCase()}, ${t("explore.services").toLowerCase()}` })}</p>
        </div>
        
      </div>

      <SectionBanner {...HINTS.banners.explore} />
      <ExploreTabsInner tab={tab} onTabChange={handleTabChange} isGuest={isGuest} isCreative={isCreative} currentUserId={currentUser.id} label={label}>

        <TabsContent value="entities">
          {/* Entity type chips + create */}
          <div className="flex items-center gap-2 mb-4 flex-wrap justify-between">
            <div className="flex items-center gap-2 flex-wrap">
            {([
              ["all", t("common.all")],
              ["guilds", t("explore.guilds")],
              ["pods", t("network.pods")],
              ["companies", t("explore.companies")],
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
            <Button size="sm" onClick={() => setWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> {t("tabs.createEntity")}
            </Button>
            <EntityCreationWizard open={wizardOpen} onOpenChange={setWizardOpen} initialKind={wizardKind} />
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
              {entitySub === "all" && <h3 className="font-display font-semibold text-base mb-3">{t("explore.guilds")}</h3>}
              <GuildsList bare hideFilters externalFilters={entityFilters} externalHouseFilter={entityHf} />
            </div>
          )}
          {(entitySub === "all" || entitySub === "pods") && (
            <div className={entitySub === "all" ? "mb-8" : ""}>
              {entitySub === "all" && <h3 className="font-display font-semibold text-base mb-3">{t("network.pods")}</h3>}
              <PodsList bare hideFilters externalFilters={entityFilters} externalHouseFilter={entityHf} />
            </div>
          )}
          {(entitySub === "all" || entitySub === "companies") && (
            <div>
              {entitySub === "all" && <h3 className="font-display font-semibold text-base mb-3">{t("explore.companies")}</h3>}
              <CompaniesList bare hideFilters externalFilters={entityFilters} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="quests">
          <div className="flex justify-end mb-4">
            <Button size="sm" asChild><Link to="/quests/new"><Plus className="h-4 w-4 mr-1" /> {t("tabs.createQuest")}</Link></Button>
          </div>
          <QuestsSubTabs />
        </TabsContent>

        <TabsContent value="services">
          <div className="flex justify-end mb-4">
            <Button size="sm" asChild><Link to="/services/new"><Plus className="h-4 w-4 mr-1" /> {t("tabs.createService")}</Link></Button>
          </div>
          <ServicesMarketplace bare />
        </TabsContent>
        <TabsContent value="jobs">
          {!isGuest && (
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={() => setJobDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> {t("tabs.postJob")}
              </Button>
            </div>
          )}
          <JobsSubTabs />
          {!isGuest && <AddJobDialog open={jobDialogOpen} onOpenChange={setJobDialogOpen} />}
        </TabsContent>
        <TabsContent value="courses">
          <div className="flex justify-end mb-4">
            <Button size="sm" asChild><Link to="/courses/new"><Plus className="h-4 w-4 mr-1" /> {t("tabs.createCourse")}</Link></Button>
          </div>
          <CoursesExplore bare />
        </TabsContent>
        <TabsContent value="users"><ExploreUsers bare /></TabsContent>
        <TabsContent value="houses"><ExploreHouses bare /></TabsContent>
        <TabsContent value="territories" className="space-y-8">
          <div className="flex justify-end mb-4">
            <Button size="sm" asChild>
              <Link to="/create/bioregion"><Plus className="h-4 w-4 mr-1" /> Create Bioregion</Link>
            </Button>
          </div>
          <TerritoryBrowseSection />
          <div className="border-t border-border pt-8">
            <TerritoryExplorer />
          </div>
        </TabsContent>
        <TabsContent value="agents">
          <AgentsMarketplace bare />
        </TabsContent>
        {currentUser.id && (
          <TabsContent value="matchmaker">
            <MatchmakerPanel matchType="user" userId={currentUser.id} />
          </TabsContent>
        )}
      </ExploreTabsInner>
    </PageShell>
    </GridDensityContext.Provider>
  );
}

function ExploreTabsInner({ tab, onTabChange, isGuest, isCreative, currentUserId, label, children }: any) {
  const { t } = useTranslation();
  const exploreTabs: TabDefinition[] = useMemo(() => [
    { value: "entities", label: <><Compass className="h-3.5 w-3.5 mr-1" /> {t("tabs.entities")} <HintTooltip {...HINTS.tooltips.exploreEntities} /></> },
    { value: "quests", label: <><Swords className="h-3.5 w-3.5 mr-1" /> {t("explore.quests")} <HintTooltip {...HINTS.tooltips.exploreQuests} /></>, visible: !isGuest },
    { value: "services", label: <><Wrench className="h-3.5 w-3.5 mr-1" /> {t("explore.services")}</>, visible: !isGuest },
    { value: "agents", label: <><Bot className="h-3.5 w-3.5 mr-1" /> {t("tabs.agents")} <HintTooltip {...HINTS.tooltips.exploreAgents} /></> },
    { value: "jobs", label: <><Briefcase className="h-3.5 w-3.5 mr-1" /> {t("tabs.jobs")}</>, visible: !isCreative },
    { value: "houses", label: <><Tag className="h-3.5 w-3.5 mr-1" /> {t("tabs.topics")} <HintTooltip {...HINTS.tooltips.exploreHouses} /></> },
    { value: "courses", label: <><BookOpen className="h-3.5 w-3.5 mr-1" /> {t("explore.courses")}</> },
    { value: "users", label: <><Users className="h-3.5 w-3.5 mr-1" /> {t("tabs.humans")}</>, visible: !isGuest },
    { value: "territories", label: <><Map className="h-3.5 w-3.5 mr-1" /> {t("tabs.territories")} <HintTooltip {...HINTS.tooltips.exploreTerritories} /></>, visible: !isGuest },
    { value: "matchmaker", label: <><Sparkles className="h-3.5 w-3.5 mr-1" /> {t("tabs.matchmaker")} <HintTooltip {...HINTS.tooltips.exploreMatchmaker} /></>, visible: !!currentUserId },
  ], [isGuest, isCreative, currentUserId, label, t]);

  const defaultOrder = useMemo(() => exploreTabs.filter(t => t.visible !== false).map(t => t.value), [exploreTabs]);
  const { orderedTabs, saveOrder, resetOrder, isCustomized } = useTabOrder("explore_hub", defaultOrder);

  return (
    <Tabs value={tab} onValueChange={onTabChange}>
      <div className="group/tabs mb-6">
        <SortableTabsList tabs={exploreTabs} orderedKeys={orderedTabs} onReorder={saveOrder} onReset={resetOrder} isCustomized={isCustomized} />
      </div>
      <div className="flex justify-end mb-3">
        <GridDensityToggle density={gridDensity.density} setDensity={gridDensity.setDensity} />
      </div>
      {children}
    </Tabs>
  );
}

function QuestsSubTabs() {
  const [sub, setSub] = useState<"quests" | "ideas" | "missions">("quests");
  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Button variant={sub === "quests" ? "default" : "outline"} size="sm" onClick={() => setSub("quests")}>Quests</Button>
        <Button variant={sub === "missions" ? "default" : "outline"} size="sm" onClick={() => setSub("missions")}>
          <Target className="h-3.5 w-3.5 mr-1" /> Missions
        </Button>
        <Button variant={sub === "ideas" ? "default" : "outline"} size="sm" onClick={() => setSub("ideas")}>
          <Lightbulb className="h-3.5 w-3.5 mr-1" /> Ideas
        </Button>
      </div>
      {sub === "quests" && <QuestsMarketplace bare />}
      {sub === "missions" && <QuestsMarketplace bare statusFilter="OPEN_OR_PROPOSALS" />}
      {sub === "ideas" && <QuestsMarketplace bare natureFilter="IDEA" />}
    </div>
  );
}

function JobsSubTabs() {
  const [sub, setSub] = useState<"positions" | "quests" | "ideas">("positions");
  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Button variant={sub === "positions" ? "default" : "outline"} size="sm" onClick={() => setSub("positions")}>
          <Briefcase className="h-3.5 w-3.5 mr-1" /> Open Positions
        </Button>
        <Button variant={sub === "quests" ? "default" : "outline"} size="sm" onClick={() => setSub("quests")}>
          <Swords className="h-3.5 w-3.5 mr-1" /> Quests
        </Button>
        <Button variant={sub === "ideas" ? "default" : "outline"} size="sm" onClick={() => setSub("ideas")}>
          <Lightbulb className="h-3.5 w-3.5 mr-1" /> Ideas
        </Button>
      </div>
      {sub === "positions" && <JobsExplore bare />}
      {sub === "quests" && <QuestsMarketplace bare statusFilter="OPEN_OR_PROPOSALS" />}
      {sub === "ideas" && <QuestsMarketplace bare natureFilter="IDEA" />}
    </div>
  );
}