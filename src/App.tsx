import { Toaster } from "@/components/ui/toaster";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CurrentUserProvider } from "@/hooks/useCurrentUser";
import { NotificationProvider } from "@/hooks/useNotifications";
import { PersonaThemeProvider } from "@/components/PersonaThemeProvider";
import { ChatBubbleProvider } from "@/components/chat/ChatBubbleContext";
import { ChatBubbleOverlay } from "@/components/chat/ChatBubbleOverlay";
import { PiPanelProvider } from "@/components/pi/PiPanelProvider";
import { PiPanel } from "@/components/pi/PiPanel";
import { PiFloatingButton } from "@/components/pi/PiFloatingButton";
import { GuestBauhausShape } from "@/components/GuestBauhausShape";
import { BugReportBubble } from "@/components/BugReportBubble";
import { RequireAuth, RedirectIfAuthed } from "@/components/AuthGuard";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ExploreHub from "./pages/ExploreHub";
import WorkHub from "./pages/WorkHub";
import FeedHub from "./pages/FeedHub";
import NetworkHub from "./pages/NetworkHub";
import MeHub from "./pages/MeHub";
import GuildDetail from "./pages/GuildDetail";
import GuildEdit from "./pages/GuildEdit";
import GuildSettings from "./pages/GuildSettings";
import QuestDetail from "./pages/QuestDetail";
import QuestSettings from "./pages/QuestSettings";
import UserProfile from "./pages/UserProfile";
import ProfileEdit from "./pages/ProfileEdit";
import NotificationsCenter from "./pages/NotificationsCenter";
import { lazy, Suspense, useEffect } from "react";
import AdminLayout from "./components/AdminLayout";

