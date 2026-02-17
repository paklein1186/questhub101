import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Sparkles, Loader2, MapPin, Hash,
  Check, Compass, Heart, Palette, Rocket, Users, Briefcase,
  GraduationCap, HelpCircle, Image as ImageIcon, Building2, Target, Landmark,
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
// Creative: 0=entry, 1=houses, 2=ground, 3=essence, 4=languages, 5=affiliations, 6=review, 7=people, 8=project, 9=service, 10=done
const STEP_LABELS_CREATIVE = ["Creative Path", "Houses of Art", "Creative Ground", "Creative Essence", "Languages", "Your Circles & Work", "Review Suggestions", "People to Follow", "Proud Project", "Skill Session", "Get Started"];
// Impact: 0=intention, 1=identity, 2=languages, 3=affiliations, 4=review, 5=people, 6=project, 7=service, 8=done
const STEP_LABELS_IMPACT = ["Intention", "Identity", "Languages", "Your Work", "Review Suggestions", "People to Follow", "Project", "Offering", "Get Started"];

const INTENTION_OPTIONS = [
  { key: "impact", label: "Make impact / collaborate", icon: Heart, desc: "Work on missions & social-impact projects" },
  { key: "creative", label: "Express myself creatively", icon: Palette, desc: "Art, writing, performance, installations" },
  { key: "explore", label: "Explore (not sure yet)", icon: HelpCircle, desc: "Just looking around for now" },
  { key: "project", label: "Launch or structure a project", icon: Rocket, desc: "Start a mission, initiative, or venture" },
  { key: "community", label: "Meet people, join communities", icon: Users, desc: "Find your people and belong" },
  { key: "work", label: "Find work / clients", icon: Briefcase, desc: "Offer your skills and get hired" },
  { key: "learn", label: "Learn and grow skills", icon: GraduationCap, desc: "Discover new topics and train" },
  { key: "register_org", label: "Register my organization", icon: Building2, desc: "Create a profile for my company, institution, or NGO" },
  { key: "recruit", label: "Recruit talent for my organization", icon: Target, desc: "Find skilled individuals and guilds aligned with your mission" },
  { key: "fund", label: "Fund or sponsor initiatives", icon: Landmark, desc: "Support projects, quests, or communities as a sponsor" },
];

