import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, UserCircle, Hash, Bell, Briefcase, Zap, Eye, Plug,
  Lock, Save, Trash2, Pencil, MapPin, Plus, Clock,
  ToggleLeft, ToggleRight, ExternalLink, Loader2, Package,
  CheckCircle, Crown, Check, ArrowRight, Download, AlertTriangle,
  Sparkles, Compass, Swords, Users, GraduationCap, CalendarCheck,
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
import type { AvailabilityRule, AvailabilityException } from "@/types";
import MyAvailability from "./MyAvailability";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { MyServicesPanel } from "@/components/MyServicesPanel";
import { MyQuestsTab, MyGuildsTab, MyPodsTab, MyCoursesTab } from "@/components/MyContentTabs";

const TABS = [
  { key: "profile", label: "Profile & Identity", icon: UserCircle },
  { key: "quests", label: "My Quests", icon: Swords },
  { key: "guilds", label: "My Guilds", icon: Users },
  { key: "pods", label: "My Pods", icon: Users },
  { key: "courses", label: "My Courses", icon: GraduationCap },
  { key: "services", label: "Services & Availability", icon: Briefcase },
  { key: "bookings", label: "My Bookings", icon: CalendarCheck },
  { key: "billing", label: "XP & Credits", icon: Zap },
  { key: "houses", label: "Houses & Territories", icon: Hash },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "account", label: "Account & Security", icon: Shield },
  { key: "privacy", label: "Privacy & Visibility", icon: Eye },
  { key: "referrals", label: "Referrals", icon: UserCircle },
  { key: "apps", label: "Connected Apps", icon: Plug },
];

