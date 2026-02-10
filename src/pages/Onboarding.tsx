import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Sparkles, Loader2, MapPin, Hash,
  Check, Compass, Heart, Palette, Rocket, Users, Briefcase,
  GraduationCap, HelpCircle, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTopics, useTerritories } from "@/hooks/useSupabaseData";
import { usePersona } from "@/hooks/usePersona";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AIWriterButton } from "@/components/AIWriterButton";
import { ImageUpload } from "@/components/ImageUpload";
import { AddTerritoryDialog } from "@/components/AddTerritoryDialog";

// ─── Step config ──────────────────────────────────────────────
const STEP_LABELS = ["Intention", "Identity", "Project", "Offering", "Get Started"];

const INTENTION_OPTIONS = [
  { key: "impact", label: "Make impact / collaborate", icon: Heart, desc: "Work on missions & social-impact projects" },
  { key: "creative", label: "Express myself creatively", icon: Palette, desc: "Art, writing, performance, installations" },
  { key: "explore", label: "Explore (not sure yet)", icon: HelpCircle, desc: "Just looking around for now" },
  { key: "project", label: "Launch or structure a project", icon: Rocket, desc: "Start a mission, initiative, or venture" },
  { key: "community", label: "Meet people, join communities", icon: Users, desc: "Find your people and belong" },
  { key: "work", label: "Find work / clients", icon: Briefcase, desc: "Offer your skills and get hired" },
  { key: "learn", label: "Learn and grow skills", icon: GraduationCap, desc: "Discover new topics and train" },
];

