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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          patient_id: number
          patient_name: string
          patient_phone: string | null
          reason: string
          reminder_sent: boolean
          status: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id: number
          patient_name: string
          patient_phone?: string | null
          reason: string
          reminder_sent?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id?: number
          patient_name?: string
          patient_phone?: string | null
          reason?: string
          reminder_sent?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          is_spam: boolean
          post_id: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_spam?: boolean
          post_id: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_spam?: boolean
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      day_reports: {
        Row: {
          adjustments: number | null
          cash_denominations: Json | null
          cash_handover_amarjeet: number | null
          cash_handover_mandeep: number | null
          cash_handover_sir: number | null
          cash_previous_day: number | null
          created_at: string | null
          created_by: string | null
          deposit_in_bank: number | null
          expenses: Json | null
          fees: number | null
          follow_up_patients: number | null
          id: string
          lab_collection: number | null
          loose_balance: number | null
          new_patients: number | null
          paytm_gpay: number | null
          psychiatry_collection: number | null
          psychiatry_patients: number | null
          report_date: string
          tapentadol_patients: number | null
          updated_at: string | null
        }
        Insert: {
          adjustments?: number | null
          cash_denominations?: Json | null
          cash_handover_amarjeet?: number | null
          cash_handover_mandeep?: number | null
          cash_handover_sir?: number | null
          cash_previous_day?: number | null
          created_at?: string | null
          created_by?: string | null
          deposit_in_bank?: number | null
          expenses?: Json | null
          fees?: number | null
          follow_up_patients?: number | null
          id?: string
          lab_collection?: number | null
          loose_balance?: number | null
          new_patients?: number | null
          paytm_gpay?: number | null
          psychiatry_collection?: number | null
          psychiatry_patients?: number | null
          report_date: string
          tapentadol_patients?: number | null
          updated_at?: string | null
        }
        Update: {
          adjustments?: number | null
          cash_denominations?: Json | null
          cash_handover_amarjeet?: number | null
          cash_handover_mandeep?: number | null
          cash_handover_sir?: number | null
          cash_previous_day?: number | null
          created_at?: string | null
          created_by?: string | null
          deposit_in_bank?: number | null
          expenses?: Json | null
          fees?: number | null
          follow_up_patients?: number | null
          id?: string
          lab_collection?: number | null
          loose_balance?: number | null
          new_patients?: number | null
          paytm_gpay?: number | null
          psychiatry_collection?: number | null
          psychiatry_patients?: number | null
          report_date?: string
          tapentadol_patients?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          batch_no: string | null
          created_at: string
          expiry_date: string | null
          id: string
          invoice_id: string
          medicine_id: number
          medicine_name: string
          mrp: number
          prescription_id: string | null
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          batch_no?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          invoice_id: string
          medicine_id: number
          medicine_name: string
          mrp?: number
          prescription_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Update: {
          batch_no?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          invoice_id?: string
          medicine_id?: number
          medicine_name?: string
          mrp?: number
          prescription_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          patient_id: string
          patient_name: string
          patient_phone: string | null
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          patient_id: string
          patient_name: string
          patient_phone?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          patient_id?: string
          patient_name?: string
          patient_phone?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      leaked_password_rejections: {
        Row: {
          created_by: string | null
          email: string | null
          event_time: string
          id: string
          ip: unknown
          raw_payload: Json | null
          reason: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_by?: string | null
          email?: string | null
          event_time?: string
          id?: string
          ip?: unknown
          raw_payload?: Json | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_by?: string | null
          email?: string | null
          event_time?: string
          id?: string
          ip?: unknown
          raw_payload?: Json | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      likes: {
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
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          aadhar_card: string
          address: string
          age: string
          category: string | null
          father_name: string
          file_no: string
          govt_id: string
          id: number
          new_govt_id: string
          patient_name: string
          phone: string
          s_no: string
        }
        Insert: {
          aadhar_card: string
          address: string
          age: string
          category?: string | null
          father_name: string
          file_no?: string
          govt_id: string
          id?: number
          new_govt_id: string
          patient_name: string
          phone: string
          s_no: string
        }
        Update: {
          aadhar_card?: string
          address?: string
          age?: string
          category?: string | null
          father_name?: string
          file_no?: string
          govt_id?: string
          id?: number
          new_govt_id?: string
          patient_name?: string
          phone?: string
          s_no?: string
        }
        Relationships: []
      }
      post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          category_id: string | null
          content: string
          created_at: string
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          created_at: string
          dosage: string
          duration: string
          frequency: string
          id: string
          instructions: string | null
          medicine_name: string
          prescription_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          dosage: string
          duration: string
          frequency: string
          id?: string
          instructions?: string | null
          medicine_name: string
          prescription_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          dosage?: string
          duration?: string
          frequency?: string
          id?: string
          instructions?: string | null
          medicine_name?: string
          prescription_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          appointment_id: string | null
          created_at: string
          created_by: string | null
          diagnosis: string
          id: string
          notes: string | null
          patient_age: string | null
          patient_id: number
          patient_id_temp: number | null
          patient_name: string
          patient_phone: string | null
          prescription_date: string
          prescription_number: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis: string
          id?: string
          notes?: string | null
          patient_age?: string | null
          patient_id: number
          patient_id_temp?: number | null
          patient_name: string
          patient_phone?: string | null
          prescription_date?: string
          prescription_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string
          id?: string
          notes?: string | null
          patient_age?: string | null
          patient_id?: number
          patient_id_temp?: number | null
          patient_name?: string
          patient_phone?: string | null
          prescription_date?: string
          prescription_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          id: number
          purchase_order_id: number
          quantity: number
          stock_item_id: number
          stock_item_name: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          purchase_order_id: number
          quantity: number
          stock_item_id: number
          stock_item_name: string
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: number
          purchase_order_id?: number
          quantity?: number
          stock_item_id?: number
          stock_item_name?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          expected_delivery: string
          grn_date: string | null
          id: number
          notes: string | null
          order_date: string
          po_number: string
          status: string
          supplier: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expected_delivery: string
          grn_date?: string | null
          id?: number
          notes?: string | null
          order_date: string
          po_number: string
          status: string
          supplier: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expected_delivery?: string
          grn_date?: string | null
          id?: number
          notes?: string | null
          order_date?: string
          po_number?: string
          status?: string
          supplier?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      stock_items: {
        Row: {
          batch_no: string
          category: string
          created_at: string | null
          current_stock: number
          expiry_date: string
          item_id: number
          minimum_stock: number
          mrp: number | null
          name: string
          status: string | null
          supplier: string
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          batch_no: string
          category: string
          created_at?: string | null
          current_stock?: number
          expiry_date: string
          item_id?: number
          minimum_stock?: number
          mrp?: number | null
          name: string
          status?: string | null
          supplier: string
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          batch_no?: string
          category?: string
          created_at?: string | null
          current_stock?: number
          expiry_date?: string
          item_id?: number
          minimum_stock?: number
          mrp?: number | null
          name?: string
          status?: string | null
          supplier?: string
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
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
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string | null
          username: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role?: string | null
          username: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      post_overview: {
        Row: {
          author_id: string | null
          author_username: string | null
          category_id: string | null
          category_name: string | null
          created_at: string | null
          id: string | null
          is_published: boolean | null
          like_count: number | null
          published_at: string | null
          slug: string | null
          summary: string | null
          tags: Json | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_leaked_password_rejection: {
        Args: {
          p_actor?: string
          p_email: string
          p_ip: unknown
          p_raw_payload: Json
          p_reason: string
          p_user_agent: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "user"
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
      app_role: ["admin", "staff", "user"],
    },
  },
} as const
