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
      patients: {
        Row: {
          aadhar: string | null
          address: string | null
          allergies: string | null
          blood_group: string | null
          created_at: string | null
          current_medications: string | null
          date_of_birth: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string
          gender: string
          govt_id_new: string | null
          govt_id_old: string | null
          last_name: string
          medical_history: string | null
          next_follow_up_date: string | null
          patient_id: string
          phone: string
          updated_at: string | null
          visit_date: string | null
        }
        Insert: {
          aadhar?: string | null
          address?: string | null
          allergies?: string | null
          blood_group?: string | null
          created_at?: string | null
          current_medications?: string | null
          date_of_birth: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name: string
          gender: string
          govt_id_new?: string | null
          govt_id_old?: string | null
          last_name: string
          medical_history?: string | null
          next_follow_up_date?: string | null
          patient_id: string
          phone: string
          updated_at?: string | null
          visit_date?: string | null
        }
        Update: {
          aadhar?: string | null
          address?: string | null
          allergies?: string | null
          blood_group?: string | null
          created_at?: string | null
          current_medications?: string | null
          date_of_birth?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string
          gender?: string
          govt_id_new?: string | null
          govt_id_old?: string | null
          last_name?: string
          medical_history?: string | null
          next_follow_up_date?: string | null
          patient_id?: string
          phone?: string
          updated_at?: string | null
          visit_date?: string | null
        }
        Relationships: []
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
