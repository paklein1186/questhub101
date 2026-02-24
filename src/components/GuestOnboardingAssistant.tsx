import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  UserPlus, Loader2, ArrowRight, ArrowLeft,
  Rocket, Users, BookOpen, Briefcase, Compass,
  Palette, Shield, Blend, Sparkles, Check,
  Link2, Building2, X, UserCheck, UsersRound,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  HOUSE_DEFINITIONS,
  type UniverseMode,
  getHouseLabel,
  getHouseIcon,
} from "@/lib/universeMapping";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel?: string;
  /** If true, skip onboarding steps and go straight to signup */
  quickSignup?: boolean;
}

type Step = "goal" | "persona" | "interests" | "connect" | "signup";

const STEPS_ORDER: Step[] = ["goal", "persona", "interests", "connect", "signup"];
const QUICK_STEPS: Step[] = ["signup"];
const STEP_LABELS = ["Goal", "World", "Topics", "Connect", "Account"];

const GOALS = [
  { key: "create", label: "Launch a project", icon: Rocket, desc: "Start a quest, mission, or creation" },
  { key: "collaborate", label: "Find my people", icon: Users, desc: "Join a guild, circle, or pod" },
  { key: "learn", label: "Learn & grow", icon: BookOpen, desc: "Take courses, attend events" },
  { key: "offer", label: "Offer my skills", icon: Briefcase, desc: "Publish services or sessions" },
  { key: "explore", label: "Just browsing", icon: Compass, desc: "See what's possible first" },
];

