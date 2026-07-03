export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          career_goal: string | null;
          target_role: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          career_goal?: string | null;
          target_role?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          career_goal?: string | null;
          target_role?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      resume_analyses: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          file_type: string;
          extracted_text: string | null;
          parsed_profile: Json | null;
          user_profile: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_name: string;
          file_type: string;
          extracted_text?: string | null;
          parsed_profile?: Json | null;
          user_profile?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string;
          file_type?: string;
          extracted_text?: string | null;
          parsed_profile?: Json | null;
          user_profile?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      job_matches: {
        Row: {
          id: string;
          user_id: string;
          job_title: string | null;
          company_name: string | null;
          job_description: string;
          match_result: Json | null;
          improvement_plan: Json | null;
          rewrite_plan: Json | null;
          roadmap: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_title?: string | null;
          company_name?: string | null;
          job_description: string;
          match_result?: Json | null;
          improvement_plan?: Json | null;
          rewrite_plan?: Json | null;
          roadmap?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          job_title?: string | null;
          company_name?: string | null;
          job_description?: string;
          match_result?: Json | null;
          improvement_plan?: Json | null;
          rewrite_plan?: Json | null;
          roadmap?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      career_snapshots: {
        Row: {
          id: string;
          user_id: string;
          career_iq: Json | null;
          recruiter_confidence: Json | null;
          salary_projection: Json | null;
          role_matches: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          career_iq?: Json | null;
          recruiter_confidence?: Json | null;
          salary_projection?: Json | null;
          role_matches?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          career_iq?: Json | null;
          recruiter_confidence?: Json | null;
          salary_projection?: Json | null;
          role_matches?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
