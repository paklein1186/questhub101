import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, Loader2, MapPin, Hash, Shield, Compass, Home, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { topics, territories, getTopicsForGuild, getReferralByCode } from "@/data/mock";
import { UserRole } from "@/types/enums";
import { generateOnboardingResults, type AIOnboardingResult } from "@/services/mockAI";
import { Link } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useXP } from "@/hooks/useXP";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const STEPS = ["Role", "Topics", "Territories", "Bio", "AI Magic", "Explore"];

const roleOptions = [
  { value: UserRole.GAMECHANGER, label: "Gamechanger", desc: "I create bold solutions and drive innovation.", icon: Zap },
  { value: UserRole.ECOSYSTEM_BUILDER, label: "Ecosystem Builder", desc: "I connect people, ideas, and resources.", icon: Shield },
  { value: UserRole.BOTH, label: "Both", desc: "I do it all — build and change the game.", icon: Sparkles },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

export default function Onboarding() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const { awardXp } = useXP();
  const { user: authUser, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [direction, setDirection] = useState(1);
  const [role, setRole] = useState<UserRole | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIOnboardingResult | null>(null);
  const [referralRewarded, setReferralRewarded] = useState(false);

  // Process referral reward when reaching the final step
  useEffect(() => {
    if (step === 5 && !referralRewarded) {
      const refCode = sessionStorage.getItem("referralCode");
      if (refCode) {
        const referral = getReferralByCode(refCode);
        if (referral && !referral.rewardGiven) {
          // Link referee
          referral.refereeUserId = currentUser.id;
          referral.rewardGiven = true;
          // Award referrer +50 XP via the XP system
          awardXp(referral.referrerUserId, "REFERRAL_REWARD");
        }
        sessionStorage.removeItem("referralCode");
        setReferralRewarded(true);
      }
    }
  }, [step]);

  const progress = ((step + 1) / STEPS.length) * 100;

  const canNext = () => {
    if (step === 0) return !!role;
    if (step === 1) return true; // allow zero interests
    if (step === 2) return selectedTerritories.length > 0;
    if (step === 3) return true; // bio is optional
    return true;
  };

  const handleGenerateBio = async () => {
    setGeneratingBio(true);
    try {
      const topicNames = selectedTopics
        .map((id) => topics.find((t) => t.id === id)?.name)
        .filter(Boolean);
      const context = bio.trim().length > 10
        ? bio
        : `I am a ${role || "changemaker"} interested in ${topicNames.join(", ") || "making an impact"}.`;
      // Mock AI bio generation
      await new Promise((r) => setTimeout(r, 1200));
      const generated = `${context} Passionate about creating meaningful change and connecting with like-minded people across communities.`;
      setBio(generated);
    } catch {
      toast({ title: "AI generation failed", description: "You can write your bio manually.", variant: "destructive" });
    } finally {
      setGeneratingBio(false);
    }
  };

  const goNext = async () => {
    if (step === 3) {
      // Trigger AI generation
      setDirection(1);
      setStep(4);
      setLoading(true);
      const res = await generateOnboardingResults({
        role: role!,
        selectedTopicIds: selectedTopics,
        selectedTerritoryIds: selectedTerritories,
        bio,
      });
      setResult(res);
      setLoading(false);
      return;
    }
    if (step === 4) {
      setDirection(1);
      setStep(5);
      return;
    }
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const toggleTopic = (id: string) =>
    setSelectedTopics((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleTerritory = (id: string) =>
    setSelectedTerritories((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span className="font-display font-semibold text-foreground">{STEPS[step]}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Step content */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 min-h-[420px] flex flex-col">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-1 flex flex-col"
            >
              {/* Step 0: Role */}
              {step === 0 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-display text-2xl font-bold">What brings you here?</h2>
                    <p className="text-sm text-muted-foreground mt-1">Choose the role that fits you best.</p>
                  </div>
                  <div className="space-y-3">
                    {roleOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setRole(opt.value)}
                        className={cn(
                          "w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all",
                          role === opt.value
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center",
                          role === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          <opt.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-display font-semibold">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                        {role === opt.value && <Check className="ml-auto h-5 w-5 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 1: Topics */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                      <Hash className="h-6 w-6 text-primary" /> Pick your topics
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Select the topics that matter to you.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topics.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => toggleTopic(topic.id)}
                        className={cn(
                          "px-4 py-2.5 rounded-full border-2 text-sm font-medium transition-all",
                          selectedTopics.includes(topic.id)
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border hover:border-primary/40 text-foreground"
                        )}
                      >
                        {topic.name}
                      </button>
                    ))}
                  </div>
                  {selectedTopics.length > 0 && (
                    <p className="text-xs text-muted-foreground">{selectedTopics.length} selected</p>
                  )}
                </div>
              )}

              {/* Step 2: Territories */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                      <MapPin className="h-6 w-6 text-primary" /> Where are you active?
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Select your territories.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {territories.map((territory) => (
                      <button
                        key={territory.id}
                        onClick={() => toggleTerritory(territory.id)}
                        className={cn(
                          "px-4 py-2.5 rounded-full border-2 text-sm font-medium transition-all",
                          selectedTerritories.includes(territory.id)
                            ? "border-accent bg-accent text-accent-foreground shadow-sm"
                            : "border-border hover:border-accent/40 text-foreground"
                        )}
                      >
                        {territory.name}
                        <span className="ml-1 text-xs opacity-70 capitalize">({territory.level.toLowerCase()})</span>
                      </button>
                    ))}
                  </div>
                  {selectedTerritories.length > 0 && (
                    <p className="text-xs text-muted-foreground">{selectedTerritories.length} selected</p>
                  )}
                </div>
              )}

              {/* Step 3: Bio */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-display text-2xl font-bold">Tell us about yourself</h2>
                    <p className="text-sm text-muted-foreground mt-1">A short bio — AI will polish it for you.</p>
                  </div>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="I'm passionate about building communities that..."
                    className="min-h-[140px] resize-none text-sm"
                    maxLength={300}
                  />
                  <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
                </div>
              )}

              {/* Step 4: AI Magic */}
              {step === 4 && (
                <div className="space-y-6 flex-1 flex flex-col items-center justify-center">
                  {loading ? (
                    <div className="text-center space-y-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      >
                        <Sparkles className="h-12 w-12 text-primary mx-auto" />
                      </motion.div>
                      <div>
                        <h2 className="font-display text-2xl font-bold">AI is crafting your profile…</h2>
                        <p className="text-sm text-muted-foreground mt-1">Generating headline, bio, and suggestions.</p>
                      </div>
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                    </div>
                  ) : result ? (
                    <div className="space-y-5 w-full">
                      <div className="text-center">
                        <h2 className="font-display text-2xl font-bold">Your AI-Generated Profile</h2>
                        <p className="text-sm text-muted-foreground mt-1">Here's what we came up with.</p>
                      </div>
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                        <p className="text-xs font-medium text-primary uppercase tracking-wider">Headline</p>
                        <p className="font-display font-bold text-lg">{result.headline}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bio Summary</p>
                        <p className="text-sm">{result.bioSummary}</p>
                      </div>
                      {result.suggestedGuilds.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Suggested Guilds</p>
                          <div className="flex flex-wrap gap-2">
                            {result.suggestedGuilds.map((g) => (
                              <div key={g.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                                <img src={g.logoUrl} className="h-6 w-6 rounded" alt="" />
                                <span className="text-sm font-medium">{g.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {result.suggestedQuests.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Suggested Quests</p>
                          <div className="flex flex-wrap gap-2">
                            {result.suggestedQuests.map((q) => (
                              <Badge key={q.id} variant="secondary" className="text-xs py-1 px-2.5">
                                <Zap className="h-3 w-3 mr-1" /> {q.title} · {q.rewardXp} XP
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Step 5: Start Exploring */}
              {step === 5 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className="font-display text-3xl font-bold">You're all set!</h2>
                    <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Your profile is ready. Start exploring guilds, quests, and your personalized feed.</p>
                  </motion.div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <Button asChild className="flex-1" variant="default">
                      <Link to="/"><Home className="h-4 w-4 mr-2" /> Home Feed</Link>
                    </Button>
                    <Button asChild className="flex-1" variant="outline">
                      <Link to="/explore?tab=guilds"><Shield className="h-4 w-4 mr-2" /> Guilds</Link>
                    </Button>
                    <Button asChild className="flex-1" variant="outline">
                      <Link to="/explore?tab=quests"><Compass className="h-4 w-4 mr-2" /> Quests</Link>
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          {step < 5 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                disabled={step === 0}
                className={step === 0 ? "invisible" : ""}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              {step < 4 && (
                <Button onClick={goNext} disabled={!canNext()} size="sm">
                  {step === 3 ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-1" /> Generate with AI
                    </>
                  ) : (
                    <>
                      Next <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              )}
              {step === 4 && !loading && result && (
                <Button onClick={goNext} size="sm">
                  Continue <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