const XP_BUNDLES = [
  { code: "STARTER", name: "Starter", xpAmount: 50, price: 5 },
  { code: "GROWTH", name: "Growth", xpAmount: 150, price: 12 },
  { code: "PRO", name: "Pro", xpAmount: 400, price: 29 },
];

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function SettingsPage() {
  const currentUser = useCurrentUser();
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
      .select("name, headline, bio, avatar_url, role, website_url, twitter_url, linkedin_url, instagram_url")
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

  // Sync privacy changes to mock user object
  const updatePrivacy = (field: keyof typeof currentUser, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    (currentUser as any)[field] = value;
  };

  // ── Services state (no longer using mock) ──

  // ── Billing state ──
  const [buyLoading, setBuyLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

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
      await supabase.from("user_territories").delete().eq("user_id", authUser.id);
      if (selectedTerritories.length > 0) {
        await supabase.from("user_territories").insert(
          selectedTerritories.map((territoryId) => ({ user_id: authUser.id, territory_id: territoryId }))
        );
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

  const handleBuyXp = async (code: string) => {
    setBuyLoading(code);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { mode: "xp_bundle", bundleCode: code } });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setBuyLoading(null); }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setPortalLoading(false); }
  };

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto">
        <h1 className="font-display text-2xl font-bold mb-6">My Hub</h1>

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
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

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
                    <Button variant="outline" size="sm" disabled={exportLoading} onClick={() => {
                      setExportLoading(true);
                      const myQuests = quests.filter(q => q.createdByUserId === currentUser.id);
                      const myComments = comments.filter(c => c.authorId === currentUser.id);
                      const myServices = services.filter(s => s.providerUserId === currentUser.id);
                      const myBookings = bookings.filter(b => b.requesterId === currentUser.id || b.providerUserId === currentUser.id);
                      const exportData = {
                        user: { id: currentUser.id, name: currentUser.name, email: currentUser.email, headline: currentUser.headline, bio: currentUser.bio, role: currentUser.role, xp: currentUser.xp, contributionIndex: currentUser.contributionIndex },
                        quests: myQuests.map(q => ({ id: q.id, title: q.title, description: q.description, status: q.status, rewardXp: q.rewardXp })),
                        comments: myComments.map(c => ({ id: c.id, content: c.content, createdAt: c.createdAt, targetType: c.targetType, targetId: c.targetId })),
                        services: myServices.map(s => ({ id: s.id, title: s.title, description: s.description, priceAmount: s.priceAmount, priceCurrency: s.priceCurrency })),
                        bookings: myBookings.map(b => ({ id: b.id, serviceId: b.serviceId, status: b.status, startDateTime: b.startDateTime, endDateTime: b.endDateTime })),
                        xpTransactions: [],
                      };
                      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `questhub-data-${currentUser.id}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      setExportLoading(false);
                      toast({ title: "Data exported!", description: "Your data has been downloaded." });
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
                              onClick={() => {
                                // Anonymize user in mock data
                                const idx = users.findIndex(u => u.id === currentUser.id);
                                if (idx !== -1) {
                                  users[idx] = { ...users[idx], name: "Deleted User", email: "", bio: undefined, headline: undefined, avatarUrl: undefined, isDeleted: true, deletedAt: new Date().toISOString() };
                                }
                                // Anonymize comments
                                comments.filter(c => c.authorId === currentUser.id).forEach(c => { (c as any).authorId = "deleted"; });
                                setDeleteDialogOpen(false);
                                toast({ title: "Account deleted", description: "Your account and data have been permanently removed." });
                                signOut();
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
                      <span className="flex items-center gap-1 text-sm font-semibold text-primary"><Zap className="h-4 w-4" /> {currentUser.xp} XP</span>
                      <span className="text-sm text-muted-foreground">CI: {currentUser.contributionIndex}</span>
                    </div>

                    <div className="space-y-4">
                      <ImageUpload label="Avatar" currentImageUrl={avatarUrl || undefined} onChange={(url) => setAvatarUrl(url ?? "")} aspectRatio="1/1" description="Square image works best" />
                      <div><label className="text-sm font-medium mb-1 block">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
                      <div><label className="text-sm font-medium mb-1 block">Headline</label><Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Community Builder" maxLength={120} /></div>
                      <div><label className="text-sm font-medium mb-1 block">Bio</label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself…" maxLength={500} className="resize-none min-h-[100px]" /></div>
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

              {/* ── Houses & Territories ── */}
              {activeTab === "houses" && (
                <div className="space-y-6">
                  <Section title="Topics (Houses)" icon={<Hash className="h-5 w-5" />}>
                    <div className="flex items-center gap-2 mb-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedTopics(topics.map((t) => t.id))}>Select all</Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTopics([])} disabled={selectedTopics.length === 0}>Clear all</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-card max-h-48 overflow-y-auto">
                      {topics.map((t) => (
                        <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox checked={selectedTopics.includes(t.id)} onCheckedChange={() => toggleTopic(t.id)} />
                          <span className="text-sm">{t.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{selectedTopics.length} selected</p>
                  </Section>

                  <Section title="Territories" icon={<MapPin className="h-5 w-5" />}>
                    <div className="flex items-center gap-2 mb-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedTerritories(territories.map((t) => t.id))}>Select all</Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTerritories([])} disabled={selectedTerritories.length === 0}>Clear all</Button>
                      <AddTerritoryDialog onCreated={(id) => setSelectedTerritories((prev) => prev.includes(id) ? prev : [...prev, id])} />
                    </div>
                    <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-card">
                      {territories.map((t) => (
                        <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox checked={selectedTerritories.includes(t.id)} onCheckedChange={() => toggleTerritory(t.id)} />
                          <span className="text-sm">{t.name} <span className="text-muted-foreground text-xs">({t.level.toLowerCase()})</span></span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{selectedTerritories.length} selected</p>
                  </Section>

                  <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                    <div>
                      <p className="text-sm font-medium">Personalize feed & suggestions</p>
                      <p className="text-xs text-muted-foreground">Use your Houses & Territories to personalize your Home feed and Explore recommendations.</p>
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

              {/* ── XP, Plan & Billing ── */}
              {activeTab === "billing" && (
                <div className="space-y-6">
                  <Section title="Current Plan" icon={<Crown className="h-5 w-5" />}>
                    <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-display text-lg font-bold">{limits.plan.planName}</h4>
                          <p className="text-sm text-muted-foreground">{limits.plan.planCode === "FREE" ? "Free forever" : "Billed monthly"}</p>
                        </div>
                        <Badge className="bg-primary text-primary-foreground">Active</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                        <div><span className="text-muted-foreground">Quests/week</span><p className="font-semibold">{limits.plan.freeQuestsPerWeek}</p></div>
                        <div><span className="text-muted-foreground">Max guilds</span><p className="font-semibold">{limits.plan.maxGuildMemberships ?? "∞"}</p></div>
                        <div><span className="text-muted-foreground">Max pods</span><p className="font-semibold">{limits.plan.maxPods ?? "∞"}</p></div>
                        <div><span className="text-muted-foreground">XP multiplier</span><p className="font-semibold">{limits.plan.xpMultiplier}x</p></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" asChild><Link to="/plans">Change plan <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link></Button>
                      {limits.plan.planCode !== "FREE" && (
                        <Button variant="outline" onClick={handleManageSubscription} disabled={portalLoading}>
                          {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ExternalLink className="h-4 w-4 mr-1" />} Manage subscription
                        </Button>
                      )}
                    </div>
                  </Section>

                  <Section title="XP Balance" icon={<Zap className="h-5 w-5" />}>
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 mb-4">
                      <Zap className="h-5 w-5 text-primary" />
                      <span className="text-lg font-bold">{limits.userXp} XP</span>
                    </div>
                    <h4 className="text-sm font-medium mb-3">Buy XP Bundles</h4>
                    <div className="grid gap-3 md:grid-cols-3">
                      {XP_BUNDLES.map((b) => (
                        <div key={b.code} className="rounded-lg border border-border bg-card p-4 text-center">
                          <Package className="h-6 w-6 mx-auto mb-2 text-primary" />
                          <p className="font-bold">{b.xpAmount} XP</p>
                          <p className="text-lg font-bold">€{b.price}</p>
                          <Button size="sm" className="w-full mt-2" onClick={() => handleBuyXp(b.code)} disabled={!!buyLoading}>
                            {buyLoading === b.code ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Section>
                </div>
              )}

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
                      <NotifToggle label="Allow comments on my profile wall" checked={allowWallComments} onChange={(v) => updatePrivacy("allowProfileComments", v, setAllowWallComments)} />
                    </div>
                  </Section>

                  <Button onClick={() => toast({ title: "Privacy settings saved!" })}><Save className="h-4 w-4 mr-1" /> Save privacy settings</Button>
                </div>
              )}

              {/* ── Connected Apps ── */}
              {activeTab === "apps" && (
                <div className="space-y-6">
                  <Section title="Stripe (Payouts)" icon={<Zap className="h-5 w-5" />}>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                      <div>
                        <p className="text-sm font-medium">Stripe Connect</p>
                        <p className="text-xs text-muted-foreground">Connect your Stripe account to receive payouts from bookings.</p>
                      </div>
                      <Badge variant="outline">Not connected</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="mt-2" disabled>
                      <Plug className="h-4 w-4 mr-1" /> Connect Stripe
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">Coming soon — Stripe Connect onboarding will be available here.</p>
                  </Section>

                  <Section title="Calendar Integration" icon={<Clock className="h-5 w-5" />}>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                      <div>
                        <p className="text-sm font-medium">Google Calendar</p>
                        <p className="text-xs text-muted-foreground">Sync your availability with Google Calendar.</p>
                      </div>
                      <Badge variant="outline">Not connected</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="mt-2" disabled>
                      <Plug className="h-4 w-4 mr-1" /> Connect Calendar
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">Coming soon — Calendar sync will be available here.</p>
                  </Section>
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
  // Import notification preferences from the hook
  const { preferences, updatePreferences } = useNotificationsHook();
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">(getPushPermissionState());

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestPushPermissionFn();
      if (!granted) {
        toast({ title: "Push notifications blocked", description: "Please enable notifications in your browser settings.", variant: "destructive" });
        return;
      }
      setPushPermission("granted");
    }
    updatePreferences({ pushEnabled: enabled });
    toast({ title: enabled ? "Push notifications enabled" : "Push notifications disabled" });
  };

  return (
    <div className="space-y-6">
      <Section title="In-App Notifications" icon={<Bell className="h-5 w-5" />}>
        <div className="space-y-3">
          <NotifToggle label="Quest updates I follow" checked={preferences.notifyOnQuestUpdates} onChange={(v) => updatePreferences({ notifyOnQuestUpdates: v })} />
          <NotifToggle label="Guild activity" checked={preferences.notifyOnGuildActivity} onChange={(v) => updatePreferences({ notifyOnGuildActivity: v })} />
          <NotifToggle label="Pod messages" checked={preferences.notifyOnPodMessages} onChange={(v) => updatePreferences({ notifyOnPodMessages: v })} />
          <NotifToggle label="Booking notifications" checked={preferences.notifyOnBookings} onChange={(v) => updatePreferences({ notifyOnBookings: v })} />
          <NotifToggle label="Comments & upvotes" checked={preferences.notifyOnComments} onChange={(v) => updatePreferences({ notifyOnComments: v })} />
          <NotifToggle label="Follower activity" checked={preferences.notifyOnFollowerActivity} onChange={(v) => updatePreferences({ notifyOnFollowerActivity: v })} />
          <NotifToggle label="XP & achievements" checked={preferences.notifyOnXpAndAchievements} onChange={(v) => updatePreferences({ notifyOnXpAndAchievements: v })} />
        </div>
      </Section>

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
              checked={preferences.pushEnabled}
              onCheckedChange={handlePushToggle}
              disabled={pushPermission === "unsupported" || pushPermission === "denied"}
            />
          </div>
        </div>
      </Section>

      <Section title="Notification Frequency" icon={<Bell className="h-5 w-5" />}>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium">Delivery frequency</p>
            <p className="text-xs text-muted-foreground">How often you receive notifications and digest emails</p>
          </div>
          <Select value={preferences.notificationFrequency} onValueChange={(v) => updatePreferences({ notificationFrequency: v as any })}>
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

      <Button onClick={() => toast({ title: "Notification preferences saved!" })}><Save className="h-4 w-4 mr-1" /> Save preferences</Button>
    </div>
  );
}

function ReferralsSection({ userId }: { userId: string }) {
  const [, rerender] = useState(0);
  const myReferrals = getReferralsForUser(userId);
  const referralLink = myReferrals.length > 0
    ? `${window.location.origin}/signup?ref=${myReferrals[0].code}`
    : null;

  const createCode = () => {
    const code = generateReferralCode();
    referrals.push({
      id: `ref-${Date.now()}`,
      referrerUserId: userId,
      refereeEmail: "",
      code,
      createdAt: new Date().toISOString(),
      rewardGiven: false,
    });
    rerender((n) => n + 1);
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
                    {r.refereeUserId ? "Signed up ✓" : "Pending"}
                  </p>
                </div>
                <Badge variant={r.rewardGiven ? "default" : "secondary"}>
                  {r.rewardGiven ? "+50 XP earned" : "Waiting"}
                </Badge>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
