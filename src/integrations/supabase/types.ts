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
          uploaded_by_user_id: string
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
          uploaded_by_user_id: string
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
          uploaded_by_user_id?: string
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
      companies: {
        Row: {
          banner_url: string | null
          contact_user_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          instagram_url: string | null
          is_deleted: boolean
          linkedin_url: string | null
          logo_url: string | null
          name: string
          sector: string | null
          size: string | null
          twitter_url: string | null
          universe_visibility: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          banner_url?: string | null
          contact_user_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          instagram_url?: string | null
          is_deleted?: boolean
          linkedin_url?: string | null
          logo_url?: string | null
          name: string
          sector?: string | null
          size?: string | null
          twitter_url?: string | null
          universe_visibility?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          banner_url?: string | null
          contact_user_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          instagram_url?: string | null
          is_deleted?: boolean
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string
          sector?: string | null
          size?: string | null
          twitter_url?: string | null
          universe_visibility?: string
          updated_at?: string
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
        }
        Insert: {
          allow_comments?: boolean
          allow_vote_change?: boolean
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
        }
        Update: {
          allow_comments?: boolean
          allow_vote_change?: boolean
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
          updated_at: string
          upvote_count: number
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
          updated_at?: string
          upvote_count?: number
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
          updated_at?: string
          upvote_count?: number
        }
        Relationships: []
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
      guilds: {
        Row: {
          application_questions: Json | null
          banner_url: string | null
          created_at: string
          created_by_user_id: string
          deleted_at: string | null
          description: string | null
          features_config: Json
          id: string
          instagram_url: string | null
          is_approved: boolean
          is_deleted: boolean
          is_draft: boolean
          join_policy: Database["public"]["Enums"]["guild_join_policy"]
          linkedin_url: string | null
          logo_url: string | null
          name: string
          twitter_url: string | null
          type: Database["public"]["Enums"]["guild_type"]
          universe_visibility: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          application_questions?: Json | null
          banner_url?: string | null
          created_at?: string
          created_by_user_id: string
          deleted_at?: string | null
          description?: string | null
          features_config?: Json
          id?: string
          instagram_url?: string | null
          is_approved?: boolean
          is_deleted?: boolean
          is_draft?: boolean
          join_policy?: Database["public"]["Enums"]["guild_join_policy"]
          linkedin_url?: string | null
          logo_url?: string | null
          name: string
          twitter_url?: string | null
          type?: Database["public"]["Enums"]["guild_type"]
          universe_visibility?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          application_questions?: Json | null
          banner_url?: string | null
          created_at?: string
          created_by_user_id?: string
          deleted_at?: string | null
          description?: string | null
          features_config?: Json
          id?: string
          instagram_url?: string | null
          is_approved?: boolean
          is_deleted?: boolean
          is_draft?: boolean
          join_policy?: Database["public"]["Enums"]["guild_join_policy"]
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string
          twitter_url?: string | null
          type?: Database["public"]["Enums"]["guild_type"]
          universe_visibility?: string
          updated_at?: string
          website_url?: string | null
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
      notification_preferences: {
        Row: {
          channel_email_enabled: boolean
          channel_in_app_enabled: boolean
          created_at: string
          id: string
          notification_frequency: string
          notify_abuse_reports: boolean
          notify_ai_flagged_content: boolean
          notify_booking_status_changes: boolean
          notify_bookings_and_cancellations: boolean
          notify_co_host_changes: boolean
          notify_comments_and_upvotes: boolean
          notify_daily_digest_email: boolean
          notify_daily_digest_in_app: boolean
          notify_events_and_courses: boolean
          notify_follower_activity: boolean
          notify_invitations_to_units: boolean
          notify_mentions: boolean
          notify_new_bug_reports: boolean
          notify_new_join_requests_guilds: boolean
          notify_new_join_requests_pods: boolean
          notify_new_partnership_requests: boolean
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
          id?: string
          notification_frequency?: string
          notify_abuse_reports?: boolean
          notify_ai_flagged_content?: boolean
          notify_booking_status_changes?: boolean
          notify_bookings_and_cancellations?: boolean
          notify_co_host_changes?: boolean
          notify_comments_and_upvotes?: boolean
          notify_daily_digest_email?: boolean
          notify_daily_digest_in_app?: boolean
          notify_events_and_courses?: boolean
          notify_follower_activity?: boolean
          notify_invitations_to_units?: boolean
          notify_mentions?: boolean
          notify_new_bug_reports?: boolean
          notify_new_join_requests_guilds?: boolean
          notify_new_join_requests_pods?: boolean
          notify_new_partnership_requests?: boolean
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
          id?: string
          notification_frequency?: string
          notify_abuse_reports?: boolean
          notify_ai_flagged_content?: boolean
          notify_booking_status_changes?: boolean
          notify_bookings_and_cancellations?: boolean
          notify_co_host_changes?: boolean
          notify_comments_and_upvotes?: boolean
          notify_daily_digest_email?: boolean
          notify_daily_digest_in_app?: boolean
          notify_events_and_courses?: boolean
          notify_follower_activity?: boolean
          notify_invitations_to_units?: boolean
          notify_mentions?: boolean
          notify_new_bug_reports?: boolean
          notify_new_join_requests_guilds?: boolean
          notify_new_join_requests_pods?: boolean
          notify_new_partnership_requests?: boolean
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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          contribution_index: number
          created_at: string
          credits_balance: number
          current_plan_code: string | null
          email: string
          filter_by_houses: boolean
          governance_weight: number
          has_completed_onboarding: boolean
          headline: string | null
          id: string
          instagram_url: string | null
          is_cooperative_member: boolean
          last_xp_recalculated_at: string | null
          linkedin_url: string | null
          name: string
          persona_confidence: number | null
          persona_source: string | null
          persona_type: string
          role: string
          total_shares_a: number
          total_shares_b: number
          twitter_url: string | null
          updated_at: string
          user_id: string
          website_url: string | null
          xp: number
          xp_level: number
          xp_recent_12m: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          contribution_index?: number
          created_at?: string
          credits_balance?: number
          current_plan_code?: string | null
          email?: string
          filter_by_houses?: boolean
          governance_weight?: number
          has_completed_onboarding?: boolean
          headline?: string | null
          id?: string
          instagram_url?: string | null
          is_cooperative_member?: boolean
          last_xp_recalculated_at?: string | null
          linkedin_url?: string | null
          name?: string
          persona_confidence?: number | null
          persona_source?: string | null
          persona_type?: string
          role?: string
          total_shares_a?: number
          total_shares_b?: number
          twitter_url?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          xp?: number
          xp_level?: number
          xp_recent_12m?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          contribution_index?: number
          created_at?: string
          credits_balance?: number
          current_plan_code?: string | null
          email?: string
          filter_by_houses?: boolean
          governance_weight?: number
          has_completed_onboarding?: boolean
          headline?: string | null
          id?: string
          instagram_url?: string | null
          is_cooperative_member?: boolean
          last_xp_recalculated_at?: string | null
          linkedin_url?: string | null
          name?: string
          persona_confidence?: number | null
          persona_source?: string | null
          persona_type?: string
          role?: string
          total_shares_a?: number
          total_shares_b?: number
          twitter_url?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          xp?: number
          xp_level?: number
          xp_recent_12m?: number
        }
        Relationships: []
      }
      quest_funding: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          funder_user_id: string | null
          id: string
          quest_id: string
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
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          order_index: number
          quest_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_user_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          order_index?: number
          quest_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_user_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          order_index?: number
          quest_id?: string
          status?: string
          title?: string
          updated_at?: string
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
      quests: {
        Row: {
          allow_fundraising: boolean
          boost_expires_at: string | null
          company_id: string | null
          cover_image_url: string | null
          created_at: string
          created_by_user_id: string
          credit_budget: number
          credit_reward: number
          deleted_at: string | null
          description: string | null
          escrow_credits: number
          funding_goal_credits: number | null
          guild_id: string | null
          id: string
          is_boosted: boolean
          is_deleted: boolean
          is_draft: boolean
          is_featured: boolean
          mission_budget_max: number | null
          mission_budget_min: number | null
          monetization_type: Database["public"]["Enums"]["monetization_type"]
          owner_id: string | null
          owner_type: string
          payment_type: string
          payout_user_id: string | null
          price_currency: string
          price_fiat: number
          reward_xp: number
          status: Database["public"]["Enums"]["quest_status"]
          title: string
          universe_visibility: string
          updated_at: string
        }
        Insert: {
          allow_fundraising?: boolean
          boost_expires_at?: string | null
          company_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by_user_id: string
          credit_budget?: number
          credit_reward?: number
          deleted_at?: string | null
          description?: string | null
          escrow_credits?: number
          funding_goal_credits?: number | null
          guild_id?: string | null
          id?: string
          is_boosted?: boolean
          is_deleted?: boolean
          is_draft?: boolean
          is_featured?: boolean
          mission_budget_max?: number | null
          mission_budget_min?: number | null
          monetization_type?: Database["public"]["Enums"]["monetization_type"]
          owner_id?: string | null
          owner_type?: string
          payment_type?: string
          payout_user_id?: string | null
          price_currency?: string
          price_fiat?: number
          reward_xp?: number
          status?: Database["public"]["Enums"]["quest_status"]
          title: string
          universe_visibility?: string
          updated_at?: string
        }
        Update: {
          allow_fundraising?: boolean
          boost_expires_at?: string | null
          company_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by_user_id?: string
          credit_budget?: number
          credit_reward?: number
          deleted_at?: string | null
          description?: string | null
          escrow_credits?: number
          funding_goal_credits?: number | null
          guild_id?: string | null
          id?: string
          is_boosted?: boolean
          is_deleted?: boolean
          is_draft?: boolean
          is_featured?: boolean
          mission_budget_max?: number | null
          mission_budget_min?: number | null
          monetization_type?: Database["public"]["Enums"]["monetization_type"]
          owner_id?: string | null
          owner_type?: string
          payment_type?: string
          payout_user_id?: string | null
          price_currency?: string
          price_fiat?: number
          reward_xp?: number
          status?: Database["public"]["Enums"]["quest_status"]
          title?: string
          universe_visibility?: string
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
          id: string
          image_url: string | null
          is_active: boolean
          is_boosted: boolean
          is_deleted: boolean
          is_draft: boolean
          online_location_type: string | null
          online_location_url_template: string | null
          owner_id: string | null
          owner_type: string
          price_amount: number | null
          price_currency: string
          provider_guild_id: string | null
          provider_user_id: string | null
          stripe_price_id: string | null
          title: string
          universe_visibility: string
          updated_at: string
        }
        Insert: {
          boost_expires_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_boosted?: boolean
          is_deleted?: boolean
          is_draft?: boolean
          online_location_type?: string | null
          online_location_url_template?: string | null
          owner_id?: string | null
          owner_type?: string
          price_amount?: number | null
          price_currency?: string
          provider_guild_id?: string | null
          provider_user_id?: string | null
          stripe_price_id?: string | null
          title: string
          universe_visibility?: string
          updated_at?: string
        }
        Update: {
          boost_expires_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_boosted?: boolean
          is_deleted?: boolean
          is_draft?: boolean
          online_location_type?: string | null
          online_location_url_template?: string | null
          owner_id?: string | null
          owner_type?: string
          price_amount?: number | null
          price_currency?: string
          provider_guild_id?: string | null
          provider_user_id?: string | null
          stripe_price_id?: string | null
          title?: string
          universe_visibility?: string
          updated_at?: string
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
      subscription_plans: {
        Row: {
          ai_muse_mode: string
          can_create_company: boolean
          code: string
          commission_discount_percentage: number
          created_at: string
          custom_guild_tools: boolean
          description: string | null
          free_quests_per_week: number
          id: string
          marketplace_fee_percent: number | null
          max_courses: number | null
          max_guild_memberships: number | null
          max_pods: number | null
          max_services_active: number | null
          monthly_included_credits: number
          monthly_price_amount: number | null
          monthly_price_currency: string
          name: string
          stripe_price_id: string | null
          updated_at: string
          visibility_ranking: string
          xp_multiplier: number
        }
        Insert: {
          ai_muse_mode?: string
          can_create_company?: boolean
          code: string
          commission_discount_percentage?: number
          created_at?: string
          custom_guild_tools?: boolean
          description?: string | null
          free_quests_per_week?: number
          id?: string
          marketplace_fee_percent?: number | null
          max_courses?: number | null
          max_guild_memberships?: number | null
          max_pods?: number | null
          max_services_active?: number | null
          monthly_included_credits?: number
          monthly_price_amount?: number | null
          monthly_price_currency?: string
          name: string
          stripe_price_id?: string | null
          updated_at?: string
          visibility_ranking?: string
          xp_multiplier?: number
        }
        Update: {
          ai_muse_mode?: string
          can_create_company?: boolean
          code?: string
          commission_discount_percentage?: number
          created_at?: string
          custom_guild_tools?: boolean
          description?: string | null
          free_quests_per_week?: number
          id?: string
          marketplace_fee_percent?: number | null
          max_courses?: number | null
          max_guild_memberships?: number | null
          max_pods?: number | null
          max_services_active?: number | null
          monthly_included_credits?: number
          monthly_price_amount?: number | null
          monthly_price_currency?: string
          name?: string
          stripe_price_id?: string | null
          updated_at?: string
          visibility_ranking?: string
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
          parent_id: string | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          level?: Database["public"]["Enums"]["territory_level"]
          name: string
          parent_id?: string | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          level?: Database["public"]["Enums"]["territory_level"]
          name?: string
          parent_id?: string | null
          slug?: string | null
          updated_at?: string
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
      set_user_role: {
        Args: {
          _actor_id: string
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "superadmin"
      guild_application_status: "PENDING" | "APPROVED" | "REJECTED"
      guild_join_policy: "OPEN" | "APPROVAL_REQUIRED" | "INVITE_ONLY"
      guild_member_role: "ADMIN" | "MEMBER"
      guild_type: "GUILD" | "NETWORK" | "COLLECTIVE"
      monetization_type: "FREE" | "PAID" | "MIXED"
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
      app_role: ["admin", "moderator", "user", "superadmin"],
      guild_application_status: ["PENDING", "APPROVED", "REJECTED"],
      guild_join_policy: ["OPEN", "APPROVAL_REQUIRED", "INVITE_ONLY"],
      guild_member_role: ["ADMIN", "MEMBER"],
      guild_type: ["GUILD", "NETWORK", "COLLECTIVE"],
      monetization_type: ["FREE", "PAID", "MIXED"],
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
      ],
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
