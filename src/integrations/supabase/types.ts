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
          territory_id: string
        }
        Insert: {
          course_id: string
          id?: string
          territory_id: string
        }
        Update: {
          course_id?: string
          id?: string
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
          application_questions: Json | null
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
          join_policy: Database["public"]["Enums"]["guild_join_policy"]
          linkedin_url: string | null
          logo_url: string | null
          name: string
          twitter_url: string | null
          type: Database["public"]["Enums"]["guild_type"]
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
          updated_at?: string
          website_url?: string | null
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
      quest_updates: {
        Row: {
          author_id: string
          content: string | null
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          is_draft: boolean
          quest_id: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_draft?: boolean
          quest_id: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_draft?: boolean
          quest_id?: string
          title?: string
          type?: string
          updated_at?: string
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
          service_id: string
          territory_id: string
        }
        Insert: {
          id?: string
          service_id: string
          territory_id: string
        }
        Update: {
          id?: string
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
          created_at: string
          deleted_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          is_active: boolean
          is_deleted: boolean
          is_draft: boolean
          online_location_type: string | null
          online_location_url_template: string | null
          price_amount: number | null
          price_currency: string
          provider_guild_id: string | null
          provider_user_id: string | null
          stripe_price_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_deleted?: boolean
          is_draft?: boolean
          online_location_type?: string | null
          online_location_url_template?: string | null
          price_amount?: number | null
          price_currency?: string
          provider_guild_id?: string | null
          provider_user_id?: string | null
          stripe_price_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_deleted?: boolean
          is_draft?: boolean
          online_location_type?: string | null
          online_location_url_template?: string | null
          price_amount?: number | null
          price_currency?: string
          provider_guild_id?: string | null
          provider_user_id?: string | null
          stripe_price_id?: string | null
          title?: string
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
      app_role: "admin" | "moderator" | "user" | "superadmin"
      guild_application_status: "PENDING" | "APPROVED" | "REJECTED"
      guild_join_policy: "OPEN" | "APPROVAL_REQUIRED" | "INVITE_ONLY"
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
      app_role: ["admin", "moderator", "user", "superadmin"],
      guild_application_status: ["PENDING", "APPROVED", "REJECTED"],
      guild_join_policy: ["OPEN", "APPROVAL_REQUIRED", "INVITE_ONLY"],
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
