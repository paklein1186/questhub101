import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CurrentUserProvider } from "@/hooks/useCurrentUser";
import { NotificationProvider } from "@/hooks/useNotifications";
import { RequireAuth, RedirectIfAuthed } from "@/components/AuthGuard";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ExploreHub from "./pages/ExploreHub";
import WorkHub from "./pages/WorkHub";
import NetworkHub from "./pages/NetworkHub";
import MeHub from "./pages/MeHub";
import GuildDetail from "./pages/GuildDetail";
import GuildEdit from "./pages/GuildEdit";
import GuildSettings from "./pages/GuildSettings";
import QuestDetail from "./pages/QuestDetail";
import UserProfile from "./pages/UserProfile";
import ProfileEdit from "./pages/ProfileEdit";
import NotificationsCenter from "./pages/NotificationsCenter";
import AdminDashboard from "./pages/AdminDashboard";
import AchievementDetail from "./pages/AchievementDetail";
import PodDetail from "./pages/PodDetail";
import ServiceDetail from "./pages/ServiceDetail";
import CompanyDetail from "./pages/CompanyDetail";
import CompanySettings from "./pages/CompanySettings";
import TopicHouse from "./pages/TopicHouse";
import BuyXpPage from "./pages/BuyXpPage";
import PlansPage from "./pages/PlansPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import SearchPage from "./pages/SearchPage";
import ErrorPage from "./pages/ErrorPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CurrentUserProvider>
          <NotificationProvider currentUserId="u1">
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Auth pages — redirect away if already logged in */}
                <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
                <Route path="/signup" element={<RedirectIfAuthed><Signup /></RedirectIfAuthed>} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Public pages */}
                <Route path="/" element={<Index />} />
                <Route path="/error/:code" element={<ErrorPage />} />
                <Route path="/explore" element={<ExploreHub />} />
                <Route path="/guilds/:id" element={<GuildDetail />} />
                <Route path="/quests/:id" element={<QuestDetail />} />
                <Route path="/users/:id" element={<UserProfile />} />
                <Route path="/achievements/:id" element={<AchievementDetail />} />
                <Route path="/pods/:id" element={<PodDetail />} />
                <Route path="/services/:id" element={<ServiceDetail />} />
                <Route path="/companies/:id" element={<CompanyDetail />} />
                <Route path="/companies/:id/settings" element={<RequireAuth><CompanySettings /></RequireAuth>} />
                <Route path="/topics/:slug" element={<TopicHouse />} />

                {/* Protected pages */}
                <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
                <Route path="/work" element={<RequireAuth><WorkHub /></RequireAuth>} />
                <Route path="/network" element={<RequireAuth><NetworkHub /></RequireAuth>} />
                <Route path="/me" element={<RequireAuth><MeHub /></RequireAuth>} />
                <Route path="/guilds/:id/edit" element={<RequireAuth><GuildEdit /></RequireAuth>} />
                <Route path="/guilds/:id/settings" element={<RequireAuth><GuildSettings /></RequireAuth>} />
                <Route path="/profile/edit" element={<RequireAuth><ProfileEdit /></RequireAuth>} />
                <Route path="/me/xp" element={<RequireAuth><BuyXpPage /></RequireAuth>} />
                <Route path="/me/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
                <Route path="/plans" element={<RequireAuth><PlansPage /></RequireAuth>} />
                <Route path="/notifications" element={<RequireAuth><NotificationsCenter /></RequireAuth>} />
                <Route path="/admin" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
                <Route path="/search" element={<RequireAuth><SearchPage /></RequireAuth>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </NotificationProvider>
        </CurrentUserProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
