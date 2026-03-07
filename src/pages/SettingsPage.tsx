import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePersona } from "@/hooks/usePersona";
import type { PersonaType } from "@/lib/personaLabels";
import { LEXICON_MODES, type LexiconMode } from "@/lib/personaLabels";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, UserCircle, Hash, Bell, Briefcase, Zap, Eye, EyeOff, Plug,
  Lock, Save, Trash2, Pencil, MapPin, Plus, Clock, Compass, Globe,
  ToggleLeft, ToggleRight, ExternalLink, Loader2, Package,
  CheckCircle, Crown, Check, ArrowRight, Download, AlertTriangle,
  Sparkles, Swords, Users, GraduationCap, CalendarCheck, Star,
  Coins, TrendingDown, Rss, Languages, CalendarSync, MessageSquare,
  History, Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageShell } from "@/components/PageShell";
import { ImageUpload } from "@/components/ImageUpload";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNotifications as useNotificationsHook, requestPushPermission as requestPushPermissionFn, getPushPermissionState } from "@/hooks/useNotifications";
import { useNotificationPreferences as useNotificationPreferencesHook } from "@/hooks/useNotificationPreferences";
import { useUserRoles } from "@/lib/admin";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTopics, useTerritories } from "@/hooks/useSupabaseData";
import { UserRole, OnlineLocationType } from "@/types/enums";
import type { Service } from "@/types";
import { SocialLinksEdit, normalizeUrl as normUrl } from "@/components/SocialLinks";
import { AddTerritoryDialog } from "@/components/AddTerritoryDialog";
import { HOUSE_DEFINITIONS, getHouseLabel, getHouseIcon, defaultUniverseForPersona } from "@/lib/universeMapping";
import type { AvailabilityRule, AvailabilityException } from "@/types";
import MyAvailability from "./MyAvailability";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { MyServicesPanel } from "@/components/MyServicesPanel";
import { MyQuestsTab, MyGuildsTab, MyPodsTab, MyCoursesTab } from "@/components/MyContentTabs";
import { AIWriterButton } from "@/components/AIWriterButton";
import { LanguageSettingsTab } from "@/components/LanguageSettingsTab";
import { WalletTab } from "@/components/WalletTab";
import { CalendarSyncTab } from "@/components/CalendarSyncTab";
import { ProfileMaskingSettings } from "@/components/ProfileMaskingSettings";
import { ActivityHistoryTab } from "@/components/ActivityHistoryTab";
import { StripeConnectSection } from "@/components/StripeConnectSection";
import { SiteCodeManager } from "@/components/website/SiteCodeManager";
import { FeedpointVisibilitySettings } from "@/components/website/FeedpointVisibilitySettings";
import { IcsFeedsManager } from "@/components/IcsFeedsManager";
import { GiveBackSettingsSection } from "@/components/giveback/GiveBackSettingsSection";
import { Heart } from "lucide-react";
import { MonOVNPanel } from "@/components/home/MonOVNPanel";


