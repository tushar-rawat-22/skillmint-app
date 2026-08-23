export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_personas: {
        Row: {
          created_at: string
          persona: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          persona: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          persona?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      active_resume_selections: {
        Row: {
          resume_analysis_id: string
          selected_at: string
          user_id: string
        }
        Insert: {
          resume_analysis_id: string
          selected_at?: string
          user_id: string
        }
        Update: {
          resume_analysis_id?: string
          selected_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_resume_selections_user_id_resume_analysis_id_fkey"
            columns: ["user_id", "resume_analysis_id"]
            isOneToOne: false
            referencedRelation: "resume_analyses"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          build_id: string
          environment: string
          event_id: string
          event_name: string
          event_version: number
          occurred_at: string
          owner_mode: string
          properties: Json
          received_at: string
          source_screen: string
        }
        Insert: {
          build_id: string
          environment: string
          event_id: string
          event_name: string
          event_version: number
          occurred_at: string
          owner_mode: string
          properties: Json
          received_at?: string
          source_screen: string
        }
        Update: {
          build_id?: string
          environment?: string
          event_id?: string
          event_name?: string
          event_version?: number
          occurred_at?: string
          owner_mode?: string
          properties?: Json
          received_at?: string
          source_screen?: string
        }
        Relationships: []
      }
      beta_feedback: {
        Row: {
          created_at: string
          feedback_type: string
          id: string
          message: string
          page_path: string | null
          sentiment: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feedback_type: string
          id?: string
          message: string
          page_path?: string | null
          sentiment: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feedback_type?: string
          id?: string
          message?: string
          page_path?: string | null
          sentiment?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      career_snapshots: {
        Row: {
          career_iq: Json | null
          created_at: string
          id: string
          recruiter_confidence: Json | null
          role_matches: Json | null
          salary_projection: Json | null
          user_id: string
        }
        Insert: {
          career_iq?: Json | null
          created_at?: string
          id?: string
          recruiter_confidence?: Json | null
          role_matches?: Json | null
          salary_projection?: Json | null
          user_id: string
        }
        Update: {
          career_iq?: Json | null
          created_at?: string
          id?: string
          recruiter_confidence?: Json | null
          role_matches?: Json | null
          salary_projection?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      job_matches: {
        Row: {
          company_name: string | null
          created_at: string
          id: string
          improvement_plan: Json | null
          job_description: string
          job_title: string | null
          match_result: Json | null
          rewrite_plan: Json | null
          roadmap: Json | null
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          id?: string
          improvement_plan?: Json | null
          job_description: string
          job_title?: string | null
          match_result?: Json | null
          rewrite_plan?: Json | null
          roadmap?: Json | null
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          id?: string
          improvement_plan?: Json | null
          job_description?: string
          job_title?: string | null
          match_result?: Json | null
          rewrite_plan?: Json | null
          roadmap?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          career_goal: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          target_role: string | null
          updated_at: string
        }
        Insert: {
          career_goal?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          target_role?: string | null
          updated_at?: string
        }
        Update: {
          career_goal?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          target_role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      proof_briefs: {
        Row: {
          brief_payload: Json
          created_at: string
          id: string
          revoked_at: string | null
          share_created_at: string | null
          share_token_hash: string | null
          source_resume_analysis_id: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          brief_payload: Json
          created_at?: string
          id?: string
          revoked_at?: string | null
          share_created_at?: string | null
          share_token_hash?: string | null
          source_resume_analysis_id: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          brief_payload?: Json
          created_at?: string
          id?: string
          revoked_at?: string | null
          share_created_at?: string | null
          share_token_hash?: string | null
          source_resume_analysis_id?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_briefs_source_owner_fkey"
            columns: ["user_id", "source_resume_analysis_id"]
            isOneToOne: false
            referencedRelation: "resume_analyses"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      resume_analyses: {
        Row: {
          created_at: string
          extracted_text: string | null
          file_name: string
          file_type: string
          id: string
          parsed_profile: Json | null
          user_id: string
          user_profile: Json | null
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          file_name: string
          file_type: string
          id?: string
          parsed_profile?: Json | null
          user_id: string
          user_profile?: Json | null
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          file_name?: string
          file_type?: string
          id?: string
          parsed_profile?: Json | null
          user_id?: string
          user_profile?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_current_user_saved_reports: {
        Args: never
        Returns: {
          career_snapshots_deleted: number
          job_matches_deleted: number
          resume_analyses_deleted: number
        }[]
      }
      get_founder_analytics_summary: {
        Args: { canonical_environment: string; requested_window: string }
        Returns: {
          summary: Json
        }[]
      }
      get_shared_proof_brief: {
        Args: { requested_token_hash: string }
        Returns: Json
      }
      is_active_skillmint_user: { Args: never; Returns: boolean }
      prepare_account_deletion: {
        Args: { target_user_id: string }
        Returns: {
          active_resume_selections_deleted: number
          beta_feedback_deleted: number
          career_snapshots_deleted: number
          job_matches_deleted: number
          profiles_deleted: number
          resume_analyses_deleted: number
          verified_absent: boolean
        }[]
      }
      purge_expired_analytics_events: {
        Args: never
        Returns: {
          deleted_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
