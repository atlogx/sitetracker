export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          code: string | null
          general_director_name: string
          general_director_email: string
          general_director_phone: string
          financial_service_name: string
          financial_service_email: string
          financial_service_phone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          general_director_name: string
          general_director_email: string
          general_director_phone: string
          financial_service_name: string
          financial_service_email: string
          financial_service_phone: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          general_director_name?: string
          general_director_email?: string
          general_director_phone?: string
          financial_service_name?: string
          financial_service_email?: string
          financial_service_phone?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          name: string
          code: string | null
          organization_id: string
          client_name: string
          client_email: string
          client_phone: string
          project_director_name: string
          project_director_email: string
          project_director_phone: string
          mission_manager_name: string
          mission_manager_email: string
          mission_manager_phone: string
          is_active: boolean
          global_status: 'active' | 'demobilized'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          organization_id: string
          client_name: string
          client_email: string
          client_phone: string
          project_director_name: string
          project_director_email: string
          project_director_phone: string
          mission_manager_name: string
          mission_manager_email: string
          mission_manager_phone: string
          is_active?: boolean
          global_status?: 'active' | 'demobilized'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          organization_id?: string
          client_name?: string
          client_email?: string
          client_phone?: string
          project_director_name?: string
          project_director_email?: string
          project_director_phone?: string
          mission_manager_name?: string
          mission_manager_email?: string
          mission_manager_phone?: string
          is_active?: boolean
          global_status?: 'active' | 'demobilized'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      sites: {
        Row: {
          id: string
          name: string
          code: string | null
          address: string
          project_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          address: string
          project_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          address?: string
          project_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      companies: {
        Row: {
          id: string
          name: string
          address: string
          email: string
          phone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          email: string
          phone: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          email?: string
          phone?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_sites: {
        Row: {
          id: string
          company_id: string
          site_id: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          site_id: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          site_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_sites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          }
        ]
      }
      monthly_progress: {
        Row: {
          id: string
          site_id: string
          month: string
          total_progress: number | null
          monthly_progress: number | null
          normal_rate: number | null
          target_rate: number | null
          delay_rate: number | null
          observations: string | null
          status: 'good' | 'problematic' | 'critical'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_id: string
          month: string
          total_progress?: number | null
          monthly_progress?: number | null
          normal_rate?: number | null
          target_rate?: number | null
          delay_rate?: number | null
          observations?: string | null
          status?: 'good' | 'problematic' | 'critical'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          month?: string
          total_progress?: number | null
          monthly_progress?: number | null
          normal_rate?: number | null
          target_rate?: number | null
          delay_rate?: number | null
          observations?: string | null
          status?: 'good' | 'problematic' | 'critical'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_progress_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          }
        ]
      }
      alerts: {
        Row: {
          id: string
          type: 'data_entry_delay' | 'problematic' | 'critical' | 'pre_demobilization' | 'demobilization'
          title: string
          message: string
          project_id: string
          site_id: string | null
          recipients: Json
          creation_date: string
          sent_date: string | null
          status: 'pending' | 'sent' | 'failed'
          priority: 'low' | 'medium' | 'high' | 'critical'
          concerned_month: number | null
          concerned_year: number | null
          metrics: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: 'data_entry_delay' | 'problematic' | 'critical' | 'pre_demobilization' | 'demobilization'
          title: string
          message: string
          project_id: string
          site_id?: string | null
          recipients: Json
          creation_date?: string
          sent_date?: string | null
          status?: 'pending' | 'sent' | 'failed'
          priority?: 'low' | 'medium' | 'high' | 'critical'
          concerned_month?: number | null
          concerned_year?: number | null
          metrics?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: 'data_entry_delay' | 'problematic' | 'critical' | 'pre_demobilization' | 'demobilization'
          title?: string
          message?: string
          project_id?: string
          site_id?: string | null
          recipients?: Json
          creation_date?: string
          sent_date?: string | null
          status?: 'pending' | 'sent' | 'failed'
          priority?: 'low' | 'medium' | 'high' | 'critical'
          concerned_month?: number | null
          concerned_year?: number | null
          metrics?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          }
        ]
      }
      status_history: {
        Row: {
          id: string
          project_id: string
          site_id: string | null
          month: number
          year: number
          previous_status: 'good' | 'problematic' | 'critical'
          new_status: 'good' | 'problematic' | 'critical'
          change_date: string
          change_reason: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          site_id?: string | null
          month: number
          year: number
          previous_status: 'good' | 'problematic' | 'critical'
          new_status: 'good' | 'problematic' | 'critical'
          change_date?: string
          change_reason: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          site_id?: string | null
          month?: number
          year?: number
          previous_status?: 'good' | 'problematic' | 'critical'
          new_status?: 'good' | 'problematic' | 'critical'
          change_date?: string
          change_reason?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_history_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          }
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never