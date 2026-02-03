import { supabase } from "@/integrations/supabase/client";

export interface Patient {
  id: string;
  patient_name: string;
  phone: string;
  file_no: string;
  aadhar_card: string;
  govt_id: string;
  new_govt_id: string;
  address: string;
  age?: string;
  father_name?: string;
  category?: string;
}

/**
 * Load all patients from the database with pagination to overcome 1000 row limit
 */
/**
 * Format phone number by removing dashes
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/-/g, '');
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
      .select('id, patient_name, phone, file_no, aadhar_card, govt_id, new_govt_id, address, age, father_name, category')
      .range(from, from + batchSize - 1)
      .order('patient_name', { ascending: true });

    if (error) {
      console.error('Error loading patients:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      // Map data to ensure proper string types for id
      const mappedData: Patient[] = data.map(p => ({
        id: String(p.id),
        patient_name: p.patient_name || '',
        phone: p.phone || '',
        file_no: p.file_no || '',
        aadhar_card: p.aadhar_card || '',
        govt_id: p.govt_id || '',
        new_govt_id: p.new_govt_id || '',
        address: p.address || '',
        age: p.age || undefined,
        father_name: p.father_name || undefined,
        category: p.category || undefined,
      }));
      allPatients = [...allPatients, ...mappedData];
      from += batchSize;
      if (data.length < batchSize) {
        hasMore = false;
      }
    }
  }

  return allPatients;
}
