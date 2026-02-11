import { useState, useEffect, useCallback } from "react";
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
import { useSpokenLanguages, AVAILABLE_LANGUAGES } from "@/hooks/useSpokenLanguages";
import { AffiliationsStep, type AffiliationLink, type ManualAffiliation } from "@/components/onboarding/AffiliationsStep";
import { AffiliationsReviewStep, type SuggestedAffiliation, type SuggestedHouse, type SuggestedService } from "@/components/onboarding/AffiliationsReviewStep";
import { useQuery } from "@tanstack/react-query";
import {
  CREATIVE_INTENTION_OPTIONS,
  CREATIVE_BIO_SUGGESTIONS,
  HOUSES_OF_ART,
  CREATIVE_HOUSE_KEYS,
  type PersonaType,
} from "@/lib/personaLabels";

// ─── Step config ──────────────────────────────────────────────
// Creative: 0=entry, 1=houses, 2=ground, 3=essence, 4=affiliations, 5=review, 6=project, 7=service, 8=done
const STEP_LABELS_CREATIVE = ["Creative Path", "Houses of Art", "Creative Ground", "Creative Essence", "Your Circles & Work", "Review Suggestions", "Proud Project", "Skill Session", "Get Started"];
// Impact: 0=intention, 1=identity, 2=affiliations, 3=review, 4=project, 5=service, 6=done
const STEP_LABELS_IMPACT = ["Intention", "Identity", "Your Work", "Review Suggestions", "Project", "Offering", "Get Started"];

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

  // Creative vs Impact path
  const [isCreativePath, setIsCreativePath] = useState(false);

  // Step 0 – Intention
  const [intentions, setIntentions] = useState<string[]>([]);
  const [creativeIntentions, setCreativeIntentions] = useState<string[]>([]);

  // Identity
  const [name, setName] = useState("");
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  // Affiliations step
  const [affLinks, setAffLinks] = useState<AffiliationLink>({ website: "", linkedin: "", other: "" });
  const [manualAffiliations, setManualAffiliations] = useState<ManualAffiliation[]>([]);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);

  // AI review step
  const [suggestedAffiliations, setSuggestedAffiliations] = useState<SuggestedAffiliation[]>([]);
  const [suggestedHouses, setSuggestedHouses] = useState<SuggestedHouse[]>([]);
  const [suggestedServices, setSuggestedServices] = useState<SuggestedService[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRequested, setAiRequested] = useState(false);

  // Project
  const [wantsProject, setWantsProject] = useState<boolean | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectStatus, setProjectStatus] = useState("STARTING");
  const [projectTopics, setProjectTopics] = useState<string[]>([]);
  const [projectTerritories, setProjectTerritories] = useState<string[]>([]);
  const [projectImage, setProjectImage] = useState<string | undefined>();

  // Service
  const [wantsService, setWantsService] = useState<boolean | null>(null);
  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceTopics, setServiceTopics] = useState<string[]>([]);
  const [serviceImage, setServiceImage] = useState<string | undefined>();

  // Fetch existing guilds & companies for affiliations step
  const { data: existingGuilds = [] } = useQuery({
    queryKey: ["onboarding-guilds"],
    queryFn: async () => {
      const { data } = await supabase.from("guilds").select("id, name").eq("is_deleted", false).eq("is_approved", true).limit(100);
      return data || [];
    },
  });
  const { data: existingCompanies = [] } = useQuery({
    queryKey: ["onboarding-companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name").eq("is_deleted", false).limit(100);
      return data || [];
    },
  });

  // Pre-fill from profile
  const [preloaded, setPreloaded] = useState(false);
  useEffect(() => {
    if (!authUser?.id || preloaded) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, bio, headline, website_url, linkedin_url, instagram_url")
        .eq("user_id", authUser.id)
        .single();
      if (data) {
        if (data.name) setName(data.name);
        if (data.bio) setBio(data.bio);
        if (data.website_url || data.linkedin_url || data.instagram_url) {
          setAffLinks({
            website: data.website_url || "",
            linkedin: data.linkedin_url || "",
            other: data.instagram_url || "",
          });
        }
      }
      const { data: ut } = await supabase.from("user_topics").select("topic_id").eq("user_id", authUser.id);
      if (ut?.length) setSelectedTopics(ut.map((r) => r.topic_id));
      const { data: utr } = await supabase.from("user_territories").select("territory_id").eq("user_id", authUser.id);
      if (utr?.length) setSelectedTerritories(utr.map((r) => r.territory_id));
      setPreloaded(true);
    })();
  }, [authUser?.id, preloaded]);

  const stepLabels = isCreativePath ? STEP_LABELS_CREATIVE : STEP_LABELS_IMPACT;
  const totalSteps = stepLabels.length;
  const lastStepIndex = totalSteps - 1;
  const personaType: PersonaType = isCreativePath ? "CREATIVE" : inferPersona(intentions);
  const serviceLabel = personaType === "CREATIVE" ? "Skill Sessions" : "Services";

  const toggleIntention = (key: string) =>
    setIntentions((p) => p.includes(key) ? p.filter((x) => x !== key) : [...p, key]);
  const toggleCreativeIntention = (key: string) =>
    setCreativeIntentions((p) => p.includes(key) ? p.filter((x) => x !== key) : [...p, key]);
  const toggleArr = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  const toggleEntity = (id: string) =>
    setSelectedEntityIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  // ─── Trigger AI suggestions ─────────────────────────────
  const requestAiSuggestions = useCallback(async () => {
    if (aiRequested) return;
    setAiLoading(true);
    setAiRequested(true);
    try {
      const { data, error } = await supabase.functions.invoke("onboarding-suggest", {
        body: {
          persona: personaType,
          name,
          headline: bio?.slice(0, 100),
          bio,
          links: affLinks,
          manualAffiliations,
          selectedHouseIds: selectedTopics,
        },
      });

      if (error) throw error;

      if (data?.suggestedAffiliations) {
        setSuggestedAffiliations(
          data.suggestedAffiliations.map((a: any) => ({ ...a, accepted: a.confidence > 0.5 }))
        );
      }
      if (data?.suggestedHouses) {
        setSuggestedHouses(
          data.suggestedHouses.map((h: any) => ({ ...h, accepted: h.confidence > 0.5 }))
        );
      }
      if (data?.suggestedServices) {
        setSuggestedServices(
          data.suggestedServices.map((s: any) => ({ ...s, accepted: true }))
        );
      }
    } catch (e: any) {
      console.error("AI suggestions error:", e);
      toast({ title: "AI suggestions unavailable", description: "You can add everything manually later.", variant: "default" });
    } finally {
      setAiLoading(false);
    }
  }, [aiRequested, personaType, name, bio, affLinks, manualAffiliations, selectedTopics, toast]);

  // ─── Save all onboarding data ─────────────────────────────
  const finishOnboarding = async () => {
    if (!authUser?.id) return;
    setSaving(true);
    try {
      // Save social links to profile
      await supabase.from("profiles").update({
        name: name.trim() || undefined,
        bio: bio.trim() || null,
        has_completed_onboarding: true,
        persona_type: personaType,
        persona_source: "onboarding_intent",
        website_url: affLinks.website.trim() || null,
        linkedin_url: affLinks.linkedin.trim() || null,
        instagram_url: affLinks.other.trim() || null,
      }).eq("user_id", authUser.id);

      await supabase.from("user_topics").delete().eq("user_id", authUser.id);
      // Merge selected topics + accepted AI house suggestions
      const allTopicIds = new Set(selectedTopics);
      suggestedHouses.filter(h => h.accepted).forEach(h => allTopicIds.add(h.topicId));
      if (allTopicIds.size > 0) {
        await supabase.from("user_topics").insert(
          Array.from(allTopicIds).map((topicId) => ({ user_id: authUser.id, topic_id: topicId }))
        );
      }

      await supabase.from("user_territories").delete().eq("user_id", authUser.id);
      if (selectedTerritories.length) {
        await supabase.from("user_territories").insert(
          selectedTerritories.map((territoryId) => ({ user_id: authUser.id, territory_id: territoryId }))
        );
      }

      // Save accepted affiliations as guild/company memberships
      for (const aff of suggestedAffiliations.filter(a => a.accepted && a.matchedEntityId)) {
        if (aff.matchedEntityType === "GUILD") {
          await supabase.from("guild_members").upsert([{
            guild_id: aff.matchedEntityId!,
            user_id: authUser.id,
            role: "MEMBER" as const,
          }], { onConflict: "guild_id,user_id" }).select();
        } else if (aff.matchedEntityType === "COMPANY") {
          await supabase.from("company_members").upsert([{
            company_id: aff.matchedEntityId!,
            user_id: authUser.id,
            role: aff.role || "member",
          }], { onConflict: "company_id,user_id" }).select();
        }
      }

      // Also join directly selected entities
      for (const entityId of selectedEntityIds) {
        const isGuild = existingGuilds.some(g => g.id === entityId);
        if (isGuild) {
          await supabase.from("guild_members").upsert([{
            guild_id: entityId,
            user_id: authUser.id,
            role: "MEMBER" as const,
          }], { onConflict: "guild_id,user_id" }).select();
        } else {
          await supabase.from("company_members").upsert([{
            company_id: entityId,
            user_id: authUser.id,
            role: "member",
          }], { onConflict: "company_id,user_id" }).select();
        }
      }

      // Save accepted draft services
      for (const svc of suggestedServices.filter(s => s.accepted)) {
        await supabase.from("services").insert({
          title: svc.title,
          description: svc.description,
          provider_user_id: authUser.id,
          owner_type: "USER",
          owner_id: authUser.id,
          price_amount: 0,
          price_currency: "EUR",
          is_active: false, // draft
          is_draft: true,
        } as any);
      }

      // Infer persona in background
      supabase.functions.invoke("infer-persona", {
        body: {
          selections: isCreativePath
            ? creativeIntentions.map((k) => CREATIVE_INTENTION_OPTIONS.find((o) => o.key === k)?.label || k)
            : intentions.map((k) => INTENTION_OPTIONS.find((o) => o.key === k)?.label || k),
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
          await supabase.from("quest_participants").insert({
            quest_id: quest.id,
            user_id: authUser.id,
            role: "LEAD",
            status: "ACTIVE",
          });
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

      if (wantsService && serviceTitle.trim()) {
        const { data: svc } = await supabase.from("services").insert({
          title: serviceTitle.trim(),
          description: serviceDesc.trim() || null,
          provider_user_id: authUser.id,
          owner_type: "USER",
          owner_id: authUser.id,
          price_amount: servicePrice ? Number(servicePrice) : 0,
          price_currency: "EUR",
          image_url: serviceImage || null,
          is_active: true,
        } as any).select("id").single();

        if (svc?.id && serviceTopics.length) {
          await supabase.from("service_topics").insert(
            serviceTopics.map((topicId) => ({ service_id: svc.id, topic_id: topicId }))
          );
        }
      }

      await refreshProfile();
      setDirection(1);
      setStep(lastStepIndex);
    } catch (e: any) {
      toast({ title: "Error saving", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ─── Step indices ─────────────────────────────────────────
  // Creative: 0=entry, 1=houses, 2=ground, 3=essence, 4=affiliations, 5=review, 6=project, 7=service, 8=done
  // Impact:  0=intention, 1=identity, 2=affiliations, 3=review, 4=project, 5=service, 6=done

  const CREATIVE_AFF_STEP = 4;
  const CREATIVE_REVIEW_STEP = 5;
  const CREATIVE_PROJECT_STEP = 6;
  const CREATIVE_SERVICE_STEP = 7;

  const IMPACT_AFF_STEP = 2;
  const IMPACT_REVIEW_STEP = 3;
  const IMPACT_PROJECT_STEP = 4;
  const IMPACT_SERVICE_STEP = 5;

  const goNext = () => {
    if (isCreativePath) {
      // Trigger AI when entering review step
      if (step === CREATIVE_AFF_STEP) {
        requestAiSuggestions();
      }
      if (step === CREATIVE_SERVICE_STEP) { finishOnboarding(); return; }
      if (step === CREATIVE_PROJECT_STEP && wantsProject === false) { setDirection(1); setStep(CREATIVE_SERVICE_STEP); return; }
    } else {
      if (step === IMPACT_AFF_STEP) {
        requestAiSuggestions();
      }
      if (step === IMPACT_SERVICE_STEP) { finishOnboarding(); return; }
      if (step === IMPACT_PROJECT_STEP && wantsProject === false) { setDirection(1); setStep(IMPACT_SERVICE_STEP); return; }
    }
    setDirection(1);
    setStep((s) => Math.min(s + 1, lastStepIndex));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const selectCreativePath = () => {
    setIsCreativePath(true);
    setDirection(1);
    setStep(1);
  };

  const selectImpactPath = () => {
    setIsCreativePath(false);
  };

  const currentStepLabel = stepLabels[step] || "";
  const isLastStep = step === lastStepIndex;
  const progressSteps = isCreativePath ? 8 : 6; // excluding final "done" step

  // Determine which step content to render
  const renderCreativeStep = () => {
    switch (step) {
      case 0: return renderEntryChoice();
      case 1: return renderHousesOfArt();
      case 2: return renderCreativeGround();
      case 3: return renderCreativeEssence();
      case 4: return renderAffiliationsInput();
      case 5: return renderAffiliationsReview();
      case 6: return renderProject(true);
      case 7: return renderService(true);
      case 8: return renderDone(true);
      default: return null;
    }
  };

  const renderImpactStep = () => {
    switch (step) {
      case 0: return renderEntryChoice();
      case 1: return renderIdentity();
      case 2: return renderAffiliationsInput();
      case 3: return renderAffiliationsReview();
      case 4: return renderProject(false);
      case 5: return renderService(false);
      case 6: return renderDone(false);
      default: return null;
    }
  };

  // ─── Step: Entry choice ─────────────────────────────────
  function renderEntryChoice() {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-bold">Welcome to changethegame ✨</h2>
          <p className="text-sm text-muted-foreground mt-1">What are you up to? Select everything that resonates — or choose the Creative path.</p>
        </div>

        <button
          onClick={selectCreativePath}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
            isCreativePath
              ? "border-primary bg-primary/10 shadow-md"
              : "border-accent/50 hover:border-accent bg-accent/5"
          )}
        >
          <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <Palette className="h-5 w-5 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">🎨 I'm here for creative projects, art & expression</p>
            <p className="text-xs text-muted-foreground">Enter the Creative path — Houses of Art, Muses, Collectives</p>
          </div>
          <ArrowRight className="h-4 w-4 text-accent shrink-0" />
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">or choose your intentions</span></div>
        </div>

        <div className="space-y-2">
          {INTENTION_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { selectImpactPath(); toggleIntention(opt.key); }}
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
    );
  }

  // ─── Creative Step 1: Houses of Art ─────────────────────
  function renderHousesOfArt() {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-bold">Choose your Houses of Art 🎨</h2>
          <p className="text-sm text-muted-foreground mt-1">Select 2–4 creative domains that resonate with you.</p>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setSelectedTopics(dbTopics.filter(t => CREATIVE_HOUSE_KEYS.includes(t.name?.toLowerCase().replace(/\s+/g, "-") || "")).map(t => t.id))}>Select all</Button>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedTopics([])} disabled={selectedTopics.length === 0}>Clear</Button>
        </div>

        <div className="space-y-2">
          {CREATIVE_HOUSE_KEYS.map((key) => {
            const house = HOUSES_OF_ART[key];
            const matchingTopic = dbTopics.find(t =>
              t.name?.toLowerCase().replace(/\s+/g, "-") === key
            );
            const topicId = matchingTopic?.id || key;
            const isSelected = selectedTopics.includes(topicId);

            return (
              <button
                key={key}
                onClick={() => setSelectedTopics((p) => toggleArr(p, topicId))}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/30"
                )}
              >
                <span className="text-2xl">{house.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{house.creativeLabel}</p>
                  <p className="text-xs text-muted-foreground">{house.description}</p>
                </div>
                {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>

        {dbTopics.filter(t => !CREATIVE_HOUSE_KEYS.includes(t.name?.toLowerCase().replace(/\s+/g, "-") || "")).length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Other Houses</p>
            <div className="flex flex-wrap gap-1.5">
              {dbTopics.filter(t => !CREATIVE_HOUSE_KEYS.includes(t.name?.toLowerCase().replace(/\s+/g, "-") || "")).map((t) => (
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
          </div>
        )}

        <p className="text-xs text-muted-foreground">{selectedTopics.length} selected</p>
      </div>
    );
  }

  // ─── Creative Step 2: Creative Ground ─────────────────
  function renderCreativeGround() {
    return (
      <div className="space-y-5 overflow-y-auto max-h-[500px] pr-1">
        <div>
          <h2 className="font-display text-2xl font-bold">Your Creative Ground 🌍</h2>
          <p className="text-sm text-muted-foreground mt-1">Which places inspire you or feel like home for your creation?</p>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={100} />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-accent" /> Places of resonance
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
      </div>
    );
  }

  // ─── Creative Step 3: Creative Essence ─────────────────
  function renderCreativeEssence() {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-bold">Your Creative Essence ✨</h2>
          <p className="text-sm text-muted-foreground mt-1">Describe your creative essence in one sentence.</p>
        </div>

        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="I follow curiosity until it becomes form…"
          className="min-h-[80px] resize-none text-sm"
          maxLength={300}
        />
        <div className="flex items-center justify-between">
          <AIWriterButton
            type="bio"
            context={{ intentions: creativeIntentions, houses: selectedTopics, territories: selectedTerritories, personaType: "CREATIVE" }}
            currentText={bio}
            onAccept={(text) => setBio(text)}
            label="✨ Write it with me"
          />
          <span className="text-xs text-muted-foreground">{bio.length}/300</span>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">Or try one of these:</p>
          <div className="space-y-1.5">
            {CREATIVE_BIO_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setBio(suggestion)}
                className="block w-full text-left text-sm px-3 py-2 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground"
              >
                "{suggestion}"
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Impact Step 1: Identity ─────────────────────────────
  function renderIdentity() {
    return (
      <div className="space-y-5 overflow-y-auto max-h-[500px] pr-1">
        <div>
          <h2 className="font-display text-2xl font-bold">Who are you? 🌱</h2>
          <p className="text-sm text-muted-foreground mt-1">A few things to help us know you better.</p>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={100} />
        </div>

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
    );
  }

  // ─── Affiliations input step (shared) ─────────────────
  function renderAffiliationsInput() {
    return (
      <AffiliationsStep
        persona={personaType}
        links={affLinks}
        onLinksChange={setAffLinks}
        manualAffiliations={manualAffiliations}
        onAffiliationsChange={setManualAffiliations}
        existingGuilds={existingGuilds}
        existingCompanies={existingCompanies}
        selectedEntityIds={selectedEntityIds}
        onToggleEntity={toggleEntity}
      />
    );
  }

  // ─── Affiliations review step (shared) ─────────────────
  function renderAffiliationsReview() {
    return (
      <AffiliationsReviewStep
        persona={personaType}
        affiliations={suggestedAffiliations}
        onAffiliationsChange={setSuggestedAffiliations}
        houses={suggestedHouses}
        onHousesChange={setSuggestedHouses}
        services={suggestedServices}
        onServicesChange={setSuggestedServices}
        loading={aiLoading}
      />
    );
  }

  // ─── Shared: Project step ───────────────────────────────
  function renderProject(creative: boolean) {
    const statusOptions = creative
      ? [
          { value: "STARTING", label: "🌱 Seedling" },
          { value: "ONGOING", label: "🌸 Blooming" },
          { value: "COMPLETED", label: "✨ Completed" },
        ]
      : [
          { value: "STARTING", label: "Starting" },
          { value: "ONGOING", label: "Ongoing" },
          { value: "COMPLETED", label: "Completed (Achievement)" },
        ];

    return (
      <div className="space-y-5 overflow-y-auto max-h-[500px] pr-1">
        <div>
          <h2 className="font-display text-2xl font-bold">
            {creative ? "Show us something you've made 🌟" : "A project you're proud of? 🚀"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {creative ? "A creation, project, or piece you're proud of." : "Past or present — share something you care about."}
          </p>
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
              <Input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder={creative ? "e.g. Sound Installation at the River" : "e.g. Regenerative Farm Network"} maxLength={120} />
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
                  {statusOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{creative ? "Houses of Art" : "Houses"}</label>
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
              <label className="text-sm font-medium mb-1.5 block">{creative ? "Places of resonance" : "Territories"}</label>
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
    );
  }

  // ─── Shared: Service step ──────────────────────────────
  function renderService(creative: boolean) {
    const sLabel = creative ? "Skill Session" : "Service";
    return (
      <div className="space-y-5 overflow-y-auto max-h-[500px] pr-1">
        <div>
          <h2 className="font-display text-2xl font-bold">
            {creative ? "Share your craft as a skill session? 🎯" : `Offer ${serviceLabel}? 🎯`}
          </h2>
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
              <Input value={serviceTitle} onChange={(e) => setServiceTitle(e.target.value)} placeholder={creative ? "e.g. Live Drawing Session" : "e.g. Strategy Workshop"} maxLength={120} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} placeholder="What does this include?" className="resize-none min-h-[80px] text-sm" maxLength={500} />
              <AIWriterButton
                type="bio"
                context={{ title: serviceTitle, personaType, serviceType: sLabel }}
                currentText={serviceDesc}
                onAccept={(text) => setServiceDesc(text)}
                label={`Generate ${sLabel.toLowerCase()} description`}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Price (€, optional)</label>
              <Input type="number" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} placeholder="0 = free" min={0} step={5} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{creative ? "Houses of Art" : "Houses"}</label>
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
              <ImageUpload label={`${sLabel} image`} currentImageUrl={serviceImage} onChange={(url) => setServiceImage(url)} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Final: Done step ──────────────────────────────────
  function renderDone(creative: boolean) {
    const hasDraftServices = suggestedServices.filter(s => s.accepted).length > 0;

    return (
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
              <h2 className="font-display text-3xl font-bold">
                {creative ? "Welcome, Creator! 🎨" : "You're all set! 🎉"}
              </h2>
              <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                {creative
                  ? "Your creative profile is ready. The muses are waiting."
                  : "Your profile is ready. Here's what you can do next."}
              </p>
            </motion.div>

            {hasDraftServices && (
              <div className="w-full rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-left">
                <p className="font-medium">✨ We've created draft {creative ? "skill sessions" : "services"} for you.</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You can review and publish them in{" "}
                  <Link to="/me/settings" className="underline text-primary">My {creative ? "Skill Sessions" : "Services"}</Link>.
                </p>
              </div>
            )}

            <div className="w-full space-y-3">
              <Button asChild className="w-full" variant="default">
                <Link to="/">
                  <Compass className="h-4 w-4 mr-2" /> Go to Home Feed
                </Link>
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button asChild variant="outline">
                  <Link to="/explore?tab=guilds">
                    <Users className="h-4 w-4 mr-2" /> {creative ? "Join a Collective" : "Join a Guild"}
                  </Link>
                </Button>
                {creative ? (
                  <Button asChild variant="outline">
                    <Link to="/quests/new">
                      <Palette className="h-4 w-4 mr-2" /> Start a Creative Quest
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline">
                    <Link to="/me/companies">
                      <Briefcase className="h-4 w-4 mr-2" /> Attach a Company
                    </Link>
                  </Button>
                )}
              </div>
              {creative && (
                <div className="grid grid-cols-2 gap-3">
                  <Button asChild variant="outline">
                    <Link to="/services/new">
                      <Sparkles className="h-4 w-4 mr-2" /> Offer a Skill Session
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/explore/users">
                      <Users className="h-4 w-4 mr-2" /> Explore Creators
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              You can revisit onboarding anytime from{" "}
              <Link to="/me/settings" className="underline text-primary">Settings → Open Wizard</Link>.
            </p>
          </>
        )}
      </div>
    );
  }

  // ─── Determine if Next button should show ─────────────────
  const showNextButton = () => {
    if (isLastStep) return false;
    if (isCreativePath) {
      if (step === CREATIVE_PROJECT_STEP && wantsProject === null) return false;
      if (step === CREATIVE_SERVICE_STEP && wantsService === null) return false;
      return true;
    } else {
      if (step === IMPACT_PROJECT_STEP && wantsProject === null) return false;
      if (step === IMPACT_SERVICE_STEP && wantsService === null) return false;
      return true;
    }
  };

  const isFinishStep = isCreativePath ? step === CREATIVE_SERVICE_STEP : step === IMPACT_SERVICE_STEP;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        {!isLastStep && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Step {step + 1} of {progressSteps}</span>
              <span className="font-display font-semibold text-foreground">{currentStepLabel}</span>
            </div>
            <Progress value={((step + 1) / progressSteps) * 100} className="h-1.5" />
          </div>
        )}

        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 min-h-[460px] flex flex-col">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`${isCreativePath}-${step}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-1 flex flex-col"
            >
              {isCreativePath ? renderCreativeStep() : renderImpactStep()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          {!isLastStep && (
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
              {showNextButton() && (
                <Button onClick={goNext} size="sm" disabled={saving || aiLoading}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {isFinishStep ? "Finish" : "Next"} <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
