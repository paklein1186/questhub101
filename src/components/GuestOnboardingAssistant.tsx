import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  UserPlus, LogIn, Loader2, ArrowRight, ArrowLeft,
  Rocket, Users, BookOpen, Briefcase, Compass,
  Palette, Shield, Blend, Sparkles, Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel?: string;
}

type Step = "goal" | "persona" | "interests" | "signup";

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
];

const INTEREST_TAGS = [
  "Design", "Music", "Film", "Writing", "Tech", "Sustainability",
  "Social Innovation", "Education", "Health", "Art", "Strategy",
  "Community Building", "Entrepreneurship", "Culture", "Research",
];

export function GuestOnboardingAssistant({ open, onOpenChange, actionLabel = "perform this action" }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("goal");
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Signup form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signingUp, setSigningUp] = useState(false);

  const redirectParam = `?redirect=${encodeURIComponent(location.pathname + location.search)}`;

  const stepIndex = ["goal", "persona", "interests", "signup"].indexOf(step);
  const totalSteps = 4;

  const goNext = useCallback(() => {
    if (step === "goal") setStep("persona");
    else if (step === "persona") setStep("interests");
    else if (step === "interests") setStep("signup");
  }, [step]);

  const goBack = useCallback(() => {
    if (step === "persona") setStep("goal");
    else if (step === "interests") setStep("persona");
    else if (step === "signup") setStep("interests");
  }, [step]);

  const toggleInterest = (tag: string) => {
    setSelectedInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 5 ? [...prev, tag] : prev
    );
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
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

    const roleMap: Record<string, string> = { creative: "CREATOR", impact: "GAMECHANGER", hybrid: "HYBRID" };
    const role = roleMap[selectedPersona || ""] || "GAMECHANGER";
    const { error } = await signUp(email.trim(), password, name.trim(), role);
    setSigningUp(false);
    if (error) {
      toast({ title: "Signup failed", description: error, variant: "destructive" });
    } else {
      // Store context for the onboarding wizard
      const ctx = {
        persona: selectedPersona,
        interests: selectedInterests,
        goals: selectedGoal ? [selectedGoal] : [],
        suggested_role: role,
      };
      sessionStorage.setItem("guestOnboardingContext", JSON.stringify(ctx));
      onOpenChange(false);
    }
  };

  const handleReset = () => {
    setStep("goal");
    setSelectedGoal(null);
    setSelectedPersona(null);
    setSelectedInterests([]);
    onOpenChange(false);
  };

  const canProceed =
    (step === "goal" && !!selectedGoal) ||
    (step === "persona" && !!selectedPersona) ||
    step === "interests" ||
    step === "signup";

  const stepLabels = ["Goal", "World", "Interests", "Account"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex-1 flex flex-col gap-1">
                <div
                  className={`h-1 rounded-full transition-colors duration-300 ${
                    i <= stepIndex ? "bg-primary" : "bg-muted"
                  }`}
                />
                <span className={`text-[10px] ${i <= stepIndex ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ─── Step 1: Goal ─── */}
          {step === "goal" && (
            <motion.div
              key="goal"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="p-5"
            >
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
                        selected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
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
            <motion.div
              key="persona"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="p-5"
            >
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
                        selected
                          ? `border-2 ${p.bg} shadow-sm`
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
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

          {/* ─── Step 3: Interests ─── */}
          {step === "interests" && (
            <motion.div
              key="interests"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="p-5"
            >
              <h2 className="font-display font-semibold text-base mb-1">What interests you?</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Pick up to 5 topics — helps us personalize your feed. <span className="italic">Optional.</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_TAGS.map((tag) => {
                  const selected = selectedInterests.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleInterest(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                      }`}
                    >
                      {selected && <Check className="inline h-3 w-3 mr-1 -mt-0.5" />}
                      {tag}
                    </button>
                  );
                })}
              </div>
              {selectedInterests.length > 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  {selectedInterests.length}/5 selected
                </p>
              )}
            </motion.div>
          )}

          {/* ─── Step 4: Signup ─── */}
          {step === "signup" && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="p-5"
            >
              <h2 className="font-display font-semibold text-base mb-1">Create your account</h2>
              <p className="text-xs text-muted-foreground mb-4">One last step — then we'll personalize everything for you.</p>

              {/* Summary chips */}
              {(selectedGoal || selectedPersona || selectedInterests.length > 0) && (
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
                  {selectedInterests.map((t) => (
                    <span key={t} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="guest-name" className="text-xs">Full name</Label>
                  <Input id="guest-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required autoComplete="name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="guest-email" className="text-xs">Email</Label>
                  <Input id="guest-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
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
                <button onClick={() => { onOpenChange(false); navigate(`/login${redirectParam}`); }} className="text-primary font-medium hover:underline">
                  Log in
                </button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

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
              {step === "interests" ? "Create account" : "Continue"} <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
