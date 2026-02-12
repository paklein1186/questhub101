import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PersonaType } from "@/lib/personaLabels";

export interface ProfileData {
  userId: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  role: string;
  personaType: PersonaType;
  xp: number;
  xpLevel: number;
  xpRecent12m: number;
  creditsBalance: number;
  contributionIndex: number;
  websiteUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  hasCompletedOnboarding: boolean;
  allowWallComments: boolean;
}

export function useProfileData(userId: string | undefined) {
  const profileQuery = useQuery({
    queryKey: ["profile-full", userId],
    queryFn: async () => {
      // Use profiles_public for public fields, profiles for own data
      const { data, error } = await supabase
        .from("profiles_public")
        .select("*")
        .eq("user_id", userId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Own profile extra (credits, private fields)
  const privateQuery = useQuery({
    queryKey: ["profile-private", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("credits_balance, website_url, twitter_url, linkedin_url, instagram_url, has_completed_onboarding, persona_type, persona_confidence")
        .eq("user_id", userId!)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  // Houses (topics)
  const topicsQuery = useQuery({
    queryKey: ["profile-topics", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_topics")
        .select("topic_id, topics(id, name, slug)")
        .eq("user_id", userId!);
      return (data ?? []).map((ut: any) => ut.topics).filter(Boolean);
    },
    enabled: !!userId,
  });

  // Territories
  const territoriesQuery = useQuery({
    queryKey: ["profile-territories", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_territories")
        .select("id, territory_id, attachment_type, is_primary, territories(id, name, slug)")
        .eq("user_id", userId!);
      return (data ?? []).map((ut: any) => ({
        id: ut.id,
        territoryId: ut.territory_id,
        attachmentType: ut.attachment_type || "LIVE_IN",
        isPrimary: ut.is_primary || false,
        territory: ut.territories,
      }));
    },
    enabled: !!userId,
  });

  // Guilds
  const guildsQuery = useQuery({
    queryKey: ["profile-guilds", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("guild_members")
        .select("id, role, guild_id, guilds(id, name, logo_url, type, is_draft)")
        .eq("user_id", userId!);
      return (data ?? []).filter((m: any) => m.guilds && !m.guilds.is_draft).map((m: any) => ({
        id: m.id,
        role: m.role,
        guildId: m.guild_id,
        guild: m.guilds,
      }));
    },
    enabled: !!userId,
  });

  // Pods
  const podsQuery = useQuery({
    queryKey: ["profile-pods", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pod_members")
        .select("id, role, pod_id, pods(id, name, type, is_draft, quest_id)")
        .eq("user_id", userId!);
      return (data ?? []).filter((m: any) => m.pods && !m.pods.is_draft).map((m: any) => ({
        id: m.id,
        role: m.role,
        podId: m.pod_id,
        pod: m.pods,
      }));
    },
    enabled: !!userId,
  });

  // Companies (Traditional Organizations)
  const companiesQuery = useQuery({
    queryKey: ["profile-companies", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("company_members")
        .select("id, role, company_id, companies(id, name, logo_url, sector)")
        .eq("user_id", userId!);
      return (data ?? []).filter((m: any) => m.companies && !m.companies.is_deleted).map((m: any) => ({
        id: m.id,
        role: m.role,
        companyId: m.company_id,
        company: m.companies,
      }));
    },
    enabled: !!userId,
  });

  // Quests created
  const questsCreatedQuery = useQuery({
    queryKey: ["profile-quests-created", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quests")
        .select("id, title, status, is_draft, credit_budget, escrow_credits, monetization_type, cover_image_url")
        .eq("created_by_user_id", userId!)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!userId,
  });

  // Quests joined (participant)
  const questsJoinedQuery = useQuery({
    queryKey: ["profile-quests-joined", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quest_participants")
        .select("id, role, status, quest_id, quests(id, title, status, cover_image_url)")
        .eq("user_id", userId!);
      return (data ?? []).filter((qp: any) => qp.quests).map((qp: any) => ({
        id: qp.id,
        role: qp.role,
        status: qp.status,
        quest: qp.quests,
      }));
    },
    enabled: !!userId,
  });

  // Proposals
  const proposalsQuery = useQuery({
    queryKey: ["profile-proposals", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quest_proposals")
        .select("id, title, requested_credits, status, upvotes_count, quest_id, quests(id, title)")
        .eq("proposer_id", userId!)
        .eq("proposer_type", "USER")
        .order("created_at", { ascending: false });
      return (data ?? []).filter((p: any) => p.quests);
    },
    enabled: !!userId,
  });

  // Funded quests
  const fundedQuery = useQuery({
    queryKey: ["profile-funded", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quest_funding")
        .select("id, amount, type, status, quest_id, quests(id, title)")
        .eq("funder_user_id", userId!)
        .order("created_at", { ascending: false });
      return (data ?? []).filter((f: any) => f.quests);
    },
    enabled: !!userId,
  });

  // Services
  const servicesQuery = useQuery({
    queryKey: ["profile-services", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("id, title, description, price_amount, price_currency, is_active, image_url")
        .eq("provider_user_id", userId!)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!userId,
  });

  const pub = profileQuery.data;
  const priv = privateQuery.data;

  const profile: ProfileData | null = pub
    ? {
        userId: pub.user_id!,
        name: pub.name || "Unknown",
        avatarUrl: pub.avatar_url,
        headline: pub.headline,
        bio: pub.bio,
        role: pub.role || "GAMECHANGER",
        personaType: ((priv as any)?.persona_type || (pub as any).persona_type || "UNSET") as PersonaType,
        xp: pub.xp ?? 0,
        xpLevel: (pub as any).xp_level ?? 1,
        xpRecent12m: (pub as any).xp_recent_12m ?? 0,
        creditsBalance: (priv as any)?.credits_balance ?? 0,
        contributionIndex: pub.contribution_index ?? 0,
        websiteUrl: (priv as any)?.website_url ?? null,
        twitterUrl: (priv as any)?.twitter_url ?? null,
        linkedinUrl: (priv as any)?.linkedin_url ?? null,
        instagramUrl: (priv as any)?.instagram_url ?? null,
        hasCompletedOnboarding: (priv as any)?.has_completed_onboarding ?? false,
        allowWallComments: (pub as any)?.allow_wall_comments !== false,
      }
    : null;

  return {
    profile,
    topics: topicsQuery.data ?? [],
    territories: territoriesQuery.data ?? [],
    guilds: guildsQuery.data ?? [],
    pods: podsQuery.data ?? [],
    companies: companiesQuery.data ?? [],
    questsCreated: questsCreatedQuery.data ?? [],
    questsJoined: questsJoinedQuery.data ?? [],
    proposals: proposalsQuery.data ?? [],
    fundedQuests: fundedQuery.data ?? [],
    services: servicesQuery.data ?? [],
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
  };
}
