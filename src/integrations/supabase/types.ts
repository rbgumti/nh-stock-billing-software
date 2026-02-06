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
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          patient_id: string | null
          patient_name: string | null
          patient_phone: string | null
          reason: string | null
          reminder_sent: boolean | null
          status: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          reason?: string | null
          reminder_sent?: boolean | null
          status?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          reason?: string | null
          reminder_sent?: boolean | null
          status?: string | null
          type?: string | null
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
      attendance_records: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          employee_id: string | null
          id: string
          notes: string | null
          status: string | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date: string
          employee_id?: string | null
          id?: string
          notes?: string | null
          status?: string | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          employee_id?: string | null
          id?: string
          notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      day_reports: {
        Row: {
          adjustments: number | null
          advances: Json | null
          cash_denominations: Json | null
          cash_handover_amarjeet: number | null
          cash_handover_mandeep: number | null
          cash_handover_sir: number | null
          cash_previous_day: number | null
          created_at: string
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
          stock_snapshot: Json | null
          tapentadol_patients: number | null
          updated_at: string
        }
        Insert: {
          adjustments?: number | null
          advances?: Json | null
          cash_denominations?: Json | null
          cash_handover_amarjeet?: number | null
          cash_handover_mandeep?: number | null
          cash_handover_sir?: number | null
          cash_previous_day?: number | null
          created_at?: string
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
          stock_snapshot?: Json | null
          tapentadol_patients?: number | null
          updated_at?: string
        }
        Update: {
          adjustments?: number | null
          advances?: Json | null
          cash_denominations?: Json | null
          cash_handover_amarjeet?: number | null
          cash_handover_mandeep?: number | null
          cash_handover_sir?: number | null
          cash_previous_day?: number | null
          created_at?: string
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
          stock_snapshot?: Json | null
          tapentadol_patients?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          aadhar_number: string | null
          address: string | null
          bank_account_number: string | null
          bank_name: string | null
          created_at: string
          date_of_joining: string | null
          department: string | null
          designation: string | null
          email: string | null
          id: string
          ifsc_code: string | null
          name: string
          pan_number: string | null
          phone: string | null
          salary: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          aadhar_number?: string | null
          address?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          date_of_joining?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          ifsc_code?: string | null
          name: string
          pan_number?: string | null
          phone?: string | null
          salary?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          aadhar_number?: string | null
          address?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          date_of_joining?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          ifsc_code?: string | null
          name?: string
          pan_number?: string | null
          phone?: string | null
          salary?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          batch_no: string | null
          created_at: string
          discount: number | null
          duration_days: number | null
          expiry_date: string | null
          frequency: string | null
          id: string
          invoice_id: string
          is_returned: boolean | null
          medicine_id: number | null
          medicine_name: string
          mrp: number | null
          quantity: number
          returned_quantity: number | null
          stock_item_id: number | null
          total: number
          unit_price: number
        }
        Insert: {
          batch_no?: string | null
          created_at?: string
          discount?: number | null
          duration_days?: number | null
          expiry_date?: string | null
          frequency?: string | null
          id?: string
          invoice_id: string
          is_returned?: boolean | null
          medicine_id?: number | null
          medicine_name: string
          mrp?: number | null
          quantity?: number
          returned_quantity?: number | null
          stock_item_id?: number | null
          total?: number
          unit_price?: number
        }
        Update: {
          batch_no?: string | null
          created_at?: string
          discount?: number | null
          duration_days?: number | null
          expiry_date?: string | null
          frequency?: string | null
          id?: string
          invoice_id?: string
          is_returned?: boolean | null
          medicine_id?: number | null
          medicine_name?: string
          mrp?: number | null
          quantity?: number
          returned_quantity?: number | null
          stock_item_id?: number | null
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
            foreignKeyName: "invoice_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "invoice_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["item_id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string | null
          discount: number | null
          follow_up_date: string | null
          id: string
          invoice_date: string
          invoice_number: string | null
          notes: string | null
          patient_id: string | null
          patient_name: string | null
          patient_phone: string | null
          payment_method: string | null
          payment_status: string | null
          prescription_id: string | null
          status: string | null
          subtotal: number | null
          tax: number | null
          total: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount?: number | null
          follow_up_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          notes?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          payment_method?: string | null
          payment_status?: string | null
          prescription_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount?: number | null
          follow_up_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          notes?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          payment_method?: string | null
          payment_status?: string | null
          prescription_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          aadhar_card: string | null
          address: string | null
          age: string | null
          allergies: string | null
          blood_group: string | null
          category: string | null
          chief_complaint: string | null
          chronic_conditions: string | null
          city: string | null
          created_at: string
          created_by: string | null
          current_medications: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          father_name: string | null
          file_no: string | null
          first_name: string
          gender: string | null
          govt_id: string | null
          id: string
          insurance_policy_number: string | null
          insurance_provider: string | null
          last_name: string | null
          medical_notes: string | null
          new_govt_id: string | null
          notes: string | null
          patient_id: string | null
          patient_name: string | null
          phone: string | null
          phone_alt: string | null
          pincode: string | null
          referred_by: string | null
          s_no: number
          state: string | null
          status: string | null
          updated_at: string
          visit_type: string | null
        }
        Insert: {
          aadhar_card?: string | null
          address?: string | null
          age?: string | null
          allergies?: string | null
          blood_group?: string | null
          category?: string | null
          chief_complaint?: string | null
          chronic_conditions?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          current_medications?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          father_name?: string | null
          file_no?: string | null
          first_name: string
          gender?: string | null
          govt_id?: string | null
          id?: string
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_name?: string | null
          medical_notes?: string | null
          new_govt_id?: string | null
          notes?: string | null
          patient_id?: string | null
          patient_name?: string | null
          phone?: string | null
          phone_alt?: string | null
          pincode?: string | null
          referred_by?: string | null
          s_no?: number
          state?: string | null
          status?: string | null
          updated_at?: string
          visit_type?: string | null
        }
        Update: {
          aadhar_card?: string | null
          address?: string | null
          age?: string | null
          allergies?: string | null
          blood_group?: string | null
          category?: string | null
          chief_complaint?: string | null
          chronic_conditions?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          current_medications?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          father_name?: string | null
          file_no?: string | null
          first_name?: string
          gender?: string | null
          govt_id?: string | null
          id?: string
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_name?: string | null
          medical_notes?: string | null
          new_govt_id?: string | null
          notes?: string | null
          patient_id?: string | null
          patient_name?: string | null
          phone?: string | null
          phone_alt?: string | null
          pincode?: string | null
          referred_by?: string | null
          s_no?: number
          state?: string | null
          status?: string | null
          updated_at?: string
          visit_type?: string | null
        }
        Relationships: []
      }
      prescription_items: {
        Row: {
          created_at: string | null
          dosage: string | null
          duration: string | null
          frequency: string | null
          id: string
          instructions: string | null
          medicine_name: string
          prescription_id: string | null
          quantity: number | null
        }
        Insert: {
          created_at?: string | null
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medicine_name: string
          prescription_id?: string | null
          quantity?: number | null
        }
        Update: {
          created_at?: string | null
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medicine_name?: string
          prescription_id?: string | null
          quantity?: number | null
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
          diagnosis: string | null
          follow_up_date: string | null
          id: string
          instructions: string | null
          medicines: Json | null
          notes: string | null
          patient_age: string | null
          patient_id: string | null
          patient_name: string | null
          patient_phone: string | null
          prescription_date: string | null
          prescription_number: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          follow_up_date?: string | null
          id?: string
          instructions?: string | null
          medicines?: Json | null
          notes?: string | null
          patient_age?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          prescription_date?: string | null
          prescription_number?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          follow_up_date?: string | null
          id?: string
          instructions?: string | null
          medicines?: Json | null
          notes?: string | null
          patient_age?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          prescription_date?: string | null
          prescription_number?: string | null
          status?: string | null
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
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          batch_no: string | null
          created_at: string
          expiry_date: string | null
          free_quantity: number | null
          id: string
          item_name: string
          mrp: number | null
          pack_size: string | null
          purchase_order_id: string
          qty_in_strips: number | null
          qty_in_tabs: number | null
          quantity: number
          received_quantity: number | null
          stock_item_id: number | null
          stock_item_name: string | null
          total: number
          total_price: number | null
          unit_price: number
        }
        Insert: {
          batch_no?: string | null
          created_at?: string
          expiry_date?: string | null
          free_quantity?: number | null
          id?: string
          item_name: string
          mrp?: number | null
          pack_size?: string | null
          purchase_order_id: string
          qty_in_strips?: number | null
          qty_in_tabs?: number | null
          quantity?: number
          received_quantity?: number | null
          stock_item_id?: number | null
          stock_item_name?: string | null
          total?: number
          total_price?: number | null
          unit_price?: number
        }
        Update: {
          batch_no?: string | null
          created_at?: string
          expiry_date?: string | null
          free_quantity?: number | null
          id?: string
          item_name?: string
          mrp?: number | null
          pack_size?: string | null
          purchase_order_id?: string
          qty_in_strips?: number | null
          qty_in_tabs?: number | null
          quantity?: number
          received_quantity?: number | null
          stock_item_id?: number | null
          stock_item_name?: string | null
          total?: number
          total_price?: number | null
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
          {
            foreignKeyName: "purchase_order_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["item_id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          discount: number | null
          expected_delivery: string | null
          expected_delivery_date: string | null
          grn_date: string | null
          grn_number: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoice_url: string | null
          is_service_po: boolean | null
          notes: string | null
          order_date: string
          payment_amount: number | null
          payment_date: string | null
          payment_due_date: string | null
          payment_notes: string | null
          payment_status: string | null
          po_number: string | null
          po_type: string | null
          service_amount: number | null
          service_description: string | null
          status: string | null
          subtotal: number | null
          supplier: string | null
          supplier_id: string | null
          supplier_name: string | null
          tax: number | null
          total: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount?: number | null
          expected_delivery?: string | null
          expected_delivery_date?: string | null
          grn_date?: string | null
          grn_number?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_url?: string | null
          is_service_po?: boolean | null
          notes?: string | null
          order_date?: string
          payment_amount?: number | null
          payment_date?: string | null
          payment_due_date?: string | null
          payment_notes?: string | null
          payment_status?: string | null
          po_number?: string | null
          po_type?: string | null
          service_amount?: number | null
          service_description?: string | null
          status?: string | null
          subtotal?: number | null
          supplier?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          tax?: number | null
          total?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount?: number | null
          expected_delivery?: string | null
          expected_delivery_date?: string | null
          grn_date?: string | null
          grn_number?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_url?: string | null
          is_service_po?: boolean | null
          notes?: string | null
          order_date?: string
          payment_amount?: number | null
          payment_date?: string | null
          payment_due_date?: string | null
          payment_notes?: string | null
          payment_status?: string | null
          po_number?: string | null
          po_type?: string | null
          service_amount?: number | null
          service_description?: string | null
          status?: string | null
          subtotal?: number | null
          supplier?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          tax?: number | null
          total?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_employees: {
        Row: {
          allowances: number | null
          basic_salary: number | null
          created_at: string | null
          deductions: number | null
          employee_id: string | null
          id: string
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          allowances?: number | null
          basic_salary?: number | null
          created_at?: string | null
          deductions?: number | null
          employee_id?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          allowances?: number | null
          basic_salary?: number | null
          created_at?: string | null
          deductions?: number | null
          employee_id?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_records: {
        Row: {
          advance_pending: number | null
          advances: number | null
          allowances: number | null
          basic_salary: number | null
          created_at: string
          deductions: number | null
          employee_id: string
          id: string
          month: number
          net_salary: number | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          status: string | null
          updated_at: string
          working_days: number | null
          year: number
        }
        Insert: {
          advance_pending?: number | null
          advances?: number | null
          allowances?: number | null
          basic_salary?: number | null
          created_at?: string
          deductions?: number | null
          employee_id: string
          id?: string
          month: number
          net_salary?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string | null
          updated_at?: string
          working_days?: number | null
          year: number
        }
        Update: {
          advance_pending?: number | null
          advances?: number | null
          allowances?: number | null
          basic_salary?: number | null
          created_at?: string
          deductions?: number | null
          employee_id?: string
          id?: string
          month?: number
          net_salary?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string | null
          updated_at?: string
          working_days?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "salary_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_numbers: {
        Row: {
          current_value: number
          id: string
          prefix: string | null
          sequence_type: string
          updated_at: string
        }
        Insert: {
          current_value?: number
          id?: string
          prefix?: string | null
          sequence_type: string
          updated_at?: string
        }
        Update: {
          current_value?: number
          id?: string
          prefix?: string | null
          sequence_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_items: {
        Row: {
          batch_no: string | null
          category: string
          composition: string | null
          created_at: string
          current_stock: number
          expiry_date: string | null
          item_id: number
          minimum_stock: number
          mrp: number | null
          name: string
          packing: string | null
          status: string | null
          supplier: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          batch_no?: string | null
          category?: string
          composition?: string | null
          created_at?: string
          current_stock?: number
          expiry_date?: string | null
          item_id?: number
          minimum_stock?: number
          mrp?: number | null
          name: string
          packing?: string | null
          status?: string | null
          supplier?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          batch_no?: string | null
          category?: string
          composition?: string | null
          created_at?: string
          current_stock?: number
          expiry_date?: string | null
          item_id?: number
          minimum_stock?: number
          mrp?: number | null
          name?: string
          packing?: string | null
          status?: string | null
          supplier?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      supplier_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          purchase_order_id: string | null
          receipt_url: string | null
          reference_number: string | null
          status: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          purchase_order_id?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          status?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          purchase_order_id?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          status?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          gst_number: string | null
          id: string
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_email_by_username: { Args: { p_username: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      snapshot_opening_stock: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "staff"
        | "manager"
        | "billing"
        | "reception"
        | "pharma"
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
        "user",
        "staff",
        "manager",
        "billing",
        "reception",
        "pharma",
      ],
    },
  },
} as const
