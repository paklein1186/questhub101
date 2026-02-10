export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      guild_members: {
        Row: {
          guild_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["guild_member_role"]
          user_id: string
        }
        Insert: {
          guild_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["guild_member_role"]
          user_id: string
        }
        Update: {
          guild_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["guild_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_members_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_territories: {
        Row: {
          guild_id: string
          id: string
          territory_id: string
        }
        Insert: {
          guild_id: string
          id?: string
          territory_id: string
        }
        Update: {
          guild_id?: string
          id?: string
          territory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_territories_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_territories_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_topics: {
        Row: {
          guild_id: string
          id: string
          topic_id: string
        }
        Insert: {
          guild_id: string
          id?: string
          topic_id: string
        }
        Update: {
          guild_id?: string
          id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_topics_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      guilds: {
        Row: {
          banner_url: string | null
          created_at: string
          created_by_user_id: string
          deleted_at: string | null
          description: string | null
          id: string
          instagram_url: string | null
          is_approved: boolean
          is_deleted: boolean
          is_draft: boolean
          linkedin_url: string | null
          logo_url: string | null
          name: string
          twitter_url: string | null
          type: Database["public"]["Enums"]["guild_type"]
          updated_at: string
          website_url: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          created_by_user_id: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          instagram_url?: string | null
          is_approved?: boolean
          is_deleted?: boolean
          is_draft?: boolean
          linkedin_url?: string | null
          logo_url?: string | null
          name: string
          twitter_url?: string | null
          type?: Database["public"]["Enums"]["guild_type"]
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          created_by_user_id?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          instagram_url?: string | null
          is_approved?: boolean
          is_deleted?: boolean
          is_draft?: boolean
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string
          twitter_url?: string | null
          type?: Database["public"]["Enums"]["guild_type"]
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      pod_members: {
        Row: {
          id: string
          joined_at: string
          pod_id: string
          role: Database["public"]["Enums"]["pod_member_role"]
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          pod_id: string
          role?: Database["public"]["Enums"]["pod_member_role"]
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          pod_id?: string
          role?: Database["public"]["Enums"]["pod_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pod_members_pod_id_fkey"
            columns: ["pod_id"]
            isOneToOne: false
            referencedRelation: "pods"
            referencedColumns: ["id"]
          },
        ]
      }
      pods: {
        Row: {
          created_at: string
          creator_id: string
          deleted_at: string | null
          description: string | null
          end_date: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          is_draft: boolean
          name: string
          quest_id: string | null
          start_date: string | null
          topic_id: string | null
          type: Database["public"]["Enums"]["pod_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_draft?: boolean
          name: string
          quest_id?: string | null
          start_date?: string | null
          topic_id?: string | null
          type?: Database["public"]["Enums"]["pod_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_draft?: boolean
          name?: string
          quest_id?: string | null
          start_date?: string | null
          topic_id?: string | null
          type?: Database["public"]["Enums"]["pod_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pods_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pods_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          contribution_index: number
          created_at: string
          current_plan_code: string | null
          email: string
          has_completed_onboarding: boolean
          headline: string | null
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          name: string
          role: string
          twitter_url: string | null
          updated_at: string
          user_id: string
          website_url: string | null
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          contribution_index?: number
          created_at?: string
          current_plan_code?: string | null
          email?: string
          has_completed_onboarding?: boolean
          headline?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          name?: string
          role?: string
          twitter_url?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          contribution_index?: number
          created_at?: string
          current_plan_code?: string | null
          email?: string
          has_completed_onboarding?: boolean
          headline?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          name?: string
          role?: string
          twitter_url?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          xp?: number
        }
        Relationships: []
      }
      quest_territories: {
        Row: {
          id: string
          quest_id: string
          territory_id: string
        }
        Insert: {
          id?: string
          quest_id: string
          territory_id: string
        }
        Update: {
          id?: string
          quest_id?: string
          territory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_territories_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_territories_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_topics: {
        Row: {
          id: string
          quest_id: string
          topic_id: string
        }
        Insert: {
          id?: string
          quest_id: string
          topic_id: string
        }
        Update: {
          id?: string
          quest_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_topics_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          company_id: string | null
          cover_image_url: string | null
          created_at: string
          created_by_user_id: string
          deleted_at: string | null
          description: string | null
          guild_id: string | null
          id: string
          is_deleted: boolean
          is_draft: boolean
          is_featured: boolean
          monetization_type: Database["public"]["Enums"]["monetization_type"]
          reward_xp: number
          status: Database["public"]["Enums"]["quest_status"]
          title: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by_user_id: string
          deleted_at?: string | null
          description?: string | null
          guild_id?: string | null
          id?: string
          is_deleted?: boolean
          is_draft?: boolean
          is_featured?: boolean
          monetization_type?: Database["public"]["Enums"]["monetization_type"]
          reward_xp?: number
          status?: Database["public"]["Enums"]["quest_status"]
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by_user_id?: string
          deleted_at?: string | null
          description?: string | null
          guild_id?: string | null
          id?: string
          is_deleted?: boolean
          is_draft?: boolean
          is_featured?: boolean
          monetization_type?: Database["public"]["Enums"]["monetization_type"]
          reward_xp?: number
          status?: Database["public"]["Enums"]["quest_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quests_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_entries: {
        Row: {
          action_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          code: string
          created_at: string
          description: string | null
          free_quests_per_week: number
          id: string
          marketplace_fee_percent: number | null
          max_guild_memberships: number | null
          max_pods: number | null
          monthly_price_amount: number | null
          monthly_price_currency: string
          name: string
          stripe_price_id: string | null
          updated_at: string
          xp_multiplier: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          free_quests_per_week?: number
          id?: string
          marketplace_fee_percent?: number | null
          max_guild_memberships?: number | null
          max_pods?: number | null
          monthly_price_amount?: number | null
          monthly_price_currency?: string
          name: string
          stripe_price_id?: string | null
          updated_at?: string
          xp_multiplier?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          free_quests_per_week?: number
          id?: string
          marketplace_fee_percent?: number | null
          max_guild_memberships?: number | null
          max_pods?: number | null
          monthly_price_amount?: number | null
          monthly_price_currency?: string
          name?: string
          stripe_price_id?: string | null
          updated_at?: string
          xp_multiplier?: number
        }
        Relationships: []
      }
      territories: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_deleted: boolean
          level: Database["public"]["Enums"]["territory_level"]
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          level?: Database["public"]["Enums"]["territory_level"]
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          level?: Database["public"]["Enums"]["territory_level"]
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_deleted: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          id: string
          is_current: boolean
          plan_id: string
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          id?: string
          is_current?: boolean
          plan_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          id?: string
          is_current?: boolean
          plan_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_territories: {
        Row: {
          id: string
          territory_id: string
          user_id: string
        }
        Insert: {
          id?: string
          territory_id: string
          user_id: string
        }
        Update: {
          id?: string
          territory_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_territories_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_topics: {
        Row: {
          id: string
          topic_id: string
          user_id: string
        }
        Insert: {
          id?: string
          topic_id: string
          user_id: string
        }
        Update: {
          id?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_usage: {
        Row: {
          created_at: string
          id: string
          quests_created_count: number
          updated_at: string
          user_id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          quests_created_count?: number
          updated_at?: string
          user_id: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          id?: string
          quests_created_count?: number
          updated_at?: string
          user_id?: string
          week_start_date?: string
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          amount_xp: number
          created_at: string
          description: string | null
          id: string
          related_entity_id: string | null
          related_entity_type: string | null
          type: Database["public"]["Enums"]["xp_transaction_type"]
          user_id: string
        }
        Insert: {
          amount_xp: number
          created_at?: string
          description?: string | null
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          type: Database["public"]["Enums"]["xp_transaction_type"]
          user_id: string
        }
        Update: {
          amount_xp?: number
          created_at?: string
          description?: string | null
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          type?: Database["public"]["Enums"]["xp_transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          contribution_index: number | null
          created_at: string | null
          current_plan_code: string | null
          has_completed_onboarding: boolean | null
          headline: string | null
          id: string | null
          name: string | null
          role: string | null
          updated_at: string | null
          user_id: string | null
          xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          contribution_index?: number | null
          created_at?: string | null
          current_plan_code?: string | null
          has_completed_onboarding?: boolean | null
          headline?: string | null
          id?: string | null
          name?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
          xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          contribution_index?: number | null
          created_at?: string | null
          current_plan_code?: string | null
          has_completed_onboarding?: boolean | null
          headline?: string | null
          id?: string | null
          name?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
          xp?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      guild_member_role: "ADMIN" | "MEMBER"
      guild_type: "GUILD" | "NETWORK" | "COLLECTIVE"
      monetization_type: "FREE" | "PAID" | "MIXED"
      pod_member_role: "HOST" | "MEMBER"
      pod_type: "QUEST_POD" | "STUDY_POD"
      quest_status: "OPEN" | "IN_PROGRESS" | "COMPLETED"
      subscription_status: "ACTIVE" | "CANCELED" | "EXPIRED" | "TRIAL"
      territory_level: "TOWN" | "REGION" | "NATIONAL" | "OTHER"
      xp_transaction_type:
        | "PURCHASE"
        | "ACTION_SPEND"
        | "REWARD"
        | "ADJUSTMENT"
        | "REFUND"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      guild_member_role: ["ADMIN", "MEMBER"],
      guild_type: ["GUILD", "NETWORK", "COLLECTIVE"],
      monetization_type: ["FREE", "PAID", "MIXED"],
      pod_member_role: ["HOST", "MEMBER"],
      pod_type: ["QUEST_POD", "STUDY_POD"],
      quest_status: ["OPEN", "IN_PROGRESS", "COMPLETED"],
      subscription_status: ["ACTIVE", "CANCELED", "EXPIRED", "TRIAL"],
      territory_level: ["TOWN", "REGION", "NATIONAL", "OTHER"],
      xp_transaction_type: [
        "PURCHASE",
        "ACTION_SPEND",
        "REWARD",
        "ADJUSTMENT",
        "REFUND",
      ],
    },
  },
} as const