const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminCommunityUsers = lazy(() => import("./pages/admin/AdminCommunityUsers"));
const AdminCommunityGuilds = lazy(() => import("./pages/admin/AdminCommunityGuilds"));
const AdminCommunityPods = lazy(() => import("./pages/admin/AdminCommunityPods"));
const AdminCommunityCompanies = lazy(() => import("./pages/admin/AdminCommunityCompanies"));
const AdminContentQuests = lazy(() => import("./pages/admin/AdminContentQuests"));
const AdminContentCourses = lazy(() => import("./pages/admin/AdminContentCourses"));
const AdminContentServices = lazy(() => import("./pages/admin/AdminContentServices"));
const AdminContentReports = lazy(() => import("./pages/admin/AdminContentReports"));
const AdminEconomyBookings = lazy(() => import("./pages/admin/AdminEconomyBookings"));
const AdminEconomyPayments = lazy(() => import("./pages/admin/AdminEconomyPayments"));
const AdminEconomyCommissions = lazy(() => import("./pages/admin/AdminEconomyCommissions"));
const AdminEconomyXp = lazy(() => import("./pages/admin/AdminEconomyXp"));
const AdminEconomyPlans = lazy(() => import("./pages/admin/AdminEconomyPlans"));
const AdminEconomyNotifications = lazy(() => import("./pages/admin/AdminEconomyNotifications"));
const AdminEconomyEmails = lazy(() => import("./pages/admin/AdminEconomyEmails"));
const AdminEconomyTreasury = lazy(() => import("./pages/admin/AdminEconomyTreasury"));
const AdminEconomyAgentBilling = lazy(() => import("./pages/admin/AdminEconomyAgentBilling"));
const AdminSystemRoles = lazy(() => import("./pages/admin/AdminSystemRoles"));
const AdminSystemHouses = lazy(() => import("./pages/admin/AdminSystemHouses"));
const AdminSystemGovernance = lazy(() => import("./pages/admin/AdminSystemGovernance"));
const AdminSystemAudit = lazy(() => import("./pages/admin/AdminSystemAudit"));
const AdminSystemIntegrations = lazy(() => import("./pages/admin/AdminSystemIntegrations"));
const AdminFeatureToggles = lazy(() => import("./pages/admin/AdminFeatureToggles"));
const AdminSuperMode = lazy(() => import("./pages/admin/AdminSuperMode"));
const AdminExcerptReports = lazy(() => import("./pages/admin/AdminExcerptReports"));
const AdminMilestones = lazy(() => import("./pages/admin/AdminMilestones"));
const AdminFeatureSuggestions = lazy(() => import("./pages/admin/AdminFeatureSuggestions"));
const AdminEmailTemplates = lazy(() => import("./pages/admin/AdminEmailTemplates"));
import AchievementDetail from "./pages/AchievementDetail";
import PodDetail from "./pages/PodDetail";
import PodSettings from "./pages/PodSettings";
import ServiceDetail from "./pages/ServiceDetail";
import BookingDetail from "./pages/BookingDetail";
import CallRoom from "./pages/CallRoom";
import RitualCallRoom from "./pages/RitualCallRoom";
import CompanyDetail from "./pages/CompanyDetail";
import CompanySettings from "./pages/CompanySettings";
import TopicHouse from "./pages/TopicHouse";
import BuyXpPage from "./pages/BuyXpPage";
import PlansPage from "./pages/PlansPage";
import SettingsPage from "./pages/SettingsPage";
import MyBookings from "./pages/MyBookings";
import MyRequests from "./pages/MyRequests";
import MyGuilds from "./pages/MyGuilds";
import MyAvailability from "./pages/MyAvailability";
import NotFound from "./pages/NotFound";
import ShareRedirect from "./pages/ShareRedirect";
import MyCompanies from "./pages/MyCompanies";
import SearchPage from "./pages/SearchPage";
import ErrorPage from "./pages/ErrorPage";
import OnboardingChecklist from "./pages/OnboardingChecklist";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import CookiesPage from "./pages/CookiesPage";
import ServicesMarketplace from "./pages/ServicesMarketplace";
import CoursesExplore from "./pages/CoursesExplore";
import CourseDetail from "./pages/CourseDetail";
import CourseCreate from "./pages/CourseCreate";
import LessonView from "./pages/LessonView";
import MyCourses from "./pages/MyCourses";
import ExploreUsers from "./pages/ExploreUsers";
import ExploreHouses from "./pages/ExploreHouses";
import QuestCreate from "./pages/QuestCreate";
import ServiceCreate from "./pages/ServiceCreate";
import MyStarredExcerpts from "./pages/MyStarredExcerpts";
import JobsPage from "./pages/JobsPage";
import MilestonesHub from "./pages/MilestonesHub";
import MyFollowing from "./pages/MyFollowing";
import AboutPage from "./pages/AboutPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import SupportPage from "./pages/SupportPage";
import ContactPage from "./pages/ContactPage";
import SecurityPage from "./pages/SecurityPage";
import QuestsInfoPage from "./pages/QuestsInfoPage";
import GuildsInfoPage from "./pages/GuildsInfoPage";
import CompaniesInfoPage from "./pages/CompaniesInfoPage";
import PeopleInfoPage from "./pages/PeopleInfoPage";
import TerritoriesHousesPage from "./pages/TerritoriesHousesPage";
import CreateQuestInfoPage from "./pages/CreateQuestInfoPage";
import ServiceInfoPage from "./pages/ServiceInfoPage";
import CreateGuildInfoPage from "./pages/CreateGuildInfoPage";
import CreateCompanyInfoPage from "./pages/CreateCompanyInfoPage";
import CoursesInfoPage from "./pages/CoursesInfoPage";
import AIInfoPage from "./pages/AIInfoPage";
import TerritoryAgentsInfoPage from "./pages/TerritoryAgentsInfoPage";
import AIEthicsPage from "./pages/AIEthicsPage";
import CommunityGuidelinesPage from "./pages/CommunityGuidelinesPage";
import GovernancePage from "./pages/GovernancePage";
import RoadmapPage from "./pages/RoadmapPage";
import BugReportingPage from "./pages/BugReportingPage";
import ManifestoPage from "./pages/ManifestoPage";
import CooperativeVenturePage from "./pages/CooperativeVenturePage";
import WhatComesNextPage from "./pages/WhatComesNextPage";
import VisionHub from "./pages/VisionHub";
import EcosystemHub from "./pages/EcosystemHub";
import LegalHub from "./pages/LegalHub";
import CreativeLanding from "./pages/CreativeLanding";
import HybridLanding from "./pages/HybridLanding";
import ImpactLanding from "./pages/ImpactLanding";
import WelcomePage from "./pages/WelcomePage";
import BrowseLanding from "./pages/BrowseLanding";
import OrganizationsLanding from "./pages/OrganizationsLanding";
import OrganizationOnboarding from "./pages/OrganizationOnboarding";
import OrganizationNextSteps from "./pages/OrganizationNextSteps";
import ProfileEnrichment from "./pages/ProfileEnrichment";
import SharesPage from "./pages/SharesPage";
import RevenueModelsPage from "./pages/RevenueModelsPage";
import CreditEconomyPage from "./pages/CreditEconomyPage";
import UseCasesPage from "./pages/UseCasesPage";
import ProductVisionPage from "./pages/ProductVisionPage";
import GuidesPage from "./pages/GuidesPage";
import TerritoryDetail from "./pages/TerritoryDetail";
import InboxPage from "./pages/InboxPage";
import EventDetail from "./pages/EventDetail";
import EventEdit from "./pages/EventEdit";
import EventSettings from "./pages/EventSettings";
import CalendarPage from "./pages/CalendarPage";
import AgentsMarketplace from "./pages/AgentsMarketplace";
import AgentDetail from "./pages/AgentDetail";
import DocumentRedirect from "./pages/DocumentRedirect";
import PublicWebsite from "./pages/PublicWebsite";
import PublicBooking from "./pages/PublicBooking";
import NaturalSystemPage from "./pages/NaturalSystemPage";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CurrentUserProvider>
          <NotificationProvider currentUserId="">
            <PersonaThemeProvider>
            <ChatBubbleProvider>
            <PiPanelProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <ScrollToTop />
            
            <GuestBauhausShape />
            <ChatBubbleOverlay />
            <PiPanel />
            <PiFloatingButton />
            <BugReportBubble />
              <Routes>
                {/* Auth pages — redirect away if already logged in */}
                <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
                <Route path="/signup" element={<RedirectIfAuthed><Signup /></RedirectIfAuthed>} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Share redirect — fallback when _redirects proxy doesn't intercept */}
                <Route path="/share/:type/:id" element={<ShareRedirect />} />

                {/* Public pages */}
                <Route path="/" element={<Index />} />
                <Route path="/welcome" element={<WelcomePage />} />
                <Route path="/landing/creative" element={<CreativeLanding />} />
                <Route path="/landing/hybrid" element={<HybridLanding />} />
                <Route path="/landing/impact" element={<ImpactLanding />} />
                <Route path="/landing/browse" element={<BrowseLanding />} />
                <Route path="/organizations" element={<OrganizationsLanding />} />
                <Route path="/onboarding/organization" element={<RequireAuth><OrganizationOnboarding /></RequireAuth>} />
                <Route path="/organizations/:id/next-steps" element={<RequireAuth><OrganizationNextSteps /></RequireAuth>} />
                <Route path="/error/:code" element={<ErrorPage />} />
                <Route path="/explore" element={<ExploreHub />} />
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="/explore/users" element={<ExploreUsers />} />
                <Route path="/explore/houses" element={<ExploreHouses />} />
                <Route path="/guilds/:id" element={<GuildDetail />} />
                <Route path="/guilds/:guildId/quests/new" element={<RequireAuth><QuestCreate /></RequireAuth>} />
                <Route path="/companies/:companyId/quests/new" element={<RequireAuth><QuestCreate /></RequireAuth>} />
                <Route path="/quests/new" element={<RequireAuth><QuestCreate /></RequireAuth>} />
                <Route path="/quests/:id" element={<QuestDetail />} />
                <Route path="/users/:id" element={<UserProfile />} />
                <Route path="/achievements/:id" element={<AchievementDetail />} />
                <Route path="/pods/:id" element={<PodDetail />} />
                <Route path="/pods/:id/settings" element={<RequireAuth><PodSettings /></RequireAuth>} />
                <Route path="/services/new" element={<RequireAuth><ServiceCreate /></RequireAuth>} />
                <Route path="/services/:id/edit" element={<RequireAuth><ServiceCreate /></RequireAuth>} />
                <Route path="/services/:id" element={<ServiceDetail />} />
                <Route path="/bookings/:id" element={<RequireAuth><BookingDetail /></RequireAuth>} />
                <Route path="/call/:bookingId" element={<RequireAuth><CallRoom /></RequireAuth>} />
                <Route path="/ritual-call/:occurrenceId" element={<RequireAuth><RitualCallRoom /></RequireAuth>} />
                <Route path="/companies/:id" element={<CompanyDetail />} />
                <Route path="/companies/:id/settings" element={<RequireAuth><CompanySettings /></RequireAuth>} />
                <Route path="/topics/:slug" element={<TopicHouse />} />
                <Route path="/courses/:id" element={<CourseDetail />} />
                <Route path="/events/:id" element={<EventDetail />} />
                <Route path="/events/:id/edit" element={<RequireAuth><EventEdit /></RequireAuth>} />
                <Route path="/events/:id/settings" element={<RequireAuth><EventSettings /></RequireAuth>} />
                <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonView />} />
                <Route path="/cookies" element={<CookiesPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/security" element={<SecurityPage />} />
                <Route path="/explore/quests-info" element={<QuestsInfoPage />} />
                <Route path="/explore/guilds-info" element={<GuildsInfoPage />} />
                <Route path="/explore/companies-info" element={<CompaniesInfoPage />} />
                <Route path="/explore/people-info" element={<PeopleInfoPage />} />
                <Route path="/territories-houses" element={<TerritoriesHousesPage />} />
                <Route path="/territories/:id" element={<TerritoryDetail />} />
                <Route path="/natural-systems/:id" element={<NaturalSystemPage />} />
                <Route path="/create/quest-info" element={<CreateQuestInfoPage />} />
                <Route path="/create/service-info" element={<ServiceInfoPage />} />
                <Route path="/create/guild-info" element={<CreateGuildInfoPage />} />
                <Route path="/create/company-info" element={<CreateCompanyInfoPage />} />
                <Route path="/courses-info" element={<CoursesInfoPage />} />
                <Route path="/ai-info" element={<AIInfoPage />} />
                <Route path="/ai/territory-agents-info" element={<TerritoryAgentsInfoPage />} />
                <Route path="/ai-ethics" element={<AIEthicsPage />} />
                <Route path="/community-guidelines" element={<CommunityGuidelinesPage />} />
                <Route path="/governance" element={<Navigate to="/ecosystem?tab=governance" replace />} />
                <Route path="/roadmap" element={<RoadmapPage />} />
                <Route path="/bugs" element={<BugReportingPage />} />
                <Route path="/manifesto" element={<Navigate to="/vision?tab=manifesto" replace />} />
                <Route path="/cooperative" element={<Navigate to="/vision?tab=cooperative" replace />} />
                <Route path="/what-comes-next" element={<Navigate to="/vision?tab=what-comes-next" replace />} />
                <Route path="/revenue-models" element={<Navigate to="/ecosystem?tab=revenue" replace />} />
                <Route path="/credit-economy" element={<Navigate to="/ecosystem?tab=credits" replace />} />
                <Route path="/use-cases" element={<Navigate to="/vision?tab=use-cases" replace />} />
                <Route path="/features" element={<Navigate to="/vision?tab=features" replace />} />
                <Route path="/vision" element={<VisionHub />} />
                <Route path="/ecosystem" element={<EcosystemHub />} />
                <Route path="/legal" element={<LegalHub />} />
                <Route path="/terms" element={<Navigate to="/legal?tab=terms" replace />} />
                <Route path="/privacy" element={<Navigate to="/legal?tab=privacy" replace />} />
                <Route path="/contact" element={<Navigate to="/legal?tab=contact" replace />} />
                <Route path="/guides" element={<GuidesPage />} />
                <Route path="/agents" element={<AgentsMarketplace />} />
                <Route path="/agents/:id" element={<AgentDetail />} />
                <Route path="/documents/:id" element={<DocumentRedirect />} />
                <Route path="/site/:websiteSlug" element={<PublicWebsite />} />
                <Route path="/site/:websiteSlug/:pageSlug" element={<PublicWebsite />} />
                <Route path="/book/:id" element={<PublicBooking />} />

                {/* Protected pages */}
                <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
                <Route path="/feed" element={<RequireAuth><FeedHub /></RequireAuth>} />
                <Route path="/work" element={<RequireAuth><WorkHub /></RequireAuth>} />
                <Route path="/calendar" element={<RequireAuth><CalendarPage /></RequireAuth>} />
                <Route path="/network" element={<RequireAuth><NetworkHub /></RequireAuth>} />
                <Route path="/me" element={<RequireAuth><SettingsPage /></RequireAuth>} />
                <Route path="/me/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
                <Route path="/settings/wallet" element={<RequireAuth><SettingsPage /></RequireAuth>} />
                <Route path="/guilds/:id/edit" element={<RequireAuth><GuildEdit /></RequireAuth>} />
                <Route path="/guilds/:id/settings" element={<RequireAuth><GuildSettings /></RequireAuth>} />
                <Route path="/quests/:id/settings" element={<RequireAuth><QuestSettings /></RequireAuth>} />
                <Route path="/profile/edit" element={<RequireAuth><ProfileEdit /></RequireAuth>} />
                <Route path="/profile/enrich" element={<RequireAuth><ProfileEnrichment /></RequireAuth>} />
                <Route path="/me/bookings" element={<RequireAuth><MyBookings /></RequireAuth>} />
                <Route path="/me/requests" element={<RequireAuth><MyRequests /></RequireAuth>} />
                <Route path="/me/guilds" element={<RequireAuth><SettingsPage /></RequireAuth>} />
                <Route path="/me/availability" element={<RequireAuth><MyAvailability /></RequireAuth>} />
                <Route path="/me/services" element={<RequireAuth><SettingsPage /></RequireAuth>} />
                <Route path="/me/xp" element={<RequireAuth><BuyXpPage /></RequireAuth>} />
                <Route path="/me/credits" element={<RequireAuth><BuyXpPage /></RequireAuth>} />
                <Route path="/me/companies" element={<RequireAuth><MyCompanies /></RequireAuth>} />
                <Route path="/plans" element={<RequireAuth><PlansPage /></RequireAuth>} />
                <Route path="/shares" element={<RequireAuth><SharesPage /></RequireAuth>} />
                <Route path="/notifications" element={<RequireAuth><NotificationsCenter /></RequireAuth>} />
                <Route path="/admin" element={<RequireAuth><Suspense fallback={null}><AdminLayout /></Suspense></RequireAuth>}>
                  <Route index element={<Suspense fallback={null}><AdminOverview /></Suspense>} />
                  <Route path="community/users" element={<Suspense fallback={null}><AdminCommunityUsers /></Suspense>} />
                  <Route path="community/guilds" element={<Suspense fallback={null}><AdminCommunityGuilds /></Suspense>} />
                  <Route path="community/pods" element={<Suspense fallback={null}><AdminCommunityPods /></Suspense>} />
                  <Route path="community/companies" element={<Suspense fallback={null}><AdminCommunityCompanies /></Suspense>} />
                  <Route path="content/quests" element={<Suspense fallback={null}><AdminContentQuests /></Suspense>} />
                  <Route path="content/courses" element={<Suspense fallback={null}><AdminContentCourses /></Suspense>} />
                  <Route path="content/services" element={<Suspense fallback={null}><AdminContentServices /></Suspense>} />
                  <Route path="content/reports" element={<Suspense fallback={null}><AdminContentReports /></Suspense>} />
                  <Route path="content/excerpt-reports" element={<Suspense fallback={null}><AdminExcerptReports /></Suspense>} />
                  <Route path="economy/bookings" element={<Suspense fallback={null}><AdminEconomyBookings /></Suspense>} />
                  <Route path="economy/payments" element={<Suspense fallback={null}><AdminEconomyPayments /></Suspense>} />
                  <Route path="economy/commissions" element={<Suspense fallback={null}><AdminEconomyCommissions /></Suspense>} />
                  <Route path="economy/xp" element={<Suspense fallback={null}><AdminEconomyXp /></Suspense>} />
                  <Route path="economy/plans" element={<Suspense fallback={null}><AdminEconomyPlans /></Suspense>} />
                  <Route path="economy/notifications" element={<Suspense fallback={null}><AdminEconomyNotifications /></Suspense>} />
                  <Route path="economy/emails" element={<Suspense fallback={null}><AdminEconomyEmails /></Suspense>} />
                  <Route path="economy/treasury" element={<Suspense fallback={null}><AdminEconomyTreasury /></Suspense>} />
                  <Route path="economy/agent-billing" element={<Suspense fallback={null}><AdminEconomyAgentBilling /></Suspense>} />
                  <Route path="system/roles" element={<Suspense fallback={null}><AdminSystemRoles /></Suspense>} />
                  <Route path="system/houses" element={<Suspense fallback={null}><AdminSystemHouses /></Suspense>} />
                  <Route path="system/governance" element={<Suspense fallback={null}><AdminSystemGovernance /></Suspense>} />
                  <Route path="system/audit" element={<Suspense fallback={null}><AdminSystemAudit /></Suspense>} />
                  <Route path="system/integrations" element={<Suspense fallback={null}><AdminSystemIntegrations /></Suspense>} />
                  <Route path="system/feature-toggles" element={<Suspense fallback={null}><AdminFeatureToggles /></Suspense>} />
                  <Route path="system/super-mode" element={<Suspense fallback={null}><AdminSuperMode /></Suspense>} />
                  <Route path="economy/milestones" element={<Suspense fallback={null}><AdminMilestones /></Suspense>} />
                  <Route path="content/feature-suggestions" element={<Suspense fallback={null}><AdminFeatureSuggestions /></Suspense>} />
                  <Route path="system/email-templates" element={<Suspense fallback={null}><AdminEmailTemplates /></Suspense>} />
                </Route>
                <Route path="/search" element={<RequireAuth><SearchPage /></RequireAuth>} />
                <Route path="/me/onboarding" element={<RequireAuth><OnboardingChecklist /></RequireAuth>} />
                <Route path="/courses/new" element={<RequireAuth><CourseCreate /></RequireAuth>} />
                <Route path="/courses/:id/edit" element={<RequireAuth><CourseCreate /></RequireAuth>} />
                <Route path="/work/courses" element={<RequireAuth><MyCourses /></RequireAuth>} />
                <Route path="/me/starred-excerpts" element={<RequireAuth><MyStarredExcerpts /></RequireAuth>} />
                <Route path="/me/following" element={<RequireAuth><MyFollowing /></RequireAuth>} />
                <Route path="/me/milestones" element={<RequireAuth><MilestonesHub /></RequireAuth>} />
                <Route path="/inbox" element={<RequireAuth><InboxPage /></RequireAuth>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            </PiPanelProvider>
            </ChatBubbleProvider>
            </PersonaThemeProvider>
          </NotificationProvider>
        </CurrentUserProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