function inferPersona(selections: string[]): "IMPACT" | "CREATIVE" | "HYBRID" {
  const s = new Set(selections);
  const hasImpact = s.has("impact") || s.has("project") || s.has("work") || s.has("recruit") || s.has("fund") || s.has("register_org");
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
  const [searchParams] = useSearchParams();
  const { user: authUser, refreshProfile } = useAuth();
  const currentUser = useCurrentUser();
  const { updatePersona } = usePersona();
  const { toast } = useToast();
  const { data: dbTopics = [] } = useTopics();
  const { data: dbTerritories = [] } = useTerritories();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [pendingRedirect] = useState(() => {
    const stored = sessionStorage.getItem("postAuthRedirect");
    if (stored) sessionStorage.removeItem("postAuthRedirect");
    return stored;
  });

  // Creative vs Impact path
  const [isCreativePath, setIsCreativePath] = useState(false);
  const [representsOrg, setRepresentsOrg] = useState(() => searchParams.get("org") === "1");

  // Step 0 – Intention
  const [intentions, setIntentions] = useState<string[]>([]);
  const [creativeIntentions, setCreativeIntentions] = useState<string[]>([]);

  // Identity
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [location, setLocation] = useState("");
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

  // Suggested people to follow
  const [selectedFollows, setSelectedFollows] = useState<string[]>([]);
  const [suggestedPeople, setSuggestedPeople] = useState<any[]>([]);
  const [suggestedPeopleLoading, setSuggestedPeopleLoading] = useState(false);
  const [suggestedPeopleFetched, setSuggestedPeopleFetched] = useState(false);

  // Languages step
  const [spokenLangCodes, setSpokenLangCodes] = useState<string[]>(["en"]);
  const { saveSpokenLanguages } = useSpokenLanguages();

  // Fetch existing guilds & companies for affiliations step
  const { data: existingGuilds = [] } = useQuery({
    queryKey: ["onboarding-guilds"],
    queryFn: async () => {
      const { data } = await supabase.from("guilds").select("id, name, join_policy").eq("is_deleted", false).eq("is_approved", true).limit(100);
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
        .select("name, bio, headline, avatar_url, location, website_url, linkedin_url, instagram_url")
        .eq("user_id", authUser.id)
        .single();
      if (data) {
        if (data.name) setName(data.name);
        if (data.bio) setBio(data.bio);
        if ((data as any).headline) setHeadline((data as any).headline);
        if ((data as any).avatar_url) setAvatarUrl((data as any).avatar_url);
        if ((data as any).location) setLocation((data as any).location);
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
    // Also persist any guest onboarding topics
    try {
      const raw = localStorage.getItem("guestOnboardingContext") || sessionStorage.getItem("guestOnboardingContext");
      if (raw) {
        const ctx = JSON.parse(raw);
        if (ctx.interest_topic_ids?.length > 0) {
          const topicRows = ctx.interest_topic_ids.map((topicId: string) => ({
            user_id: authUser.id,
            topic_id: topicId,
          }));
          await supabase
            .from("user_topics")
            .upsert(topicRows, { onConflict: "user_id,topic_id", ignoreDuplicates: true });
          // Merge into local state
          setSelectedTopics(prev => {
            const merged = new Set([...prev, ...ctx.interest_topic_ids]);
            return Array.from(merged);
          });
          delete ctx.interest_topic_ids;
          localStorage.setItem("guestOnboardingContext", JSON.stringify(ctx));
          sessionStorage.removeItem("guestOnboardingContext");
        }
        // Clean up the wizard flag so PostSignupWizard never triggers
        if (ctx.show_post_signup_wizard) {
          delete ctx.show_post_signup_wizard;
          localStorage.setItem("guestOnboardingContext", JSON.stringify(ctx));
        }
      }
    } catch { /* ignore */ }
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

  // ─── Incremental save: persist profile data at each step transition ───
  const saveProgressIncremental = useCallback(async () => {
    if (!authUser?.id) return;
    try {
      const updates: Record<string, any> = {};
      if (name.trim()) updates.name = name.trim();
      if (headline.trim()) updates.headline = headline.trim();
      if (avatarUrl) updates.avatar_url = avatarUrl;
      if (bio.trim()) updates.bio = bio.trim();
      if (location.trim()) updates.location = location.trim();
      if (affLinks.website.trim()) updates.website_url = affLinks.website.trim();
      if (affLinks.linkedin.trim()) updates.linkedin_url = affLinks.linkedin.trim();
      if (affLinks.other.trim()) updates.instagram_url = affLinks.other.trim();
      updates.persona_type = personaType;
      updates.persona_source = "onboarding_intent";

      if (Object.keys(updates).length > 0) {
        await supabase.from("profiles").update(updates).eq("user_id", authUser.id);
      }

      // Save topics incrementally
      if (selectedTopics.length > 0) {
        const topicRows = selectedTopics.map(topicId => ({ user_id: authUser.id, topic_id: topicId }));
        await supabase.from("user_topics").upsert(topicRows, { onConflict: "user_id,topic_id", ignoreDuplicates: true });
      }

      // Save territories incrementally
      if (selectedTerritories.length > 0) {
        const territoryRows = selectedTerritories.map(tid => ({ user_id: authUser.id, territory_id: tid }));
        await supabase.from("user_territories").upsert(territoryRows, { onConflict: "user_id,territory_id", ignoreDuplicates: true });
      }

      // Save languages incrementally
      if (spokenLangCodes.length > 0) {
        await saveSpokenLanguages(spokenLangCodes);
      }
    } catch (e) {
      console.error("Incremental save error:", e);
    }
  }, [authUser?.id, name, headline, avatarUrl, bio, location, affLinks, personaType, selectedTopics, selectedTerritories, spokenLangCodes, saveSpokenLanguages]);

  // ─── Save all onboarding data ─────────────────────────────
  const finishOnboarding = async () => {
    if (!authUser?.id) return;
    setSaving(true);
    try {
      // Save spoken languages
      await saveSpokenLanguages(spokenLangCodes);

      // Set preferred language to first spoken language if not already set
      const preferredLang = spokenLangCodes[0] || "en";
      // Save profile data
      await supabase.from("profiles").update({
        name: name.trim() || undefined,
        headline: headline.trim() || null,
        avatar_url: avatarUrl || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
        has_completed_onboarding: true,
        persona_type: personaType,
        persona_source: "onboarding_intent",
        preferred_language: preferredLang,
        website_url: affLinks.website.trim() || null,
        linkedin_url: affLinks.linkedin.trim() || null,
        instagram_url: affLinks.other.trim() || null,
      } as any).eq("user_id", authUser.id);

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

      // Save accepted affiliations — apply or join based on unit's join_policy
      const joinOrApplyGuild = async (guildId: string) => {
        const guild = existingGuilds.find(g => g.id === guildId);
        const policy = guild?.join_policy ?? "APPROVAL_REQUIRED";
        if (policy === "OPEN") {
          await supabase.from("guild_members").upsert([{
            guild_id: guildId,
            user_id: authUser.id,
            role: "MEMBER" as const,
          }], { onConflict: "guild_id,user_id" }).select();
        } else {
          // Create application (APPROVAL_REQUIRED or INVITE_ONLY → needs admin validation)
          const { data: existing } = await supabase.from("guild_applications")
            .select("id").eq("guild_id", guildId).eq("applicant_user_id", authUser.id).maybeSingle();
          if (!existing) {
            await supabase.from("guild_applications").insert({
              guild_id: guildId,
              applicant_user_id: authUser.id,
              status: "PENDING" as const,
            });
          }
        }
      };

      const joinOrApplyCompany = async (companyId: string) => {
        // Companies always require application (no join_policy column)
        const { data: existing } = await supabase.from("company_applications")
          .select("id").eq("company_id", companyId).eq("applicant_user_id", authUser.id).maybeSingle();
        if (!existing) {
          await supabase.from("company_applications").insert({
            company_id: companyId,
            applicant_user_id: authUser.id,
            status: "PENDING" as const,
          });
        }
      };

      for (const aff of suggestedAffiliations.filter(a => a.accepted && a.matchedEntityId)) {
        if (aff.matchedEntityType === "GUILD") {
          await joinOrApplyGuild(aff.matchedEntityId!);
        } else if (aff.matchedEntityType === "COMPANY") {
          await joinOrApplyCompany(aff.matchedEntityId!);
        }
      }

      // Also handle directly selected entities
      for (const entityId of selectedEntityIds) {
        const isGuild = existingGuilds.some(g => g.id === entityId);
        if (isGuild) {
          await joinOrApplyGuild(entityId);
        } else {
          await joinOrApplyCompany(entityId);
        }
      }

      // Save selected follows
      if (selectedFollows.length > 0) {
        await supabase.from("follows").insert(
          selectedFollows.map(targetId => ({
            follower_id: authUser.id,
            target_id: targetId,
            target_type: "USER",
          }))
        );
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
  // Creative: 0=entry, 1=houses, 2=ground, 3=essence, 4=languages, 5=affiliations, 6=review, 7=project, 8=service, 9=done
  // Impact:  0=intention, 1=identity, 2=languages, 3=affiliations, 4=review, 5=project, 6=service, 7=done

  const CREATIVE_LANG_STEP = 4;
  const CREATIVE_AFF_STEP = 5;
  const CREATIVE_REVIEW_STEP = 6;
  const CREATIVE_PEOPLE_STEP = 7;
  const CREATIVE_PROJECT_STEP = 8;
  const CREATIVE_SERVICE_STEP = 9;

  const IMPACT_LANG_STEP = 2;
  const IMPACT_AFF_STEP = 3;
  const IMPACT_REVIEW_STEP = 4;
  const IMPACT_PEOPLE_STEP = 5;
  const IMPACT_PROJECT_STEP = 6;
  const IMPACT_SERVICE_STEP = 7;

  // Fetch suggested people based on shared topics/territories
  const fetchSuggestedPeople = useCallback(async () => {
    if (suggestedPeopleFetched || !authUser?.id) return;
    setSuggestedPeopleLoading(true);
    setSuggestedPeopleFetched(true);
    try {
      const topicIds = [...new Set([...selectedTopics, ...suggestedHouses.filter(h => h.accepted).map(h => h.topicId)])];
      const territoryIds = selectedTerritories;

      // Find users who share topics or territories
      const fetches: Promise<string[]>[] = [];
      if (topicIds.length > 0) {
        fetches.push(
          supabase.from("user_topics").select("user_id").in("topic_id", topicIds).limit(200)
            .then(r => (r.data ?? []).map(d => d.user_id)) as Promise<string[]>
        );
      }
      if (territoryIds.length > 0) {
        fetches.push(
          supabase.from("user_territories").select("user_id").in("territory_id", territoryIds).limit(200)
            .then(r => (r.data ?? []).map(d => d.user_id)) as Promise<string[]>
        );
      }

      const results = await Promise.all(fetches);
      const userIdCounts = new Map<string, number>();
      results.flat().forEach(uid => {
        if (uid !== authUser.id) userIdCounts.set(uid, (userIdCounts.get(uid) || 0) + 1);
      });

      // Sort by overlap count, take top 20
      const topIds = Array.from(userIdCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([uid]) => uid);

      if (topIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("user_id, name, avatar_url, headline")
          .in("user_id", topIds);
        
        // Sort profiles by overlap count
        const sorted = (profiles ?? [])
          .filter(p => p.name) // only show named profiles
          .sort((a, b) => (userIdCounts.get(b.user_id) || 0) - (userIdCounts.get(a.user_id) || 0));
        setSuggestedPeople(sorted);
      }
    } catch (e) {
      console.error("Failed to fetch suggested people:", e);
    } finally {
      setSuggestedPeopleLoading(false);
    }
  }, [suggestedPeopleFetched, authUser?.id, selectedTopics, selectedTerritories, suggestedHouses]);

  const goNext = () => {
    // Save progress incrementally on every step transition
    saveProgressIncremental();

    if (isCreativePath) {
      // Trigger AI when entering review step
      if (step === CREATIVE_AFF_STEP) {
        requestAiSuggestions();
      }
      // Trigger people suggestions when entering people step
      if (step === CREATIVE_REVIEW_STEP) {
        fetchSuggestedPeople();
      }
      if (step === CREATIVE_SERVICE_STEP) { finishOnboarding(); return; }
      if (step === CREATIVE_PROJECT_STEP && wantsProject === false) { setDirection(1); setStep(CREATIVE_SERVICE_STEP); return; }
    } else {
      if (step === IMPACT_AFF_STEP) {
        requestAiSuggestions();
      }
      if (step === IMPACT_REVIEW_STEP) {
        fetchSuggestedPeople();
      }
      if (step === IMPACT_SERVICE_STEP) { finishOnboarding(); return; }
      if (step === IMPACT_PROJECT_STEP && wantsProject === false) { setDirection(1); setStep(IMPACT_SERVICE_STEP); return; }
    }
    // Validate languages step: at least one language required
    if ((isCreativePath && step === CREATIVE_LANG_STEP) || (!isCreativePath && step === IMPACT_LANG_STEP)) {
      if (spokenLangCodes.length === 0) {
        toast({ title: "Please select at least one language", variant: "destructive" });
        return;
      }
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
  const progressSteps = isCreativePath ? 10 : 8; // excluding final "done" step

  // Determine which step content to render
  const renderCreativeStep = () => {
    switch (step) {
      case 0: return renderEntryChoice();
      case 1: return renderHousesOfArt();
      case 2: return renderCreativeGround();
      case 3: return renderCreativeEssence();
      case 4: return renderLanguagesStep();
      case 5: return renderAffiliationsInput();
      case 6: return renderAffiliationsReview();
      case 7: return renderSuggestedPeople(true);
      case 8: return renderProject(true);
      case 9: return renderService(true);
      case 10: return renderDone(true);
      default: return null;
    }
  };

  const renderImpactStep = () => {
    switch (step) {
      case 0: return renderEntryChoice();
      case 1: return renderIdentity();
      case 2: return renderLanguagesStep();
      case 3: return renderAffiliationsInput();
      case 4: return renderAffiliationsReview();
      case 5: return renderSuggestedPeople(false);
      case 6: return renderProject(false);
      case 7: return renderService(false);
      case 8: return renderDone(false);
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

        <button
          onClick={() => { setRepresentsOrg(!representsOrg); selectImpactPath(); }}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
            representsOrg
              ? "border-blue-500 bg-blue-500/10 shadow-md"
              : "border-border hover:border-blue-400/30"
          )}
        >
          <div className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
            representsOrg ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
          )}>
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">🏛️ I represent an organization</p>
            <p className="text-xs text-muted-foreground">Public institution, company, university, foundation, or NGO</p>
          </div>
          {representsOrg && <Check className="h-4 w-4 text-blue-500 shrink-0" />}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">or choose your intentions</span></div>
        </div>

        <div className="space-y-2">
          {INTENTION_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { selectImpactPath(); toggleIntention(opt.key); if (opt.key === "register_org") setRepresentsOrg(true); }}
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
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => {
            const creativeTopicIds = dbTopics.filter(t => (t as any).universe_type === "creative").map(t => t.id);
            setSelectedTopics(creativeTopicIds);
          }}>Select all</Button>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedTopics([])} disabled={selectedTopics.length === 0}>Clear</Button>
        </div>

        <div className="space-y-2">
          {CREATIVE_HOUSE_KEYS.map((key) => {
            const house = HOUSES_OF_ART[key];
            // Match by slug field (new creative topics have slug = house key)
            const matchingTopic = dbTopics.find(t =>
              (t as any).slug === key || t.name?.toLowerCase().replace(/\s+/g, "-") === key
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

        {dbTopics.filter(t => (t as any).universe_type !== "creative" && !CREATIVE_HOUSE_KEYS.includes((t as any).slug || "")).length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Impact Topics</p>
            <div className="flex flex-wrap gap-1.5">
              {dbTopics.filter(t => (t as any).universe_type !== "creative" && !CREATIVE_HOUSE_KEYS.includes((t as any).slug || "")).map((t) => (
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

        <div className="flex flex-col items-center gap-3">
          <ImageUpload
            label="Profile picture"
            currentImageUrl={avatarUrl}
            onChange={(url) => setAvatarUrl(url)}
            aspectRatio="1/1"
            description="Square photo, 256×256 recommended"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={100} />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Headline</label>
          <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Visual artist & sound designer" maxLength={120} />
          <p className="text-xs text-muted-foreground mt-1">A short tagline visible on your profile</p>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-accent" /> Location
          </label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Berlin, Germany" maxLength={100} />
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
          className="min-h-[120px] resize-none text-sm"
          maxLength={1300}
        />
        <div className="flex items-center justify-between">
          <AIWriterButton
            type="bio"
            context={{ intentions: creativeIntentions, houses: selectedTopics, territories: selectedTerritories, personaType: "CREATIVE" }}
            currentText={bio}
            onAccept={(text) => setBio(text)}
            label="✨ Write it with me"
          />
           <span className="text-xs text-muted-foreground">{bio.length}/1300</span>
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
    const isOrgRep = representsOrg || intentions.includes("register_org");
    return (
      <div className="space-y-5 overflow-y-auto max-h-[500px] pr-1">
        <div>
          <h2 className="font-display text-2xl font-bold">{isOrgRep ? "About you 🏛️" : "Who are you? 🌱"}</h2>
          <p className="text-sm text-muted-foreground mt-1">{isOrgRep ? "Tell us about yourself as the representative. Your organization profile comes next." : "A few things to help us know you better."}</p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <ImageUpload
            label="Profile picture"
            currentImageUrl={avatarUrl}
            onChange={(url) => setAvatarUrl(url)}
            aspectRatio="1/1"
            description="Square photo, 256×256 recommended"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={100} />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Headline</label>
          <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder={isOrgRep ? "e.g. Head of Partnerships, ACME Foundation" : "e.g. Social entrepreneur, renewable energy"} maxLength={120} />
          <p className="text-xs text-muted-foreground mt-1">A short tagline visible on your profile</p>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-accent" /> Location
          </label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Paris, France" maxLength={100} />
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
            placeholder={isOrgRep ? "I represent [Organization] and I'm here to…" : "I'm passionate about…"}
            className="min-h-[120px] resize-none text-sm"
            maxLength={1300}
          />
          <div className="flex items-center justify-between mt-1.5">
            <AIWriterButton
              type="bio"
              context={{ intentions, houses: selectedTopics, territories: selectedTerritories, personaType }}
              currentText={bio}
              onAccept={(text) => setBio(text)}
            />
            <span className="text-xs text-muted-foreground">{bio.length}/1300</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── Languages Step (shared) ─────────────────────────────
  function renderLanguagesStep() {
    const toggleLang = (code: string) => {
      setSpokenLangCodes((p) =>
        p.includes(code) ? p.filter((c) => c !== code) : [...p, code]
      );
    };

    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-bold">Languages you speak 🌍</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Which languages do you speak and feel comfortable collaborating in?
          </p>
        </div>

        <div className="space-y-2">
          {AVAILABLE_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => toggleLang(lang.code)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
                spokenLangCodes.includes(lang.code)
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/30"
              )}
            >
              <span className="text-xl">{lang.flag}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{lang.label}</p>
                <p className="text-xs text-muted-foreground">{lang.native}</p>
              </div>
              {spokenLangCodes.includes(lang.code) && <Check className="h-4 w-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {spokenLangCodes.length} selected · Translations and AI responses will prioritize these languages.
        </p>
      </div>
    );
  }

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
        guilds={existingGuilds}
      />
    );
  }

  // ─── Suggested People to Follow step ─────────────────────
  function renderSuggestedPeople(creative: boolean) {
    const toggleFollow = (userId: string) =>
      setSelectedFollows(p => p.includes(userId) ? p.filter(id => id !== userId) : [...p, userId]);

    return (
      <div className="space-y-5 overflow-y-auto max-h-[500px] pr-1">
        <div>
          <h2 className="font-display text-2xl font-bold">
            {creative ? "Creators in your orbit 🌌" : "People you might know 🤝"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {creative
              ? "These creators share your Houses or territories. Follow them to see their work in your feed."
              : "Based on your topics and territories — follow people to build your network."}
          </p>
        </div>

        {suggestedPeopleLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Finding your people…</span>
          </div>
        )}

        {!suggestedPeopleLoading && suggestedPeople.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No suggestions yet — you'll discover people as you explore!</p>
          </div>
        )}

        {!suggestedPeopleLoading && suggestedPeople.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{selectedFollows.length} selected</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedFollows(suggestedPeople.map(p => p.user_id))}>
                  Follow all
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedFollows([])} disabled={selectedFollows.length === 0}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {suggestedPeople.map((person) => (
                <button
                  key={person.user_id}
                  onClick={() => toggleFollow(person.user_id)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
                    selectedFollows.includes(person.user_id)
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {person.avatar_url ? (
                      <img src={person.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{person.name}</p>
                    {person.headline && <p className="text-xs text-muted-foreground truncate">{person.headline}</p>}
                  </div>
                  {selectedFollows.includes(person.user_id) && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">You can always discover and follow more people later.</p>
      </div>
    );
  }


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

            {representsOrg && (
              <div className="w-full rounded-lg border border-primary/20 bg-primary/5 p-4 text-left">
                <p className="font-medium text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Now let's set up your organization
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You'll register your institution and configure its presence on the platform.
                </p>
                <Button asChild className="w-full mt-3" variant="default">
                  <Link to="/onboarding/organization">
                    <Building2 className="h-4 w-4 mr-2" /> Onboard your organization
                  </Link>
                </Button>
              </div>
            )}

            <div className="w-full space-y-3">
              {!representsOrg && (
                <Button asChild className="w-full" variant="default">
                  <Link to={pendingRedirect || "/"}>
                    <Compass className="h-4 w-4 mr-2" /> {pendingRedirect ? "Continue where you left off" : "Go to Home Feed"}
                  </Link>
                </Button>
              )}
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
