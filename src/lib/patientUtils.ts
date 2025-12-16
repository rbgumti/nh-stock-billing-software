import { supabase } from "@/integrations/supabase/client";

export interface Patient {
  id: number;
  patient_name: string;
  phone: string;
  file_no: string;
  aadhar_card: string;
  govt_id: string;
  age?: string;
}

/**
 * Load all patients from the database with pagination to overcome 1000 row limit
 */
export async function loadAllPatients(): Promise<Patient[]> {
  let allPatients: Patient[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('patients')
      .select('id, patient_name, phone, file_no, aadhar_card, govt_id, age')
      .range(from, from + batchSize - 1)
      .order('patient_name', { ascending: true });

    if (error) {
      console.error('Error loading patients:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allPatients = [...allPatients, ...data];
      from += batchSize;
      if (data.length < batchSize) {
        hasMore = false;
      }
    }
  }

  return allPatients;
}
