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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          event_type: string
          hours_spent: number | null
          id: string
          logged_at: string
          notes: string | null
          requirement_id: string
          title: string
        }
        Insert: {
          event_type: string
          hours_spent?: number | null
          id?: string
          logged_at?: string
          notes?: string | null
          requirement_id: string
          title: string
        }
        Update: {
          event_type?: string
          hours_spent?: number | null
          id?: string
          logged_at?: string
          notes?: string | null
          requirement_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          document_name: string
          file_url: string
          id: string
          requirement_id: string
          uploaded_at: string
          version: string
        }
        Insert: {
          document_name: string
          file_url: string
          id?: string
          requirement_id: string
          uploaded_at?: string
          version?: string
        }
        Update: {
          document_name?: string
          file_url?: string
          id?: string
          requirement_id?: string
          uploaded_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      requirement_tasks: {
        Row: {
          blockers: string | null
          completed_date: string | null
          created_at: string
          detail: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          milestone: string | null
          notes: string | null
          phase_name: string
          phase_number: number
          planned_end_date: string | null
          planned_start_date: string | null
          requirement_id: string
          sort_order: number
          status: string
          task_name: string
        }
        Insert: {
          blockers?: string | null
          completed_date?: string | null
          created_at?: string
          detail?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          milestone?: string | null
          notes?: string | null
          phase_name: string
          phase_number: number
          planned_end_date?: string | null
          planned_start_date?: string | null
          requirement_id: string
          sort_order?: number
          status?: string
          task_name: string
        }
        Update: {
          blockers?: string | null
          completed_date?: string | null
          created_at?: string
          detail?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          milestone?: string | null
          notes?: string | null
          phase_name?: string
          phase_number?: number
          planned_end_date?: string | null
          planned_start_date?: string | null
          requirement_id?: string
          sort_order?: number
          status?: string
          task_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirement_tasks_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      requirements: {
        Row: {
          billing_date: string | null
          category: string | null
          code: string
          complexity: string | null
          created_at: string
          deadline: string | null
          dev_environment_url: string | null
          documentation_folder_url: string | null
          estimated_hours: number | null
          executed_hours: number | null
          has_detail_tracking: boolean
          id: string
          month_label: string | null
          notes: string | null
          parent_requirement_id: string | null
          project_id: string
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          billing_date?: string | null
          category?: string | null
          code: string
          complexity?: string | null
          created_at?: string
          deadline?: string | null
          dev_environment_url?: string | null
          documentation_folder_url?: string | null
          estimated_hours?: number | null
          executed_hours?: number | null
          has_detail_tracking?: boolean
          id?: string
          month_label?: string | null
          notes?: string | null
          parent_requirement_id?: string | null
          project_id: string
          slug: string
          status: string
          title: string
          updated_at?: string
        }
        Update: {
          billing_date?: string | null
          category?: string | null
          code?: string
          complexity?: string | null
          created_at?: string
          deadline?: string | null
          dev_environment_url?: string | null
          documentation_folder_url?: string | null
          estimated_hours?: number | null
          executed_hours?: number | null
          has_detail_tracking?: boolean
          id?: string
          month_label?: string | null
          notes?: string | null
          parent_requirement_id?: string | null
          project_id?: string
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirements_parent_requirement_id_fkey"
            columns: ["parent_requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