function inferPersona(selections: string[]): "IMPACT" | "CREATIVE" | "HYBRID" {
  const s = new Set(selections);
  const hasImpact = s.has("impact") || s.has("project") || s.has("work");
  const hasCreative = s.has("creative");
  if (hasImpact && hasCreative) return "HYBRID";
  if (hasCreative) return "CREATIVE";
  if (hasImpact) return "IMPACT";
  return "HYBRID";
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { user: authUser, refreshProfile } = useAuth();
  const currentUser = useCurrentUser();
  const { updatePersona } = usePersona();
  const { toast } = useToast();
  const { data: dbTopics = [] } = useTopics();
  const { data: dbTerritories = [] } = useTerritories();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 – Intention
  const [intentions, setIntentions] = useState<string[]>([]);

  // Step 2 – Identity
  const [name, setName] = useState("");
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  // Step 3 – Project
  const [wantsProject, setWantsProject] = useState<boolean | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectStatus, setProjectStatus] = useState("STARTING");
  const [projectTopics, setProjectTopics] = useState<string[]>([]);
  const [projectTerritories, setProjectTerritories] = useState<string[]>([]);
  const [projectImage, setProjectImage] = useState<string | undefined>();

  // Step 4 – Service
  const [wantsService, setWantsService] = useState<boolean | null>(null);
  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceTopics, setServiceTopics] = useState<string[]>([]);
  const [serviceImage, setServiceImage] = useState<string | undefined>();

  // Pre-fill from profile
  const [preloaded, setPreloaded] = useState(false);
  useEffect(() => {
    if (!authUser?.id || preloaded) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, bio, headline")
        .eq("user_id", authUser.id)
        .single();
      if (data) {
        if (data.name) setName(data.name);
        if (data.bio) setBio(data.bio);
      }
      // Load existing topics
      const { data: ut } = await supabase.from("user_topics").select("topic_id").eq("user_id", authUser.id);
      if (ut?.length) setSelectedTopics(ut.map((r) => r.topic_id));
      // Load existing territories
      const { data: utr } = await supabase.from("user_territories").select("territory_id").eq("user_id", authUser.id);
      if (utr?.length) setSelectedTerritories(utr.map((r) => r.territory_id));
      setPreloaded(true);
    })();
  }, [authUser?.id, preloaded]);

  const progress = ((step + 1) / STEP_LABELS.length) * 100;
  const personaType = inferPersona(intentions);
  const serviceLabel = personaType === "CREATIVE" ? "Skill Sessions" : "Services";

  const toggleIntention = (key: string) =>
    setIntentions((p) => p.includes(key) ? p.filter((x) => x !== key) : [...p, key]);
  const toggleArr = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  // ─── Save all onboarding data ─────────────────────────────
  const finishOnboarding = async () => {
    if (!authUser?.id) return;
    setSaving(true);
    try {
      // 1. Update profile
      await supabase.from("profiles").update({
        name: name.trim() || undefined,
        bio: bio.trim() || null,
        has_completed_onboarding: true,
        persona_type: personaType,
        persona_source: "onboarding_intent",
      }).eq("user_id", authUser.id);

      // 2. Sync user topics
      await supabase.from("user_topics").delete().eq("user_id", authUser.id);
      if (selectedTopics.length) {
        await supabase.from("user_topics").insert(
          selectedTopics.map((topicId) => ({ user_id: authUser.id, topic_id: topicId }))
        );
      }

      // 3. Sync user territories
      await supabase.from("user_territories").delete().eq("user_id", authUser.id);
      if (selectedTerritories.length) {
        await supabase.from("user_territories").insert(
          selectedTerritories.map((territoryId) => ({ user_id: authUser.id, territory_id: territoryId }))
        );
      }

      // 4. Infer persona via AI in background
      supabase.functions.invoke("infer-persona", {
        body: {
          selections: intentions.map((k) => INTENTION_OPTIONS.find((o) => o.key === k)?.label || k),
          freeText: bio,
          topics: selectedTopics,
        },
      }).then(({ data }) => {
        if (data?.persona && authUser?.id) {
          supabase.from("profiles").update({
            persona_type: data.persona,
            persona_confidence: data.confidence || 0.5,
            persona_source: data.source || "onboarding_ai",
          } as any).eq("user_id", authUser.id);
        }
      });

      // 5. Create quest if user wanted one
      if (wantsProject && projectTitle.trim()) {
        const questStatus = projectStatus === "COMPLETED" ? "COMPLETED" : projectStatus === "ONGOING" ? "IN_PROGRESS" : "OPEN";
        const { data: quest } = await supabase.from("quests").insert({
          title: projectTitle.trim(),
          description: projectDesc.trim() || null,
          status: questStatus,
          created_by_user_id: authUser.id,
          cover_image_url: projectImage || null,
          is_draft: false,
        }).select("id").single();

        if (quest?.id) {
          // Quest topics
          if (projectTopics.length) {
            await supabase.from("quest_topics").insert(
              projectTopics.map((topicId) => ({ quest_id: quest.id, topic_id: topicId }))
            );
          }
          if (projectTerritories.length) {
            await supabase.from("quest_territories").insert(
              projectTerritories.map((territoryId) => ({ quest_id: quest.id, territory_id: territoryId }))
            );
          }
          // Add creator as participant
          await supabase.from("quest_participants").insert({
            quest_id: quest.id,
            user_id: authUser.id,
            role: "LEAD",
            status: "ACTIVE",
          });
          // If completed, also create an achievement
          if (projectStatus === "COMPLETED") {
            await supabase.from("achievements").insert({
              user_id: authUser.id,
              quest_id: quest.id,
              title: projectTitle.trim(),
              description: projectDesc.trim() || null,
            });
          }
        }
      }

      // 6. Create service if user wanted one
      if (wantsService && serviceTitle.trim()) {
        const { data: svc } = await supabase.from("services").insert({
          title: serviceTitle.trim(),
          description: serviceDesc.trim() || null,
          provider_user_id: authUser.id,
          price_amount: servicePrice ? Number(servicePrice) : 0,
          price_currency: "EUR",
          image_url: serviceImage || null,
          is_active: true,
        }).select("id").single();

        if (svc?.id && serviceTopics.length) {
          await supabase.from("service_topics").insert(
            serviceTopics.map((topicId) => ({ service_id: svc.id, topic_id: topicId }))
          );
        }
      }

      await refreshProfile();
      // Move to post-onboarding CTA step
      setDirection(1);
      setStep(4);
    } catch (e: any) {
      toast({ title: "Error saving", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    // Step 3 (Project): if user said No or is done, go to step 4 (Service)
    if (step === 2 && wantsProject === false) {
      setDirection(1);
      setStep(3);
      return;
    }
    // Step 4 (Service): finalize
    if (step === 3) {
      finishOnboarding();
      return;
    }
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        {step < STEP_LABELS.length - 1 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Step {step + 1} of {STEP_LABELS.length - 1}</span>
              <span className="font-display font-semibold text-foreground">{STEP_LABELS[step]}</span>
            </div>
            <Progress value={((step + 1) / (STEP_LABELS.length - 1)) * 100} className="h-1.5" />
          </div>
        )}

        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 min-h-[460px] flex flex-col">
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
              {/* ───── STEP 0: Intention ───── */}
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold">What are you up to? ✨</h2>
                    <p className="text-sm text-muted-foreground mt-1">Select everything that resonates. You can always change this later.</p>
                  </div>
                  <div className="space-y-2">
                    {INTENTION_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => toggleIntention(opt.key)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
                          intentions.includes(opt.key)
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                          intentions.includes(opt.key) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          <opt.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                        {intentions.includes(opt.key) && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ───── STEP 1: Identity ───── */}
              {step === 1 && (
                <div className="space-y-5 overflow-y-auto max-h-[500px] pr-1">
                  <div>
                    <h2 className="font-display text-2xl font-bold">Who are you? 🌱</h2>
                    <p className="text-sm text-muted-foreground mt-1">A few things to help us know you better.</p>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Name</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={100} />
                  </div>

                  {/* Territory */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-accent" /> Territory (where you live)
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTerritories([])} disabled={selectedTerritories.length === 0} className="text-xs h-7">Clear</Button>
                      <AddTerritoryDialog onCreated={(id) => setSelectedTerritories((p) => [...p, id])} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {dbTerritories.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTerritories((p) => toggleArr(p, t.id))}
                          className={cn(
                            "px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                            selectedTerritories.includes(t.id)
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-border hover:border-accent/40"
                          )}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Houses (Topics) */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5 text-primary" /> Houses (2–4 recommended)
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setSelectedTopics(dbTopics.map((t) => t.id))}>Select all</Button>
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedTopics([])} disabled={selectedTopics.length === 0}>Clear</Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      {dbTopics.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTopics((p) => toggleArr(p, t.id))}
                          className={cn(
                            "px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                            selectedTopics.includes(t.id)
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary/40"
                          )}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{selectedTopics.length} selected</p>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">One-sentence bio</label>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="I'm passionate about…"
                      className="min-h-[80px] resize-none text-sm"
                      maxLength={300}
                    />
                    <div className="flex items-center justify-between mt-1.5">
                      <AIWriterButton
                        type="bio"
                        context={{ intentions, houses: selectedTopics, territories: selectedTerritories, personaType }}
                        currentText={bio}
                        onAccept={(text) => setBio(text)}
                      />
                      <span className="text-xs text-muted-foreground">{bio.length}/300</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ───── STEP 2: Project ───── */}
              {step === 2 && (
                <div className="space-y-5 overflow-y-auto max-h-[500px] pr-1">
                  <div>
                    <h2 className="font-display text-2xl font-bold">A project you're proud of? 🚀</h2>
                    <p className="text-sm text-muted-foreground mt-1">Past or present — share something you care about.</p>
                  </div>

                  {wantsProject === null && (
                    <div className="flex gap-3">
                      <Button variant="default" className="flex-1" onClick={() => setWantsProject(true)}>
                        Yes, let me share
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={() => setWantsProject(false)}>
                        Skip for now
                      </Button>
                    </div>
                  )}

                  {wantsProject && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Title</label>
                        <Input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="e.g. Regenerative Farm Network" maxLength={120} />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Short description</label>
                        <Textarea value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} placeholder="What is it about?" className="resize-none min-h-[80px] text-sm" maxLength={500} />
                        <AIWriterButton
                          type="quest_story"
                          context={{ title: projectTitle, houses: projectTopics, territories: projectTerritories, personaType }}
                          currentText={projectDesc}
                          onAccept={(text) => setProjectDesc(text)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Status</label>
                        <Select value={projectStatus} onValueChange={setProjectStatus}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="STARTING">Starting</SelectItem>
                            <SelectItem value="ONGOING">Ongoing</SelectItem>
                            <SelectItem value="COMPLETED">Completed (Achievement)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Houses</label>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                          {dbTopics.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => setProjectTopics((p) => toggleArr(p, t.id))}
                              className={cn(
                                "px-2.5 py-1 rounded-full border text-xs transition-all",
                                projectTopics.includes(t.id)
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border hover:border-primary/40"
                              )}
                            >
                              {t.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Territories</label>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                          {dbTerritories.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => setProjectTerritories((p) => toggleArr(p, t.id))}
                              className={cn(
                                "px-2.5 py-1 rounded-full border text-xs transition-all",
                                projectTerritories.includes(t.id)
                                  ? "border-accent bg-accent text-accent-foreground"
                                  : "border-border hover:border-accent/40"
                              )}
                            >
                              {t.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Cover image (optional)</label>
                        <ImageUpload label="Cover image" currentImageUrl={projectImage} onChange={(url) => setProjectImage(url)} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ───── STEP 3: Service / Skill Session ───── */}
              {step === 3 && (
                <div className="space-y-5 overflow-y-auto max-h-[500px] pr-1">
                  <div>
                    <h2 className="font-display text-2xl font-bold">Offer {serviceLabel}? 🎯</h2>
                    <p className="text-sm text-muted-foreground mt-1">Share your skills with the ecosystem.</p>
                  </div>

                  {wantsService === null && (
                    <div className="flex gap-3">
                      <Button variant="default" className="flex-1" onClick={() => setWantsService(true)}>
                        Yes, let's go
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={() => { setWantsService(false); finishOnboarding(); }}>
                        Skip for now
                      </Button>
                    </div>
                  )}

                  {wantsService && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Title</label>
                        <Input value={serviceTitle} onChange={(e) => setServiceTitle(e.target.value)} placeholder={personaType === "CREATIVE" ? "e.g. Live Drawing Session" : "e.g. Strategy Workshop"} maxLength={120} />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Description</label>
                        <Textarea value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} placeholder="What does this include?" className="resize-none min-h-[80px] text-sm" maxLength={500} />
                        <AIWriterButton
                          type="bio"
                          context={{ title: serviceTitle, personaType, serviceType: serviceLabel }}
                          currentText={serviceDesc}
                          onAccept={(text) => setServiceDesc(text)}
                          label={`Generate ${serviceLabel.toLowerCase()} description`}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Price (€, optional)</label>
                        <Input type="number" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} placeholder="0 = free" min={0} step={5} />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Houses</label>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                          {dbTopics.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => setServiceTopics((p) => toggleArr(p, t.id))}
                              className={cn(
                                "px-2.5 py-1 rounded-full border text-xs transition-all",
                                serviceTopics.includes(t.id)
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border hover:border-primary/40"
                              )}
                            >
                              {t.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Image (optional)</label>
                        <ImageUpload label="Service image" currentImageUrl={serviceImage} onChange={(url) => setServiceImage(url)} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ───── STEP 4: Post-onboarding CTA ───── */}
              {step === 4 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                  {saving ? (
                    <div className="space-y-4">
                      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                      <p className="text-muted-foreground">Setting everything up…</p>
                    </div>
                  ) : (
                    <>
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <Sparkles className="h-10 w-10 text-primary" />
                        </div>
                        <h2 className="font-display text-3xl font-bold">You're all set! 🎉</h2>
                        <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                          Your profile is ready. Here's what you can do next.
                        </p>
                      </motion.div>

                      <div className="w-full space-y-3">
                        <Button asChild className="w-full" variant="default">
                          <Link to="/">
                            <Compass className="h-4 w-4 mr-2" /> Go to Home Feed
                          </Link>
                        </Button>
                        <div className="grid grid-cols-2 gap-3">
                          <Button asChild variant="outline">
                            <Link to="/explore?tab=guilds">
                              <Users className="h-4 w-4 mr-2" /> Join a Guild
                            </Link>
                          </Button>
                          <Button asChild variant="outline">
                            <Link to="/me/companies">
                              <Briefcase className="h-4 w-4 mr-2" /> Attach a Company
                            </Link>
                          </Button>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        You can revisit onboarding anytime from{" "}
                        <Link to="/me/settings" className="underline text-primary">Settings → Open Wizard</Link>.
                      </p>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          {step < 4 && (
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
              {/* Step 2 (Project): only show Next if user chose Yes and filled title, or if they haven't chosen yet (skip is handled by the skip button) */}
              {step === 2 && wantsProject === null ? null : step === 3 && wantsService === null ? null : (
                <Button onClick={goNext} size="sm" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {step === 3 ? "Finish" : "Next"} <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