const PERSONAS = [
  { key: "creative", label: "Creator", icon: Palette, desc: "Artist, designer, writer, performer", color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20" },
  { key: "impact", label: "Impact Builder", icon: Shield, desc: "Consultant, facilitator, ecosystem builder", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { key: "hybrid", label: "Both", icon: Blend, desc: "Creative meets strategic", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
  { key: "org_rep", label: "Organization Representative", icon: Building2, desc: "Company, institution, foundation, or NGO", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
];

interface TopicItem {
  id: string;
  label: string;
  icon: string;
  type: "house" | "topic";
}

interface ScrapedOrg {
  name: string | null;
  description: string | null;
  logo: string | null;
  sector: string | null;
  url: string;
}

interface SuggestedGuild {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  member_count: number;
}

interface SuggestedUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  headline: string | null;
}

function getUniverseForPersona(persona: string | null): UniverseMode {
  if (persona === "creative") return "creative";
  if (persona === "impact") return "impact";
  return "both";
}

export function GuestOnboardingAssistant({ open, onOpenChange, actionLabel = "perform this action", quickSignup = false }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  // Track dismissal so auto-trigger doesn't fire again in the same session
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      localStorage.setItem("guestAssistantDismissed", Date.now().toString());
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);
  const { signUp } = useAuth();
  const { toast } = useToast();

  const activeSteps = quickSignup ? QUICK_STEPS : STEPS_ORDER;
  const activeLabels = quickSignup ? ["Account"] : STEP_LABELS;
  const [step, setStep] = useState<Step>(quickSignup ? "signup" : "goal");

  // Reset step when dialog opens or mode changes
  useEffect(() => {
    if (open) {
      setStep(quickSignup ? "signup" : "goal");
    }
  }, [open, quickSignup]);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Dynamic topics from DB + Houses
  const [topicItems, setTopicItems] = useState<TopicItem[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Connect step
  const [orgUrl, setOrgUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapedOrg, setScrapedOrg] = useState<ScrapedOrg | null>(null);
  const [suggestedGuilds, setSuggestedGuilds] = useState<SuggestedGuild[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [selectedGuildIds, setSelectedGuildIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Signup form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signingUp, setSigningUp] = useState(false);

  const redirectParam = `?redirect=${encodeURIComponent(location.pathname + location.search)}`;

  const stepIndex = activeSteps.indexOf(step);
  const totalSteps = activeSteps.length;
  const universe = getUniverseForPersona(selectedPersona);

  // Fetch topics when persona changes
  useEffect(() => {
    if (quickSignup) return; // skip topic fetching in quick mode
    if (!selectedPersona) return;
    setLoadingTopics(true);
    setSelectedInterests([]);

    // Fetch all DB topics (now includes both impact and creative universe_type)
    supabase
      .from("topics")
      .select("id, name, slug, universe_type")
      .eq("is_deleted", false)
      .order("name")
      .limit(50)
      .then(({ data }) => {
        const items: TopicItem[] = [];
        if (data) {
          data.forEach((t: any) => {
            const isCreative = t.universe_type === "creative";
            const showForUniverse =
              universe === "both" ||
              (universe === "creative" && isCreative) ||
              (universe === "impact" && !isCreative);
            if (!showForUniverse) return;

            const slug = t.slug;
            const houseDef = slug ? HOUSE_DEFINITIONS[slug] : null;
            items.push({
              id: `topic:${t.id}`,
              label: houseDef ? getHouseLabel(slug, universe) : t.name,
              icon: houseDef ? houseDef.icon : "📌",
              type: isCreative ? "house" : "topic",
            });
          });
        }
        setTopicItems(items);
        setLoadingTopics(false);
      });
  }, [selectedPersona, universe]);

  const goNext = useCallback(() => {
    const idx = activeSteps.indexOf(step);
    if (idx < activeSteps.length - 1) setStep(activeSteps[idx + 1]);
  }, [step, activeSteps]);

  const goBack = useCallback(() => {
    const idx = activeSteps.indexOf(step);
    if (idx > 0) setStep(activeSteps[idx - 1]);
  }, [step, activeSteps]);

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : prev.length < 7 ? [...prev, id] : prev
    );
  };

  const toggleGuild = (id: string) => {
    setSelectedGuildIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  // Scrape org URL and fetch suggestions
  const handleScrapeOrg = async () => {
    let url = orgUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    setScraping(true);
    setScrapedOrg(null);
    setSuggestedGuilds([]);
    setSuggestedUsers([]);

    try {
      const { data: scraped, error: scrapeErr } = await supabase.functions.invoke("scrape-entity", {
        body: { url },
      });
      if (scrapeErr) throw scrapeErr;
      setScrapedOrg(scraped);

      const [guildsRes, usersRes] = await Promise.all([
        scraped?.name
          ? supabase
              .from("guilds")
              .select("id, name, logo_url, description")
              .eq("is_deleted", false)
              .eq("is_draft", false)
              .ilike("name", `%${(scraped.name || "").split(/\s+/)[0]}%`)
              .limit(5)
          : Promise.resolve({ data: [] }),
        scraped?.sector
          ? supabase
              .from("profiles_public")
              .select("user_id, name, avatar_url, headline")
              .ilike("headline", `%${scraped.sector.split(/\s+/)[0]}%`)
              .eq("has_completed_onboarding", true)
              .limit(6)
          : Promise.resolve({ data: [] }),
      ]);

      const guildData = guildsRes.data || [];
      if (guildData.length > 0) {
        const guildIds = guildData.map((g: any) => g.id);
        const { data: memberCounts } = await supabase
          .from("guild_members")
          .select("guild_id", { count: "exact", head: false })
          .in("guild_id", guildIds);

        const countMap: Record<string, number> = {};
        (memberCounts || []).forEach((m: any) => {
          countMap[m.guild_id] = (countMap[m.guild_id] || 0) + 1;
        });

        setSuggestedGuilds(
          guildData.map((g: any) => ({
            id: g.id, name: g.name, logo_url: g.logo_url, description: g.description,
            member_count: countMap[g.id] || 0,
          }))
        );
      }

      setSuggestedUsers(
        (usersRes.data || []).map((u: any) => ({
          id: u.user_id, display_name: u.name, avatar_url: u.avatar_url, headline: u.headline,
        }))
      );
    } catch (err) {
      console.error("Scrape error:", err);
      toast({ title: "Could not analyze URL", description: "Check the URL and try again.", variant: "destructive" });
    } finally {
      setScraping(false);
    }
  };

  const clearOrg = () => {
    setOrgUrl("");
    setScrapedOrg(null);
    setSuggestedGuilds([]);
    setSuggestedUsers([]);
    setSelectedGuildIds([]);
    setSelectedUserIds([]);
  };

  const [signupError, setSignupError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    if (!name.trim() || !email.trim() || !password) return;
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setSigningUp(true);

    // Pre-check if email already exists in profiles to give immediate feedback
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      setSigningUp(false);
      setSignupError("This email is already registered. Please use a different one or log in.");
      toast({ title: "Email already in use", description: "Try a different email address or log in.", variant: "destructive" });
      return;
    }

    const roleMap: Record<string, string> = { creative: "CREATOR", impact: "GAMECHANGER", hybrid: "HYBRID", org_rep: "GAMECHANGER" };
    const role = roleMap[selectedPersona || ""] || "GAMECHANGER";
    const { error } = await signUp(email.trim(), password, name.trim(), role);
    setSigningUp(false);
    if (error) {
      setSignupError(error);
      toast({ title: "Signup failed", description: error, variant: "destructive" });
    } else {
      setSignupError(null);
      // Resolve interest labels and keep raw IDs for persistence
      const interestLabels = selectedInterests.map((id) => {
        const item = topicItems.find((t) => t.id === id);
        return item?.label ?? id;
      });

      // All interests now use "topic:<uuid>" format (both Houses and Topics are DB rows)
      const topicIds = selectedInterests
        .filter((id) => id.startsWith("topic:"))
        .map((id) => id.replace("topic:", ""));

      const personaMap: Record<string, string> = { creative: "CREATIVE", impact: "IMPACT", hybrid: "HYBRID", org_rep: "IMPACT" };
      const mappedPersona = personaMap[selectedPersona || ""] || "IMPACT";

      const ctx = {
        persona: selectedPersona === "org_rep" ? "impact" : selectedPersona,
        interests: interestLabels,
        interest_topic_ids: topicIds,
        goals: selectedGoal ? [selectedGoal] : [],
        suggested_role: role,
        org: scrapedOrg ? { name: scrapedOrg.name, url: scrapedOrg.url, sector: scrapedOrg.sector, logo: scrapedOrg.logo } : null,
        is_org_rep: selectedPersona === "org_rep",
        preselected_guild_ids: selectedGuildIds,
        preselected_follow_user_ids: selectedUserIds,
        show_post_signup_wizard: false,
      };
      localStorage.setItem("guestOnboardingContext", JSON.stringify(ctx));
      // Clear dismissal flag so post-signup flows work
      localStorage.removeItem("guestAssistantDismissed");

      // Persist persona + topics to the profile immediately after signup
      // (use a short delay to allow auth trigger to create the profile row)
      setTimeout(async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const uid = session?.user?.id;
          if (uid) {
            await supabase.from("profiles").update({
              persona_type: mappedPersona,
              persona_source: "guest_onboarding",
            }).eq("user_id", uid);

            if (topicIds.length > 0) {
              const topicRows = topicIds.map((tid: string) => ({ user_id: uid, topic_id: tid }));
              await supabase.from("user_topics").upsert(topicRows, { onConflict: "user_id,topic_id", ignoreDuplicates: true });
            }
          }
        } catch (e) {
          console.error("Post-signup persist error:", e);
        }
      }, 1500);

      handleOpenChange(false);
      // Navigate to onboarding wizard
      navigate("/onboarding");
    }
  };

  const canProceed =
    (step === "goal" && !!selectedGoal) ||
    (step === "persona" && !!selectedPersona) ||
    step === "interests" ||
    step === "connect" ||
    step === "signup";

  const motionProps = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
    transition: { duration: 0.2 },
  };

  // Section heading for interests based on universe
  const interestsHeading =
    universe === "creative"
      ? "Choose your creative houses"
      : universe === "impact"
        ? "What topics interest you?"
        : "Pick your topics & houses";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="p-4 pb-3 border-b bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="font-display font-semibold text-sm">Get Started</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Step {stepIndex + 1} of {totalSteps}
            </p>
          </div>
          <div className="flex gap-1.5">
            {activeLabels.map((label, i) => (
              <div key={label} className="flex-1 flex flex-col gap-1">
                <div className={`h-1 rounded-full transition-colors duration-300 ${i <= stepIndex ? "bg-primary" : "bg-muted"}`} />
                <span className={`text-[10px] ${i <= stepIndex ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <AnimatePresence mode="wait">
            {/* ─── Step 1: Goal ─── */}
            {step === "goal" && (
              <motion.div key="goal" {...motionProps} className="p-5">
                <h2 className="font-display font-semibold text-base mb-1">What brings you here?</h2>
                <p className="text-xs text-muted-foreground mb-4">Pick what resonates most — you can do everything later.</p>
                <div className="space-y-2">
                  {GOALS.map((g) => {
                    const Icon = g.icon;
                    const selected = selectedGoal === g.key;
                    return (
                      <button
                        key={g.key}
                        onClick={() => setSelectedGoal(g.key)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                          selected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30 hover:bg-muted/50"
                        }`}
                      >
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{g.label}</p>
                          <p className="text-xs text-muted-foreground">{g.desc}</p>
                        </div>
                        {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ─── Step 2: Persona ─── */}
            {step === "persona" && (
              <motion.div key="persona" {...motionProps} className="p-5">
                <h2 className="font-display font-semibold text-base mb-1">Which world fits you?</h2>
                <p className="text-xs text-muted-foreground mb-4">This shapes your vocabulary & experience. Changeable anytime.</p>
                <div className="space-y-3">
                  {PERSONAS.map((p) => {
                    const Icon = p.icon;
                    const selected = selectedPersona === p.key;
                    return (
                      <button
                        key={p.key}
                        onClick={() => setSelectedPersona(p.key)}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                          selected ? `border-2 ${p.bg} shadow-sm` : "border-border hover:border-primary/30 hover:bg-muted/50"
                        }`}
                      >
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${selected ? p.bg : "bg-muted"}`}>
                          <Icon className={`h-5 w-5 ${selected ? p.color : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${selected ? p.color : ""}`}>{p.label}</p>
                          <p className="text-xs text-muted-foreground">{p.desc}</p>
                        </div>
                        {selected && <Check className={`h-4 w-4 shrink-0 ${p.color}`} />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ─── Step 3: Interests (Dynamic Topics + Houses) ─── */}
            {step === "interests" && (
              <motion.div key="interests" {...motionProps} className="p-5">
                <h2 className="font-display font-semibold text-base mb-1">{interestsHeading}</h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Pick up to 7 — helps us personalize your feed. <span className="italic">Optional.</span>
                </p>

                {loadingTopics ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Houses section (creative / both) */}
                    {topicItems.some((t) => t.type === "house") && (
                      <div className="mb-4">
                        {universe === "both" && (
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Creative Houses
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {topicItems
                            .filter((t) => t.type === "house")
                            .map((t) => {
                              const selected = selectedInterests.includes(t.id);
                              return (
                                <button
                                  key={t.id}
                                  onClick={() => toggleInterest(t.id)}
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                                    selected
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-muted/50 text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                                  }`}
                                >
                                  <span>{t.icon}</span>
                                  {t.label}
                                  {selected && <Check className="h-3 w-3 ml-0.5" />}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Topics section (impact / both) */}
                    {topicItems.some((t) => t.type === "topic") && (
                      <div>
                        {universe === "both" && (
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Impact Topics
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {topicItems
                            .filter((t) => t.type === "topic")
                            .map((t) => {
                              const selected = selectedInterests.includes(t.id);
                              return (
                                <button
                                  key={t.id}
                                  onClick={() => toggleInterest(t.id)}
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                    selected
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-muted/50 text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                                  }`}
                                >
                                  {selected && <Check className="inline h-3 w-3 mr-1 -mt-0.5" />}
                                  {t.label}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {selectedInterests.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-3">{selectedInterests.length}/7 selected</p>
                )}
              </motion.div>
            )}

            {/* ─── Step 4: Connect (Org URL) ─── */}
            {step === "connect" && (
              <motion.div key="connect" {...motionProps} className="p-5">
                <h2 className="font-display font-semibold text-base mb-1">Your project or organization</h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Paste a website to discover relevant communities, people, and pre-fill services. <span className="italic">Optional.</span>
                </p>

                {!scrapedOrg ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={orgUrl}
                          onChange={(e) => setOrgUrl(e.target.value)}
                          placeholder="https://your-project.com"
                          className="pl-9"
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleScrapeOrg(); } }}
                        />
                      </div>
                      <Button onClick={handleScrapeOrg} disabled={scraping || !orgUrl.trim()} size="default">
                        {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
                      </Button>
                    </div>
                    {scraping && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" /> Analyzing website…
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      We'll look for matching communities, users with similar expertise, and suggest services you could offer.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Scraped org card */}
                    <div className="flex items-start gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
                      {scrapedOrg.logo ? (
                        <img src={scrapedOrg.logo} alt="" className="h-10 w-10 rounded-lg object-cover bg-background shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{scrapedOrg.name || "Organization"}</p>
                        {scrapedOrg.sector && (
                          <span className="inline-block text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full mt-0.5">
                            {scrapedOrg.sector}
                          </span>
                        )}
                        {scrapedOrg.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{scrapedOrg.description}</p>
                        )}
                      </div>
                      <button onClick={clearOrg} className="text-muted-foreground hover:text-foreground p-1 shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Suggested guilds */}
                    {suggestedGuilds.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                          <UsersRound className="h-3.5 w-3.5" /> Communities to join
                        </p>
                        <ScrollArea className="max-h-[120px]">
                          <div className="space-y-1.5">
                            {suggestedGuilds.map((g) => {
                              const selected = selectedGuildIds.includes(g.id);
                              return (
                                <button
                                  key={g.id}
                                  onClick={() => toggleGuild(g.id)}
                                  className={`w-full flex items-center gap-2.5 p-2 rounded-lg border text-left transition-all ${
                                    selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                                  }`}
                                >
                                  <Avatar className="h-8 w-8 shrink-0">
                                    {g.logo_url && <AvatarImage src={g.logo_url} />}
                                    <AvatarFallback className="text-[10px]">{g.name.slice(0, 2)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{g.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{g.member_count} members</p>
                                  </div>
                                  {selected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {/* Suggested users */}
                    {suggestedUsers.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5" /> People to follow
                        </p>
                        <ScrollArea className="max-h-[120px]">
                          <div className="space-y-1.5">
                            {suggestedUsers.map((u) => {
                              const selected = selectedUserIds.includes(u.id);
                              return (
                                <button
                                  key={u.id}
                                  onClick={() => toggleUser(u.id)}
                                  className={`w-full flex items-center gap-2.5 p-2 rounded-lg border text-left transition-all ${
                                    selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                                  }`}
                                >
                                  <Avatar className="h-8 w-8 shrink-0">
                                    {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                                    <AvatarFallback className="text-[10px]">{u.display_name?.slice(0, 2)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{u.display_name}</p>
                                    {u.headline && <p className="text-[10px] text-muted-foreground truncate">{u.headline}</p>}
                                  </div>
                                  {selected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {suggestedGuilds.length === 0 && suggestedUsers.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No matching communities found yet — you'll be able to create or join after signing up.
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── Step 5: Signup ─── */}
            {step === "signup" && (
              <motion.div key="signup" {...motionProps} className="p-5">
                <h2 className="font-display font-semibold text-base mb-1">Create your account</h2>
                <p className="text-xs text-muted-foreground mb-4">One last step — then we'll personalize everything for you.</p>

                {/* Summary chips */}
                {(selectedGoal || selectedPersona || selectedInterests.length > 0 || scrapedOrg) && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {selectedGoal && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        🎯 {GOALS.find((g) => g.key === selectedGoal)?.label}
                      </span>
                    )}
                    {selectedPersona && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        🌍 {PERSONAS.find((p) => p.key === selectedPersona)?.label}
                      </span>
                    )}
                    {scrapedOrg?.name && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        🏢 {scrapedOrg.name}
                      </span>
                    )}
                    {selectedInterests.slice(0, 4).map((id) => {
                      const item = topicItems.find((t) => t.id === id);
                      return (
                        <span key={id} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {item?.icon} {item?.label ?? id}
                        </span>
                      );
                    })}
                    {selectedInterests.length > 4 && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        +{selectedInterests.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                <form onSubmit={handleSignup} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="guest-name" className="text-xs">Full name</Label>
                    <Input id="guest-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required autoComplete="name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="guest-email" className="text-xs">Email</Label>
                    <Input id="guest-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setSignupError(null); }} placeholder="you@example.com" required autoComplete="email" className={signupError ? "border-destructive" : ""} />
                    {signupError && <p className="text-[11px] text-destructive">{signupError}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="guest-pw" className="text-xs">Password</Label>
                      <Input id="guest-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 chars" required minLength={6} autoComplete="new-password" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="guest-pw2" className="text-xs">Confirm</Label>
                      <Input id="guest-pw2" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat" required autoComplete="new-password" />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={signingUp}>
                    {signingUp ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    Create account
                  </Button>
                </form>

                <p className="text-center text-xs text-muted-foreground mt-4">
                  Already have an account?{" "}
                  <button onClick={() => { handleOpenChange(false); navigate(`/login${redirectParam}`); }} className="text-primary font-medium hover:underline">
                    Log in
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Footer nav */}
        <div className="p-3 border-t flex items-center justify-between">
          {stepIndex > 0 ? (
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
          ) : (
            <div />
          )}
          {step !== "signup" && (
            <Button size="sm" onClick={goNext} disabled={!canProceed}>
              {step === "connect" ? "Create account" : "Continue"} <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
