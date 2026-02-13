import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera, MapPin, Briefcase, Rocket,
  ArrowRight, ArrowLeft, Check, X, Loader2, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload } from "@/components/ImageUpload";

type WizardStep = "photo" | "details" | "next_actions";

const STEPS: WizardStep[] = ["photo", "details", "next_actions"];
const STEP_LABELS = ["Photo", "About you", "What's next"];

export function PostSignupWizard() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("photo");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [skipDetailsStep, setSkipDetailsStep] = useState(false);

  // Pre-fill from existing profile data
  useEffect(() => {
    if (!user || prefilled) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, headline, bio, location")
        .eq("user_id", user.id)
        .single();
      if (data) {
        if (data.avatar_url) setAvatarUrl(data.avatar_url);
        if (data.headline) setHeadline(data.headline);
        if ((data as any).bio) setBio((data as any).bio);
        if ((data as any).location) setLocation((data as any).location);
        // Skip details step if headline, bio, and location are already filled
        if (data.headline && (data as any).bio && (data as any).location) {
          setSkipDetailsStep(true);
        }
      }
      setPrefilled(true);
    })();
  }, [user, prefilled]);

  // Check for post-signup context and persist onboarding selections
  useEffect(() => {
    if (!user) return;
    try {
      const raw = sessionStorage.getItem("guestOnboardingContext");
      if (!raw) return;
      const ctx = JSON.parse(raw);

      // Persist selected topics to user_topics table
      if (ctx.interest_topic_ids?.length > 0) {
        const topicRows = ctx.interest_topic_ids.map((topicId: string) => ({
          user_id: user.id,
          topic_id: topicId,
        }));
        supabase
          .from("user_topics")
          .upsert(topicRows, { onConflict: "user_id,topic_id", ignoreDuplicates: true })
          .then(({ error }) => {
            if (error) console.error("Failed to persist onboarding topics:", error);
          });
        // Clear so we don't re-insert on re-render
        delete ctx.interest_topic_ids;
        sessionStorage.setItem("guestOnboardingContext", JSON.stringify(ctx));
      }

      if (ctx.show_post_signup_wizard) {
        // Show after a brief delay to let the page settle
        const t = setTimeout(() => setOpen(true), 1500);
        return () => clearTimeout(t);
      }
    } catch { /* ignore */ }
  }, [user]);

  if (!user) return null;

  const stepIndex = STEPS.indexOf(step);

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) {
      const nextStep = STEPS[idx + 1];
      // Skip details step if already filled
      if (nextStep === "details" && skipDetailsStep) {
        setStep(STEPS[idx + 2]);
      } else {
        setStep(nextStep);
      }
    }
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) {
      const prevStep = STEPS[idx - 1];
      // Skip details step if already filled
      if (prevStep === "details" && skipDetailsStep) {
        setStep(STEPS[idx - 2]);
      } else {
        setStep(prevStep);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const updates: Record<string, any> = { has_completed_onboarding: true };
    updates.avatar_url = avatarUrl || null;
    if (headline.trim()) updates.headline = headline.trim();
    if (location.trim()) updates.location = location.trim();
    if (bio.trim()) updates.bio = bio.trim();

    const hasChanges = avatarUrl || headline.trim() || location.trim() || bio.trim();
    if (hasChanges || true) { // Always update to set has_completed_onboarding
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (error) {
        console.error("Profile save error:", error);
        toast({ title: "Could not save profile", variant: "destructive" });
        setSaving(false);
        return;
      }
      await refreshProfile();
    }

    // Clean up session flag
    try {
      const raw = sessionStorage.getItem("guestOnboardingContext");
      if (raw) {
        const ctx = JSON.parse(raw);
        delete ctx.show_post_signup_wizard;
        sessionStorage.setItem("guestOnboardingContext", JSON.stringify(ctx));
      }
    } catch { /* ignore */ }

    setSaving(false);
    setOpen(false);
  };

  const handleClose = () => {
    // Clean up session flag
    try {
      const raw = sessionStorage.getItem("guestOnboardingContext");
      if (raw) {
        const ctx = JSON.parse(raw);
        delete ctx.show_post_signup_wizard;
        sessionStorage.setItem("guestOnboardingContext", JSON.stringify(ctx));
      }
    } catch { /* ignore */ }
    setOpen(false);
  };

  const handleNavigate = (path: string) => {
    handleSave().then(() => navigate(path));
  };

  const motionProps = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
    transition: { duration: 0.2 },
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 pb-3 border-b bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="font-display font-semibold text-sm">Complete your profile</p>
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-1.5">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex-1 flex flex-col gap-1">
                <div className={`h-1 rounded-full transition-colors duration-300 ${i <= stepIndex ? "bg-primary" : "bg-muted"}`} />
                <span className={`text-[10px] ${i <= stepIndex ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Photo */}
          {step === "photo" && (
            <motion.div key="photo" {...motionProps} className="p-5 flex flex-col items-center gap-4">
              <h2 className="font-display font-semibold text-base">Add a profile picture</h2>
              <p className="text-xs text-muted-foreground text-center">Help people recognize you. Optional — you can add one later.</p>

              <div className="relative">
                <Avatar className="h-24 w-24 border-2 border-border">
                  {avatarUrl && <AvatarImage src={avatarUrl} />}
                  <AvatarFallback className="text-2xl">{user.name?.slice(0, 2)?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>

              <ImageUpload
                label="Upload photo"
                currentImageUrl={avatarUrl || undefined}
                onChange={(url) => setAvatarUrl(url || "")}
                aspectRatio="1/1"
                description="Square image works best"
              />
            </motion.div>
          )}

          {/* Step 2: Details */}
          {step === "details" && (
            <motion.div key="details" {...motionProps} className="p-5 space-y-4">
              <div>
                <h2 className="font-display font-semibold text-base">Tell us a bit more</h2>
                <p className="text-xs text-muted-foreground">All optional — fill what feels right.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" /> Headline
                </Label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Regenerative designer & facilitator"
                  maxLength={120}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Location
                </Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Paris, France"
                  maxLength={100}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Short bio</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A few words about yourself…"
                  maxLength={300}
                  rows={3}
                />
              </div>
            </motion.div>
          )}

          {/* Step 3: What's next */}
          {step === "next_actions" && (
            <motion.div key="next_actions" {...motionProps} className="p-5 space-y-4">
              <div>
                <h2 className="font-display font-semibold text-base">What would you like to do first?</h2>
                <p className="text-xs text-muted-foreground">Pick one to get started — or save & explore freely.</p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleNavigate("/services/new")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/50 transition-all text-left"
                >
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Offer a service</p>
                    <p className="text-xs text-muted-foreground">Publish your expertise for others to book</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>

                <button
                  onClick={() => handleNavigate("/quests/new")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/50 transition-all text-left"
                >
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Rocket className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Start a quest</p>
                    <p className="text-xs text-muted-foreground">Launch a project and find collaborators</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>

                <button
                  onClick={() => handleNavigate("/explore")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/50 transition-all text-left"
                >
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Explore the platform</p>
                    <p className="text-xs text-muted-foreground">Browse communities, courses, and people</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="p-3 border-t flex items-center justify-between">
          {stepIndex > 0 ? (
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Skip
            </Button>
          )}
          {step !== "next_actions" ? (
            <Button size="sm" onClick={goNext}>
              Continue <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => handleSave()} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
              Save & explore
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
