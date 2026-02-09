import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CurrentUserProvider } from "@/hooks/useCurrentUser";
import { NotificationProvider } from "@/hooks/useNotifications";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import GuildsList from "./pages/GuildsList";
import GuildDetail from "./pages/GuildDetail";
import QuestsMarketplace from "./pages/QuestsMarketplace";
import QuestDetail from "./pages/QuestDetail";
import UserProfile from "./pages/UserProfile";
import NotificationsCenter from "./pages/NotificationsCenter";
import AdminDashboard from "./pages/AdminDashboard";
import AchievementDetail from "./pages/AchievementDetail";
import PodsList from "./pages/PodsList";
import PodDetail from "./pages/PodDetail";
import ServicesMarketplace from "./pages/ServicesMarketplace";
import ServiceDetail from "./pages/ServiceDetail";
import MyBookings from "./pages/MyBookings";
import MyRequests from "./pages/MyRequests";
import CompaniesList from "./pages/CompaniesList";
import CompanyDetail from "./pages/CompanyDetail";
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
              <Route path="/guilds" element={<GuildsList />} />
              <Route path="/guilds/:id" element={<GuildDetail />} />
              <Route path="/quests" element={<QuestsMarketplace />} />
              <Route path="/quests/:id" element={<QuestDetail />} />
              <Route path="/users/:id" element={<UserProfile />} />
              <Route path="/notifications" element={<NotificationsCenter />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/achievements/:id" element={<AchievementDetail />} />
              <Route path="/pods" element={<PodsList />} />
              <Route path="/pods/:id" element={<PodDetail />} />
              <Route path="/services" element={<ServicesMarketplace />} />
              <Route path="/services/:id" element={<ServiceDetail />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/my-requests" element={<MyRequests />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </CurrentUserProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
