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
      achievements: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          quest_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          quest_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          quest_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      action_cards: {
        Row: {
          button_label: string | null
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          depends_on: string[] | null
          description: string | null
          estimated_minutes: number | null
          id: string
          priority: string
          sort_order: number
          status: string
          subtitle: string | null
          title: string
          tool_call: string | null
          tool_params: Json | null
          trust_reward: number
          type: string
          unlock_condition: string | null
          user_id: string
          xp_reward: number
        }
        Insert: {
          button_label?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          depends_on?: string[] | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          priority?: string
          sort_order?: number
          status?: string
          subtitle?: string | null
          title: string
          tool_call?: string | null
          tool_params?: Json | null
          trust_reward?: number
          type: string
          unlock_condition?: string | null
          user_id: string
          xp_reward?: number
        }
        Update: {
          button_label?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          depends_on?: string[] | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          priority?: string
          sort_order?: number
          status?: string
          subtitle?: string | null
          title?: string
          tool_call?: string | null
          tool_params?: Json | null
          trust_reward?: number
          type?: string
          unlock_condition?: string | null
          user_id?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "action_cards_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "pi_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          action_type: string
          actor_user_id: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_name: string | null
          target_type: string | null
        }
        Insert: {
          action_type: string
          actor_user_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_name?: string | null
          target_type?: string | null
        }
        Update: {
          action_type?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_name?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      agent_billing_profiles: {
        Row: {
          agent_id: string
          auto_pause_over_limit: boolean
          created_at: string
          current_plan_id: string | null
          id: string
          is_active: boolean
          monthly_spend_limit: number | null
          payer_id: string
          payer_type: Database["public"]["Enums"]["billing_entity_type"]
          updated_at: string
        }
        Insert: {
          agent_id: string
          auto_pause_over_limit?: boolean
          created_at?: string
          current_plan_id?: string | null
          id?: string
          is_active?: boolean
          monthly_spend_limit?: number | null
          payer_id: string
          payer_type?: Database["public"]["Enums"]["billing_entity_type"]
          updated_at?: string
        }
        Update: {
          agent_id?: string
          auto_pause_over_limit?: boolean
          created_at?: string
          current_plan_id?: string | null
          id?: string
          is_active?: boolean
          monthly_spend_limit?: number | null
          payer_id?: string
          payer_type?: Database["public"]["Enums"]["billing_entity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_billing_profiles_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_billing_profiles_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "agent_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_conversations: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          messages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_hires: {
        Row: {
          agent_id: string
          hired_at: string
          id: string
          last_used_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          agent_id: string
          hired_at?: string
          id?: string
          last_used_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          hired_at?: string
          id?: string
          last_used_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_hires_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_plans: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string
          monthly_price: number
          quota_json: Json
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label: string
          monthly_price?: number
          quota_json?: Json
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string
          monthly_price?: number
          quota_json?: Json
          updated_at?: string
        }
        Relationships: []
      }
      agent_trust_scores: {
        Row: {
          agent_id: string
          computed_at: string
          guild_endorsements: number
          history_score: number
          id: string
          owner_trust: number
          penalties: number
          total_score: number
          xp_level: number
        }
        Insert: {
          agent_id: string
          computed_at?: string
          guild_endorsements?: number
          history_score?: number
          id?: string
          owner_trust?: number
          penalties?: number
          total_score?: number
          xp_level?: number
        }
        Update: {
          agent_id?: string
          computed_at?: string
          guild_endorsements?: number
          history_score?: number
          id?: string
          owner_trust?: number
          penalties?: number
          total_score?: number
          xp_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_trust_scores_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_usage_records: {
        Row: {
          action_type_id: string
          agent_id: string
          base_price: number
          billed_from_plan: boolean
          created_at: string
          creator_id: string
          creator_type: Database["public"]["Enums"]["billing_entity_type"]
          final_price: number
          id: string
          payer_id: string
          payer_type: Database["public"]["Enums"]["billing_entity_type"]
          resource_id: string | null
          resource_type: string | null
          sensitivity: Database["public"]["Enums"]["content_sensitivity"]
          sensitivity_multiplier: number
          trust_multiplier: number
          trust_score_at_action: number
          value_factor: number
          value_multiplier: number
          volume_multiplier: number
        }
        Insert: {
          action_type_id: string
          agent_id: string
          base_price?: number
          billed_from_plan?: boolean
          created_at?: string
          creator_id: string
          creator_type?: Database["public"]["Enums"]["billing_entity_type"]
          final_price?: number
          id?: string
          payer_id: string
          payer_type?: Database["public"]["Enums"]["billing_entity_type"]
          resource_id?: string | null
          resource_type?: string | null
          sensitivity?: Database["public"]["Enums"]["content_sensitivity"]
          sensitivity_multiplier?: number
          trust_multiplier?: number
          trust_score_at_action?: number
          value_factor?: number
          value_multiplier?: number
          volume_multiplier?: number
        }
        Update: {
          action_type_id?: string
          agent_id?: string
          base_price?: number
          billed_from_plan?: boolean
          created_at?: string
          creator_id?: string
          creator_type?: Database["public"]["Enums"]["billing_entity_type"]
          final_price?: number
          id?: string
          payer_id?: string
          payer_type?: Database["public"]["Enums"]["billing_entity_type"]
          resource_id?: string | null
          resource_type?: string | null
          sensitivity?: Database["public"]["Enums"]["content_sensitivity"]
          sensitivity_multiplier?: number
          trust_multiplier?: number
          trust_score_at_action?: number
          value_factor?: number
          value_multiplier?: number
          volume_multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_usage_records_action_type_id_fkey"
            columns: ["action_type_id"]
            isOneToOne: false
            referencedRelation: "monetized_action_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_usage_records_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          avatar_url: string | null
          category: string
          cost_per_use: number
          created_at: string
          creator_user_id: string
          description: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          name: string
          skills: string[] | null
          system_prompt: string
          territory_id: string | null
          updated_at: string
          usage_count: number
        }
        Insert: {
          avatar_url?: string | null
          category?: string
          cost_per_use?: number
          created_at?: string
          creator_user_id: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          name: string
          skills?: string[] | null
          system_prompt: string
          territory_id?: string | null
          updated_at?: string
          usage_count?: number
        }
        Update: {
          avatar_url?: string | null
          category?: string
          cost_per_use?: number
          created_at?: string
          creator_user_id?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          name?: string
          skills?: string[] | null
          system_prompt?: string
          territory_id?: string | null
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "agents_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_messages: {
        Row: {
          content: Json
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assistant_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_sessions: {
        Row: {
          context_id: string | null
          context_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          context_id?: string | null
          context_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          context_id?: string | null
          context_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      attachment_upvotes: {
        Row: {
          attachment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          attachment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          attachment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachment_upvotes_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "attachments"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          file_name: string | null
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          target_id: string
          target_type: string
          title: string | null
          uploaded_by_user_id: string
          upvote_count: number
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          target_id: string
          target_type: string
          title?: string | null
          uploaded_by_user_id: string
          upvote_count?: number
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          target_id?: string
          target_type?: string
          title?: string | null
          uploaded_by_user_id?: string
          upvote_count?: number
        }
        Relationships: []
      }
      availability_exceptions: {
        Row: {
          created_at: string
          date: string
          end_time: string | null
          id: string
          is_available: boolean
          provider_user_id: string
          start_time: string | null
        }
        Insert: {
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          is_available?: boolean
          provider_user_id: string
          start_time?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          is_available?: boolean
          provider_user_id?: string
          start_time?: string | null
        }
        Relationships: []
      }
      availability_rules: {
        Row: {
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          provider_user_id: string
          service_id: string | null
          start_time: string
          timezone: string
          updated_at: string
          weekday: number
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          is_active?: boolean
          provider_user_id: string
          service_id?: string | null
          start_time: string
          timezone?: string
          updated_at?: string
          weekday: number
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          provider_user_id?: string
          service_id?: string | null
          start_time?: string
          timezone?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      biopoints_budgets: {
        Row: {
          allocated_by_user_id: string | null
          created_at: string
          evaluation_months: number
          health_threshold: number
          id: string
          is_active: boolean
          natural_system_id: string
          remaining_budget: number
          territory_id: string | null
          total_budget: number
          updated_at: string
        }
        Insert: {
          allocated_by_user_id?: string | null
          created_at?: string
          evaluation_months?: number
          health_threshold?: number
          id?: string
          is_active?: boolean
          natural_system_id: string
          remaining_budget?: number
          territory_id?: string | null
          total_budget?: number
          updated_at?: string
        }
        Update: {
          allocated_by_user_id?: string | null
          created_at?: string
          evaluation_months?: number
          health_threshold?: number
          id?: string
          is_active?: boolean
          natural_system_id?: string
          remaining_budget?: number
          territory_id?: string | null
          total_budget?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "biopoints_budgets_natural_system_id_fkey"
            columns: ["natural_system_id"]
            isOneToOne: false
            referencedRelation: "natural_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biopoints_budgets_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      biopoints_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          natural_system_id: string | null
          quest_id: string | null
          source: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          natural_system_id?: string | null
          quest_id?: string | null
          source?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          natural_system_id?: string | null
          quest_id?: string | null
          source?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "biopoints_transactions_natural_system_id_fkey"
            columns: ["natural_system_id"]
            isOneToOne: false
            referencedRelation: "natural_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      bioregion_members: {
        Row: {
          added_at: string
          bioregion_id: string
          id: string
          territory_id: string
        }
        Insert: {
          added_at?: string
          bioregion_id: string
          id?: string
          territory_id: string
        }
        Update: {
          added_at?: string
          bioregion_id?: string
          id?: string
          territory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bioregion_members_bioregion_id_fkey"
            columns: ["bioregion_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bioregion_members_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          amount: number | null
          call_url: string | null
          company_id: string | null
          created_at: string
          currency: string | null
          deleted_at: string | null
          end_date_time: string | null
          id: string
          is_deleted: boolean
          notes: string | null
          payment_status: string | null
          provider_guild_id: string | null
          provider_user_id: string | null
          requested_date_time: string | null
          requester_id: string
          service_id: string
          start_date_time: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          call_url?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          end_date_time?: string | null
          id?: string
          is_deleted?: boolean
          notes?: string | null
          payment_status?: string | null
          provider_guild_id?: string | null
          provider_user_id?: string | null
          requested_date_time?: string | null
          requester_id: string
          service_id: string
          start_date_time?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          call_url?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          end_date_time?: string | null
          id?: string
          is_deleted?: boolean
          notes?: string | null
          payment_status?: string | null
          provider_guild_id?: string | null
          provider_user_id?: string | null
          requested_date_time?: string | null
          requester_id?: string
          service_id?: string
          start_date_time?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_provider_guild_id_fkey"
            columns: ["provider_guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          audience_segments: Json | null
          content: string
          created_at: string
          id: string
          link_url: string | null
          sender_conversation_id: string | null
          sender_entity_id: string | null
          sender_entity_type: string | null
          sender_label: string | null
          sender_user_id: string
          subject: string | null
          total_failed: number
          total_recipients: number
          total_sent: number
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          audience_segments?: Json | null
          content: string
          created_at?: string
          id?: string
          link_url?: string | null
          sender_conversation_id?: string | null
          sender_entity_id?: string | null
          sender_entity_type?: string | null
          sender_label?: string | null
          sender_user_id: string
          subject?: string | null
          total_failed?: number
          total_recipients?: number
          total_sent?: number
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          audience_segments?: Json | null
          content?: string
          created_at?: string
          id?: string
          link_url?: string | null
          sender_conversation_id?: string | null
          sender_entity_id?: string | null
          sender_entity_type?: string | null
          sender_label?: string | null
          sender_user_id?: string
          subject?: string | null
          total_failed?: number
          total_recipients?: number
          total_sent?: number
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_messages_sender_conversation_id_fkey"
            columns: ["sender_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_recipients: {
        Row: {
          broadcast_id: string
          conversation_id: string | null
          created_at: string
          delivered_at: string | null
          id: string
          read_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          broadcast_id: string
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          read_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          broadcast_id?: string
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          read_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcast_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_recipients_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_busy_events: {
        Row: {
          connection_id: string
          created_at: string
          end_at: string
          external_event_id: string | null
          id: string
          source_calendar_id: string | null
          source_calendar_name: string | null
          start_at: string
          summary: string | null
          user_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          end_at: string
          external_event_id?: string | null
          id?: string
          source_calendar_id?: string | null
          source_calendar_name?: string | null
          start_at: string
          summary?: string | null
          user_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          end_at?: string
          external_event_id?: string | null
          id?: string
          source_calendar_id?: string | null
          source_calendar_name?: string | null
          start_at?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_busy_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          provider: string
          refresh_token: string | null
          sync_enabled: boolean
          sync_error: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider: string
          refresh_token?: string | null
          sync_enabled?: boolean
          sync_error?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider?: string
          refresh_token?: string | null
          sync_enabled?: boolean
          sync_error?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_subcalendar_preferences: {
        Row: {
          connection_id: string
          created_at: string
          id: string
          is_enabled: boolean
          source_calendar_id: string
          source_calendar_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          source_calendar_id: string
          source_calendar_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          source_calendar_id?: string
          source_calendar_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_subcalendar_preferences_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          fiat_backing_amount: number | null
          fiat_currency: string | null
          id: string
          quest_id: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          source: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          fiat_backing_amount?: number | null
          fiat_currency?: string | null
          id?: string
          quest_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          source?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          fiat_backing_amount?: number | null
          fiat_currency?: string | null
          id?: string
          quest_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          source?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      coin_withdrawal_requests: {
        Row: {
          admin_note: string | null
          amount_fiat: number
          amount_tokens: number
          completed_at: string | null
          created_at: string
          currency: string
          id: string
          processed_at: string | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: string
          stripe_connect_account_id: string | null
          stripe_transfer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_fiat: number
          amount_tokens: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          processed_at?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          stripe_connect_account_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_fiat?: number
          amount_tokens?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          processed_at?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          stripe_connect_account_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comment_mentions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          mentioned_user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          mentioned_user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          mentioned_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_upvotes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_upvotes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          parent_id: string | null
          target_id: string
          target_type: string
          upvote_count: number
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          parent_id?: string | null
          target_id: string
          target_type: string
          upvote_count?: number
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          parent_id?: string | null
          target_id?: string
          target_type?: string
          upvote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          commission_percentage: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_amount: number | null
          min_amount: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          commission_percentage: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          commission_percentage?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      commons_pulse_history: {
        Row: {
          distributed_at: string | null
          id: string
          recipients_count: number
          total_distributed: number
          triggered_by_user_id: string | null
        }
        Insert: {
          distributed_at?: string | null
          id?: string
          recipients_count?: number
          total_distributed?: number
          triggered_by_user_id?: string | null
        }
        Update: {
          distributed_at?: string | null
          id?: string
          recipients_count?: number
          total_distributed?: number
          triggered_by_user_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          allow_agent_crawling: boolean
          allow_agent_subscription: boolean
          banner_url: string | null
          coins_balance: number
          collaboration_interests: string[] | null
          contact_user_id: string | null
          created_at: string
          credits_balance: number
          deleted_at: string | null
          description: string | null
          featured_order: number | null
          feedpoint_default_guilds: boolean
          feedpoint_default_partner_entities: boolean
          feedpoint_default_posts: boolean
          feedpoint_default_quests: boolean
          feedpoint_default_services: boolean
          id: string
          instagram_url: string | null
          is_deleted: boolean
          is_verified: boolean | null
          linkedin_url: string | null
          logo_url: string | null
          mission_statement: string | null
          name: string
          org_type: string | null
          public_visibility: string
          scale_category: string | null
          sector: string | null
          size: string | null
          twitter_url: string | null
          universe_visibility: string
          updated_at: string
          value_factor: number
          web_scopes: string[]
          web_tags: string[]
          web_visibility_override: string
          website_url: string | null
        }
        Insert: {
          allow_agent_crawling?: boolean
          allow_agent_subscription?: boolean
          banner_url?: string | null
          coins_balance?: number
          collaboration_interests?: string[] | null
          contact_user_id?: string | null
          created_at?: string
          credits_balance?: number
          deleted_at?: string | null
          description?: string | null
          featured_order?: number | null
          feedpoint_default_guilds?: boolean
          feedpoint_default_partner_entities?: boolean
          feedpoint_default_posts?: boolean
          feedpoint_default_quests?: boolean
          feedpoint_default_services?: boolean
          id?: string
          instagram_url?: string | null
          is_deleted?: boolean
          is_verified?: boolean | null
          linkedin_url?: string | null
          logo_url?: string | null
          mission_statement?: string | null
          name: string
          org_type?: string | null
          public_visibility?: string
          scale_category?: string | null
          sector?: string | null
          size?: string | null
          twitter_url?: string | null
          universe_visibility?: string
          updated_at?: string
          value_factor?: number
          web_scopes?: string[]
          web_tags?: string[]
          web_visibility_override?: string
          website_url?: string | null
        }
        Update: {
          allow_agent_crawling?: boolean
          allow_agent_subscription?: boolean
          banner_url?: string | null
          coins_balance?: number
          collaboration_interests?: string[] | null
          contact_user_id?: string | null
          created_at?: string
          credits_balance?: number
          deleted_at?: string | null
          description?: string | null
          featured_order?: number | null
          feedpoint_default_guilds?: boolean
          feedpoint_default_partner_entities?: boolean
          feedpoint_default_posts?: boolean
          feedpoint_default_quests?: boolean
          feedpoint_default_services?: boolean
          id?: string
          instagram_url?: string | null
          is_deleted?: boolean
          is_verified?: boolean | null
          linkedin_url?: string | null
          logo_url?: string | null
          mission_statement?: string | null
          name?: string
          org_type?: string | null
          public_visibility?: string
          scale_category?: string | null
          sector?: string | null
          size?: string | null
          twitter_url?: string | null
          universe_visibility?: string
          updated_at?: string
          value_factor?: number
          web_scopes?: string[]
          web_tags?: string[]
          web_visibility_override?: string
          website_url?: string | null
        }
        Relationships: []
      }
      company_applications: {
        Row: {
          admin_note: string | null
          answers: Json | null
          applicant_user_id: string
          company_id: string
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: Database["public"]["Enums"]["guild_application_status"]
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          answers?: Json | null
          applicant_user_id: string
          company_id: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["guild_application_status"]
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          answers?: Json | null
          applicant_user_id?: string
          company_id?: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["guild_application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_applications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_service_visibility: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_visible: boolean
          service_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_visible?: boolean
          service_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_service_visibility_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_service_visibility_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      company_territories: {
        Row: {
          company_id: string
          id: string
          is_primary: boolean
          relation_type: string
          territory_id: string
        }
        Insert: {
          company_id: string
          id?: string
          is_primary?: boolean
          relation_type?: string
          territory_id: string
        }
        Update: {
          company_id?: string
          id?: string
          is_primary?: boolean
          relation_type?: string
          territory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_territories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_territories_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      company_topics: {
        Row: {
          company_id: string
          id: string
          topic_id: string
        }
        Insert: {
          company_id: string
          id?: string
          topic_id: string
        }
        Update: {
          company_id?: string
          id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_topics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      content_translations: {
        Row: {
          auto_generated: boolean
          created_at: string
          entity_id: string
          entity_type: string
          field_name: string
          id: string
          language_code: string
          translated_by: string
          translated_text: string
          updated_at: string
        }
        Insert: {
          auto_generated?: boolean
          created_at?: string
          entity_id: string
          entity_type: string
          field_name: string
          id?: string
          language_code: string
          translated_by?: string
          translated_text: string
          updated_at?: string
        }
        Update: {
          auto_generated?: boolean
          created_at?: string
          entity_id?: string
          entity_type?: string
          field_name?: string
          id?: string
          language_code?: string
          translated_by?: string
          translated_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      contribution_logs: {
        Row: {
          base_units: number | null
          contribution_type: string
          created_at: string
          credits_earned: number
          deliverable_url: string | null
          description: string | null
          guild_id: string | null
          hours_logged: number | null
          id: string
          impact_signal: Json | null
          ip_licence: string
          quest_id: string | null
          role: string | null
          status: string
          subtask_id: string | null
          task_type: string | null
          territory_id: string | null
          title: string
          trust_signal: Json | null
          user_id: string
          verified_at: string | null
          verified_by_user_id: string | null
          weight_factor: number | null
          weighted_units: number | null
          xp_earned: number
        }
        Insert: {
          base_units?: number | null
          contribution_type?: string
          created_at?: string
          credits_earned?: number
          deliverable_url?: string | null
          description?: string | null
          guild_id?: string | null
          hours_logged?: number | null
          id?: string
          impact_signal?: Json | null
          ip_licence?: string
          quest_id?: string | null
          role?: string | null
          status?: string
          subtask_id?: string | null
          task_type?: string | null
          territory_id?: string | null
          title: string
          trust_signal?: Json | null
          user_id: string
          verified_at?: string | null
          verified_by_user_id?: string | null
          weight_factor?: number | null
          weighted_units?: number | null
          xp_earned?: number
        }
        Update: {
          base_units?: number | null
          contribution_type?: string
          created_at?: string
          credits_earned?: number
          deliverable_url?: string | null
          description?: string | null
          guild_id?: string | null
          hours_logged?: number | null
          id?: string
          impact_signal?: Json | null
          ip_licence?: string
          quest_id?: string | null
          role?: string | null
          status?: string
          subtask_id?: string | null
          task_type?: string | null
          territory_id?: string | null
          title?: string
          trust_signal?: Json | null
          user_id?: string
          verified_at?: string | null
          verified_by_user_id?: string | null
          weight_factor?: number | null
          weighted_units?: number | null
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "contribution_logs_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contribution_logs_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contribution_logs_subtask_id_fkey"
            columns: ["subtask_id"]
            isOneToOne: false
            referencedRelation: "quest_subtasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contribution_logs_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_group: boolean
          sender_entity_id: string | null
          sender_entity_type: string | null
          sender_label: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_group?: boolean
          sender_entity_id?: string | null
          sender_entity_type?: string | null
          sender_label?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_group?: boolean
          sender_entity_id?: string | null
          sender_entity_type?: string | null
          sender_label?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cooperative_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          progress_percent: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          progress_percent?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          progress_percent?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_purchases: {
        Row: {
          amount: number | null
          course_id: string
          created_at: string
          currency: string | null
          id: string
          status: string
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          course_id: string
          created_at?: string
          currency?: string | null
          id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          course_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_territories: {
        Row: {
          course_id: string
          id: string
          is_primary: boolean
          relation_type: string
          territory_id: string
        }
        Insert: {
          course_id: string
          id?: string
          is_primary?: boolean
          relation_type?: string
          territory_id: string
        }
        Update: {
          course_id?: string
          id?: string
          is_primary?: boolean
          relation_type?: string
          territory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_territories_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_territories_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      course_topics: {
        Row: {
          course_id: string
          id: string
          topic_id: string
        }
        Insert: {
          course_id: string
          id?: string
          topic_id: string
        }
        Update: {
          course_id?: string
          id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_topics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_deleted: boolean
          is_free: boolean
          is_published: boolean
          level: string
          owner_company_id: string | null
          owner_guild_id: string | null
          owner_type: string
          owner_user_id: string | null
          price_amount: number | null
          price_currency: string | null
          stripe_price_id: string | null
          title: string
          universe_visibility: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean
          is_free?: boolean
          is_published?: boolean
          level?: string
          owner_company_id?: string | null
          owner_guild_id?: string | null
          owner_type?: string
          owner_user_id?: string | null
          price_amount?: number | null
          price_currency?: string | null
          stripe_price_id?: string | null
          title: string
          universe_visibility?: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean
          is_free?: boolean
          is_published?: boolean
          level?: string
          owner_company_id?: string | null
          owner_guild_id?: string | null
          owner_type?: string
          owner_user_id?: string | null
          price_amount?: number | null
          price_currency?: string | null
          stripe_price_id?: string | null
          title?: string
          universe_visibility?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_owner_company_id_fkey"
            columns: ["owner_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_owner_guild_id_fkey"
            columns: ["owner_guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          related_entity_id: string | null
          related_entity_type: string | null
          source: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          source?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          source?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      ctg_bounties: {
        Row: {
          action_type: string
          claimed_slots: number
          created_at: string | null
          ctg_reward: number
          description: string | null
          ends_at: string
          id: string
          is_active: boolean | null
          required_count: number
          starts_at: string
          title: string
          total_slots: number
        }
        Insert: {
          action_type: string
          claimed_slots?: number
          created_at?: string | null
          ctg_reward: number
          description?: string | null
          ends_at: string
          id?: string
          is_active?: boolean | null
          required_count?: number
          starts_at: string
          title: string
          total_slots?: number
        }
        Update: {
          action_type?: string
          claimed_slots?: number
          created_at?: string | null
          ctg_reward?: number
          description?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean | null
          required_count?: number
          starts_at?: string
          title?: string
          total_slots?: number
        }
        Relationships: []
      }
      ctg_bounty_claims: {
        Row: {
          bounty_id: string | null
          claimed_at: string | null
          id: string
          user_id: string
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          bounty_id?: string | null
          claimed_at?: string | null
          id?: string
          user_id: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          bounty_id?: string | null
          claimed_at?: string | null
          id?: string
          user_id?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ctg_bounty_claims_bounty_id_fkey"
            columns: ["bounty_id"]
            isOneToOne: false
            referencedRelation: "ctg_bounties"
            referencedColumns: ["id"]
          },
        ]
      }
      ctg_commons_wallet: {
        Row: {
          balance: number
          id: string
          lifetime_received: number
          updated_at: string
        }
        Insert: {
          balance?: number
          id?: string
          lifetime_received?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          id?: string
          lifetime_received?: number
          updated_at?: string
        }
        Relationships: []
      }
      ctg_emission_rules: {
        Row: {
          commons_share_percent: number
          contribution_type: string
          created_at: string
          ctg_amount: number
          id: string
          is_active: boolean
        }
        Insert: {
          commons_share_percent?: number
          contribution_type: string
          created_at?: string
          ctg_amount?: number
          id?: string
          is_active?: boolean
        }
        Update: {
          commons_share_percent?: number
          contribution_type?: string
          created_at?: string
          ctg_amount?: number
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      ctg_exchange_rates: {
        Row: {
          active: boolean
          created_at: string
          id: string
          rate_ctg_to_credits: number
          reason: string | null
          set_by_user_id: string
          valid_from: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          rate_ctg_to_credits?: number
          reason?: string | null
          set_by_user_id: string
          valid_from?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          rate_ctg_to_credits?: number
          reason?: string | null
          set_by_user_id?: string
          valid_from?: string
        }
        Relationships: []
      }
      ctg_transactions: {
        Row: {
          amount: number
          balance_after: number
          counterpart_user_id: string | null
          created_at: string
          id: string
          note: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          counterpart_user_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          counterpart_user_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      ctg_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          lifetime_earned: number
          lifetime_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      decision_poll_votes: {
        Row: {
          created_at: string
          id: string
          objection_reason: string | null
          option_index: number
          poll_id: string
          user_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          objection_reason?: string | null
          option_index: number
          poll_id: string
          user_id: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          objection_reason?: string | null
          option_index?: number
          poll_id?: string
          user_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "decision_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_polls: {
        Row: {
          allow_comments: boolean
          allow_vote_change: boolean
          allowed_visibility_role_ids: string[] | null
          allowed_vote_role_ids: string[] | null
          can_manage_decision_audience_type: string
          can_manage_decision_role_ids: string[] | null
          can_vote_audience_type: string
          closes_at: string | null
          created_at: string
          created_by: string
          decision_type: string
          description: string | null
          eligible_roles: Json | null
          entity_id: string
          entity_type: string
          id: string
          multi_select: boolean
          opens_at: string | null
          options: Json
          outcome_summary: string | null
          pass_threshold: number | null
          question: string
          quorum_type: string
          quorum_value: number | null
          status: string
          thread_id: string | null
          updated_at: string
          visibility: string
          visibility_audience_type: string
        }
        Insert: {
          allow_comments?: boolean
          allow_vote_change?: boolean
          allowed_visibility_role_ids?: string[] | null
          allowed_vote_role_ids?: string[] | null
          can_manage_decision_audience_type?: string
          can_manage_decision_role_ids?: string[] | null
          can_vote_audience_type?: string
          closes_at?: string | null
          created_at?: string
          created_by: string
          decision_type?: string
          description?: string | null
          eligible_roles?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          multi_select?: boolean
          opens_at?: string | null
          options?: Json
          outcome_summary?: string | null
          pass_threshold?: number | null
          question: string
          quorum_type?: string
          quorum_value?: number | null
          status?: string
          thread_id?: string | null
          updated_at?: string
          visibility?: string
          visibility_audience_type?: string
        }
        Update: {
          allow_comments?: boolean
          allow_vote_change?: boolean
          allowed_visibility_role_ids?: string[] | null
          allowed_vote_role_ids?: string[] | null
          can_manage_decision_audience_type?: string
          can_manage_decision_role_ids?: string[] | null
          can_vote_audience_type?: string
          closes_at?: string | null
          created_at?: string
          created_by?: string
          decision_type?: string
          description?: string | null
          eligible_roles?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          multi_select?: boolean
          opens_at?: string | null
          options?: Json
          outcome_summary?: string | null
          pass_threshold?: number | null
          question?: string
          quorum_type?: string
          quorum_value?: number | null
          status?: string
          thread_id?: string | null
          updated_at?: string
          visibility?: string
          visibility_audience_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_polls_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "unit_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      demurrage_log: {
        Row: {
          balance_after: number
          balance_before: number
          created_at: string
          fade_amount: number
          fade_rate: number
          id: string
          treasury_credited: boolean
          user_id: string
        }
        Insert: {
          balance_after: number
          balance_before: number
          created_at?: string
          fade_amount: number
          fade_rate?: number
          id?: string
          treasury_credited?: boolean
          user_id: string
        }
        Update: {
          balance_after?: number
          balance_before?: number
          created_at?: string
          fade_amount?: number
          fade_rate?: number
          id?: string
          treasury_credited?: boolean
          user_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_deleted: boolean
          sender_id: string
          sender_label: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          sender_id: string
          sender_label?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          sender_id?: string
          sender_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_rooms: {
        Row: {
          allowed_role_ids: string[] | null
          audience_type: string
          can_manage_audience_type: string
          can_manage_role_ids: string[] | null
          can_post_audience_type: string
          can_reply_audience_type: string
          created_at: string
          created_by_user_id: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          scope_id: string
          scope_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allowed_role_ids?: string[] | null
          audience_type?: string
          can_manage_audience_type?: string
          can_manage_role_ids?: string[] | null
          can_post_audience_type?: string
          can_reply_audience_type?: string
          created_at?: string
          created_by_user_id: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          scope_id: string
          scope_type: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allowed_role_ids?: string[] | null
          audience_type?: string
          can_manage_audience_type?: string
          can_manage_role_ids?: string[] | null
          can_post_audience_type?: string
          can_reply_audience_type?: string
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          scope_id?: string
          scope_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      eco_impact_events: {
        Row: {
          beneficiary_user_ids: string[] | null
          created_at: string
          id: string
          indicator_name: string
          narrative_text: string | null
          natural_system_id: string | null
          quest_id: string
          reward_amount: number
          reward_type: string
          rule_id: string | null
          value_after: Json | null
          value_before: Json | null
        }
        Insert: {
          beneficiary_user_ids?: string[] | null
          created_at?: string
          id?: string
          indicator_name: string
          narrative_text?: string | null
          natural_system_id?: string | null
          quest_id: string
          reward_amount: number
          reward_type: string
          rule_id?: string | null
          value_after?: Json | null
          value_before?: Json | null
        }
        Update: {
          beneficiary_user_ids?: string[] | null
          created_at?: string
          id?: string
          indicator_name?: string
          narrative_text?: string | null
          natural_system_id?: string | null
          quest_id?: string
          reward_amount?: number
          reward_type?: string
          rule_id?: string | null
          value_after?: Json | null
          value_before?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "eco_impact_events_natural_system_id_fkey"
            columns: ["natural_system_id"]
            isOneToOne: false
            referencedRelation: "natural_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eco_impact_events_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eco_impact_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "eco_impact_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_impact_rules: {
        Row: {
          comparison_type: string
          created_at: string
          created_by_user_id: string
          evaluation_period: string
          fulfilled_at: string | null
          id: string
          is_active: boolean
          is_fulfilled: boolean
          natural_system_id: string | null
          quest_id: string
          reward_amount: number
          reward_type: string
          target_indicator: string
          target_value: Json
          updated_at: string
        }
        Insert: {
          comparison_type?: string
          created_at?: string
          created_by_user_id: string
          evaluation_period?: string
          fulfilled_at?: string | null
          id?: string
          is_active?: boolean
          is_fulfilled?: boolean
          natural_system_id?: string | null
          quest_id: string
          reward_amount?: number
          reward_type?: string
          target_indicator: string
          target_value?: Json
          updated_at?: string
        }
        Update: {
          comparison_type?: string
          created_at?: string
          created_by_user_id?: string
          evaluation_period?: string
          fulfilled_at?: string | null
          id?: string
          is_active?: boolean
          is_fulfilled?: boolean
          natural_system_id?: string | null
          quest_id?: string
          reward_amount?: number
          reward_type?: string
          target_indicator?: string
          target_value?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eco_impact_rules_natural_system_id_fkey"
            columns: ["natural_system_id"]
            isOneToOne: false
            referencedRelation: "natural_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eco_impact_rules_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_narratives: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          indicator_after: Json | null
          indicator_before: Json | null
          indicator_key: string | null
          narrative_text: string
          narrative_type: string
          natural_system_id: string | null
          quest_id: string | null
          territory_id: string | null
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          indicator_after?: Json | null
          indicator_before?: Json | null
          indicator_key?: string | null
          narrative_text: string
          narrative_type?: string
          natural_system_id?: string | null
          quest_id?: string | null
          territory_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          indicator_after?: Json | null
          indicator_before?: Json | null
          indicator_key?: string | null
          narrative_text?: string
          narrative_type?: string
          natural_system_id?: string | null
          quest_id?: string | null
          territory_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eco_narratives_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "eco_impact_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eco_narratives_natural_system_id_fkey"
            columns: ["natural_system_id"]
            isOneToOne: false
            referencedRelation: "natural_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eco_narratives_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eco_narratives_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_region_lookup: {
        Row: {
          admin_level: string | null
          biome: string | null
          code_admin: string | null
          comments: string | null
          created_at: string
          eco_region_code: string
          eco_region_name: string
          eco_region_scheme: string | null
          id: string
          realm: string | null
          territory_code: string
          territory_granularity: Database["public"]["Enums"]["territorial_granularity"]
          updated_at: string | null
        }
        Insert: {
          admin_level?: string | null
          biome?: string | null
          code_admin?: string | null
          comments?: string | null
          created_at?: string
          eco_region_code: string
          eco_region_name: string
          eco_region_scheme?: string | null
          id?: string
          realm?: string | null
          territory_code: string
          territory_granularity: Database["public"]["Enums"]["territorial_granularity"]
          updated_at?: string | null
        }
        Update: {
          admin_level?: string | null
          biome?: string | null
          code_admin?: string | null
          comments?: string | null
          created_at?: string
          eco_region_code?: string
          eco_region_name?: string
          eco_region_scheme?: string | null
          id?: string
          realm?: string | null
          territory_code?: string
          territory_granularity?: Database["public"]["Enums"]["territorial_granularity"]
          updated_at?: string | null
        }
        Relationships: []
      }
      ecosystem_treasury_allocations: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          id: string
          notes: string | null
          period_end: string
          period_label: string
          period_start: string
          reinvestment_amount: number
          shareholder_amount: number
          solidarity_amount: number
          total_surplus: number
          treasury_amount: number
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_label: string
          period_start: string
          reinvestment_amount?: number
          shareholder_amount?: number
          solidarity_amount?: number
          total_surplus?: number
          treasury_amount?: number
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_label?: string
          period_start?: string
          reinvestment_amount?: number
          shareholder_amount?: number
          solidarity_amount?: number
          total_surplus?: number
          treasury_amount?: number
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          cta_label: string | null
          cta_url: string | null
          description: string | null
          id: string
          key: string
          label: string
          subject: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          body_html: string
          cta_label?: string | null
          cta_url?: string | null
          description?: string | null
          id?: string
          key: string
          label: string
          subject: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          body_html?: string
          cta_label?: string | null
          cta_url?: string | null
          description?: string | null
          id?: string
          key?: string
          label?: string
          subject?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: []
      }
      entity_member_roles: {
        Row: {
          created_at: string
          entity_role_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_role_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_role_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_member_roles_entity_role_id_fkey"
            columns: ["entity_role_id"]
            isOneToOne: false
            referencedRelation: "entity_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_roles: {
        Row: {
          color: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          is_default: boolean
          name: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      environmental_datasets: {
        Row: {
          api_base_url: string | null
          api_endpoint: string | null
          api_method: string | null
          api_params_template: Json | null
          created_at: string
          dataset_type: string | null
          description: string | null
          example_response: Json | null
          fetch_method: Database["public"]["Enums"]["dataset_fetch_method"]
          granularity: Database["public"]["Enums"]["dataset_granularity"]
          id: string
          is_active: boolean
          metadata_schema: Json | null
          response_mapping: Json | null
          source: string
          title: string
          update_frequency: string | null
          updated_at: string
        }
        Insert: {
          api_base_url?: string | null
          api_endpoint?: string | null
          api_method?: string | null
          api_params_template?: Json | null
          created_at?: string
          dataset_type?: string | null
          description?: string | null
          example_response?: Json | null
          fetch_method?: Database["public"]["Enums"]["dataset_fetch_method"]
          granularity?: Database["public"]["Enums"]["dataset_granularity"]
          id?: string
          is_active?: boolean
          metadata_schema?: Json | null
          response_mapping?: Json | null
          source: string
          title: string
          update_frequency?: string | null
          updated_at?: string
        }
        Update: {
          api_base_url?: string | null
          api_endpoint?: string | null
          api_method?: string | null
          api_params_template?: Json | null
          created_at?: string
          dataset_type?: string | null
          description?: string | null
          example_response?: Json | null
          fetch_method?: Database["public"]["Enums"]["dataset_fetch_method"]
          granularity?: Database["public"]["Enums"]["dataset_granularity"]
          id?: string
          is_active?: boolean
          metadata_schema?: Json | null
          response_mapping?: Json | null
          source?: string
          title?: string
          update_frequency?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          category: string
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          label: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          label: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_suggestions: {
        Row: {
          admin_comment: string | null
          confidence_score: number | null
          created_at: string
          id: string
          interpreted_action_type: string | null
          original_text: string
          persona_at_time: string | null
          source: string
          status: string
          tags: string[] | null
          updated_at: string
          user_explicit: boolean
          user_id: string | null
        }
        Insert: {
          admin_comment?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          interpreted_action_type?: string | null
          original_text: string
          persona_at_time?: string | null
          source?: string
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_explicit?: boolean
          user_id?: string | null
        }
        Update: {
          admin_comment?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          interpreted_action_type?: string | null
          original_text?: string
          persona_at_time?: string | null
          source?: string
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_explicit?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      feed_posts: {
        Row: {
          author_user_id: string
          content: string | null
          context_id: string | null
          context_type: string
          created_at: string
          deleted_at: string | null
          id: string
          is_deleted: boolean
          reshared_post_id: string | null
          room_id: string | null
          updated_at: string
          upvote_count: number
          visibility: string
          web_visibility_override: string
        }
        Insert: {
          author_user_id: string
          content?: string | null
          context_id?: string | null
          context_type?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          reshared_post_id?: string | null
          room_id?: string | null
          updated_at?: string
          upvote_count?: number
          visibility?: string
          web_visibility_override?: string
        }
        Update: {
          author_user_id?: string
          content?: string | null
          context_id?: string | null
          context_type?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          reshared_post_id?: string | null
          room_id?: string | null
          updated_at?: string
          upvote_count?: number
          visibility?: string
          web_visibility_override?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_reshared_post_id_fkey"
            columns: ["reshared_post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "discussion_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          id: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          id?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      giveback_distribution_rules: {
        Row: {
          created_at: string
          guild_id: string | null
          id: string
          percentage: number
          target_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          guild_id?: string | null
          id?: string
          percentage?: number
          target_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          guild_id?: string | null
          id?: string
          percentage?: number
          target_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "giveback_distribution_rules_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      gratitude_donations: {
        Row: {
          amount_credits: number
          amount_fiat: number
          booking_id: string | null
          created_at: string
          currency: string | null
          from_user_id: string
          id: string
          metadata: Json | null
          to_guild_id: string | null
          to_target_type: string
        }
        Insert: {
          amount_credits?: number
          amount_fiat?: number
          booking_id?: string | null
          created_at?: string
          currency?: string | null
          from_user_id: string
          id?: string
          metadata?: Json | null
          to_guild_id?: string | null
          to_target_type: string
        }
        Update: {
          amount_credits?: number
          amount_fiat?: number
          booking_id?: string | null
          created_at?: string
          currency?: string | null
          from_user_id?: string
          id?: string
          metadata?: Json | null
          to_guild_id?: string | null
          to_target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "gratitude_donations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gratitude_donations_to_guild_id_fkey"
            columns: ["to_guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_applications: {
        Row: {
          admin_note: string | null
          answers: Json | null
          applicant_user_id: string
          created_at: string
          guild_id: string
          id: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: Database["public"]["Enums"]["guild_application_status"]
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          answers?: Json | null
          applicant_user_id: string
          created_at?: string
          guild_id: string
          id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["guild_application_status"]
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          answers?: Json | null
          applicant_user_id?: string
          created_at?: string
          guild_id?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["guild_application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_applications_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_contribution_weights: {
        Row: {
          created_at: string
          guild_id: string
          id: string
          task_type: string
          updated_at: string
          weight_factor: number
        }
        Insert: {
          created_at?: string
          guild_id: string
          id?: string
          task_type: string
          updated_at?: string
          weight_factor?: number
        }
        Update: {
          created_at?: string
          guild_id?: string
          id?: string
          task_type?: string
          updated_at?: string
          weight_factor?: number
        }
        Relationships: []
      }
      guild_decisions: {
        Row: {
          created_at: string
          description: string | null
          guild_id: string
          id: string
          proposed_by: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          guild_id: string
          id?: string
          proposed_by: string
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          guild_id?: string
          id?: string
          proposed_by?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_decisions_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_docs: {
        Row: {
          content: string | null
          created_at: string
          created_by_user_id: string
          guild_id: string
          id: string
          is_pinned: boolean
          title: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by_user_id: string
          guild_id: string
          id?: string
          is_pinned?: boolean
          title: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by_user_id?: string
          guild_id?: string
          id?: string
          is_pinned?: boolean
          title?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guild_docs_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_event_attendees: {
        Row: {
          accepted_at: string | null
          cancelled_at: string | null
          email: string | null
          event_id: string
          id: string
          name: string | null
          notes: string | null
          payment_status: string
          refunded_at: string | null
          registered_at: string
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          cancelled_at?: string | null
          email?: string | null
          event_id: string
          id?: string
          name?: string | null
          notes?: string | null
          payment_status?: string
          refunded_at?: string | null
          registered_at?: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          cancelled_at?: string | null
          email?: string | null
          event_id?: string
          id?: string
          name?: string | null
          notes?: string | null
          payment_status?: string
          refunded_at?: string | null
          registered_at?: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guild_event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "guild_events"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_events: {
        Row: {
          acceptance_mode: string
          call_url: string | null
          created_at: string
          created_by_user_id: string
          currency: string | null
          description: string | null
          end_at: string | null
          guild_id: string
          id: string
          is_cancelled: boolean
          is_paid: boolean
          location_text: string | null
          location_type: string
          max_attendees: number | null
          price_per_ticket: number | null
          start_at: string
          status: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          acceptance_mode?: string
          call_url?: string | null
          created_at?: string
          created_by_user_id: string
          currency?: string | null
          description?: string | null
          end_at?: string | null
          guild_id: string
          id?: string
          is_cancelled?: boolean
          is_paid?: boolean
          location_text?: string | null
          location_type?: string
          max_attendees?: number | null
          price_per_ticket?: number | null
          start_at: string
          status?: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          acceptance_mode?: string
          call_url?: string | null
          created_at?: string
          created_by_user_id?: string
          currency?: string | null
          description?: string | null
          end_at?: string | null
          guild_id?: string
          id?: string
          is_cancelled?: boolean
          is_paid?: boolean
          location_text?: string | null
          location_type?: string
          max_attendees?: number | null
          price_per_ticket?: number | null
          start_at?: string
          status?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_events_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
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
      guild_service_visibility: {
        Row: {
          created_at: string
          guild_id: string
          id: string
          is_visible: boolean
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          guild_id: string
          id?: string
          is_visible?: boolean
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          guild_id?: string
          id?: string
          is_visible?: boolean
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_service_visibility_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_service_visibility_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_territories: {
        Row: {
          guild_id: string
          id: string
          is_primary: boolean
          relation_type: string
          territory_id: string
        }
        Insert: {
          guild_id: string
          id?: string
          is_primary?: boolean
          relation_type?: string
          territory_id: string
        }
        Update: {
          guild_id?: string
          id?: string
          is_primary?: boolean
          relation_type?: string
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
      guild_wallets: {
        Row: {
          coins_balance: number
          created_at: string
          guild_id: string
          id: string
          updated_at: string
        }
        Insert: {
          coins_balance?: number
          created_at?: string
          guild_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          coins_balance?: number
          created_at?: string
          guild_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_wallets_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: true
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guilds: {
        Row: {
          allow_agent_crawling: boolean
          allow_agent_subscription: boolean
          application_questions: Json | null
          banner_url: string | null
          coins_balance: number
          created_at: string
          created_by_user_id: string
          credits_balance: number
          deleted_at: string | null
          description: string | null
          enable_membership: boolean
          entry_fee_credits: number | null
          featured_order: number | null
          features_config: Json
          feedpoint_default_guilds: boolean
          feedpoint_default_partner_entities: boolean
          feedpoint_default_posts: boolean
          feedpoint_default_quests: boolean
          feedpoint_default_services: boolean
          id: string
          instagram_url: string | null
          is_approved: boolean
          is_deleted: boolean
          is_draft: boolean
          join_policy: Database["public"]["Enums"]["guild_join_policy"]
          linkedin_url: string | null
          logo_url: string | null
          member_xp_bonus_percent: number
          members_only_events: boolean
          members_only_quests: boolean
          members_only_voting: boolean
          membership_benefits_text: string | null
          membership_commitments_text: string | null
          membership_duration_months: number | null
          membership_style: string
          name: string
          public_visibility: string
          redistribution_percent: number
          twitter_url: string | null
          type: Database["public"]["Enums"]["guild_type"]
          universe_visibility: string
          updated_at: string
          value_factor: number
          web_scopes: string[] | null
          web_tags: string[] | null
          web_visibility_override: string
          website_url: string | null
        }
        Insert: {
          allow_agent_crawling?: boolean
          allow_agent_subscription?: boolean
          application_questions?: Json | null
          banner_url?: string | null
          coins_balance?: number
          created_at?: string
          created_by_user_id: string
          credits_balance?: number
          deleted_at?: string | null
          description?: string | null
          enable_membership?: boolean
          entry_fee_credits?: number | null
          featured_order?: number | null
          features_config?: Json
          feedpoint_default_guilds?: boolean
          feedpoint_default_partner_entities?: boolean
          feedpoint_default_posts?: boolean
          feedpoint_default_quests?: boolean
          feedpoint_default_services?: boolean
          id?: string
          instagram_url?: string | null
          is_approved?: boolean
          is_deleted?: boolean
          is_draft?: boolean
          join_policy?: Database["public"]["Enums"]["guild_join_policy"]
          linkedin_url?: string | null
          logo_url?: string | null
          member_xp_bonus_percent?: number
          members_only_events?: boolean
          members_only_quests?: boolean
          members_only_voting?: boolean
          membership_benefits_text?: string | null
          membership_commitments_text?: string | null
          membership_duration_months?: number | null
          membership_style?: string
          name: string
          public_visibility?: string
          redistribution_percent?: number
          twitter_url?: string | null
          type?: Database["public"]["Enums"]["guild_type"]
          universe_visibility?: string
          updated_at?: string
          value_factor?: number
          web_scopes?: string[] | null
          web_tags?: string[] | null
          web_visibility_override?: string
          website_url?: string | null
        }
        Update: {
          allow_agent_crawling?: boolean
          allow_agent_subscription?: boolean
          application_questions?: Json | null
          banner_url?: string | null
          coins_balance?: number
          created_at?: string
          created_by_user_id?: string
          credits_balance?: number
          deleted_at?: string | null
          description?: string | null
          enable_membership?: boolean
          entry_fee_credits?: number | null
          featured_order?: number | null
          features_config?: Json
          feedpoint_default_guilds?: boolean
          feedpoint_default_partner_entities?: boolean
          feedpoint_default_posts?: boolean
          feedpoint_default_quests?: boolean
          feedpoint_default_services?: boolean
          id?: string
          instagram_url?: string | null
          is_approved?: boolean
          is_deleted?: boolean
          is_draft?: boolean
          join_policy?: Database["public"]["Enums"]["guild_join_policy"]
          linkedin_url?: string | null
          logo_url?: string | null
          member_xp_bonus_percent?: number
          members_only_events?: boolean
          members_only_quests?: boolean
          members_only_voting?: boolean
          membership_benefits_text?: string | null
          membership_commitments_text?: string | null
          membership_duration_months?: number | null
          membership_style?: string
          name?: string
          public_visibility?: string
          redistribution_percent?: number
          twitter_url?: string | null
          type?: Database["public"]["Enums"]["guild_type"]
          universe_visibility?: string
          updated_at?: string
          value_factor?: number
          web_scopes?: string[] | null
          web_tags?: string[] | null
          web_visibility_override?: string
          website_url?: string | null
        }
        Relationships: []
      }
      harvest_windows: {
        Row: {
          created_at: string | null
          ends_at: string
          id: string
          is_active: boolean | null
          label: string
          multiplier: number
          starts_at: string
        }
        Insert: {
          created_at?: string | null
          ends_at: string
          id?: string
          is_active?: boolean | null
          label: string
          multiplier?: number
          starts_at: string
        }
        Update: {
          created_at?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean | null
          label?: string
          multiplier?: number
          starts_at?: string
        }
        Relationships: []
      }
      highlighted_quests: {
        Row: {
          created_at: string
          id: string
          quest_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quest_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quest_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlighted_quests_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      ics_feeds: {
        Row: {
          created_at: string
          filters: Json | null
          id: string
          is_active: boolean
          label: string
          owner_user_id: string
          token: string
          type: Database["public"]["Enums"]["ics_feed_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          filters?: Json | null
          id?: string
          is_active?: boolean
          label?: string
          owner_user_id: string
          token?: string
          type?: Database["public"]["Enums"]["ics_feed_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          filters?: Json | null
          id?: string
          is_active?: boolean
          label?: string
          owner_user_id?: string
          token?: string
          type?: Database["public"]["Enums"]["ics_feed_type"]
          updated_at?: string
        }
        Relationships: []
      }
      job_position_territories: {
        Row: {
          id: string
          job_position_id: string
          territory_id: string
        }
        Insert: {
          id?: string
          job_position_id: string
          territory_id: string
        }
        Update: {
          id?: string
          job_position_id?: string
          territory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_position_territories_job_position_id_fkey"
            columns: ["job_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_position_territories_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      job_position_topics: {
        Row: {
          id: string
          job_position_id: string
          topic_id: string
        }
        Insert: {
          id?: string
          job_position_id: string
          topic_id: string
        }
        Update: {
          id?: string
          job_position_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_position_topics_job_position_id_fkey"
            columns: ["job_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_position_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      job_positions: {
        Row: {
          company_id: string | null
          contract_type: string
          created_at: string
          created_by_user_id: string
          description: string | null
          document_name: string | null
          document_url: string | null
          id: string
          is_active: boolean
          location_text: string | null
          organization_name: string | null
          remote_policy: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          contract_type?: string
          created_at?: string
          created_by_user_id: string
          description?: string | null
          document_name?: string | null
          document_url?: string | null
          id?: string
          is_active?: boolean
          location_text?: string | null
          organization_name?: string | null
          remote_policy?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          contract_type?: string
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          document_name?: string | null
          document_url?: string | null
          id?: string
          is_active?: boolean
          location_text?: string | null
          organization_name?: string | null
          remote_policy?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      languages: {
        Row: {
          code: string
          created_at: string
          id: string
          is_enabled: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          name?: string
        }
        Relationships: []
      }
      leaderboard_scores: {
        Row: {
          ai_score: number
          collaborator_score: number
          created_at: string
          creator_score: number
          followers_gained: number
          guild_score: number
          helpful_score: number
          id: string
          mentor_score: number
          period_start: string | null
          rising_score: number
          territory_score: number
          time_scope: string
          updated_at: string
          user_id: string
          xp_gained: number
        }
        Insert: {
          ai_score?: number
          collaborator_score?: number
          created_at?: string
          creator_score?: number
          followers_gained?: number
          guild_score?: number
          helpful_score?: number
          id?: string
          mentor_score?: number
          period_start?: string | null
          rising_score?: number
          territory_score?: number
          time_scope: string
          updated_at?: string
          user_id: string
          xp_gained?: number
        }
        Update: {
          ai_score?: number
          collaborator_score?: number
          created_at?: string
          creator_score?: number
          followers_gained?: number
          guild_score?: number
          helpful_score?: number
          id?: string
          mentor_score?: number
          period_start?: string | null
          rising_score?: number
          territory_score?: number
          time_scope?: string
          updated_at?: string
          user_id?: string
          xp_gained?: number
        }
        Relationships: []
      }
      lessons: {
        Row: {
          content_markdown: string | null
          course_id: string
          created_at: string
          id: string
          is_preview: boolean
          position: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content_markdown?: string | null
          course_id: string
          created_at?: string
          id?: string
          is_preview?: boolean
          position?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content_markdown?: string | null
          course_id?: string
          created_at?: string
          id?: string
          is_preview?: boolean
          position?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          code: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_enabled: boolean
          persona_visibility: string
          reward_amount: number | null
          reward_type: string
          sort_order: number
          title: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_enabled?: boolean
          persona_visibility?: string
          reward_amount?: number | null
          reward_type?: string
          sort_order?: number
          title: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_enabled?: boolean
          persona_visibility?: string
          reward_amount?: number | null
          reward_type?: string
          sort_order?: number
          title?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      mission_agreements: {
        Row: {
          amount_accepted: number
          base_commission_percentage: number
          collaborator_user_id: string
          commission_amount: number
          created_at: string
          credit_reduction_percentage: number
          credits_spent_for_reduction: number
          final_commission_percentage: number
          id: string
          owner_user_id: string
          payment_status: string
          payment_type: string
          payout_amount: number
          plan_discount_percentage: number
          proposal_id: string | null
          quest_id: string
          updated_at: string
        }
        Insert: {
          amount_accepted: number
          base_commission_percentage: number
          collaborator_user_id: string
          commission_amount: number
          created_at?: string
          credit_reduction_percentage?: number
          credits_spent_for_reduction?: number
          final_commission_percentage: number
          id?: string
          owner_user_id: string
          payment_status?: string
          payment_type?: string
          payout_amount: number
          plan_discount_percentage?: number
          proposal_id?: string | null
          quest_id: string
          updated_at?: string
        }
        Update: {
          amount_accepted?: number
          base_commission_percentage?: number
          collaborator_user_id?: string
          commission_amount?: number
          created_at?: string
          credit_reduction_percentage?: number
          credits_spent_for_reduction?: number
          final_commission_percentage?: number
          id?: string
          owner_user_id?: string
          payment_status?: string
          payment_type?: string
          payout_amount?: number
          plan_discount_percentage?: number
          proposal_id?: string | null
          quest_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_agreements_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "quest_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_agreements_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      monetized_action_types: {
        Row: {
          base_price: number
          code: string
          created_at: string
          default_sensitivity: Database["public"]["Enums"]["content_sensitivity"]
          id: string
          label: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          code: string
          created_at?: string
          default_sensitivity?: Database["public"]["Enums"]["content_sensitivity"]
          id?: string
          label: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          code?: string
          created_at?: string
          default_sensitivity?: Database["public"]["Enums"]["content_sensitivity"]
          id?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      natural_system_data_points: {
        Row: {
          created_at: string
          id: string
          metric: string
          natural_system_id: string
          recorded_at: string
          source: string | null
          unit: string | null
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          metric: string
          natural_system_id: string
          recorded_at?: string
          source?: string | null
          unit?: string | null
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          metric?: string
          natural_system_id?: string
          recorded_at?: string
          source?: string | null
          unit?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "natural_system_data_points_natural_system_id_fkey"
            columns: ["natural_system_id"]
            isOneToOne: false
            referencedRelation: "natural_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      natural_system_health_snapshots: {
        Row: {
          health_index: number
          id: string
          natural_system_id: string
          recorded_at: string
          resilience_index: number
        }
        Insert: {
          health_index: number
          id?: string
          natural_system_id: string
          recorded_at?: string
          resilience_index: number
        }
        Update: {
          health_index?: number
          id?: string
          natural_system_id?: string
          recorded_at?: string
          resilience_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "natural_system_health_snapshots_natural_system_id_fkey"
            columns: ["natural_system_id"]
            isOneToOne: false
            referencedRelation: "natural_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      natural_system_indicators: {
        Row: {
          computed_at: string
          id: string
          indicator: string
          natural_system_id: string
          value: number
        }
        Insert: {
          computed_at?: string
          id?: string
          indicator: string
          natural_system_id: string
          value: number
        }
        Update: {
          computed_at?: string
          id?: string
          indicator?: string
          natural_system_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "natural_system_indicators_natural_system_id_fkey"
            columns: ["natural_system_id"]
            isOneToOne: false
            referencedRelation: "natural_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      natural_system_links: {
        Row: {
          created_at: string
          id: string
          linked_id: string
          linked_type: Database["public"]["Enums"]["ns_link_type"]
          linked_via: string
          natural_system_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          linked_id: string
          linked_type: Database["public"]["Enums"]["ns_link_type"]
          linked_via?: string
          natural_system_id: string
        }
        Update: {
          created_at?: string
          id?: string
          linked_id?: string
          linked_type?: Database["public"]["Enums"]["ns_link_type"]
          linked_via?: string
          natural_system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "natural_system_links_natural_system_id_fkey"
            columns: ["natural_system_id"]
            isOneToOne: false
            referencedRelation: "natural_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      natural_systems: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          description: string | null
          external_data_links: Json | null
          geo_shape: Json | null
          health_index: number | null
          id: string
          is_deleted: boolean
          kingdom: Database["public"]["Enums"]["natural_system_kingdom"]
          live_config: Json | null
          location_text: string | null
          name: string
          picture_url: string | null
          regenerative_potential: number | null
          resilience_index: number | null
          seasonal_cycle: Json | null
          source_url: string | null
          stress_signals: Json | null
          system_type: Database["public"]["Enums"]["natural_system_type_v2"]
          tags: string[] | null
          territory_id: string | null
          type: Database["public"]["Enums"]["natural_system_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          external_data_links?: Json | null
          geo_shape?: Json | null
          health_index?: number | null
          id?: string
          is_deleted?: boolean
          kingdom?: Database["public"]["Enums"]["natural_system_kingdom"]
          live_config?: Json | null
          location_text?: string | null
          name: string
          picture_url?: string | null
          regenerative_potential?: number | null
          resilience_index?: number | null
          seasonal_cycle?: Json | null
          source_url?: string | null
          stress_signals?: Json | null
          system_type?: Database["public"]["Enums"]["natural_system_type_v2"]
          tags?: string[] | null
          territory_id?: string | null
          type?: Database["public"]["Enums"]["natural_system_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          external_data_links?: Json | null
          geo_shape?: Json | null
          health_index?: number | null
          id?: string
          is_deleted?: boolean
          kingdom?: Database["public"]["Enums"]["natural_system_kingdom"]
          live_config?: Json | null
          location_text?: string | null
          name?: string
          picture_url?: string | null
          regenerative_potential?: number | null
          resilience_index?: number | null
          seasonal_cycle?: Json | null
          source_url?: string | null
          stress_signals?: Json | null
          system_type?: Database["public"]["Enums"]["natural_system_type_v2"]
          tags?: string[] | null
          territory_id?: string | null
          type?: Database["public"]["Enums"]["natural_system_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "natural_systems_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel_email_enabled: boolean
          channel_in_app_enabled: boolean
          created_at: string
          digest_frequency: string
          id: string
          instant_email_for_bookings: boolean
          instant_email_for_invites: boolean
          last_digest_sent_at: string | null
          notification_frequency: string
          notify_abuse_reports: boolean
          notify_ai_flagged_content: boolean
          notify_booking_status_changes: boolean
          notify_bookings_and_cancellations: boolean
          notify_co_host_changes: boolean
          notify_comments_and_upvotes: boolean
          notify_daily_digest_email: boolean
          notify_daily_digest_in_app: boolean
          notify_direct_messages_email: boolean | null
          notify_direct_messages_in_app: boolean
          notify_entity_updates_from_followed: boolean
          notify_events_and_courses: boolean
          notify_follower_activity: boolean
          notify_invitations_to_units: boolean
          notify_mentions: boolean
          notify_new_bug_reports: boolean
          notify_new_courses_from_followed: boolean
          notify_new_events_from_followed: boolean
          notify_new_join_requests_guilds: boolean
          notify_new_join_requests_pods: boolean
          notify_new_members_in_my_units: boolean
          notify_new_partnership_requests: boolean
          notify_new_posts_from_followed: boolean
          notify_new_quests_from_followed: boolean
          notify_new_services_from_followed: boolean
          notify_new_user_registrations: boolean
          notify_payments_and_shares: boolean
          notify_quest_updates_and_comments: boolean
          notify_quest_updates_from_followed: boolean
          notify_system_errors: boolean
          notify_xp_and_achievements: boolean
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_email_enabled?: boolean
          channel_in_app_enabled?: boolean
          created_at?: string
          digest_frequency?: string
          id?: string
          instant_email_for_bookings?: boolean
          instant_email_for_invites?: boolean
          last_digest_sent_at?: string | null
          notification_frequency?: string
          notify_abuse_reports?: boolean
          notify_ai_flagged_content?: boolean
          notify_booking_status_changes?: boolean
          notify_bookings_and_cancellations?: boolean
          notify_co_host_changes?: boolean
          notify_comments_and_upvotes?: boolean
          notify_daily_digest_email?: boolean
          notify_daily_digest_in_app?: boolean
          notify_direct_messages_email?: boolean | null
          notify_direct_messages_in_app?: boolean
          notify_entity_updates_from_followed?: boolean
          notify_events_and_courses?: boolean
          notify_follower_activity?: boolean
          notify_invitations_to_units?: boolean
          notify_mentions?: boolean
          notify_new_bug_reports?: boolean
          notify_new_courses_from_followed?: boolean
          notify_new_events_from_followed?: boolean
          notify_new_join_requests_guilds?: boolean
          notify_new_join_requests_pods?: boolean
          notify_new_members_in_my_units?: boolean
          notify_new_partnership_requests?: boolean
          notify_new_posts_from_followed?: boolean
          notify_new_quests_from_followed?: boolean
          notify_new_services_from_followed?: boolean
          notify_new_user_registrations?: boolean
          notify_payments_and_shares?: boolean
          notify_quest_updates_and_comments?: boolean
          notify_quest_updates_from_followed?: boolean
          notify_system_errors?: boolean
          notify_xp_and_achievements?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_email_enabled?: boolean
          channel_in_app_enabled?: boolean
          created_at?: string
          digest_frequency?: string
          id?: string
          instant_email_for_bookings?: boolean
          instant_email_for_invites?: boolean
          last_digest_sent_at?: string | null
          notification_frequency?: string
          notify_abuse_reports?: boolean
          notify_ai_flagged_content?: boolean
          notify_booking_status_changes?: boolean
          notify_bookings_and_cancellations?: boolean
          notify_co_host_changes?: boolean
          notify_comments_and_upvotes?: boolean
          notify_daily_digest_email?: boolean
          notify_daily_digest_in_app?: boolean
          notify_direct_messages_email?: boolean | null
          notify_direct_messages_in_app?: boolean
          notify_entity_updates_from_followed?: boolean
          notify_events_and_courses?: boolean
          notify_follower_activity?: boolean
          notify_invitations_to_units?: boolean
          notify_mentions?: boolean
          notify_new_bug_reports?: boolean
          notify_new_courses_from_followed?: boolean
          notify_new_events_from_followed?: boolean
          notify_new_join_requests_guilds?: boolean
          notify_new_join_requests_pods?: boolean
          notify_new_members_in_my_units?: boolean
          notify_new_partnership_requests?: boolean
          notify_new_posts_from_followed?: boolean
          notify_new_quests_from_followed?: boolean
          notify_new_services_from_followed?: boolean
          notify_new_user_registrations?: boolean
          notify_payments_and_shares?: boolean
          notify_quest_updates_and_comments?: boolean
          notify_quest_updates_from_followed?: boolean
          notify_system_errors?: boolean
          notify_xp_and_achievements?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          deep_link_url: string | null
          id: string
          is_read: boolean
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          deep_link_url?: string | null
          id?: string
          is_read?: boolean
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          deep_link_url?: string | null
          id?: string
          is_read?: boolean
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      partnerships: {
        Row: {
          created_at: string
          created_by_user_id: string
          from_entity_id: string
          from_entity_type: string
          id: string
          notes: string | null
          partnership_type: string | null
          status: string
          to_entity_id: string
          to_entity_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          from_entity_id: string
          from_entity_type: string
          id?: string
          notes?: string | null
          partnership_type?: string | null
          status?: string
          to_entity_id: string
          to_entity_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          from_entity_id?: string
          from_entity_type?: string
          id?: string
          notes?: string | null
          partnership_type?: string | null
          status?: string
          to_entity_id?: string
          to_entity_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      personal_tasks: {
        Row: {
          converted_to_quest_id: string | null
          converted_to_subtask_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          converted_to_quest_id?: string | null
          converted_to_subtask_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          converted_to_quest_id?: string | null
          converted_to_subtask_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_tasks_converted_to_quest_id_fkey"
            columns: ["converted_to_quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_tasks_converted_to_subtask_id_fkey"
            columns: ["converted_to_subtask_id"]
            isOneToOne: false
            referencedRelation: "quest_subtasks"
            referencedColumns: ["id"]
          },
        ]
      }
      pi_conversations: {
        Row: {
          context_id: string | null
          context_type: string | null
          created_at: string
          id: string
          is_active: boolean
          messages: Json | null
          model_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          messages?: Json | null
          model_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          messages?: Json | null
          model_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pi_memories: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          key: string
          session_id: string | null
          tier: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key: string
          session_id?: string | null
          tier: string
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key?: string
          session_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      pi_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "pi_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "pi_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      pi_tool_logs: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          params: Json | null
          result: Json | null
          tool_name: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          params?: Json | null
          result?: Json | null
          tool_name: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          params?: Json | null
          result?: Json | null
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "pi_tool_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "pi_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      pi_triggers: {
        Row: {
          created_at: string
          delivered_at: string | null
          id: string
          status: string
          trigger_data: Json | null
          trigger_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          status?: string
          trigger_data?: Json | null
          trigger_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          status?: string
          trigger_data?: Json | null
          trigger_type?: string
          user_id?: string
        }
        Relationships: []
      }
      pod_applications: {
        Row: {
          admin_note: string | null
          answers: Json | null
          applicant_user_id: string
          created_at: string
          id: string
          pod_id: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: Database["public"]["Enums"]["guild_application_status"]
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          answers?: Json | null
          applicant_user_id: string
          created_at?: string
          id?: string
          pod_id: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["guild_application_status"]
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          answers?: Json | null
          applicant_user_id?: string
          created_at?: string
          id?: string
          pod_id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["guild_application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pod_applications_pod_id_fkey"
            columns: ["pod_id"]
            isOneToOne: false
            referencedRelation: "pods"
            referencedColumns: ["id"]
          },
        ]
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
      pod_territories: {
        Row: {
          id: string
          is_primary: boolean
          pod_id: string
          relation_type: string
          territory_id: string
        }
        Insert: {
          id?: string
          is_primary?: boolean
          pod_id: string
          relation_type?: string
          territory_id: string
        }
        Update: {
          id?: string
          is_primary?: boolean
          pod_id?: string
          relation_type?: string
          territory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pod_territories_pod_id_fkey"
            columns: ["pod_id"]
            isOneToOne: false
            referencedRelation: "pods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pod_territories_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      pods: {
        Row: {
          application_questions: Json | null
          created_at: string
          creator_id: string
          deleted_at: string | null
          description: string | null
          end_date: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          is_draft: boolean
          join_policy: Database["public"]["Enums"]["guild_join_policy"]
          name: string
          quest_id: string | null
          start_date: string | null
          topic_id: string | null
          type: Database["public"]["Enums"]["pod_type"]
          universe_visibility: string
          updated_at: string
        }
        Insert: {
          application_questions?: Json | null
          created_at?: string
          creator_id: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_draft?: boolean
          join_policy?: Database["public"]["Enums"]["guild_join_policy"]
          name: string
          quest_id?: string | null
          start_date?: string | null
          topic_id?: string | null
          type?: Database["public"]["Enums"]["pod_type"]
          universe_visibility?: string
          updated_at?: string
        }
        Update: {
          application_questions?: Json | null
          created_at?: string
          creator_id?: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_draft?: boolean
          join_policy?: Database["public"]["Enums"]["guild_join_policy"]
          name?: string
          quest_id?: string | null
          start_date?: string | null
          topic_id?: string | null
          type?: Database["public"]["Enums"]["pod_type"]
          universe_visibility?: string
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
      post_attachments: {
        Row: {
          created_at: string
          embed_meta: Json | null
          embed_provider: string | null
          file_name: string | null
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          post_id: string
          sort_order: number
          thumbnail_url: string | null
          type: string
          url: string
        }
        Insert: {
          created_at?: string
          embed_meta?: Json | null
          embed_provider?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          post_id: string
          sort_order?: number
          thumbnail_url?: string | null
          type: string
          url: string
        }
        Update: {
          created_at?: string
          embed_meta?: Json | null
          embed_provider?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          post_id?: string
          sort_order?: number
          thumbnail_url?: string | null
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_attachments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_territories: {
        Row: {
          created_at: string
          id: string
          post_id: string
          territory_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          territory_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          territory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_territories_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_territories_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      post_topics: {
        Row: {
          created_at: string
          id: string
          post_id: string
          topic_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          topic_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_topics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      post_upvotes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_upvotes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_masked_items: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_name: string | null
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_name?: string | null
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_name?: string | null
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allow_wall_comments: boolean
          avatar_url: string | null
          bio: string | null
          biopoints_balance: number
          coins_balance: number
          community_xp: number
          contribution_index: number
          created_at: string
          credits_balance: number
          ctg_balance: number
          current_path: string | null
          current_plan_code: string | null
          default_give_back_guild_id: string | null
          default_give_back_target_type: string
          demurrage_exempt: boolean
          dismissed_hints: string[]
          email: string
          featured_order: number | null
          feedpoint_default_guilds: boolean
          feedpoint_default_partner_entities: boolean
          feedpoint_default_posts: boolean
          feedpoint_default_quests: boolean
          feedpoint_default_services: boolean
          filter_by_houses: boolean
          governance_weight: number
          has_completed_onboarding: boolean
          headline: string | null
          id: string
          instagram_url: string | null
          is_cooperative_member: boolean
          last_demurrage_at: string | null
          last_milestone_popup_at: string | null
          last_xp_recalculated_at: string | null
          lifetime_credits_earned: number
          lifetime_credits_faded: number
          lifetime_credits_spent: number
          linkedin_url: string | null
          location: string | null
          maker_xp: number
          milestone_popups_enabled: boolean
          name: string
          path_step: number | null
          persona_confidence: number | null
          persona_source: string | null
          persona_type: string
          preferred_language: string
          public_visibility: string
          pulse_nudge_sent: boolean
          resource_catalyst_xp: number
          role: string
          stewardship_xp: number
          stripe_account_id: string | null
          stripe_connect_account_id: string | null
          stripe_connect_onboarded: boolean
          stripe_onboarding_complete: boolean
          tech_commons_xp: number
          total_shares_a: number
          total_shares_b: number
          trust_xp_granted_this_month: number
          trust_xp_month_key: string
          twitter_url: string | null
          updated_at: string
          user_id: string
          web_scopes: string[]
          web_tags: string[]
          website_url: string | null
          xp: number
          xp_level: number
          xp_pending: number
          xp_recent_12m: number
          xp_total: number
        }
        Insert: {
          allow_wall_comments?: boolean
          avatar_url?: string | null
          bio?: string | null
          biopoints_balance?: number
          coins_balance?: number
          community_xp?: number
          contribution_index?: number
          created_at?: string
          credits_balance?: number
          ctg_balance?: number
          current_path?: string | null
          current_plan_code?: string | null
          default_give_back_guild_id?: string | null
          default_give_back_target_type?: string
          demurrage_exempt?: boolean
          dismissed_hints?: string[]
          email?: string
          featured_order?: number | null
          feedpoint_default_guilds?: boolean
          feedpoint_default_partner_entities?: boolean
          feedpoint_default_posts?: boolean
          feedpoint_default_quests?: boolean
          feedpoint_default_services?: boolean
          filter_by_houses?: boolean
          governance_weight?: number
          has_completed_onboarding?: boolean
          headline?: string | null
          id?: string
          instagram_url?: string | null
          is_cooperative_member?: boolean
          last_demurrage_at?: string | null
          last_milestone_popup_at?: string | null
          last_xp_recalculated_at?: string | null
          lifetime_credits_earned?: number
          lifetime_credits_faded?: number
          lifetime_credits_spent?: number
          linkedin_url?: string | null
          location?: string | null
          maker_xp?: number
          milestone_popups_enabled?: boolean
          name?: string
          path_step?: number | null
          persona_confidence?: number | null
          persona_source?: string | null
          persona_type?: string
          preferred_language?: string
          public_visibility?: string
          pulse_nudge_sent?: boolean
          resource_catalyst_xp?: number
          role?: string
          stewardship_xp?: number
          stripe_account_id?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_onboarded?: boolean
          stripe_onboarding_complete?: boolean
          tech_commons_xp?: number
          total_shares_a?: number
          total_shares_b?: number
          trust_xp_granted_this_month?: number
          trust_xp_month_key?: string
          twitter_url?: string | null
          updated_at?: string
          user_id: string
          web_scopes?: string[]
          web_tags?: string[]
          website_url?: string | null
          xp?: number
          xp_level?: number
          xp_pending?: number
          xp_recent_12m?: number
          xp_total?: number
        }
        Update: {
          allow_wall_comments?: boolean
          avatar_url?: string | null
          bio?: string | null
          biopoints_balance?: number
          coins_balance?: number
          community_xp?: number
          contribution_index?: number
          created_at?: string
          credits_balance?: number
          ctg_balance?: number
          current_path?: string | null
          current_plan_code?: string | null
          default_give_back_guild_id?: string | null
          default_give_back_target_type?: string
          demurrage_exempt?: boolean
          dismissed_hints?: string[]
          email?: string
          featured_order?: number | null
          feedpoint_default_guilds?: boolean
          feedpoint_default_partner_entities?: boolean
          feedpoint_default_posts?: boolean
          feedpoint_default_quests?: boolean
          feedpoint_default_services?: boolean
          filter_by_houses?: boolean
          governance_weight?: number
          has_completed_onboarding?: boolean
          headline?: string | null
          id?: string
          instagram_url?: string | null
          is_cooperative_member?: boolean
          last_demurrage_at?: string | null
          last_milestone_popup_at?: string | null
          last_xp_recalculated_at?: string | null
          lifetime_credits_earned?: number
          lifetime_credits_faded?: number
          lifetime_credits_spent?: number
          linkedin_url?: string | null
          location?: string | null
          maker_xp?: number
          milestone_popups_enabled?: boolean
          name?: string
          path_step?: number | null
          persona_confidence?: number | null
          persona_source?: string | null
          persona_type?: string
          preferred_language?: string
          public_visibility?: string
          pulse_nudge_sent?: boolean
          resource_catalyst_xp?: number
          role?: string
          stewardship_xp?: number
          stripe_account_id?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_onboarded?: boolean
          stripe_onboarding_complete?: boolean
          tech_commons_xp?: number
          total_shares_a?: number
          total_shares_b?: number
          trust_xp_granted_this_month?: number
          trust_xp_month_key?: string
          twitter_url?: string | null
          updated_at?: string
          user_id?: string
          web_scopes?: string[]
          web_tags?: string[]
          website_url?: string | null
          xp?: number
          xp_level?: number
          xp_pending?: number
          xp_recent_12m?: number
          xp_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_give_back_guild_id_fkey"
            columns: ["default_give_back_guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_affiliations: {
        Row: {
          created_at: string
          created_by_user_id: string
          entity_id: string
          entity_type: string
          id: string
          quest_id: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          entity_id: string
          entity_type: string
          id?: string
          quest_id: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
          quest_id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_affiliations_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_campaigns: {
        Row: {
          created_at: string
          created_by_user_id: string
          currency: string
          goal_amount: number
          id: string
          quest_id: string
          raised_amount: number
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          currency?: string
          goal_amount?: number
          id?: string
          quest_id: string
          raised_amount?: number
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          currency?: string
          goal_amount?: number
          id?: string
          quest_id?: string
          raised_amount?: number
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_campaigns_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_email_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by_user_id: string
          quest_id: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by_user_id: string
          quest_id: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by_user_id?: string
          quest_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_email_invites_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_funding: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          funder_user_id: string | null
          id: string
          quest_id: string
          refunded_at: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string | null
          funder_user_id?: string | null
          id?: string
          quest_id: string
          refunded_at?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          funder_user_id?: string | null
          id?: string
          quest_id?: string
          refunded_at?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_funding_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_hosts: {
        Row: {
          created_at: string
          created_by_user_id: string
          entity_id: string
          entity_type: string
          id: string
          quest_id: string
          role: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          entity_id: string
          entity_type: string
          id?: string
          quest_id: string
          role?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
          quest_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_hosts_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_needs: {
        Row: {
          category: string | null
          created_at: string
          created_by_user_id: string
          description: string | null
          id: string
          quest_id: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by_user_id: string
          description?: string | null
          id?: string
          quest_id: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          id?: string
          quest_id?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_needs_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_participants: {
        Row: {
          created_at: string
          id: string
          quest_id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quest_id: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quest_id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_participants_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_proposal_upvotes: {
        Row: {
          created_at: string
          id: string
          proposal_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proposal_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proposal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_proposal_upvotes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "quest_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_proposals: {
        Row: {
          created_at: string
          description: string | null
          id: string
          proposer_id: string
          proposer_type: string
          quest_id: string
          requested_credits: number
          requested_currency: string | null
          requested_fiat: number | null
          status: string
          title: string
          updated_at: string
          upvotes_count: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          proposer_id: string
          proposer_type?: string
          quest_id: string
          requested_credits?: number
          requested_currency?: string | null
          requested_fiat?: number | null
          status?: string
          title: string
          updated_at?: string
          upvotes_count?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          proposer_id?: string
          proposer_type?: string
          quest_id?: string
          requested_credits?: number
          requested_currency?: string | null
          requested_fiat?: number | null
          status?: string
          title?: string
          updated_at?: string
          upvotes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "quest_proposals_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_subtasks: {
        Row: {
          assignee_user_id: string | null
          completed_at: string | null
          completed_by_user_id: string | null
          contribution_weight: number
          created_at: string
          credit_reward: number | null
          description: string | null
          due_date: string | null
          estimated_minutes: number | null
          evidence_url: string | null
          id: string
          order_index: number
          priority: string
          quest_id: string
          status: string
          title: string
          updated_at: string
          xp_reward: number | null
        }
        Insert: {
          assignee_user_id?: string | null
          completed_at?: string | null
          completed_by_user_id?: string | null
          contribution_weight?: number
          created_at?: string
          credit_reward?: number | null
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          evidence_url?: string | null
          id?: string
          order_index?: number
          priority?: string
          quest_id: string
          status?: string
          title: string
          updated_at?: string
          xp_reward?: number | null
        }
        Update: {
          assignee_user_id?: string | null
          completed_at?: string | null
          completed_by_user_id?: string | null
          contribution_weight?: number
          created_at?: string
          credit_reward?: number | null
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          evidence_url?: string | null
          id?: string
          order_index?: number
          priority?: string
          quest_id?: string
          status?: string
          title?: string
          updated_at?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quest_subtasks_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_territories: {
        Row: {
          id: string
          is_primary: boolean
          quest_id: string
          relation_type: string
          territory_id: string
        }
        Insert: {
          id?: string
          is_primary?: boolean
          quest_id: string
          relation_type?: string
          territory_id: string
        }
        Update: {
          id?: string
          is_primary?: boolean
          quest_id?: string
          relation_type?: string
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
      quest_updates: {
        Row: {
          author_id: string
          comments_enabled: boolean
          content: string | null
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          is_draft: boolean
          pinned: boolean
          quest_id: string
          title: string
          type: string
          updated_at: string
          visibility: string
        }
        Insert: {
          author_id: string
          comments_enabled?: boolean
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_draft?: boolean
          pinned?: boolean
          quest_id: string
          title: string
          type?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_id?: string
          comments_enabled?: boolean
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_draft?: boolean
          pinned?: boolean
          quest_id?: string
          title?: string
          type?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_updates_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_value_pie_log: {
        Row: {
          coins_awarded: number
          contributor_id: string
          created_at: string
          id: string
          quest_id: string
          share_percent: number
          weighted_units: number
        }
        Insert: {
          coins_awarded?: number
          contributor_id: string
          created_at?: string
          id?: string
          quest_id: string
          share_percent?: number
          weighted_units?: number
        }
        Update: {
          coins_awarded?: number
          contributor_id?: string
          created_at?: string
          id?: string
          quest_id?: string
          share_percent?: number
          weighted_units?: number
        }
        Relationships: []
      }
      quests: {
        Row: {
          allow_fundraising: boolean
          boost_expires_at: string | null
          coin_budget: number
          coin_escrow: number
          coin_escrow_status: string
          company_id: string | null
          cover_focal_y: number
          cover_image_url: string | null
          created_at: string
          created_by_user_id: string
          credit_budget: number
          credit_reward: number
          deleted_at: string | null
          description: string | null
          eco_category: Database["public"]["Enums"]["eco_category"] | null
          escrow_credits: number
          featured_order: number | null
          features_config: Json
          funding_goal_credits: number | null
          funding_type: string
          fundraising_cancelled: boolean
          guild_id: string | null
          id: string
          is_boosted: boolean
          is_deleted: boolean
          is_draft: boolean
          is_featured: boolean
          mission_budget_max: number | null
          mission_budget_min: number | null
          monetization_type: Database["public"]["Enums"]["monetization_type"]
          natural_system_id: string | null
          otg_edges_created: boolean
          owner_id: string | null
          owner_type: string
          payment_type: string
          payout_user_id: string | null
          price_currency: string
          price_fiat: number
          priority: string
          public_visibility: string
          quest_nature: string | null
          reward_currency: string
          reward_xp: number
          status: Database["public"]["Enums"]["quest_status"]
          title: string
          universe_visibility: string
          updated_at: string
          value_pie_calculated: boolean | null
          web_scopes: string[] | null
          web_tags: string[] | null
          web_visibility_override: string
          website_url: string | null
        }
        Insert: {
          allow_fundraising?: boolean
          boost_expires_at?: string | null
          coin_budget?: number
          coin_escrow?: number
          coin_escrow_status?: string
          company_id?: string | null
          cover_focal_y?: number
          cover_image_url?: string | null
          created_at?: string
          created_by_user_id: string
          credit_budget?: number
          credit_reward?: number
          deleted_at?: string | null
          description?: string | null
          eco_category?: Database["public"]["Enums"]["eco_category"] | null
          escrow_credits?: number
          featured_order?: number | null
          features_config?: Json
          funding_goal_credits?: number | null
          funding_type?: string
          fundraising_cancelled?: boolean
          guild_id?: string | null
          id?: string
          is_boosted?: boolean
          is_deleted?: boolean
          is_draft?: boolean
          is_featured?: boolean
          mission_budget_max?: number | null
          mission_budget_min?: number | null
          monetization_type?: Database["public"]["Enums"]["monetization_type"]
          natural_system_id?: string | null
          otg_edges_created?: boolean
          owner_id?: string | null
          owner_type?: string
          payment_type?: string
          payout_user_id?: string | null
          price_currency?: string
          price_fiat?: number
          priority?: string
          public_visibility?: string
          quest_nature?: string | null
          reward_currency?: string
          reward_xp?: number
          status?: Database["public"]["Enums"]["quest_status"]
          title: string
          universe_visibility?: string
          updated_at?: string
          value_pie_calculated?: boolean | null
          web_scopes?: string[] | null
          web_tags?: string[] | null
          web_visibility_override?: string
          website_url?: string | null
        }
        Update: {
          allow_fundraising?: boolean
          boost_expires_at?: string | null
          coin_budget?: number
          coin_escrow?: number
          coin_escrow_status?: string
          company_id?: string | null
          cover_focal_y?: number
          cover_image_url?: string | null
          created_at?: string
          created_by_user_id?: string
          credit_budget?: number
          credit_reward?: number
          deleted_at?: string | null
          description?: string | null
          eco_category?: Database["public"]["Enums"]["eco_category"] | null
          escrow_credits?: number
          featured_order?: number | null
          features_config?: Json
          funding_goal_credits?: number | null
          funding_type?: string
          fundraising_cancelled?: boolean
          guild_id?: string | null
          id?: string
          is_boosted?: boolean
          is_deleted?: boolean
          is_draft?: boolean
          is_featured?: boolean
          mission_budget_max?: number | null
          mission_budget_min?: number | null
          monetization_type?: Database["public"]["Enums"]["monetization_type"]
          natural_system_id?: string | null
          otg_edges_created?: boolean
          owner_id?: string | null
          owner_type?: string
          payment_type?: string
          payout_user_id?: string | null
          price_currency?: string
          price_fiat?: number
          priority?: string
          public_visibility?: string
          quest_nature?: string | null
          reward_currency?: string
          reward_xp?: number
          status?: Database["public"]["Enums"]["quest_status"]
          title?: string
          universe_visibility?: string
          updated_at?: string
          value_pie_calculated?: boolean | null
          web_scopes?: string[] | null
          web_tags?: string[] | null
          web_visibility_override?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_natural_system_id_fkey"
            columns: ["natural_system_id"]
            isOneToOne: false
            referencedRelation: "natural_systems"
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
      referrals: {
        Row: {
          bonus_xp: number
          code: string
          created_at: string
          id: string
          is_used: boolean
          owner_user_id: string
          used_by_user_id: string | null
        }
        Insert: {
          bonus_xp?: number
          code: string
          created_at?: string
          id?: string
          is_used?: boolean
          owner_user_id: string
          used_by_user_id?: string | null
        }
        Update: {
          bonus_xp?: number
          code?: string
          created_at?: string
          id?: string
          is_used?: boolean
          owner_user_id?: string
          used_by_user_id?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reporter_id: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      revenue_share_records: {
        Row: {
          amount: number
          beneficiary_id: string | null
          beneficiary_type: Database["public"]["Enums"]["billing_entity_type"]
          created_at: string
          id: string
          usage_record_id: string
        }
        Insert: {
          amount?: number
          beneficiary_id?: string | null
          beneficiary_type: Database["public"]["Enums"]["billing_entity_type"]
          created_at?: string
          id?: string
          usage_record_id: string
        }
        Update: {
          amount?: number
          beneficiary_id?: string | null
          beneficiary_type?: Database["public"]["Enums"]["billing_entity_type"]
          created_at?: string
          id?: string
          usage_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_share_records_usage_record_id_fkey"
            columns: ["usage_record_id"]
            isOneToOne: false
            referencedRelation: "agent_usage_records"
            referencedColumns: ["id"]
          },
        ]
      }
      ritual_attendees: {
        Row: {
          id: string
          joined_at: string
          occurrence_id: string
          role: string
          status: string
          user_id: string
          xp_granted: boolean
        }
        Insert: {
          id?: string
          joined_at?: string
          occurrence_id: string
          role?: string
          status?: string
          user_id: string
          xp_granted?: boolean
        }
        Update: {
          id?: string
          joined_at?: string
          occurrence_id?: string
          role?: string
          status?: string
          user_id?: string
          xp_granted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ritual_attendees_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "ritual_occurrences"
            referencedColumns: ["id"]
          },
        ]
      }
      ritual_occurrences: {
        Row: {
          created_at: string
          decisions: Json | null
          ended_at: string | null
          id: string
          notes: string | null
          quests_created: string[] | null
          ritual_id: string
          scheduled_at: string
          status: string
          updated_at: string
          visio_link: string | null
        }
        Insert: {
          created_at?: string
          decisions?: Json | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          quests_created?: string[] | null
          ritual_id: string
          scheduled_at: string
          status?: string
          updated_at?: string
          visio_link?: string | null
        }
        Update: {
          created_at?: string
          decisions?: Json | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          quests_created?: string[] | null
          ritual_id?: string
          scheduled_at?: string
          status?: string
          updated_at?: string
          visio_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ritual_occurrences_ritual_id_fkey"
            columns: ["ritual_id"]
            isOneToOne: false
            referencedRelation: "rituals"
            referencedColumns: ["id"]
          },
        ]
      }
      rituals: {
        Row: {
          access_roles: string[] | null
          access_type: Database["public"]["Enums"]["ritual_access_type"]
          archive_visibility: string
          created_at: string
          created_by_user_id: string
          credit_reward: number | null
          custom_cron: string | null
          default_visio_link: string | null
          description: string | null
          duration_minutes: number
          facilitator_xp_bonus: number
          frequency: Database["public"]["Enums"]["ritual_frequency"]
          guild_id: string
          id: string
          is_active: boolean
          min_share_class: string | null
          min_xp: number | null
          next_occurrence: string | null
          program_segments: Json | null
          quest_id: string | null
          recording_enabled: boolean
          session_type: Database["public"]["Enums"]["ritual_session_type"]
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          access_roles?: string[] | null
          access_type?: Database["public"]["Enums"]["ritual_access_type"]
          archive_visibility?: string
          created_at?: string
          created_by_user_id: string
          credit_reward?: number | null
          custom_cron?: string | null
          default_visio_link?: string | null
          description?: string | null
          duration_minutes?: number
          facilitator_xp_bonus?: number
          frequency?: Database["public"]["Enums"]["ritual_frequency"]
          guild_id: string
          id?: string
          is_active?: boolean
          min_share_class?: string | null
          min_xp?: number | null
          next_occurrence?: string | null
          program_segments?: Json | null
          quest_id?: string | null
          recording_enabled?: boolean
          session_type?: Database["public"]["Enums"]["ritual_session_type"]
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          access_roles?: string[] | null
          access_type?: Database["public"]["Enums"]["ritual_access_type"]
          archive_visibility?: string
          created_at?: string
          created_by_user_id?: string
          credit_reward?: number | null
          custom_cron?: string | null
          default_visio_link?: string | null
          description?: string | null
          duration_minutes?: number
          facilitator_xp_bonus?: number
          frequency?: Database["public"]["Enums"]["ritual_frequency"]
          guild_id?: string
          id?: string
          is_active?: boolean
          min_share_class?: string | null
          min_xp?: number | null
          next_occurrence?: string | null
          program_segments?: Json | null
          quest_id?: string | null
          recording_enabled?: boolean
          session_type?: Database["public"]["Enums"]["ritual_session_type"]
          title?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "rituals_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rituals_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_territories: {
        Row: {
          id: string
          is_primary: boolean
          relation_type: string
          service_id: string
          territory_id: string
        }
        Insert: {
          id?: string
          is_primary?: boolean
          relation_type?: string
          service_id: string
          territory_id: string
        }
        Update: {
          id?: string
          is_primary?: boolean
          relation_type?: string
          service_id?: string
          territory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_territories_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_territories_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      service_topics: {
        Row: {
          id: string
          service_id: string
          topic_id: string
        }
        Insert: {
          id?: string
          service_id: string
          topic_id: string
        }
        Update: {
          id?: string
          service_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_topics_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          boost_expires_at: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          duration_minutes: number | null
          featured_order: number | null
          id: string
          image_url: string | null
          is_active: boolean
          is_boosted: boolean
          is_deleted: boolean
          is_draft: boolean
          location_text: string | null
          location_type: string
          online_location_type: string | null
          online_location_url_template: string | null
          owner_id: string | null
          owner_type: string
          price_amount: number | null
          price_currency: string
          provider_guild_id: string | null
          provider_user_id: string | null
          public_visibility: string
          service_type: string
          stripe_price_id: string | null
          title: string
          universe_visibility: string
          updated_at: string
          web_scopes: string[] | null
          web_tags: string[] | null
          web_visibility_override: string
        }
        Insert: {
          boost_expires_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          featured_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_boosted?: boolean
          is_deleted?: boolean
          is_draft?: boolean
          location_text?: string | null
          location_type?: string
          online_location_type?: string | null
          online_location_url_template?: string | null
          owner_id?: string | null
          owner_type?: string
          price_amount?: number | null
          price_currency?: string
          provider_guild_id?: string | null
          provider_user_id?: string | null
          public_visibility?: string
          service_type?: string
          stripe_price_id?: string | null
          title: string
          universe_visibility?: string
          updated_at?: string
          web_scopes?: string[] | null
          web_tags?: string[] | null
          web_visibility_override?: string
        }
        Update: {
          boost_expires_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          featured_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_boosted?: boolean
          is_deleted?: boolean
          is_draft?: boolean
          location_text?: string | null
          location_type?: string
          online_location_type?: string | null
          online_location_url_template?: string | null
          owner_id?: string | null
          owner_type?: string
          price_amount?: number | null
          price_currency?: string
          provider_guild_id?: string | null
          provider_user_id?: string | null
          public_visibility?: string
          service_type?: string
          stripe_price_id?: string | null
          title?: string
          universe_visibility?: string
          updated_at?: string
          web_scopes?: string[] | null
          web_tags?: string[] | null
          web_visibility_override?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_provider_guild_id_fkey"
            columns: ["provider_guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      shareholdings: {
        Row: {
          created_at: string
          id: string
          number_of_shares: number
          purchase_price_per_share: number
          share_class: string
          stripe_payment_intent_id: string | null
          total_paid: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          number_of_shares?: number
          purchase_price_per_share?: number
          share_class: string
          stripe_payment_intent_id?: string | null
          total_paid: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          number_of_shares?: number
          purchase_price_per_share?: number
          share_class?: string
          stripe_payment_intent_id?: string | null
          total_paid?: number
          user_id?: string
        }
        Relationships: []
      }
      site_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          owner_id: string
          owner_type: string
          revoked: boolean
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          owner_id: string
          owner_type: string
          revoked?: boolean
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          owner_id?: string
          owner_type?: string
          revoked?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      starred_excerpt_reports: {
        Row: {
          created_at: string
          custom_reason: string | null
          excerpt_id: string
          id: string
          reason: string
          reported_by_user_id: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          custom_reason?: string | null
          excerpt_id: string
          id?: string
          reason: string
          reported_by_user_id: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          custom_reason?: string | null
          excerpt_id?: string
          id?: string
          reason?: string
          reported_by_user_id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "starred_excerpt_reports_excerpt_id_fkey"
            columns: ["excerpt_id"]
            isOneToOne: false
            referencedRelation: "starred_excerpts"
            referencedColumns: ["id"]
          },
        ]
      }
      starred_excerpt_upvotes: {
        Row: {
          created_at: string
          excerpt_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          excerpt_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          excerpt_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "starred_excerpt_upvotes_excerpt_id_fkey"
            columns: ["excerpt_id"]
            isOneToOne: false
            referencedRelation: "starred_excerpts"
            referencedColumns: ["id"]
          },
        ]
      }
      starred_excerpts: {
        Row: {
          created_at: string
          created_by_user_id: string
          deleted_at: string | null
          excerpt_text: string
          id: string
          is_deleted: boolean
          is_from_agent: boolean
          message_id: string
          tags: Json | null
          thread_id: string
          title: string | null
          upvotes_count: number
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          deleted_at?: string | null
          excerpt_text: string
          id?: string
          is_deleted?: boolean
          is_from_agent?: boolean
          message_id: string
          tags?: Json | null
          thread_id: string
          title?: string | null
          upvotes_count?: number
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          deleted_at?: string | null
          excerpt_text?: string
          id?: string
          is_deleted?: boolean
          is_from_agent?: boolean
          message_id?: string
          tags?: Json | null
          thread_id?: string
          title?: string | null
          upvotes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "starred_excerpts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "unit_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "starred_excerpts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "unit_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      stewardship_requests: {
        Row: {
          created_at: string
          id: string
          note: string | null
          requester_user_id: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: string
          territory_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          requester_user_id: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          territory_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          requester_user_id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          territory_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stewardship_requests_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          ai_agents_enabled: boolean | null
          ai_muse_mode: string
          broadcast_enabled: boolean | null
          can_create_company: boolean
          can_create_territory: boolean | null
          code: string
          commission_discount_percentage: number
          created_at: string
          custom_guild_tools: boolean
          description: string | null
          free_quests_per_week: number
          fundraising_tools_enabled: boolean | null
          id: string
          is_public: boolean
          marketplace_fee_percent: number | null
          max_attachment_size_mb: number | null
          max_courses: number | null
          max_guild_memberships: number | null
          max_pods: number | null
          max_services_active: number | null
          max_territories: number | null
          memory_engine_enabled: boolean | null
          monthly_included_credits: number
          monthly_price_amount: number | null
          monthly_price_currency: string
          name: string
          partnership_proposals_enabled: boolean | null
          stripe_price_id: string | null
          territory_intelligence_enabled: boolean | null
          updated_at: string
          visibility_ranking: string
          xp_multiplier: number
        }
        Insert: {
          ai_agents_enabled?: boolean | null
          ai_muse_mode?: string
          broadcast_enabled?: boolean | null
          can_create_company?: boolean
          can_create_territory?: boolean | null
          code: string
          commission_discount_percentage?: number
          created_at?: string
          custom_guild_tools?: boolean
          description?: string | null
          free_quests_per_week?: number
          fundraising_tools_enabled?: boolean | null
          id?: string
          is_public?: boolean
          marketplace_fee_percent?: number | null
          max_attachment_size_mb?: number | null
          max_courses?: number | null
          max_guild_memberships?: number | null
          max_pods?: number | null
          max_services_active?: number | null
          max_territories?: number | null
          memory_engine_enabled?: boolean | null
          monthly_included_credits?: number
          monthly_price_amount?: number | null
          monthly_price_currency?: string
          name: string
          partnership_proposals_enabled?: boolean | null
          stripe_price_id?: string | null
          territory_intelligence_enabled?: boolean | null
          updated_at?: string
          visibility_ranking?: string
          xp_multiplier?: number
        }
        Update: {
          ai_agents_enabled?: boolean | null
          ai_muse_mode?: string
          broadcast_enabled?: boolean | null
          can_create_company?: boolean
          can_create_territory?: boolean | null
          code?: string
          commission_discount_percentage?: number
          created_at?: string
          custom_guild_tools?: boolean
          description?: string | null
          free_quests_per_week?: number
          fundraising_tools_enabled?: boolean | null
          id?: string
          is_public?: boolean
          marketplace_fee_percent?: number | null
          max_attachment_size_mb?: number | null
          max_courses?: number | null
          max_guild_memberships?: number | null
          max_pods?: number | null
          max_services_active?: number | null
          max_territories?: number | null
          memory_engine_enabled?: boolean | null
          monthly_included_credits?: number
          monthly_price_amount?: number | null
          monthly_price_currency?: string
          name?: string
          partnership_proposals_enabled?: boolean | null
          stripe_price_id?: string | null
          territory_intelligence_enabled?: boolean | null
          updated_at?: string
          visibility_ranking?: string
          xp_multiplier?: number
        }
        Relationships: []
      }
      task_assignees: {
        Row: {
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "personal_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      territories: {
        Row: {
          allow_agent_crawling: boolean
          allow_agent_subscription: boolean
          auto_expand_perimeter: boolean
          coins_balance: number
          created_at: string
          created_by_user_id: string | null
          custom_perimeter_name: string | null
          deleted_at: string | null
          featured_order: number | null
          feedpoint_default_guilds: boolean
          feedpoint_default_partner_entities: boolean
          feedpoint_default_posts: boolean
          feedpoint_default_quests: boolean
          feedpoint_default_services: boolean
          gameb_tokens_balance: number
          geojson: Json | null
          granularity:
            | Database["public"]["Enums"]["territorial_granularity"]
            | null
          id: string
          is_deleted: boolean
          latitude: number | null
          level: Database["public"]["Enums"]["territory_level"]
          longitude: number | null
          name: string
          parent_id: string | null
          precision_level: Database["public"]["Enums"]["territorial_precision_level"]
          public_visibility: string
          slug: string | null
          stats: Json | null
          summary: string | null
          updated_at: string
          value_factor: number
          web_scopes: string[]
          web_tags: string[]
        }
        Insert: {
          allow_agent_crawling?: boolean
          allow_agent_subscription?: boolean
          auto_expand_perimeter?: boolean
          coins_balance?: number
          created_at?: string
          created_by_user_id?: string | null
          custom_perimeter_name?: string | null
          deleted_at?: string | null
          featured_order?: number | null
          feedpoint_default_guilds?: boolean
          feedpoint_default_partner_entities?: boolean
          feedpoint_default_posts?: boolean
          feedpoint_default_quests?: boolean
          feedpoint_default_services?: boolean
          gameb_tokens_balance?: number
          geojson?: Json | null
          granularity?:
            | Database["public"]["Enums"]["territorial_granularity"]
            | null
          id?: string
          is_deleted?: boolean
          latitude?: number | null
          level?: Database["public"]["Enums"]["territory_level"]
          longitude?: number | null
          name: string
          parent_id?: string | null
          precision_level?: Database["public"]["Enums"]["territorial_precision_level"]
          public_visibility?: string
          slug?: string | null
          stats?: Json | null
          summary?: string | null
          updated_at?: string
          value_factor?: number
          web_scopes?: string[]
          web_tags?: string[]
        }
        Update: {
          allow_agent_crawling?: boolean
          allow_agent_subscription?: boolean
          auto_expand_perimeter?: boolean
          coins_balance?: number
          created_at?: string
          created_by_user_id?: string | null
          custom_perimeter_name?: string | null
          deleted_at?: string | null
          featured_order?: number | null
          feedpoint_default_guilds?: boolean
          feedpoint_default_partner_entities?: boolean
          feedpoint_default_posts?: boolean
          feedpoint_default_quests?: boolean
          feedpoint_default_services?: boolean
          gameb_tokens_balance?: number
          geojson?: Json | null
          granularity?:
            | Database["public"]["Enums"]["territorial_granularity"]
            | null
          id?: string
          is_deleted?: boolean
          latitude?: number | null
          level?: Database["public"]["Enums"]["territory_level"]
          longitude?: number | null
          name?: string
          parent_id?: string | null
          precision_level?: Database["public"]["Enums"]["territorial_precision_level"]
          public_visibility?: string
          slug?: string | null
          stats?: Json | null
          summary?: string | null
          updated_at?: string
          value_factor?: number
          web_scopes?: string[]
          web_tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "territories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_chat_logs: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          created_at: string
          id: string
          is_knowledge_contribution: boolean
          linked_memory_entry_id: string | null
          message_role: string
          territory_id: string
          user_id: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string
          id?: string
          is_knowledge_contribution?: boolean
          linked_memory_entry_id?: string | null
          message_role: string
          territory_id: string
          user_id?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          id?: string
          is_knowledge_contribution?: boolean
          linked_memory_entry_id?: string | null
          message_role?: string
          territory_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "territory_chat_logs_linked_memory_entry_id_fkey"
            columns: ["linked_memory_entry_id"]
            isOneToOne: false
            referencedRelation: "territory_memory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_chat_logs_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_closure: {
        Row: {
          ancestor_id: string
          depth: number
          descendant_id: string
        }
        Insert: {
          ancestor_id: string
          depth?: number
          descendant_id: string
        }
        Update: {
          ancestor_id?: string
          depth?: number
          descendant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_closure_ancestor_id_fkey"
            columns: ["ancestor_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_closure_descendant_id_fkey"
            columns: ["descendant_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_dataset_matches: {
        Row: {
          created_at: string
          dataset_id: string
          fetched_summary: Json | null
          id: string
          is_active: boolean
          last_fetched_at: string | null
          match_level: string
          matched_granularity: string
          territory_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dataset_id: string
          fetched_summary?: Json | null
          id?: string
          is_active?: boolean
          last_fetched_at?: string | null
          match_level?: string
          matched_granularity: string
          territory_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dataset_id?: string
          fetched_summary?: Json | null
          id?: string
          is_active?: boolean
          last_fetched_at?: string | null
          match_level?: string
          matched_granularity?: string
          territory_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_dataset_matches_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "environmental_datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_dataset_matches_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_excerpt_reports: {
        Row: {
          created_at: string
          custom_reason: string | null
          excerpt_id: string
          id: string
          reason: string
          reported_by_user_id: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          custom_reason?: string | null
          excerpt_id: string
          id?: string
          reason: string
          reported_by_user_id: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          custom_reason?: string | null
          excerpt_id?: string
          id?: string
          reason?: string
          reported_by_user_id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_excerpt_reports_excerpt_id_fkey"
            columns: ["excerpt_id"]
            isOneToOne: false
            referencedRelation: "territory_excerpts"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_excerpt_upvotes: {
        Row: {
          created_at: string
          excerpt_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          excerpt_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          excerpt_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_excerpt_upvotes_excerpt_id_fkey"
            columns: ["excerpt_id"]
            isOneToOne: false
            referencedRelation: "territory_excerpts"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_excerpts: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          id: string
          is_deleted: boolean
          source_chat_log_id: string | null
          source_event_id: string | null
          source_memory_entry_id: string | null
          source_prompt: string | null
          source_quest_id: string | null
          synthesis: string | null
          territory_id: string
          text: string
          updated_at: string
          upvote_count: number
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          source_chat_log_id?: string | null
          source_event_id?: string | null
          source_memory_entry_id?: string | null
          source_prompt?: string | null
          source_quest_id?: string | null
          synthesis?: string | null
          territory_id: string
          text: string
          updated_at?: string
          upvote_count?: number
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          source_chat_log_id?: string | null
          source_event_id?: string | null
          source_memory_entry_id?: string | null
          source_prompt?: string | null
          source_quest_id?: string | null
          synthesis?: string | null
          territory_id?: string
          text?: string
          updated_at?: string
          upvote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "territory_excerpts_source_memory_entry_id_fkey"
            columns: ["source_memory_entry_id"]
            isOneToOne: false
            referencedRelation: "territory_memory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_excerpts_source_quest_id_fkey"
            columns: ["source_quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_excerpts_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_memory: {
        Row: {
          ai_score: number
          category: string
          content: string
          created_at: string
          created_by_user_id: string
          human_score: number | null
          id: string
          is_included_in_summary: boolean
          tags: string[] | null
          territory_id: string
          title: string
          updated_at: string
          used_in_last_summary_at: string | null
          visibility: string
        }
        Insert: {
          ai_score?: number
          category?: string
          content: string
          created_at?: string
          created_by_user_id: string
          human_score?: number | null
          id?: string
          is_included_in_summary?: boolean
          tags?: string[] | null
          territory_id: string
          title: string
          updated_at?: string
          used_in_last_summary_at?: string | null
          visibility?: string
        }
        Update: {
          ai_score?: number
          category?: string
          content?: string
          created_at?: string
          created_by_user_id?: string
          human_score?: number | null
          id?: string
          is_included_in_summary?: boolean
          tags?: string[] | null
          territory_id?: string
          title?: string
          updated_at?: string
          used_in_last_summary_at?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_memory_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_summaries: {
        Row: {
          based_on_memory_ids: Json | null
          content: string
          created_at: string
          generated_at: string
          generated_by: string
          id: string
          summary_type: string
          territory_id: string
          updated_at: string
        }
        Insert: {
          based_on_memory_ids?: Json | null
          content?: string
          created_at?: string
          generated_at?: string
          generated_by?: string
          id?: string
          summary_type?: string
          territory_id: string
          updated_at?: string
        }
        Update: {
          based_on_memory_ids?: Json | null
          content?: string
          created_at?: string
          generated_at?: string
          generated_by?: string
          id?: string
          summary_type?: string
          territory_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_summaries_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_token_flows: {
        Row: {
          amount: number
          created_at: string
          id: string
          quest_id: string | null
          territory_id: string
          type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          quest_id?: string | null
          territory_id: string
          type?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          quest_id?: string | null
          territory_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_token_flows_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_token_flows_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_features: {
        Row: {
          added_by_user_id: string
          created_at: string
          id: string
          target_id: string
          target_type: string
          topic_id: string
        }
        Insert: {
          added_by_user_id: string
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          topic_id: string
        }
        Update: {
          added_by_user_id?: string
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_features_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_stewards: {
        Row: {
          created_at: string
          id: string
          role: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_stewards_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_deleted: boolean
          name: string
          slug: string
          universe_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          slug: string
          universe_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          slug?: string
          universe_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      trust_edge_useful_marks: {
        Row: {
          created_at: string
          id: string
          trust_edge_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          trust_edge_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          trust_edge_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_edge_useful_marks_trust_edge_id_fkey"
            columns: ["trust_edge_id"]
            isOneToOne: false
            referencedRelation: "open_trust_edges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_edge_useful_marks_trust_edge_id_fkey"
            columns: ["trust_edge_id"]
            isOneToOne: false
            referencedRelation: "trust_edges"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_edges: {
        Row: {
          context_guild_id: string | null
          context_quest_id: string | null
          context_territory_id: string | null
          created_at: string
          created_by: string
          creator_credit_granted: boolean
          edge_type: Database["public"]["Enums"]["trust_edge_type"]
          evidence_url: string | null
          from_node_id: string
          from_node_type: Database["public"]["Enums"]["trust_node_type"]
          id: string
          last_confirmed_at: string | null
          mutual_credit_granted: boolean
          note: string | null
          renewal_credit_granted: boolean
          renewal_notified_at: string | null
          score: number
          status: Database["public"]["Enums"]["trust_status"]
          tags: string[] | null
          to_node_id: string
          to_node_type: Database["public"]["Enums"]["trust_node_type"]
          updated_at: string
          useful_credit_granted: boolean
          visibility: Database["public"]["Enums"]["trust_visibility"]
        }
        Insert: {
          context_guild_id?: string | null
          context_quest_id?: string | null
          context_territory_id?: string | null
          created_at?: string
          created_by: string
          creator_credit_granted?: boolean
          edge_type: Database["public"]["Enums"]["trust_edge_type"]
          evidence_url?: string | null
          from_node_id: string
          from_node_type: Database["public"]["Enums"]["trust_node_type"]
          id?: string
          last_confirmed_at?: string | null
          mutual_credit_granted?: boolean
          note?: string | null
          renewal_credit_granted?: boolean
          renewal_notified_at?: string | null
          score?: number
          status?: Database["public"]["Enums"]["trust_status"]
          tags?: string[] | null
          to_node_id: string
          to_node_type: Database["public"]["Enums"]["trust_node_type"]
          updated_at?: string
          useful_credit_granted?: boolean
          visibility?: Database["public"]["Enums"]["trust_visibility"]
        }
        Update: {
          context_guild_id?: string | null
          context_quest_id?: string | null
          context_territory_id?: string | null
          created_at?: string
          created_by?: string
          creator_credit_granted?: boolean
          edge_type?: Database["public"]["Enums"]["trust_edge_type"]
          evidence_url?: string | null
          from_node_id?: string
          from_node_type?: Database["public"]["Enums"]["trust_node_type"]
          id?: string
          last_confirmed_at?: string | null
          mutual_credit_granted?: boolean
          note?: string | null
          renewal_credit_granted?: boolean
          renewal_notified_at?: string | null
          score?: number
          status?: Database["public"]["Enums"]["trust_status"]
          tags?: string[] | null
          to_node_id?: string
          to_node_type?: Database["public"]["Enums"]["trust_node_type"]
          updated_at?: string
          useful_credit_granted?: boolean
          visibility?: Database["public"]["Enums"]["trust_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "trust_edges_context_guild_id_fkey"
            columns: ["context_guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_edges_context_quest_id_fkey"
            columns: ["context_quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_edges_context_territory_id_fkey"
            columns: ["context_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_agents: {
        Row: {
          admitted_at: string
          admitted_by_user_id: string
          agent_id: string
          id: string
          is_active: boolean
          unit_id: string
          unit_type: string
        }
        Insert: {
          admitted_at?: string
          admitted_by_user_id: string
          agent_id: string
          id?: string
          is_active?: boolean
          unit_id: string
          unit_type: string
        }
        Update: {
          admitted_at?: string
          admitted_by_user_id?: string
          agent_id?: string
          id?: string
          is_active?: boolean
          unit_id?: string
          unit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_availability: {
        Row: {
          availability_mode: string
          created_at: string
          exceptions: Json
          id: string
          max_bookings_per_day: number | null
          unit_id: string
          unit_type: string
          updated_at: string
          weekly_schedule: Json
        }
        Insert: {
          availability_mode?: string
          created_at?: string
          exceptions?: Json
          id?: string
          max_bookings_per_day?: number | null
          unit_id: string
          unit_type: string
          updated_at?: string
          weekly_schedule?: Json
        }
        Update: {
          availability_mode?: string
          created_at?: string
          exceptions?: Json
          id?: string
          max_bookings_per_day?: number | null
          unit_id?: string
          unit_type?: string
          updated_at?: string
          weekly_schedule?: Json
        }
        Relationships: []
      }
      unit_chat_messages: {
        Row: {
          created_at: string
          id: string
          message_text: string
          metadata_json: Json | null
          sender_type: string
          sender_user_id: string | null
          thread_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_text: string
          metadata_json?: Json | null
          sender_type?: string
          sender_user_id?: string | null
          thread_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_text?: string
          metadata_json?: Json | null
          sender_type?: string
          sender_user_id?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "unit_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_chat_threads: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      unit_credit_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by_user_id: string
          id: string
          note: string | null
          quest_id: string | null
          type: string
          unit_id: string
          unit_type: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by_user_id: string
          id?: string
          note?: string | null
          quest_id?: string | null
          type: string
          unit_id: string
          unit_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by_user_id?: string
          id?: string
          note?: string | null
          quest_id?: string | null
          type?: string
          unit_id?: string
          unit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_credit_transactions_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_guild_memberships: {
        Row: {
          guild_id: string
          id: string
          joined_at: string
          membership_expires_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          guild_id: string
          id?: string
          joined_at?: string
          membership_expires_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          guild_id?: string
          id?: string
          joined_at?: string
          membership_expires_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_guild_memberships_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      user_milestones: {
        Row: {
          acknowledged_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          milestone_id: string
          reward_delivered: boolean
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          milestone_id: string
          reward_delivered?: boolean
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          milestone_id?: string
          reward_delivered?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_milestones_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
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
      user_spoken_languages: {
        Row: {
          created_at: string
          id: string
          language_code: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language_code: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language_code?: string
          sort_order?: number
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
      user_tab_preferences: {
        Row: {
          created_at: string
          id: string
          tab_order: string[]
          updated_at: string
          user_id: string
          view_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          tab_order?: string[]
          updated_at?: string
          user_id: string
          view_key: string
        }
        Update: {
          created_at?: string
          id?: string
          tab_order?: string[]
          updated_at?: string
          user_id?: string
          view_key?: string
        }
        Relationships: []
      }
      user_territories: {
        Row: {
          attachment_type: string
          id: string
          is_primary: boolean
          territory_id: string
          user_id: string
        }
        Insert: {
          attachment_type?: string
          id?: string
          is_primary?: boolean
          territory_id: string
          user_id: string
        }
        Update: {
          attachment_type?: string
          id?: string
          is_primary?: boolean
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
      user_work_items: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          today_goal_at: string | null
          updated_at: string
          user_id: string
          work_state: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          today_goal_at?: string | null
          updated_at?: string
          user_id: string
          work_state?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          today_goal_at?: string | null
          updated_at?: string
          user_id?: string
          work_state?: string
        }
        Relationships: []
      }
      vision_bank: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          created_at: string
          guild_id: string | null
          id: string
          seasonal_relevance: string | null
          status: string
          tags: string[]
          territory_id: string | null
          user_id: string
          visibility: string
          vision_text: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          guild_id?: string | null
          id?: string
          seasonal_relevance?: string | null
          status?: string
          tags?: string[]
          territory_id?: string | null
          user_id: string
          visibility?: string
          vision_text: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          guild_id?: string | null
          id?: string
          seasonal_relevance?: string | null
          status?: string
          tags?: string[]
          territory_id?: string | null
          user_id?: string
          visibility?: string
          vision_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "vision_bank_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vision_bank_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      website_pages: {
        Row: {
          created_at: string
          id: string
          page_type: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
          website_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_type?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
          website_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_type?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_pages_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      website_sections: {
        Row: {
          body_markdown: string | null
          created_at: string
          filters: Json | null
          id: string
          layout: string | null
          page_id: string
          selected_ids: string[] | null
          sort_order: number
          source: string
          subtitle: string | null
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          body_markdown?: string | null
          created_at?: string
          filters?: Json | null
          id?: string
          layout?: string | null
          page_id: string
          selected_ids?: string[] | null
          sort_order?: number
          source?: string
          subtitle?: string | null
          title?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          body_markdown?: string | null
          created_at?: string
          filters?: Json | null
          id?: string
          layout?: string | null
          page_id?: string
          selected_ids?: string[] | null
          sort_order?: number
          source?: string
          subtitle?: string | null
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "website_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      websites: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          owner_id: string
          owner_type: string
          slug: string
          subtitle: string | null
          theme: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          owner_id: string
          owner_type: string
          slug: string
          subtitle?: string | null
          theme?: Json
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          owner_id?: string
          owner_type?: string
          slug?: string
          subtitle?: string | null
          theme?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      xp_events: {
        Row: {
          amount: number
          created_at: string
          id: string
          related_entity_id: string | null
          related_entity_type: string | null
          territory_id: string | null
          topic_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          territory_id?: string | null
          topic_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          territory_id?: string | null
          topic_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_events_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_events_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
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
      economy_stats: {
        Row: {
          active_holders: number | null
          monthly_faded: number | null
          monthly_minted: number | null
          total_credits_in_circulation: number | null
          total_lifetime_faded: number | null
          treasury_balance: number | null
        }
        Relationships: []
      }
      graph_edges: {
        Row: {
          created_at: string | null
          id: string | null
          relation_type: string | null
          source_id: string | null
          source_type: string | null
          target_id: string | null
          target_type: string | null
          updated_at: string | null
          visibility: string | null
          weight: number | null
        }
        Relationships: []
      }
      open_trust_edges: {
        Row: {
          context_guild_id: string | null
          context_quest_id: string | null
          context_territory_id: string | null
          edge_type: string | null
          evidence_count: number | null
          from_id: string | null
          from_type: string | null
          id: string | null
          last_updated_at: string | null
          status: string | null
          tags: string[] | null
          to_id: string | null
          to_type: string | null
          visibility: string | null
          weight: number | null
        }
        Insert: {
          context_guild_id?: string | null
          context_quest_id?: string | null
          context_territory_id?: string | null
          edge_type?: never
          evidence_count?: never
          from_id?: string | null
          from_type?: never
          id?: string | null
          last_updated_at?: string | null
          status?: never
          tags?: string[] | null
          to_id?: string | null
          to_type?: never
          visibility?: never
          weight?: never
        }
        Update: {
          context_guild_id?: string | null
          context_quest_id?: string | null
          context_territory_id?: string | null
          edge_type?: never
          evidence_count?: never
          from_id?: string | null
          from_type?: never
          id?: string | null
          last_updated_at?: string | null
          status?: never
          tags?: string[] | null
          to_id?: string | null
          to_type?: never
          visibility?: never
          weight?: never
        }
        Relationships: [
          {
            foreignKeyName: "trust_edges_context_guild_id_fkey"
            columns: ["context_guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_edges_context_quest_id_fkey"
            columns: ["context_quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_edges_context_territory_id_fkey"
            columns: ["context_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_public: {
        Row: {
          allow_wall_comments: boolean | null
          avatar_url: string | null
          bio: string | null
          contribution_index: number | null
          created_at: string | null
          current_plan_code: string | null
          filter_by_houses: boolean | null
          governance_weight: number | null
          has_completed_onboarding: boolean | null
          headline: string | null
          is_cooperative_member: boolean | null
          location: string | null
          name: string | null
          persona_type: string | null
          role: string | null
          total_shares_a: number | null
          total_shares_b: number | null
          updated_at: string | null
          user_id: string | null
          xp: number | null
          xp_level: number | null
          xp_recent_12m: number | null
        }
        Insert: {
          allow_wall_comments?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          contribution_index?: number | null
          created_at?: string | null
          current_plan_code?: string | null
          filter_by_houses?: boolean | null
          governance_weight?: number | null
          has_completed_onboarding?: boolean | null
          headline?: string | null
          is_cooperative_member?: boolean | null
          location?: string | null
          name?: string | null
          persona_type?: string | null
          role?: string | null
          total_shares_a?: number | null
          total_shares_b?: number | null
          updated_at?: string | null
          user_id?: string | null
          xp?: number | null
          xp_level?: number | null
          xp_recent_12m?: number | null
        }
        Update: {
          allow_wall_comments?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          contribution_index?: number | null
          created_at?: string | null
          current_plan_code?: string | null
          filter_by_houses?: boolean | null
          governance_weight?: number | null
          has_completed_onboarding?: boolean | null
          headline?: string | null
          is_cooperative_member?: boolean | null
          location?: string | null
          name?: string | null
          persona_type?: string | null
          role?: string | null
          total_shares_a?: number | null
          total_shares_b?: number | null
          updated_at?: string | null
          user_id?: string | null
          xp?: number | null
          xp_level?: number | null
          xp_recent_12m?: number | null
        }
        Relationships: []
      }
      territory_natural_systems_summary: {
        Row: {
          avg_health_index: number | null
          avg_regenerative_potential: number | null
          avg_resilience_index: number | null
          forest_count: number | null
          linked_quests_count: number | null
          other_count: number | null
          pollinator_network_count: number | null
          river_count: number | null
          soil_system_count: number | null
          species_guild_count: number | null
          territory_id: string | null
          total_systems: number | null
          wetland_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "natural_systems_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_deduct_ctg: {
        Args: {
          p_admin_id: string
          p_amount: number
          p_note?: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_grant_ctg: {
        Args: {
          p_admin_id: string
          p_amount: number
          p_note?: string
          p_user_id: string
        }
        Returns: Json
      }
      apply_monthly_demurrage: {
        Args: { _fade_rate?: number }
        Returns: {
          total_faded: number
          treasury_credited: number
          users_faded: number
        }[]
      }
      approve_quest_affiliation: {
        Args: { _affiliation_id: string }
        Returns: undefined
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      create_and_link_natural_system: {
        Args: {
          p_description?: string
          p_kingdom: Database["public"]["Enums"]["natural_system_kingdom"]
          p_linked_id?: string
          p_linked_type?: Database["public"]["Enums"]["ns_link_type"]
          p_location_text?: string
          p_name: string
          p_picture_url?: string
          p_source_url?: string
          p_system_type: Database["public"]["Enums"]["natural_system_type_v2"]
          p_tags?: string[]
          p_territory_id?: string
        }
        Returns: string
      }
      create_eco_quest_otg_edges: {
        Args: { _quest_id: string }
        Returns: undefined
      }
      distribute_commons_pulse: {
        Args: { p_triggered_by?: string }
        Returns: Json
      }
      distribute_eco_quest_rewards: {
        Args: { _quest_id: string }
        Returns: undefined
      }
      distribute_health_improvement_biopoints: {
        Args: never
        Returns: {
          improvement: number
          recipients: number
          system_name: string
          total_distributed: number
        }[]
      }
      emit_ctg_for_contribution: {
        Args: {
          p_contribution_type: string
          p_note?: string
          p_related_entity_id?: string
          p_related_entity_type?: string
          p_user_id: string
        }
        Returns: Json
      }
      exchange_ctg_to_credits: {
        Args: { p_ctg_amount: number; p_user_id: string }
        Returns: Json
      }
      get_co_occurring_natural_systems: {
        Args: { p_natural_system_id: string }
        Returns: {
          health_index: number
          id: string
          kingdom: string
          name: string
          picture_url: string
          shared_links_count: number
          system_type: string
        }[]
      }
      get_conversation_participants: {
        Args: { conv_ids: string[] }
        Returns: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string
          user_id: string
        }[]
      }
      get_eco_config: { Args: never; Returns: Json }
      get_latest_indicator: {
        Args: { p_indicator?: string; p_natural_system_id: string }
        Returns: {
          computed_at: string
          indicator: string
          value: number
        }[]
      }
      get_linked_natural_systems: {
        Args: {
          p_linked_id: string
          p_linked_type: Database["public"]["Enums"]["ns_link_type"]
        }
        Returns: {
          created_at: string
          description: string
          health_index: number
          id: string
          kingdom: string
          link_created_at: string
          linked_via: string
          location_text: string
          name: string
          picture_url: string
          regenerative_potential: number
          resilience_index: number
          source_url: string
          system_type: string
          tags: string[]
          territory_id: string
          updated_at: string
        }[]
      }
      get_linked_natural_systems_with_codeps: {
        Args: { p_linked_id: string; p_linked_type: string }
        Returns: {
          codep_source: string
          created_at: string
          description: string
          health_index: number
          id: string
          kingdom: string
          link_created_at: string
          linked_via: string
          location_text: string
          name: string
          picture_url: string
          regenerative_potential: number
          resilience_index: number
          source_url: string
          system_type: string
          tags: string[]
          territory_id: string
          updated_at: string
        }[]
      }
      get_my_bookings: {
        Args: never
        Returns: {
          amount: number
          call_url: string
          company_id: string
          created_at: string
          currency: string
          end_date_time: string
          id: string
          is_deleted: boolean
          notes: string
          payment_status: string
          provider_guild_id: string
          provider_user_id: string
          requested_date_time: string
          requester_id: string
          service_id: string
          start_date_time: string
          status: string
          updated_at: string
        }[]
      }
      get_my_calendar_connections: {
        Args: never
        Returns: {
          calendar_id: string
          created_at: string
          id: string
          last_synced_at: string
          provider: string
          sync_enabled: boolean
          sync_error: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }[]
      }
      get_recent_data_points: {
        Args: {
          p_limit?: number
          p_metric?: string
          p_natural_system_id: string
          p_since?: string
        }
        Returns: {
          id: string
          metric: string
          recorded_at: string
          source: string
          unit: string
          value: number
        }[]
      }
      get_territory_ancestors: {
        Args: { p_id: string }
        Returns: {
          depth: number
          id: string
          level: string
          name: string
          slug: string
        }[]
      }
      get_territory_living_dashboard: {
        Args: { p_territory_id: string }
        Returns: Json
      }
      get_territory_natural_systems: {
        Args: { p_territory_id: string }
        Returns: {
          created_at: string
          description: string
          health_index: number
          id: string
          kingdom: string
          location_text: string
          name: string
          picture_url: string
          regenerative_potential: number
          resilience_index: number
          source_url: string
          system_type: string
          tags: string[]
        }[]
      }
      get_territory_otg_graph: {
        Args: { p_max_nodes?: number; p_territory_id: string }
        Returns: Json
      }
      get_territory_otg_stewards: {
        Args: { p_limit?: number; p_territory_id: string }
        Returns: {
          edge_count: number
          node_avatar: string
          node_id: string
          node_name: string
          node_type: string
          tags: string[]
          total_weight: number
        }[]
      }
      get_territory_stewards: {
        Args: { p_limit?: number; p_territory_id: string }
        Returns: {
          created_at: string
          edge_type: string
          from_id: string
          from_type: string
          status: string
          tags: string[]
          weight: number
        }[]
      }
      get_user_ctg_summary: { Args: { p_user_id: string }; Returns: Json }
      get_user_id_by_email: {
        Args: { lookup_email: string }
        Returns: {
          id: string
        }[]
      }
      grant_user_credits: {
        Args: {
          _amount: number
          _related_entity_id?: string
          _related_entity_type?: string
          _source?: string
          _target_user_id: string
          _type: string
        }
        Returns: undefined
      }
      grant_user_xp: {
        Args: {
          _amount: number
          _related_entity_id?: string
          _related_entity_type?: string
          _target_user_id: string
          _territory_id?: string
          _topic_id?: string
          _type: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      link_natural_system: {
        Args: {
          p_linked_id: string
          p_linked_type: Database["public"]["Enums"]["ns_link_type"]
          p_natural_system_id: string
        }
        Returns: undefined
      }
      map_territory_to_eco_region: {
        Args: { p_territory_id: string }
        Returns: {
          eco_region_code: string
          eco_region_name: string
          eco_region_scheme: string
        }[]
      }
      match_territory_with_datasets: {
        Args: { p_territory_id: string }
        Returns: {
          dataset_granularity: string
          dataset_id: string
          dataset_source: string
          dataset_title: string
          match_level: string
          matched_at_granularity: string
        }[]
      }
      process_give_back: {
        Args: {
          _amount_credits?: number
          _booking_id?: string
          _metadata?: Json
          _to_guild_id?: string
          _to_target_type: string
        }
        Returns: string
      }
      process_trust_renewal: {
        Args: { p_edge_id: string; p_user_id: string }
        Returns: Json
      }
      rebuild_territory_closure: { Args: never; Returns: undefined }
      recompute_all_indicators: { Args: never; Returns: number }
      recompute_natural_system_indicators: {
        Args: { p_natural_system_id: string }
        Returns: undefined
      }
      refund_quest_funding: {
        Args: { _quest_id: string }
        Returns: {
          refunded_count: number
          refunded_total: number
        }[]
      }
      reject_quest_affiliation: {
        Args: { _affiliation_id: string }
        Returns: undefined
      }
      release_pending_trust_xp: {
        Args: never
        Returns: {
          total_released: number
          users_processed: number
        }[]
      }
      set_ctg_exchange_rate: {
        Args: { p_admin_id: string; p_new_rate: number; p_reason?: string }
        Returns: Json
      }
      set_user_role:
        | {
            Args: {
              _actor_id: string
              _grant: boolean
              _role: Database["public"]["Enums"]["app_role"]
              _target_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _grant: boolean
              _role: Database["public"]["Enums"]["app_role"]
              _target_user_id: string
            }
            Returns: undefined
          }
      spend_user_credits: {
        Args: {
          _amount: number
          _related_entity_id?: string
          _related_entity_type?: string
          _source?: string
          _type: string
        }
        Returns: undefined
      }
      transfer_credits: {
        Args: {
          _amount: number
          _note?: string
          _source_guild_id?: string
          _target_id: string
          _target_type: string
        }
        Returns: undefined
      }
      transfer_ctg: {
        Args: {
          p_amount: number
          p_from_user_id: string
          p_note?: string
          p_to_user_id: string
        }
        Returns: Json
      }
      update_living_system_external_data: {
        Args: { p_natural_system_id: string }
        Returns: undefined
      }
      upsert_stewardship_edge: {
        Args: {
          _context_guild_id?: string
          _context_quest_id?: string
          _context_territory_id?: string
          _created_by?: string
          _delta_score?: number
          _edge_type?: Database["public"]["Enums"]["trust_edge_type"]
          _from_id: string
          _from_type: Database["public"]["Enums"]["trust_node_type"]
          _tags?: string[]
          _to_id: string
          _to_type: Database["public"]["Enums"]["trust_node_type"]
        }
        Returns: string
      }
    }
    Enums: {
      api_method: "GET" | "POST" | "STATIC_FILE"
      app_role: "admin" | "moderator" | "user" | "superadmin"
      billing_entity_type:
        | "user"
        | "guild"
        | "entity"
        | "territory"
        | "platform"
        | "commons"
      content_sensitivity: "public" | "restricted" | "private"
      dataset_fetch_method: "API" | "SCRAPER" | "STATIC_IMPORT"
      dataset_granularity:
        | "GLOBAL"
        | "COUNTRY"
        | "NUTS1"
        | "NUTS2"
        | "NUTS3"
        | "BIOREGION"
        | "CUSTOM"
      dataset_type: "FOREST_NAVIGATOR" | "COPERNICUS" | "GBIF" | "CUSTOM"
      eco_category:
        | "observation"
        | "restoration"
        | "governance"
        | "knowledge"
        | "none"
      guild_application_status: "PENDING" | "APPROVED" | "REJECTED"
      guild_join_policy: "OPEN" | "APPROVAL_REQUIRED" | "INVITE_ONLY"
      guild_member_role: "ADMIN" | "MEMBER"
      guild_type: "GUILD" | "NETWORK" | "COLLECTIVE"
      ics_feed_type:
        | "PERSONAL_ALL"
        | "PERSONAL_ONLY_BOOKINGS"
        | "PERSONAL_ONLY_RITUALS"
        | "CUSTOM"
      monetization_type: "FREE" | "PAID" | "MIXED"
      natural_system_kingdom:
        | "plants"
        | "animals"
        | "fungi_lichens"
        | "microorganisms"
        | "multi_species_guild"
        | "ecosystem"
      natural_system_type:
        | "river"
        | "wetland"
        | "forest"
        | "soil_system"
        | "pollinator_network"
        | "species_guild"
        | "other"
      natural_system_type_v2:
        | "river_watershed"
        | "wetland_peatland"
        | "forest_woodland"
        | "soil_system_agroecosystem"
        | "grassland_meadow"
        | "urban_ecosystem"
        | "mountain_slope"
        | "coastline_estuary"
        | "aquifer_spring"
        | "climate_cell"
        | "other"
      ns_link_type: "user" | "entity" | "territory" | "quest"
      pod_member_role: "HOST" | "MEMBER"
      pod_type: "QUEST_POD" | "STUDY_POD"
      quest_status:
        | "OPEN"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "OPEN_FOR_PROPOSALS"
        | "ACTIVE"
        | "CANCELLED"
        | "DRAFT"
        | "IDEA"
      ritual_access_type:
        | "PUBLIC"
        | "MEMBERS"
        | "ROLES"
        | "XP_THRESHOLD"
        | "SHARE_CLASS"
        | "INVITE_ONLY"
      ritual_frequency:
        | "WEEKLY"
        | "BIWEEKLY"
        | "MONTHLY"
        | "QUARTERLY"
        | "CUSTOM"
      ritual_session_type:
        | "INFORMAL_HANGING"
        | "EMOTIONAL_CHECKIN"
        | "GUILD_ASSEMBLY"
        | "MASTERMIND"
        | "LEARNING_LAB"
        | "SPRINT_ALIGNMENT"
        | "CONFLICT_RESOLUTION"
        | "VISIONARY_SESSION"
        | "CROSS_GUILD_FEDERATION"
        | "CELEBRATION"
      subscription_status: "ACTIVE" | "CANCELED" | "EXPIRED" | "TRIAL"
      territorial_granularity:
        | "COUNTRY"
        | "NUTS1"
        | "NUTS2"
        | "NUTS3"
        | "DISTRICT_OR_COMMUNE"
        | "CUSTOM_PERIMETER"
      territorial_precision_level:
        | "STRICT_MATCH"
        | "PERIMETER_MATCH"
        | "BIOREGIONAL_MATCH"
      territory_level:
        | "TOWN"
        | "REGION"
        | "NATIONAL"
        | "OTHER"
        | "LOCALITY"
        | "PROVINCE"
        | "CONTINENT"
        | "GLOBAL"
        | "BIOREGION"
      trust_edge_type:
        | "skill_trust"
        | "reliability"
        | "collaboration"
        | "stewardship"
        | "financial_trust"
      trust_node_type:
        | "profile"
        | "guild"
        | "quest"
        | "service"
        | "partner_entity"
        | "territory"
        | "natural_system"
      trust_status: "active" | "outdated" | "retracted"
      trust_visibility: "public" | "network" | "private"
      xp_transaction_type: "ACTION_SPEND" | "REWARD" | "ADJUSTMENT" | "REFUND"
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
      api_method: ["GET", "POST", "STATIC_FILE"],
      app_role: ["admin", "moderator", "user", "superadmin"],
      billing_entity_type: [
        "user",
        "guild",
        "entity",
        "territory",
        "platform",
        "commons",
      ],
      content_sensitivity: ["public", "restricted", "private"],
      dataset_fetch_method: ["API", "SCRAPER", "STATIC_IMPORT"],
      dataset_granularity: [
        "GLOBAL",
        "COUNTRY",
        "NUTS1",
        "NUTS2",
        "NUTS3",
        "BIOREGION",
        "CUSTOM",
      ],
      dataset_type: ["FOREST_NAVIGATOR", "COPERNICUS", "GBIF", "CUSTOM"],
      eco_category: [
        "observation",
        "restoration",
        "governance",
        "knowledge",
        "none",
      ],
      guild_application_status: ["PENDING", "APPROVED", "REJECTED"],
      guild_join_policy: ["OPEN", "APPROVAL_REQUIRED", "INVITE_ONLY"],
      guild_member_role: ["ADMIN", "MEMBER"],
      guild_type: ["GUILD", "NETWORK", "COLLECTIVE"],
      ics_feed_type: [
        "PERSONAL_ALL",
        "PERSONAL_ONLY_BOOKINGS",
        "PERSONAL_ONLY_RITUALS",
        "CUSTOM",
      ],
      monetization_type: ["FREE", "PAID", "MIXED"],
      natural_system_kingdom: [
        "plants",
        "animals",
        "fungi_lichens",
        "microorganisms",
        "multi_species_guild",
        "ecosystem",
      ],
      natural_system_type: [
        "river",
        "wetland",
        "forest",
        "soil_system",
        "pollinator_network",
        "species_guild",
        "other",
      ],
      natural_system_type_v2: [
        "river_watershed",
        "wetland_peatland",
        "forest_woodland",
        "soil_system_agroecosystem",
        "grassland_meadow",
        "urban_ecosystem",
        "mountain_slope",
        "coastline_estuary",
        "aquifer_spring",
        "climate_cell",
        "other",
      ],
      ns_link_type: ["user", "entity", "territory", "quest"],
      pod_member_role: ["HOST", "MEMBER"],
      pod_type: ["QUEST_POD", "STUDY_POD"],
      quest_status: [
        "OPEN",
        "IN_PROGRESS",
        "COMPLETED",
        "OPEN_FOR_PROPOSALS",
        "ACTIVE",
        "CANCELLED",
        "DRAFT",
        "IDEA",
      ],
      ritual_access_type: [
        "PUBLIC",
        "MEMBERS",
        "ROLES",
        "XP_THRESHOLD",
        "SHARE_CLASS",
        "INVITE_ONLY",
      ],
      ritual_frequency: [
        "WEEKLY",
        "BIWEEKLY",
        "MONTHLY",
        "QUARTERLY",
        "CUSTOM",
      ],
      ritual_session_type: [
        "INFORMAL_HANGING",
        "EMOTIONAL_CHECKIN",
        "GUILD_ASSEMBLY",
        "MASTERMIND",
        "LEARNING_LAB",
        "SPRINT_ALIGNMENT",
        "CONFLICT_RESOLUTION",
        "VISIONARY_SESSION",
        "CROSS_GUILD_FEDERATION",
        "CELEBRATION",
      ],
      subscription_status: ["ACTIVE", "CANCELED", "EXPIRED", "TRIAL"],
      territorial_granularity: [
        "COUNTRY",
        "NUTS1",
        "NUTS2",
        "NUTS3",
        "DISTRICT_OR_COMMUNE",
        "CUSTOM_PERIMETER",
      ],
      territorial_precision_level: [
        "STRICT_MATCH",
        "PERIMETER_MATCH",
        "BIOREGIONAL_MATCH",
      ],
      territory_level: [
        "TOWN",
        "REGION",
        "NATIONAL",
        "OTHER",
        "LOCALITY",
        "PROVINCE",
        "CONTINENT",
        "GLOBAL",
        "BIOREGION",
      ],
      trust_edge_type: [
        "skill_trust",
        "reliability",
        "collaboration",
        "stewardship",
        "financial_trust",
      ],
      trust_node_type: [
        "profile",
        "guild",
        "quest",
        "service",
        "partner_entity",
        "territory",
        "natural_system",
      ],
      trust_status: ["active", "outdated", "retracted"],
      trust_visibility: ["public", "network", "private"],
      xp_transaction_type: ["ACTION_SPEND", "REWARD", "ADJUSTMENT", "REFUND"],
    },
  },
} as const