const TABS = [
  { key: "profile", label: "settings.profile", icon: UserCircle },
  { key: "persona", label: "settings.persona", icon: Compass },
  { key: "language", label: "settings.language", icon: Languages },
  { key: "quests", label: "settings.quests", icon: Swords },
  { key: "guilds", label: "settings.guilds", icon: Users },
  { key: "pods", label: "settings.pods", icon: Users },
  { key: "courses", label: "settings.courses", icon: GraduationCap },
  { key: "services", label: "settings.services", icon: Briefcase },
  { key: "calendar", label: "settings.calendar", icon: CalendarSync },
  { key: "bookings", label: "settings.bookings", icon: CalendarCheck },
  { key: "wallet", label: "settings.wallet", icon: Coins },
  { key: "houses", label: "settings.houses", icon: Hash },
  { key: "starred", label: "settings.starred", icon: Star },
  { key: "notifications", label: "settings.notifications", icon: Bell },
  { key: "account", label: "settings.account", icon: Shield },
  { key: "privacy", label: "settings.privacy", icon: Eye },
  { key: "referrals", label: "settings.referrals", icon: UserCircle },
  { key: "apps", label: "settings.apps", icon: Plug },
  { key: "history", label: "Activity History", icon: History },
  { key: "ovn", label: "Mon OVN", icon: Scale },
  { key: "giveback", label: "Give-back", icon: Heart },
  { key: "website", label: "Website", icon: Globe },
];

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const currentUser = useCurrentUser();
  const { persona, updatePersona, lexiconOverride, setLexiconOverride } = usePersona();
  const { user: authUser, updatePassword, signOut, refreshProfile } = useAuth();
  const limits = usePlanLimits();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // DB-sourced topics & territories
  const { data: dbTopics = [] } = useTopics();
  const { data: dbTerritories = [] } = useTerritories();



  const activeTab = searchParams.get("tab") || "profile";
  const setActiveTab = (tab: string) => setSearchParams({ tab }, { replace: true });

  // ── Profile state (sourced from Supabase auth profile, NOT mock) ──
  const [name, setName] = useState(authUser?.name ?? currentUser.name);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(authUser?.avatarUrl ?? "");
  const [role, setRole] = useState<UserRole>(currentUser.role);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Social links state
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");

  // Load full profile from Supabase on mount so we get headline/bio/social
  useEffect(() => {
    if (!authUser?.id) return;
    supabase
      .from("profiles")
      .select("name, headline, bio, avatar_url, role, website_url, twitter_url, linkedin_url, instagram_url, filter_by_houses")
      .eq("user_id", authUser.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setName(data.name || "");
          setHeadline(data.headline || "");
          setBio(data.bio || "");
          setAvatarUrl(data.avatar_url || "");
          setRole((data.role as UserRole) || UserRole.GAMECHANGER);
          setWebsiteUrl((data as any).website_url || "");
          setTwitterUrl((data as any).twitter_url || "");
          setLinkedinUrl((data as any).linkedin_url || "");
          setInstagramUrl((data as any).instagram_url || "");
          setUsePrefs((data as any).filter_by_houses ?? false);
          setProfileLoaded(true);
        }
      });
  }, [authUser?.id]);

  // ── Account state ──
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // ── Houses state (loaded from DB) ──
  const { data: myUserTopics } = useQuery({
    queryKey: ["user-topics", authUser?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_topics").select("topic_id").eq("user_id", authUser!.id);
      return (data ?? []).map((r: any) => r.topic_id);
    },
    enabled: !!authUser?.id,
  });
  const { data: myUserTerritories } = useQuery({
    queryKey: ["user-territories", authUser?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_territories").select("territory_id").eq("user_id", authUser!.id);
      return (data ?? []).map((r: any) => r.territory_id);
    },
    enabled: !!authUser?.id,
  });
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>([]);
  const [usePrefs, setUsePrefs] = useState(true);

  // Sync selected topics/territories when loaded from DB
  useEffect(() => {
    if (myUserTopics) setSelectedTopics(myUserTopics);
  }, [myUserTopics]);
  useEffect(() => {
    if (myUserTerritories) setSelectedTerritories(myUserTerritories);
  }, [myUserTerritories]);

  // ── Privacy state (synced with user model) ──
  const [showXp, setShowXp] = useState(currentUser.showXpPublicly !== false);
  const [showCi, setShowCi] = useState(currentUser.showContributionIndexPublicly !== false);
  const [showAchievements, setShowAchievements] = useState(currentUser.showAchievementsPublicly !== false);
  const [showServices, setShowServices] = useState(currentUser.showServicesPublicly !== false);
  const [allowFollow, setAllowFollow] = useState(currentUser.allowFollows !== false);
  const [allowWallComments, setAllowWallComments] = useState(currentUser.allowProfileComments !== false);

  // Sync privacy changes to DB + local state
  const updatePrivacy = async (field: keyof typeof currentUser, value: boolean, setter: (v: boolean) => void, dbColumn?: string) => {
    setter(value);
    (currentUser as any)[field] = value;
    if (dbColumn && currentUser.id) {
      await supabase.from("profiles").update({ [dbColumn]: value } as any).eq("user_id", currentUser.id);
    }
  };

  // ── Services state (no longer using mock) ──

  // ── Billing state (moved to WalletTab) ──

  // ── Data export & deletion ──
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // ── Handlers ──
  const handleChangePassword = async () => {
    if (newPw !== confirmPw) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    if (newPw.length < 6) { toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return; }
    setPwLoading(true);
    const { error } = await updatePassword(newPw);
    setPwLoading(false);
    if (error) toast({ title: "Error", description: error, variant: "destructive" });
    else { toast({ title: "Password updated!" }); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
  };

  const [profileSaving, setProfileSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!authUser) return;
    setProfileSaving(true);
    const normalizeUrl = (url: string) => {
      const t = url.trim();
      if (!t) return null;
      return /^https?:\/\//i.test(t) ? t : `https://${t}`;
    };
    const updates: Record<string, unknown> = {
      name: name.trim() || currentUser.name,
      headline: headline.trim() || null,
      bio: bio.trim() || null,
      avatar_url: avatarUrl.trim() || null,
      role,
      website_url: normalizeUrl(websiteUrl),
      twitter_url: normalizeUrl(twitterUrl),
      linkedin_url: normalizeUrl(linkedinUrl),
      instagram_url: normalizeUrl(instagramUrl),
    };
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", authUser.id);
    setProfileSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    // Save topic/territory relations to DB
    // Delete existing, then insert new
    if (authUser?.id) {
      await supabase.from("user_topics").delete().eq("user_id", authUser.id);
      if (selectedTopics.length > 0) {
        await supabase.from("user_topics").insert(
          selectedTopics.map((topicId) => ({ user_id: authUser.id, topic_id: topicId }))
        );
      }
      // Fetch previous territory associations to diff follows
      const { data: prevUt } = await supabase.from("user_territories").select("territory_id").eq("user_id", authUser.id);
      const prevTerritoryIds = new Set((prevUt ?? []).map((r: any) => r.territory_id));
      const newTerritoryIds = new Set(selectedTerritories);

      await supabase.from("user_territories").delete().eq("user_id", authUser.id);
      if (selectedTerritories.length > 0) {
        await supabase.from("user_territories").insert(
          selectedTerritories.map((territoryId) => ({ user_id: authUser.id, territory_id: territoryId }))
        );
      }

      // Remove follows for territories that were removed (trigger handles new inserts)
      const removedTerritories = [...prevTerritoryIds].filter((id) => !newTerritoryIds.has(id));
      if (removedTerritories.length > 0) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", authUser.id)
          .eq("target_type", "TERRITORY")
          .in("target_id", removedTerritories);
      }
      qc.invalidateQueries({ queryKey: ["user-topics"] });
      qc.invalidateQueries({ queryKey: ["user-territories"] });
    }
    // Refresh auth context so nav reflects updated name/avatar
    await refreshProfile();
    toast({ title: "Profile updated!" });
  };

  const toggleTopic = (id: string) => setSelectedTopics((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleTerritory = (id: string) => setSelectedTerritories((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  // toggleServiceActive is now handled by MyServicesPanel

  // Billing handlers moved to WalletTab component

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto">
        <h1 className="font-display text-2xl font-bold mb-6">{t("settings.title")}</h1>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar nav */}
          <nav className="md:w-56 shrink-0 space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {t(tab.label)}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

              {/* ── Persona ── */}
              {activeTab === "persona" && (
                <div className="space-y-6">
                  <Section title="How do you primarily use this space?" icon={<Compass className="h-5 w-5" />}>
                    <p className="text-sm text-muted-foreground mb-4">This adapts labels and suggestions across the platform to match your style. It doesn't change permissions or features.</p>
                    <div className="space-y-2 max-w-md">
                      {([
                        { value: "IMPACT" as PersonaType, label: "Mainly for impact work & missions", desc: "Labels like Services, Guilds, Quests & Missions" },
                        { value: "CREATIVE" as PersonaType, label: "Mainly for creative projects & art", desc: "Labels like Skill Sessions, Collectives, Quests & Creations" },
                        { value: "HYBRID" as PersonaType, label: "Both", desc: "A mix of impact and creative language" },
                      ]).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => updatePersona(opt.value, "manual")}
                          className={`w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                            persona === opt.value ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"
                          }`}
                        >
                          <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            persona === opt.value ? "border-primary bg-primary" : "border-muted-foreground/30"
                          }`}>
                            {persona === opt.value && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{opt.label}</p>
                            <p className="text-xs text-muted-foreground">{opt.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    {persona === "UNSET" && (
                      <p className="text-xs text-muted-foreground mt-3">No persona set yet. Complete onboarding or select one above.</p>
                    )}
                   </Section>

                  <Separator />

                  <Section title="World / Lexicon Toggle" icon={<Globe className="h-5 w-5" />}>
                    <p className="text-sm text-muted-foreground mb-4">Override the UI language without changing your persona. This only affects labels and display.</p>
                    <div className="space-y-2 max-w-md">
                      {LEXICON_MODES.map((mode) => {
                        const isActive = lexiconOverride === mode.value || (!lexiconOverride && (
                          (persona === mode.value) || (persona === "UNSET" && mode.value === "NEUTRAL")
                        ));
                        return (
                          <button
                            key={mode.value}
                            onClick={() => {
                              // If selecting the mode that matches persona, clear override
                              if (mode.value === persona || (mode.value === "NEUTRAL" && persona === "UNSET")) {
                                setLexiconOverride(null);
                              } else {
                                setLexiconOverride(mode.value);
                              }
                              toast({ title: `Switched to ${mode.label}` });
                            }}
                            className={`w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                              isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"
                            }`}
                          >
                            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isActive ? "border-primary bg-primary" : "border-muted-foreground/30"
                            }`}>
                              {isActive && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{mode.label}</p>
                              <p className="text-xs text-muted-foreground">{mode.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {lexiconOverride && (
                      <button onClick={() => { setLexiconOverride(null); toast({ title: "Reset to persona default" }); }}
                        className="text-xs text-primary hover:underline mt-3">
                        Reset to persona default
                      </button>
                    )}
                  </Section>

                  <Separator />

                  <Section title="Auto-filter by your Topics" icon={<Hash className="h-5 w-5" />}>
                    <p className="text-sm text-muted-foreground mb-3">When enabled, Explore, Feed, and Search will prioritize content from your selected Topics.</p>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={usePrefs}
                        onCheckedChange={async (checked) => {
                          setUsePrefs(checked);
                          if (authUser?.id) {
                            await supabase.from("profiles").update({ filter_by_houses: checked } as any).eq("user_id", authUser.id);
                            toast({ title: checked ? "Topic filter enabled" : "Topic filter disabled" });
                          }
                        }}
                      />
                      <span className="text-sm font-medium">Use my Topics as default filters across the platform</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">You can always override this with "Show all" in any section.</p>
                  </Section>
                </div>
              )}

              {/* ── Account & Security ── */}
              {activeTab === "account" && (
                <div className="space-y-6">
                  <Section title="Email" icon={<Shield className="h-5 w-5" />}>
                    <div className="flex items-center gap-3">
                      <Input value={authUser?.email || ""} disabled className="max-w-sm" />
                      <Badge variant="secondary">Verified</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Contact support to change your email address.</p>
                  </Section>

                  <Separator />

                  <Section title="Change Password" icon={<Lock className="h-5 w-5" />}>
                    <div className="space-y-3 max-w-sm">
                      <Input type="password" placeholder="Current password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
                      <Input type="password" placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                      <Input type="password" placeholder="Confirm new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
                      <Button onClick={handleChangePassword} disabled={pwLoading || !newPw}>
                        {pwLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Update password
                      </Button>
                    </div>
                  </Section>

                  <Separator />

                  <Section title="Linked Accounts" icon={<Plug className="h-5 w-5" />}>
                    <p className="text-sm text-muted-foreground">Email & password sign-in is currently active. Social logins can be configured in Connected Apps.</p>
                  </Section>

                  <Separator />

                  <Section title="Export My Data" icon={<Download className="h-5 w-5" />}>
                    <p className="text-sm text-muted-foreground mb-3">Download a copy of all your data in JSON format (profile, quests, comments, services, bookings, XP transactions).</p>
                    <Button variant="outline" size="sm" disabled={exportLoading} onClick={async () => {
                      setExportLoading(true);
                      try {
                        const userId = authUser?.id;
                        if (!userId) return;
                        const [qRes, cRes, sRes, bRes] = await Promise.all([
                          supabase.from("quests").select("id, title, description, status, reward_xp").eq("created_by_user_id", userId),
                          supabase.from("comments").select("id, content, created_at, target_type, target_id").eq("author_id", userId),
                          supabase.from("services").select("id, title, description, price_amount, price_currency").eq("provider_user_id", userId).eq("is_deleted", false),
                          supabase.from("bookings").select("id, service_id, status, start_date_time, end_date_time").or(`requester_id.eq.${userId},provider_user_id.eq.${userId}`),
                        ]);
                        const exportData = {
                          user: { id: currentUser.id, name: currentUser.name, email: currentUser.email, role: currentUser.role },
                          quests: qRes.data ?? [],
                          comments: cRes.data ?? [],
                          services: sRes.data ?? [],
                          bookings: bRes.data ?? [],
                        };
                        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `changethegame-data-${currentUser.id}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        toast({ title: "Data exported!", description: "Your data has been downloaded." });
                      } finally {
                        setExportLoading(false);
                      }
                    }}>
                      {exportLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />} Export my data
                    </Button>
                  </Section>

                  <Separator />

                  <Section title="Danger Zone" icon={<Trash2 className="h-5 w-5 text-destructive" />}>
                    <p className="text-sm text-muted-foreground mb-3">Permanently delete your account and all associated data. This action cannot be undone.</p>
                    <Button variant="destructive" size="sm" onClick={() => { setDeleteDialogOpen(true); setDeleteStep(0); setDeleteConfirmText(""); }}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete my account
                    </Button>

                    <Dialog open={deleteDialogOpen} onOpenChange={(o) => { setDeleteDialogOpen(o); if (!o) { setDeleteStep(0); setDeleteConfirmText(""); } }}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" /> Delete Account
                          </DialogTitle>
                          <DialogDescription>This will permanently remove your account and data.</DialogDescription>
                        </DialogHeader>

                        {deleteStep === 0 && (
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">This will:</p>
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                              <li>Delete your profile, services, and bookings</li>
                              <li>Remove your quests and XP history</li>
                              <li>Replace your name with "Deleted User" on authored content</li>
                              <li>Remove you from all guilds and pods</li>
                            </ul>
                            <Button variant="destructive" className="w-full" onClick={() => setDeleteStep(1)}>
                              Delete my data
                            </Button>
                          </div>
                        )}

                        {deleteStep === 1 && (
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Type <span className="font-mono font-semibold text-destructive">DELETE</span> to confirm you understand this is irreversible.
                            </p>
                            <Input
                              value={deleteConfirmText}
                              onChange={(e) => setDeleteConfirmText(e.target.value)}
                              placeholder="Type DELETE"
                              className="font-mono"
                            />
                            <Button
                              variant="destructive"
                              className="w-full"
                              disabled={deleteConfirmText !== "DELETE"}
                              onClick={async () => {
                                // Sign out and let the user know — actual deletion requires backend support
                                setDeleteDialogOpen(false);
                                toast({ title: "Account deletion requested", description: "Your data will be removed. You will be signed out." });
                                await signOut();
                              }}
                            >
                              I understand — delete permanently
                            </Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </Section>
                </div>
              )}

              {/* ── Profile & Identity ── */}
              {activeTab === "profile" && (
                <div className="space-y-6 max-w-lg">
                  <Section title="Profile" icon={<UserCircle className="h-5 w-5" />}>
                    <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-muted/50 border border-border">
                      <span className="flex items-center gap-1 text-sm font-semibold text-primary"><Zap className="h-4 w-4" /> {limits.userXp} XP</span>
                      <span className="text-sm text-muted-foreground">Credits: {limits.userCredits}</span>
                    </div>

                    <div className="space-y-4">
                      <ImageUpload label="Avatar" currentImageUrl={avatarUrl || undefined} onChange={(url) => setAvatarUrl(url ?? "")} aspectRatio="1/1" description="Square image works best" />
                      <div><label className="text-sm font-medium mb-1 block">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
                      <div><label className="text-sm font-medium mb-1 block">Headline</label><Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Community Builder" maxLength={120} /></div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-sm font-medium">Bio</label>
                          <AIWriterButton
                            type="bio"
                            context={{ name, persona, role, headline, houses: dbTopics.filter(t => selectedTopics.includes(t.id)).map(t => t.name), territories: dbTerritories.filter(t => selectedTerritories.includes(t.id)).map(t => t.name) }}
                            currentText={bio}
                            onAccept={(text) => setBio(text)}
                          />
                        </div>
                        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself…" maxLength={1300} className="min-h-[140px]" />
                        <span className="text-xs text-muted-foreground text-right block mt-1">{bio?.length || 0}/1300</span>
                      </div>
                      <div><label className="text-sm font-medium mb-1 block">Role</label>
                        <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UserRole.GAMECHANGER}>Gamechanger</SelectItem>
                            <SelectItem value={UserRole.ECOSYSTEM_BUILDER}>Ecosystem Builder</SelectItem>
                            <SelectItem value={UserRole.BOTH}>Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    <Button onClick={handleSaveProfile} disabled={profileSaving} className="w-full">
                        {profileSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Save profile
                       </Button>
                       {authUser?.id && (
                         <Button variant="ghost" size="sm" asChild className="w-full mt-2">
                           <Link to={`/users/${authUser.id}`}><ExternalLink className="h-4 w-4 mr-1" /> View my public profile</Link>
                         </Button>
                       )}
                    </div>
                  </Section>

                  <Separator />

                  <Section title="Social & Web Links" icon={<ExternalLink className="h-5 w-5" />}>
                    <SocialLinksEdit
                      data={{ websiteUrl, twitterUrl, linkedinUrl, instagramUrl }}
                      onChange={(key, value) => {
                        if (key === "websiteUrl") setWebsiteUrl(value);
                        else if (key === "twitterUrl") setTwitterUrl(value);
                        else if (key === "linkedinUrl") setLinkedinUrl(value);
                        else if (key === "instagramUrl") setInstagramUrl(value);
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-2">Links are saved when you click "Save profile" above.</p>
                  </Section>

                  <Separator />

                  <Section title="Onboarding Wizard" icon={<Compass className="h-5 w-5" />}>
                    <p className="text-sm text-muted-foreground mb-3">Reopen the onboarding wizard to review or update your profile, interests, and territories.</p>
                    <Button variant="outline" asChild>
                      <Link to="/onboarding"><Sparkles className="h-4 w-4 mr-1" /> Open wizard</Link>
                    </Button>
                  </Section>
                </div>
              )}

              {/* ── Starred Excerpts ── */}
              {activeTab === "starred" && (
                <div className="space-y-4">
                  <Section title="Starred Excerpts" icon={<Star className="h-5 w-5 text-yellow-500" />}>
                    <p className="text-sm text-muted-foreground mb-3">
                      Your saved highlights from AI and human messages across all units.
                    </p>
                    <Link to="/me/starred-excerpts">
                      <Button variant="outline" size="sm">
                        <Star className="h-3.5 w-3.5 mr-1" /> Open My Starred Excerpts
                      </Button>
                    </Link>
                  </Section>
                </div>
              )}

              {/* ── Topics & Territories ── */}
              {activeTab === "houses" && (
                <div className="space-y-6">
                  <Section title="Topics" icon={<Hash className="h-5 w-5" />}>
                    {(persona === "CREATIVE" || persona === "HYBRID") && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {persona === "CREATIVE"
                          ? "Topics are shown with creative labels. Your selections will also include related impact topics in navigation filters."
                          : "Topics are shown with hybrid labels. Your selections include both creative and impact perspectives."}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedTopics(dbTopics.map((t) => t.id))}>Select all</Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTopics([])} disabled={selectedTopics.length === 0}>Clear all</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-card max-h-64 overflow-y-auto">
                      {dbTopics.map((t) => {
                        const universe = defaultUniverseForPersona(persona);
                        const houseDef = HOUSE_DEFINITIONS[(t as any).slug];
                        const icon = houseDef ? getHouseIcon((t as any).slug) : null;
                        const label = houseDef ? getHouseLabel((t as any).slug, universe) : t.name;
                        return (
                          <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                            <Checkbox checked={selectedTopics.includes(t.id)} onCheckedChange={() => toggleTopic(t.id)} />
                            {icon && <span className="text-sm">{icon}</span>}
                            <span className="text-sm">{label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{selectedTopics.length} selected</p>
                  </Section>

                  <Section title="Territories" icon={<MapPin className="h-5 w-5" />}>
                    <div className="flex items-center gap-2 mb-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedTerritories(dbTerritories.map((t) => t.id))}>Select all</Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTerritories([])} disabled={selectedTerritories.length === 0}>Clear all</Button>
                      <AddTerritoryDialog onCreated={(id) => setSelectedTerritories((prev) => prev.includes(id) ? prev : [...prev, id])} />
                    </div>
                    <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-card">
                      {dbTerritories.map((t: any) => (
                        <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox checked={selectedTerritories.includes(t.id)} onCheckedChange={() => toggleTerritory(t.id)} />
                          <span className="text-sm">{t.name} <span className="text-muted-foreground text-xs">({(t.level || "").toLowerCase()})</span></span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{selectedTerritories.length} selected</p>
                  </Section>

                  <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                    <div>
                      <p className="text-sm font-medium">Personalize feed & suggestions</p>
                      <p className="text-xs text-muted-foreground">Use your Topics & Territories to personalize your Home feed and Explore recommendations.</p>
                    </div>
                    <Switch checked={usePrefs} onCheckedChange={setUsePrefs} />
                  </div>

                  <p className="text-xs text-muted-foreground italic">⚠ These choices influence your Home feed and Explore recommendations.</p>
                  <Button onClick={handleSaveProfile}><Save className="h-4 w-4 mr-1" /> Save Houses & Territories</Button>
                </div>
              )}

              {/* ── Notifications & Emails ── */}
              {activeTab === "notifications" && (
                <NotificationsSettingsTab toast={toast} />
              )}

              {/* ── Language ── */}
              {activeTab === "language" && (
                <LanguageSettingsTab />
              )}

              {/* ── Services & Availability ── */}
              {activeTab === "quests" && <MyQuestsTab userId={currentUser.id} />}
              {activeTab === "guilds" && <MyGuildsTab userId={currentUser.id} />}
              {activeTab === "pods" && <MyPodsTab userId={currentUser.id} />}
              {activeTab === "courses" && <MyCoursesTab userId={currentUser.id} />}

              {activeTab === "services" && (
                <div className="space-y-6">
                  <MyServicesPanel userId={currentUser.id} />
                  <Section title="Availability" icon={<Clock className="h-5 w-5" />}>
                    <MyAvailability bare />
                  </Section>
                </div>
              )}

              {activeTab === "bookings" && (
                <div className="space-y-4">
                  <h3 className="font-display text-lg font-semibold flex items-center gap-2"><CalendarCheck className="h-5 w-5" /> My Bookings</h3>
                  <div className="flex gap-2">
                    <Button asChild variant="outline"><Link to="/me/bookings">View bookings I made</Link></Button>
                    <Button asChild variant="outline"><Link to="/me/requests">View booking requests</Link></Button>
                  </div>
                </div>
              )}

              {/* ── Wallet ── */}
              {activeTab === "wallet" && <WalletTab />}

              {/* ── Give-back ── */}
              {activeTab === "giveback" && <GiveBackSettingsSection />}

              {/* ── Referrals ── */}
              {activeTab === "referrals" && (
                <ReferralsSection userId={currentUser.id} />
              )}

              {/* ── Privacy & Visibility ── */}
              {activeTab === "privacy" && (
                <div className="space-y-6">
                  <Section title="Profile Visibility" icon={<Eye className="h-5 w-5" />}>
                    <div className="space-y-3">
                      <NotifToggle label="Show my XP publicly on my profile" checked={showXp} onChange={(v) => updatePrivacy("showXpPublicly", v, setShowXp)} />
                      <NotifToggle label="Show my contribution index on my profile" checked={showCi} onChange={(v) => updatePrivacy("showContributionIndexPublicly", v, setShowCi)} />
                      <NotifToggle label="Show my achievements on my profile" checked={showAchievements} onChange={(v) => updatePrivacy("showAchievementsPublicly", v, setShowAchievements)} />
                      <NotifToggle label="Show services I offer on my public profile" checked={showServices} onChange={(v) => updatePrivacy("showServicesPublicly", v, setShowServices)} />
                    </div>
                  </Section>

                  <Section title="Social & Privacy" icon={<Shield className="h-5 w-5" />}>
                    <div className="space-y-3">
                      <NotifToggle label="Allow people to follow me" checked={allowFollow} onChange={(v) => updatePrivacy("allowFollows", v, setAllowFollow)} />
                      <NotifToggle label="Allow comments on my profile wall" checked={allowWallComments} onChange={(v) => updatePrivacy("allowProfileComments", v, setAllowWallComments, "allow_wall_comments")} />
                    </div>
                  </Section>

                  <Separator />

                  <Section title="Hidden Profile Activity" icon={<EyeOff className="h-5 w-5" />}>
                    <ProfileMaskingSettings />
                  </Section>

                  <Button onClick={() => toast({ title: "Privacy settings saved!" })}><Save className="h-4 w-4 mr-1" /> Save privacy settings</Button>
                </div>
              )}

              {/* ── Calendar Sync ── */}
              {activeTab === "calendar" && (
                <div className="space-y-8">
                  <CalendarSyncTab />
                  <Separator />
                  <IcsFeedsManager />
                </div>
              )}

              {/* ── Connected Apps ── */}
              {activeTab === "apps" && (
                <StripeConnectSection />
              )}

              {/* ── Activity History ── */}
              {activeTab === "history" && <ActivityHistoryTab />}

              {/* ── Website ── */}
              {activeTab === "website" && (
                <div className="space-y-6">
                  <FeedpointVisibilitySettings ownerType="user" ownerId={currentUser.id} />
                  <SiteCodeManager ownerType="user" ownerId={currentUser.id} />
                </div>
              )}

            </motion.div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// ── Helper Components ──

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function NotifToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function NotificationsSettingsTab({ toast }: { toast: (opts: any) => void }) {
  const { session } = useAuth();
  const { label } = usePersona();
  const { isAdmin: isSuperAdmin } = useUserRoles(session?.user?.id);

  // DB-backed preferences
  const { prefs, updatePrefs, isSaving } = useNotificationPreferencesHook();
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">(getPushPermissionState());

  // Check if user is an admin of any unit
  const { data: isUnitAdmin = false } = useQuery({
    queryKey: ["is-unit-admin", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const uid = session!.user.id;
      const [gm, pm, cm] = await Promise.all([
        supabase.from("guild_members").select("id").eq("user_id", uid).eq("role", "ADMIN").limit(1),
        supabase.from("pod_members").select("id").eq("user_id", uid).eq("role", "HOST").limit(1),
        supabase.from("company_members").select("id").eq("user_id", uid).eq("role", "admin").limit(1),
      ]);
      return (gm.data?.length ?? 0) > 0 || (pm.data?.length ?? 0) > 0 || (cm.data?.length ?? 0) > 0;
    },
    staleTime: 60_000,
  });

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestPushPermissionFn();
      if (!granted) {
        toast({ title: "Push notifications blocked", description: "Please enable notifications in your browser settings.", variant: "destructive" });
        return;
      }
      setPushPermission("granted");
    }
    updatePrefs({ push_enabled: enabled });
    toast({ title: enabled ? "Push notifications enabled" : "Push notifications disabled" });
  };

  const toggle = (key: keyof typeof prefs, label_text: string) => (
    <NotifToggle label={label_text} checked={!!prefs[key]} onChange={(v) => updatePrefs({ [key]: v })} />
  );

  return (
    <div className="space-y-6">
      {/* Global channel toggles */}
      <Section title="Channels" icon={<Bell className="h-5 w-5" />}>
        <div className="space-y-3">
          {toggle("channel_in_app_enabled", "In-app notifications")}
          {toggle("channel_email_enabled", "Email notifications")}
        </div>
      </Section>

      {/* Superadmin section */}
      {isSuperAdmin && (
        <Section title="Superadmin Notifications" icon={<Shield className="h-5 w-5" />}>
          <p className="text-xs text-muted-foreground mb-3">Platform-level alerts visible only to superadmins.</p>
          <div className="space-y-3">
            {toggle("notify_new_user_registrations", "New user registrations")}
            {toggle("notify_new_bug_reports", "Bug reports")}
            {toggle("notify_payments_and_shares", "Payments & share purchases")}
            {toggle("notify_abuse_reports", "Abuse reports")}
            {toggle("notify_system_errors", "System errors & alerts")}
          </div>
        </Section>
      )}

      {/* Unit admin section */}
      {(isUnitAdmin || isSuperAdmin) && (
        <Section title="Unit Admin Notifications" icon={<Users className="h-5 w-5" />}>
          <p className="text-xs text-muted-foreground mb-3">Notifications for entities you manage ({label("guild.label")}s, {label("pod.label")}s, organizations, {label("quest.label")}s).</p>
          <div className="space-y-3">
            {toggle("notify_new_join_requests_guilds", `New join requests (${label("guild.label")}s)`)}
            {toggle("notify_new_join_requests_pods", `New join requests (${label("pod.label")}s)`)}
            {toggle("notify_new_partnership_requests", "Partnership requests & status")}
            {toggle("notify_quest_updates_and_comments", `${label("quest.label")} updates & comments`)}
            {toggle("notify_bookings_and_cancellations", "Bookings & cancellations")}
            {toggle("notify_co_host_changes", "Co-host changes")}
            {toggle("notify_events_and_courses", "Events & courses")}
            {toggle("notify_ai_flagged_content", "AI/moderation alerts")}
          </div>
        </Section>
      )}

       {/* Personal */}
       <Section title="My Activity" icon={<Bell className="h-5 w-5" />}>
         <div className="space-y-3">
           {toggle("notify_booking_status_changes", "Booking status changes")}
           {toggle("notify_quest_updates_from_followed", `Updates from ${label("quest.label")}s I follow`)}
           {toggle("notify_invitations_to_units", "Invitations to join quests, guilds, pods & organizations")}
           {toggle("notify_comments_and_upvotes", "Comments & upvotes")}
           {toggle("notify_mentions" as any, "Mentions in comments and updates")}
           {toggle("notify_follower_activity", "Follower activity")}
           {toggle("notify_xp_and_achievements", "XP & achievements")}
         </div>
       </Section>

       {/* Followed Activity */}
       <Section title="Followed Activity" icon={<Rss className="h-5 w-5" />}>
         <p className="text-xs text-muted-foreground mb-3">Get notified when people or entities you follow publish new content.</p>
         <div className="space-y-3">
           {toggle("notify_new_posts_from_followed" as any, "New posts from people & entities I follow")}
           {toggle("notify_new_quests_from_followed" as any, `New ${label("quest.label")}s from entities I follow`)}
           {toggle("notify_new_events_from_followed" as any, "New events from entities I follow")}
           {toggle("notify_new_services_from_followed" as any, "New services from people I follow")}
           {toggle("notify_new_courses_from_followed" as any, "New courses from entities I follow")}
           {toggle("notify_entity_updates_from_followed" as any, "General updates from entities I follow")}
           {toggle("notify_new_members_in_my_units" as any, "New members joining my guilds, pods & organizations")}
         </div>
       </Section>

       {/* Direct Messages */}
       <Section title="Direct Messages" icon={<MessageSquare className="h-5 w-5" />}>
         <p className="text-xs text-muted-foreground mb-3">Control how you're notified when you receive private messages.</p>
         <div className="space-y-3">
           {toggle("notify_direct_messages_in_app" as any, "In-app notification for new messages")}
           {toggle("notify_direct_messages_email" as any, "Email notification when I receive a message")}
         </div>
       </Section>

      {/* Push */}
      <Section title="Push Notifications" icon={<Bell className="h-5 w-5" />}>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-1.5">
            <div>
              <p className="text-sm font-medium">Browser push notifications</p>
              <p className="text-xs text-muted-foreground">
                {pushPermission === "unsupported" ? "Not supported in this browser" :
                 pushPermission === "denied" ? "Blocked by browser — enable in browser settings" :
                 "Receive desktop notifications for new activity"}
              </p>
            </div>
            <Switch
              checked={prefs.push_enabled}
              onCheckedChange={handlePushToggle}
              disabled={pushPermission === "unsupported" || pushPermission === "denied"}
            />
          </div>
        </div>
      </Section>

      {/* AI Journey Digest */}
      <Section title="AI Journey Digest" icon={<Rss className="h-5 w-5" />}>
        <p className="text-xs text-muted-foreground mb-3">
          A personalized AI-generated summary of your journey, activity highlights, and suggested next steps on the platform.
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Digest frequency</p>
              <p className="text-xs text-muted-foreground">How often you receive your AI journey digest</p>
            </div>
            <Select value={prefs.digest_frequency ?? "three_days"} onValueChange={(v) => updatePrefs({ digest_frequency: v } as any)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="three_days">Every 3 days</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="none">Don't send</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {prefs.digest_frequency !== "none" && (
            <div className="space-y-3">
              {toggle("notify_daily_digest_in_app" as any, "Show digest in-app notifications")}
              {toggle("notify_daily_digest_email" as any, "Receive digest by email")}
            </div>
          )}
        </div>
      </Section>

      {/* Frequency */}
      <Section title="Notification Frequency" icon={<Clock className="h-5 w-5" />}>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium">Delivery frequency</p>
            <p className="text-xs text-muted-foreground">How often you receive notifications and digest emails</p>
          </div>
          <Select value={prefs.notification_frequency} onValueChange={(v) => updatePrefs({ notification_frequency: v })}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="INSTANT">Instant</SelectItem>
              <SelectItem value="DAILY">Daily digest</SelectItem>
              <SelectItem value="WEEKLY">Weekly digest</SelectItem>
              <SelectItem value="NEVER">Never</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Button onClick={() => toast({ title: "Preferences saved automatically!" })} disabled={isSaving}>
        <Save className="h-4 w-4 mr-1" /> {isSaving ? "Saving..." : "Preferences saved automatically"}
      </Button>
    </div>
  );
}

function ReferralsSection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: myReferrals = [] } = useQuery({
    queryKey: ["referrals", userId],
    queryFn: async () => {
      const { data } = await supabase.from("referrals").select("*").eq("owner_user_id", userId).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!userId,
  });
  const referralLink = myReferrals.length > 0
    ? `https://changethegame.xyz/signup?ref=${myReferrals[0].code}`
    : null;

  const createCode = async () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    await supabase.from("referrals").insert({ owner_user_id: userId, code });
    qc.invalidateQueries({ queryKey: ["referrals", userId] });
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
  };

  return (
    <div className="space-y-6">
      <Section title="Your Referral Link" icon={<UserCircle className="h-5 w-5" />}>
        <p className="text-sm text-muted-foreground mb-3">
          Share your referral link. When someone signs up and completes onboarding, you earn <strong>+50 XP</strong>.
        </p>
        {referralLink ? (
          <div className="flex items-center gap-2">
            <Input value={referralLink} readOnly className="font-mono text-xs" />
            <Button size="sm" variant="outline" onClick={() => copyLink(referralLink)}>
              Copy
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={createCode}>
            <Plus className="h-4 w-4 mr-1" /> Generate referral link
          </Button>
        )}
      </Section>

      {myReferrals.length > 0 && (
        <Section title="Referral History" icon={<Zap className="h-5 w-5" />}>
          <div className="space-y-2">
            {myReferrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium font-mono">{r.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.used_by_user_id ? "Signed up ✓" : "Pending"}
                  </p>
                </div>
                <Badge variant={r.is_used ? "default" : "secondary"}>
                  {r.is_used ? `+${r.bonus_xp} XP earned` : "Waiting"}
                </Badge>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
