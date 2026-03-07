import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/** DB-backed notification preference columns */
export interface NotificationPreferencesRow {
  channel_in_app_enabled: boolean;
  channel_email_enabled: boolean;
  // Superadmin
  notify_system_errors: boolean;
  notify_new_user_registrations: boolean;
  notify_new_bug_reports: boolean;
  notify_payments_and_shares: boolean;
  notify_abuse_reports: boolean;
  // Unit admin
  notify_new_join_requests_guilds: boolean;
  notify_new_join_requests_pods: boolean;
  notify_new_partnership_requests: boolean;
  notify_quest_updates_and_comments: boolean;
  notify_bookings_and_cancellations: boolean;
  notify_co_host_changes: boolean;
  notify_events_and_courses: boolean;
  notify_ai_flagged_content: boolean;
  // User personal
  notify_booking_status_changes: boolean;
  notify_quest_updates_from_followed: boolean;
  notify_invitations_to_units: boolean;
  notify_comments_and_upvotes: boolean;
  notify_follower_activity: boolean;
  notify_xp_and_achievements: boolean;
  notify_mentions: boolean;
  notify_direct_messages_email: boolean;
  notify_direct_messages_in_app: boolean;
  // Followed activity
  notify_new_posts_from_followed: boolean;
  notify_new_events_from_followed: boolean;
  notify_new_services_from_followed: boolean;
  notify_new_courses_from_followed: boolean;
  notify_new_quests_from_followed: boolean;
  notify_entity_updates_from_followed: boolean;
  notify_new_members_in_my_units: boolean;
  // Digest
  notify_daily_digest_in_app: boolean;
  notify_daily_digest_email: boolean;
  digest_frequency: string; // 'three_days' | 'weekly' | 'none'
  // Delivery
  notification_frequency: string;
  push_enabled: boolean;
}

const DEFAULTS: NotificationPreferencesRow = {
  channel_in_app_enabled: true,
  channel_email_enabled: true,
  notify_system_errors: true,
  notify_new_user_registrations: true,
  notify_new_bug_reports: true,
  notify_payments_and_shares: true,
  notify_abuse_reports: true,
  notify_new_join_requests_guilds: true,
  notify_new_join_requests_pods: true,
  notify_new_partnership_requests: true,
  notify_quest_updates_and_comments: true,
  notify_bookings_and_cancellations: true,
  notify_co_host_changes: true,
  notify_events_and_courses: true,
  notify_ai_flagged_content: true,
  notify_booking_status_changes: true,
  notify_quest_updates_from_followed: true,
  notify_invitations_to_units: true,
  notify_comments_and_upvotes: true,
  notify_follower_activity: true,
  notify_xp_and_achievements: true,
  notify_mentions: true,
  notify_direct_messages_email: true,
  notify_direct_messages_in_app: true,
  notify_new_posts_from_followed: true,
  notify_new_events_from_followed: true,
  notify_new_services_from_followed: true,
  notify_new_courses_from_followed: true,
  notify_new_quests_from_followed: true,
  notify_entity_updates_from_followed: true,
  notify_new_members_in_my_units: true,
  notify_daily_digest_in_app: true,
  notify_daily_digest_email: true,
  digest_frequency: "twice_weekly",
  notification_frequency: "INSTANT",
  push_enabled: false,
};

export function useNotificationPreferences() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const qc = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["notification-preferences", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();

      if (!data) {
        // Create default row
        const { data: created } = await supabase
          .from("notification_preferences")
          .insert({ user_id: userId! } as any)
          .select("*")
          .single();
        return (created ?? DEFAULTS) as NotificationPreferencesRow;
      }
      return data as unknown as NotificationPreferencesRow;
    },
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: async (partial: Partial<NotificationPreferencesRow>) => {
      if (!userId) return;
      await supabase
        .from("notification_preferences")
        .update(partial as any)
        .eq("user_id", userId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-preferences", userId] });
    },
  });

  return {
    prefs: prefs ?? DEFAULTS,
    isLoading,
    updatePrefs: (partial: Partial<NotificationPreferencesRow>) => mutation.mutate(partial),
    isSaving: mutation.isPending,
  };
}
