export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
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
      leaderboard_entries: {
        Row: {
          created_at: string
          id: string
          month: number
          training_count: number | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          training_count?: number | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
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
      news: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_published: boolean
          published_at: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_code: string | null
          age: number | null
          back_squat_1rm: number | null
          bench_press_1rm: number | null
          birth_year: number | null
          clean_and_jerk_1rm: number | null
          created_at: string
          deadlift_1rm: number | null
          display_name: string | null
          extra_lifts: Json | null
          fitness_level: string | null
          front_squat_1rm: number | null
          gender: string | null
          id: string
          limitations: Json | null
          membership_type: string | null
          preferences: Json | null
          preferred_exercises: Json | null
          session_duration_minutes: number | null
          snatch_1rm: number | null
          training_frequency_per_week: number | null
          updated_at: string
          user_id: string | null
          weight_kg: number | null
        }
        Insert: {
          access_code?: string | null
          age?: number | null
          back_squat_1rm?: number | null
          bench_press_1rm?: number | null
          birth_year?: number | null
          clean_and_jerk_1rm?: number | null
          created_at?: string
          deadlift_1rm?: number | null
          display_name?: string | null
          extra_lifts?: Json | null
          fitness_level?: string | null
          front_squat_1rm?: number | null
          gender?: string | null
          id?: string
          limitations?: Json | null
          membership_type?: string | null
          preferences?: Json | null
          preferred_exercises?: Json | null
          session_duration_minutes?: number | null
          snatch_1rm?: number | null
          training_frequency_per_week?: number | null
          updated_at?: string
          user_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          access_code?: string | null
          age?: number | null
          back_squat_1rm?: number | null
          bench_press_1rm?: number | null
          birth_year?: number | null
          clean_and_jerk_1rm?: number | null
          created_at?: string
          deadlift_1rm?: number | null
          display_name?: string | null
          extra_lifts?: Json | null
          fitness_level?: string | null
          front_squat_1rm?: number | null
          gender?: string | null
          id?: string
          limitations?: Json | null
          membership_type?: string | null
          preferences?: Json | null
          preferred_exercises?: Json | null
          session_duration_minutes?: number | null
          snatch_1rm?: number | null
          training_frequency_per_week?: number | null
          updated_at?: string
          user_id?: string | null
          weight_kg?: number | null
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
      workouts_rag: {
        Row: {
          created_at: string | null
          embedding: string | null
          full_text: string | null
          part_a_description: string | null
          part_a_duration: string | null
          part_a_notes: string | null
          part_a_type: string | null
          part_b_description: string | null
          part_b_duration: string | null
          part_b_notes: string | null
          part_b_score_type: string | null
          part_c_description: string | null
          part_c_duration: string | null
          part_c_notes: string | null
          part_c_score_type: string | null
          updated_at: string | null
          workout_id: string
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          full_text?: string | null
          part_a_description?: string | null
          part_a_duration?: string | null
          part_a_notes?: string | null
          part_a_type?: string | null
          part_b_description?: string | null
          part_b_duration?: string | null
          part_b_notes?: string | null
          part_b_score_type?: string | null
          part_c_description?: string | null
          part_c_duration?: string | null
          part_c_notes?: string | null
          part_c_score_type?: string | null
          updated_at?: string | null
          workout_id?: string
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          full_text?: string | null
          part_a_description?: string | null
          part_a_duration?: string | null
          part_a_notes?: string | null
          part_a_type?: string | null
          part_b_description?: string | null
          part_b_duration?: string | null
          part_b_notes?: string | null
          part_b_score_type?: string | null
          part_c_description?: string | null
          part_c_duration?: string | null
          part_c_notes?: string | null
          part_c_score_type?: string | null
          updated_at?: string | null
          workout_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_waitlist: {
        Args: { course_id_param: string }
        Returns: undefined
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      generate_courses_from_template: {
        Args: {
          template_id_param: string
          start_date_param: string
          end_date_param: string
        }
        Returns: {
          course_id: string
          course_date: string
          start_time: string
          end_time: string
        }[]
      }
      get_course_stats: {
        Args: { course_id_param: string }
        Returns: {
          registered_count: number
          waitlist_count: number
          max_participants: number
        }[]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      match_workouts: {
        Args: {
          query_embedding: string
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          workout_id: string
          full_text: string
          part_a_description: string
          part_b_description: string
          part_c_description: string
          part_a_type: string
          part_b_score_type: string
          part_c_score_type: string
          similarity: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      update_leaderboard_entry: {
        Args: { user_id_param: string; session_date: string }
        Returns: undefined
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "member" | "trainer"
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
      app_role: ["admin", "member", "trainer"],
    },
  },
} as const
