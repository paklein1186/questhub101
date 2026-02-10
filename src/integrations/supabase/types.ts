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
    }
    Enums: {
      subscription_status: "ACTIVE" | "CANCELED" | "EXPIRED" | "TRIAL"
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
      subscription_status: ["ACTIVE", "CANCELED", "EXPIRED", "TRIAL"],
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
