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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      bodybuilding_workouts: {
        Row: {
          created_at: string | null
          difficulty: string
          focus_area: string
          id: string
          notes: string | null
          title: string
          updated_at: string | null
          workout_content: string
        }
        Insert: {
          created_at?: string | null
          difficulty: string
          focus_area: string
          id?: string
          notes?: string | null
          title: string
          updated_at?: string | null
          workout_content: string
        }
        Update: {
          created_at?: string | null
          difficulty?: string
          focus_area?: string
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string | null
          workout_content?: string
        }
        Relationships: []
      }
      challenge_checkpoints: {
        Row: {
          challenge_id: string
          checked_at: string
          checkpoint_number: number
          id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          checked_at?: string
          checkpoint_number: number
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          checked_at?: string
          checkpoint_number?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_checkpoints_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "monthly_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      course_invitations: {
        Row: {
          course_id: string
          created_at: string
          id: string
          message: string | null
          recipient_id: string
          responded_at: string | null
          sender_id: string
          status: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          message?: string | null
          recipient_id: string
          responded_at?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          message?: string | null
          recipient_id?: string
          responded_at?: string | null
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_invitations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_registrations: {
        Row: {
          course_id: string
          id: string
          registered_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          id?: string
          registered_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          id?: string
          registered_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_registrations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_templates: {
        Row: {
          cancellation_deadline_minutes: number
          color: string | null
          created_at: string
          duration_minutes: number
          id: string
          max_participants: number
          registration_deadline_minutes: number
          strength_exercise: string | null
          title: string
          trainer: string
          updated_at: string
        }
        Insert: {
          cancellation_deadline_minutes?: number
          color?: string | null
          created_at?: string
          duration_minutes: number
          id?: string
          max_participants: number
          registration_deadline_minutes?: number
          strength_exercise?: string | null
          title: string
          trainer: string
          updated_at?: string
        }
        Update: {
          cancellation_deadline_minutes?: number
          color?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          max_participants?: number
          registration_deadline_minutes?: number
          strength_exercise?: string | null
          title?: string
          trainer?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          cancellation_deadline_minutes: number
          color: string | null
          course_date: string
          created_at: string
          duration_minutes: number
          end_time: string
          id: string
          is_cancelled: boolean
          max_participants: number
          registration_deadline_minutes: number
          start_time: string
          strength_exercise: string | null
          template_id: string
          title: string
          trainer: string
          updated_at: string
        }
        Insert: {
          cancellation_deadline_minutes?: number
          color?: string | null
          course_date: string
          created_at?: string
          duration_minutes: number
          end_time: string
          id?: string
          is_cancelled?: boolean
          max_participants: number
          registration_deadline_minutes: number
          start_time: string
          strength_exercise?: string | null
          template_id: string
          title: string
          trainer: string
          updated_at?: string
        }
        Update: {
          cancellation_deadline_minutes?: number
          color?: string | null
          course_date?: string
          created_at?: string
          duration_minutes?: number
          end_time?: string
          id?: string
          is_cancelled?: boolean
          max_participants?: number
          registration_deadline_minutes?: number
          start_time?: string
          strength_exercise?: string | null
          template_id?: string
          title?: string
          trainer?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "course_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      crossfit_workouts: {
        Row: {
          author_nickname: string
          created_at: string | null
          id: string
          notes: string | null
          required_exercises: Json | null
          scaling_beginner: string | null
          scaling_rx: string | null
          scaling_scaled: string | null
          title: string
          updated_at: string | null
          workout_content: string
          workout_type: string
        }
        Insert: {
          author_nickname: string
          created_at?: string | null
          id?: string
          notes?: string | null
          required_exercises?: Json | null
          scaling_beginner?: string | null
          scaling_rx?: string | null
          scaling_scaled?: string | null
          title: string
          updated_at?: string | null
          workout_content: string
          workout_type: string
        }
        Update: {
          author_nickname?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          required_exercises?: Json | null
          scaling_beginner?: string | null
          scaling_rx?: string | null
          scaling_scaled?: string | null
          title?: string
          updated_at?: string | null
          workout_content?: string
          workout_type?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          created_at: string | null
          created_by: string | null
          id: string
          subject: string
          title: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          subject: string
          title: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          subject?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gym_access_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      inactive_member_details: {
        Row: {
          cancellations: number | null
          category: string
          created_at: string | null
          days_since_last_activity: number
          display_name: string | null
          first_name: string | null
          id: string
          last_activity_date: string | null
          last_name: string | null
          membership_type: string | null
          snapshot_date: string
          total_bookings: number | null
          total_training_sessions: number | null
          user_id: string
        }
        Insert: {
          cancellations?: number | null
          category: string
          created_at?: string | null
          days_since_last_activity: number
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_activity_date?: string | null
          last_name?: string | null
          membership_type?: string | null
          snapshot_date: string
          total_bookings?: number | null
          total_training_sessions?: number | null
          user_id: string
        }
        Update: {
          cancellations?: number | null
          category?: string
          created_at?: string | null
          days_since_last_activity?: number
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_activity_date?: string | null
          last_name?: string | null
          membership_type?: string | null
          snapshot_date?: string
          total_bookings?: number | null
          total_training_sessions?: number | null
          user_id?: string
        }
        Relationships: []
      }
      inactive_member_snapshots: {
        Row: {
          active_under_10_count: number
          active_under_10_percentage: number | null
          created_at: string | null
          days_10_15_count: number
          days_10_15_percentage: number | null
          days_15_21_count: number
          days_15_21_percentage: number | null
          days_21_plus_count: number
          days_21_plus_percentage: number | null
          id: string
          snapshot_date: string
          total_previously_active: number
        }
        Insert: {
          active_under_10_count?: number
          active_under_10_percentage?: number | null
          created_at?: string | null
          days_10_15_count?: number
          days_10_15_percentage?: number | null
          days_15_21_count?: number
          days_15_21_percentage?: number | null
          days_21_plus_count?: number
          days_21_plus_percentage?: number | null
          id?: string
          snapshot_date: string
          total_previously_active?: number
        }
        Update: {
          active_under_10_count?: number
          active_under_10_percentage?: number | null
          created_at?: string | null
          days_10_15_count?: number
          days_10_15_percentage?: number | null
          days_15_21_count?: number
          days_15_21_percentage?: number | null
          days_21_plus_count?: number
          days_21_plus_percentage?: number | null
          id?: string
          snapshot_date?: string
          total_previously_active?: number
        }
        Relationships: []
      }
      leaderboard_entries: {
        Row: {
          challenge_bonus_points: number
          created_at: string
          id: string
          month: number
          training_count: number | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          challenge_bonus_points?: number
          created_at?: string
          id?: string
          month: number
          training_count?: number | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          challenge_bonus_points?: number
          created_at?: string
          id?: string
          month?: number
          training_count?: number | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      member_favorites: {
        Row: {
          created_at: string
          favorite_user_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          favorite_user_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          favorite_user_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      membership_credits: {
        Row: {
          created_at: string
          credits_remaining: number
          credits_total: number
          id: string
          last_recharged_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_remaining?: number
          credits_total?: number
          id?: string
          last_recharged_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_remaining?: number
          credits_total?: number
          id?: string
          last_recharged_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      merch_order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price_per_item: number
          product_type: string
          quantity: number
          size: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price_per_item: number
          product_type: string
          quantity?: number
          size: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price_per_item?: number
          product_type?: string
          quantity?: number
          size?: string
        }
        Relationships: [
          {
            foreignKeyName: "merch_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "merch_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      merch_orders: {
        Row: {
          created_at: string
          id: string
          is_paid: boolean
          notes: string | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_paid?: boolean
          notes?: string | null
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_paid?: boolean
          notes?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      merch_settings: {
        Row: {
          created_at: string
          id: string
          is_ordering_open: boolean
          order_deadline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_ordering_open?: boolean
          order_deadline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_ordering_open?: boolean
          order_deadline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      monthly_challenges: {
        Row: {
          bonus_points: number
          checkpoint_count: number
          created_at: string
          created_by: string
          description: string
          icon: string
          id: string
          is_archived: boolean
          is_primary: boolean
          is_recurring: boolean
          month: number
          title: string
          updated_at: string
          year: number
        }
        Insert: {
          bonus_points?: number
          checkpoint_count?: number
          created_at?: string
          created_by: string
          description: string
          icon?: string
          id?: string
          is_archived?: boolean
          is_primary?: boolean
          is_recurring?: boolean
          month: number
          title: string
          updated_at?: string
          year: number
        }
        Update: {
          bonus_points?: number
          checkpoint_count?: number
          created_at?: string
          created_by?: string
          description?: string
          icon?: string
          id?: string
          is_archived?: boolean
          is_primary?: boolean
          is_recurring?: boolean
          month?: number
          title?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      never_active_member_details: {
        Row: {
          category: string
          created_at: string | null
          days_since_signup: number
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          membership_type: string | null
          signup_date: string | null
          snapshot_date: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          days_since_signup: number
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          membership_type?: string | null
          signup_date?: string | null
          snapshot_date: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          days_since_signup?: number
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          membership_type?: string | null
          signup_date?: string | null
          snapshot_date?: string
          user_id?: string
        }
        Relationships: []
      }
      never_active_snapshots: {
        Row: {
          created_at: string | null
          days_0_7_count: number
          days_0_7_percentage: number | null
          days_15_21_count: number
          days_15_21_percentage: number | null
          days_21_plus_count: number
          days_21_plus_percentage: number | null
          days_8_14_count: number
          days_8_14_percentage: number | null
          id: string
          snapshot_date: string
          total_never_active: number
        }
        Insert: {
          created_at?: string | null
          days_0_7_count?: number
          days_0_7_percentage?: number | null
          days_15_21_count?: number
          days_15_21_percentage?: number | null
          days_21_plus_count?: number
          days_21_plus_percentage?: number | null
          days_8_14_count?: number
          days_8_14_percentage?: number | null
          id?: string
          snapshot_date: string
          total_never_active?: number
        }
        Update: {
          created_at?: string | null
          days_0_7_count?: number
          days_0_7_percentage?: number | null
          days_15_21_count?: number
          days_15_21_percentage?: number | null
          days_21_plus_count?: number
          days_21_plus_percentage?: number | null
          days_8_14_count?: number
          days_8_14_percentage?: number | null
          id?: string
          snapshot_date?: string
          total_never_active?: number
        }
        Relationships: []
      }
      news: {
        Row: {
          attachments: Json | null
          author_id: string
          content: string
          created_at: string
          email_sent_at: string | null
          id: string
          is_published: boolean
          link_url: string | null
          published_at: string
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          author_id: string
          content: string
          created_at?: string
          email_sent_at?: string | null
          id?: string
          is_published?: boolean
          link_url?: string | null
          published_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          author_id?: string
          content?: string
          created_at?: string
          email_sent_at?: string | null
          id?: string
          is_published?: boolean
          link_url?: string | null
          published_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_code: string | null
          authors: boolean | null
          avatar_url: string | null
          back_squat_1rm: number | null
          bench_press_1rm: number | null
          clean_1rm: number | null
          clean_and_jerk_1rm: number | null
          created_at: string
          deadlift_1rm: number | null
          display_name: string | null
          email: string | null
          extra_lifts: Json | null
          first_name: string | null
          front_squat_1rm: number | null
          id: string
          jerk_1rm: number | null
          last_inactivity_webhook_sent_at: string | null
          last_login_at: string | null
          last_name: string | null
          membership_type: string | null
          nickname: string | null
          preferred_exercises: Json | null
          show_in_leaderboard: boolean
          snatch_1rm: number | null
          status: string | null
          updated_at: string
          user_id: string | null
          welcome_dialog_shown: boolean
        }
        Insert: {
          access_code?: string | null
          authors?: boolean | null
          avatar_url?: string | null
          back_squat_1rm?: number | null
          bench_press_1rm?: number | null
          clean_1rm?: number | null
          clean_and_jerk_1rm?: number | null
          created_at?: string
          deadlift_1rm?: number | null
          display_name?: string | null
          email?: string | null
          extra_lifts?: Json | null
          first_name?: string | null
          front_squat_1rm?: number | null
          id?: string
          jerk_1rm?: number | null
          last_inactivity_webhook_sent_at?: string | null
          last_login_at?: string | null
          last_name?: string | null
          membership_type?: string | null
          nickname?: string | null
          preferred_exercises?: Json | null
          show_in_leaderboard?: boolean
          snatch_1rm?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          welcome_dialog_shown?: boolean
        }
        Update: {
          access_code?: string | null
          authors?: boolean | null
          avatar_url?: string | null
          back_squat_1rm?: number | null
          bench_press_1rm?: number | null
          clean_1rm?: number | null
          clean_and_jerk_1rm?: number | null
          created_at?: string
          deadlift_1rm?: number | null
          display_name?: string | null
          email?: string | null
          extra_lifts?: Json | null
          first_name?: string | null
          front_squat_1rm?: number | null
          id?: string
          jerk_1rm?: number | null
          last_inactivity_webhook_sent_at?: string | null
          last_login_at?: string | null
          last_name?: string | null
          membership_type?: string | null
          nickname?: string | null
          preferred_exercises?: Json | null
          show_in_leaderboard?: boolean
          snatch_1rm?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          welcome_dialog_shown?: boolean
        }
        Relationships: []
      }
      training_plans: {
        Row: {
          created_at: string
          current_week: number | null
          duration_weeks: number
          goal: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_week?: number | null
          duration_weeks: number
          goal: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_week?: number | null
          duration_weeks?: number
          goal?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          date: string
          feedback: string | null
          id: string
          plan_id: string | null
          status: string
          updated_at: string
          user_id: string
          workout_data: Json | null
          workout_type: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          date: string
          feedback?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          workout_data?: Json | null
          workout_type?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          date?: string
          feedback?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          workout_data?: Json | null
          workout_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          challenge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "monthly_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenge_progress: {
        Row: {
          challenge_id: string
          completed_at: string | null
          completed_checkpoints: number
          created_at: string
          id: string
          is_completed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          completed_checkpoints?: number
          created_at?: string
          id?: string
          is_completed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          completed_checkpoints?: number
          created_at?: string
          id?: string
          is_completed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "monthly_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_read_news: {
        Row: {
          id: string
          news_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          news_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          news_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_read_news_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
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
      waitlist_promotion_events: {
        Row: {
          course_id: string
          created_at: string
          id: string
          notified_at: string | null
          payload: Json | null
          registration_id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          notified_at?: string | null
          payload?: Json | null
          registration_id: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          notified_at?: string | null
          payload?: Json | null
          registration_id?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          webhook_type: string
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          webhook_type: string
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          webhook_type?: string
          webhook_url?: string
        }
        Relationships: []
      }
      weekly_course_limits: {
        Row: {
          created_at: string
          id: string
          registrations_count: number
          updated_at: string
          user_id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          registrations_count?: number
          updated_at?: string
          user_id: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          id?: string
          registrations_count?: number
          updated_at?: string
          user_id?: string
          week_start_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_challenge_bonus: {
        Args: { challenge_id_param: string; user_id_param: string }
        Returns: undefined
      }
      can_user_register_for_course: {
        Args: { course_id_param: string; user_id_param: string }
        Returns: boolean
      }
      debug_can_user_register_for_course: {
        Args: { course_id_param: string; user_id_param: string }
        Returns: {
          can_register: boolean
          course_date: string
          debug_info: string
          user_credits: number
          user_membership_type: string
          user_role: string
          weekly_count: number
        }[]
      }
      generate_courses_from_template: {
        Args: {
          end_date_param: string
          start_date_param: string
          template_id_param: string
        }
        Returns: {
          course_date: string
          course_id: string
          end_time: string
          start_time: string
        }[]
      }
      get_course_stats: {
        Args: { course_id_param: string }
        Returns: {
          max_participants: number
          registered_count: number
          waitlist_count: number
        }[]
      }
      get_inactive_members: {
        Args: { days_threshold?: number }
        Returns: {
          days_since_activity: number
          display_name: string
          first_name: string
          last_activity: string
          last_name: string
          membership_type: string
          user_id: string
          was_ever_active: boolean
        }[]
      }
      get_weekly_registrations_count: {
        Args: { check_date?: string; user_id_param: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_workouts: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          full_text: string
          part_a_description: string
          part_a_type: string
          part_b_description: string
          part_b_score_type: string
          part_c_description: string
          part_c_score_type: string
          similarity: number
          workout_id: string
        }[]
      }
      match_workouts_v2: {
        Args: {
          duration_minutes_param?: number
          focus_area_param?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
          session_type_param?: string
          user_preferred_exercises?: string[]
          workout_type_param?: string
        }
        Returns: {
          difficulty_level: string
          duration_minutes: number
          focus_area: string
          session_type: string
          similarity: number
          title: string
          workout_id: string
          workout_type: string
        }[]
      }
      update_leaderboard_entry: {
        Args: { session_date: string; user_id_param: string }
        Returns: undefined
      }
      update_member_status: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role:
        | "admin"
        | "member"
        | "trainer"
        | "open_gym"
        | "basic_member"
        | "premium_member"
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
      app_role: [
        "admin",
        "member",
        "trainer",
        "open_gym",
        "basic_member",
        "premium_member",
      ],
    },
  },
} as const
