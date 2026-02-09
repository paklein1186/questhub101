import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import GuildsList from "./pages/GuildsList";
import GuildDetail from "./pages/GuildDetail";
import QuestsMarketplace from "./pages/QuestsMarketplace";
import QuestDetail from "./pages/QuestDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/guilds" element={<GuildsList />} />
          <Route path="/guilds/:id" element={<GuildDetail />} />
          <Route path="/quests" element={<QuestsMarketplace />} />
          <Route path="/quests/:id" element={<QuestDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
