import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/PageShell";
import GuildsList from "./GuildsList";
import QuestsMarketplace from "./QuestsMarketplace";
import PodsList from "./PodsList";
import ServicesMarketplace from "./ServicesMarketplace";
import CompaniesList from "./CompaniesList";

const VALID_TABS = ["quests", "guilds", "pods", "services", "companies"];

export default function ExploreHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get("tab") || "") ? searchParams.get("tab")! : "quests";
  const [tab, setTab] = useState(initialTab);

  const handleTabChange = (value: string) => {
    setTab(value);
    setSearchParams(value === "quests" ? {} : { tab: value }, { replace: true });
  };

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Search className="h-7 w-7 text-primary" /> Explore
        </h1>
        <p className="text-muted-foreground mt-1">Discover quests, guilds, pods, services, and companies.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="quests">Quests</TabsTrigger>
          <TabsTrigger value="guilds">Guilds</TabsTrigger>
          <TabsTrigger value="pods">Pods</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
        </TabsList>

        <TabsContent value="quests"><QuestsMarketplace bare /></TabsContent>
        <TabsContent value="guilds"><GuildsList bare /></TabsContent>
        <TabsContent value="pods"><PodsList bare /></TabsContent>
        <TabsContent value="services"><ServicesMarketplace bare /></TabsContent>
        <TabsContent value="companies"><CompaniesList bare /></TabsContent>
      </Tabs>
    </PageShell>
  );
}
