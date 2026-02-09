import { useState } from "react";
import { Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/PageShell";
import GuildsList from "./GuildsList";
import QuestsMarketplace from "./QuestsMarketplace";
import PodsList from "./PodsList";
import ServicesMarketplace from "./ServicesMarketplace";
import CompaniesList from "./CompaniesList";

export default function ExploreHub() {
  const [tab, setTab] = useState("quests");

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
