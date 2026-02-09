import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CurrentUserProvider } from "@/hooks/useCurrentUser";
import { NotificationProvider } from "@/hooks/useNotifications";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import ExploreHub from "./pages/ExploreHub";
import WorkHub from "./pages/WorkHub";
import NetworkHub from "./pages/NetworkHub";
import MeHub from "./pages/MeHub";
import GuildDetail from "./pages/GuildDetail";
import GuildEdit from "./pages/GuildEdit";
import QuestDetail from "./pages/QuestDetail";
import UserProfile from "./pages/UserProfile";
import ProfileEdit from "./pages/ProfileEdit";
import NotificationsCenter from "./pages/NotificationsCenter";
import AdminDashboard from "./pages/AdminDashboard";
import AchievementDetail from "./pages/AchievementDetail";
import PodDetail from "./pages/PodDetail";
import ServiceDetail from "./pages/ServiceDetail";
import CompanyDetail from "./pages/CompanyDetail";
import TopicHouse from "./pages/TopicHouse";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CurrentUserProvider>
        <NotificationProvider currentUserId="u1">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/onboarding" element={<Onboarding />} />
              {/* Hub pages */}
              <Route path="/explore" element={<ExploreHub />} />
              <Route path="/work" element={<WorkHub />} />
              <Route path="/network" element={<NetworkHub />} />
              <Route path="/me" element={<MeHub />} />
              {/* Detail pages */}
              <Route path="/guilds/:id" element={<GuildDetail />} />
              <Route path="/guilds/:id/edit" element={<GuildEdit />} />
              <Route path="/quests/:id" element={<QuestDetail />} />
              <Route path="/users/:id" element={<UserProfile />} />
              <Route path="/profile/edit" element={<ProfileEdit />} />
              <Route path="/notifications" element={<NotificationsCenter />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/achievements/:id" element={<AchievementDetail />} />
              <Route path="/pods/:id" element={<PodDetail />} />
              <Route path="/services/:id" element={<ServiceDetail />} />
              <Route path="/companies/:id" element={<CompanyDetail />} />
              <Route path="/topics/:slug" element={<TopicHouse />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </CurrentUserProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
