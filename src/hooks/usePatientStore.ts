import { useState, useEffect } from "react";
import { PatientFormData } from "./usePatientForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function usePatientStore() {
  const [patients, setPatients] = useState<PatientFormData[]>([]);
  const [loading, setLoading] = useState(true);

  // Load patients from Supabase
  useEffect(() => {
    loadPatients();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('patients-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients'
        },
        () => {
          loadPatients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPatients = async () => {
    try {
      // Fetch all patients with pagination to overcome 1000 row limit
      let allPatients: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .range(from, from + batchSize - 1)
          .order('id', { ascending: true });

        if (error) {
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

      if (allPatients.length === 0) {
        setPatients([]);
        return;
      }

      const formattedPatients: PatientFormData[] = allPatients.map(p => ({
        patientId: String(p.id || ''),
        fileNo: String(p.file_no || ''),
        firstName: (p.patient_name || '').split(' ')[0] || '',
        lastName: (p.patient_name || '').split(' ').slice(1).join(' ') || '',
        dateOfBirth: '',
        gender: '',
        phone: String(p.phone || ''),
        email: '',
        address: String(p.address || ''),
        aadhar: String(p.aadhar_card || ''),
        govtIdOld: String(p.govt_id || ''),
        govtIdNew: String(p.new_govt_id || ''),
        emergencyContact: '',
        emergencyPhone: '',
        medicalHistory: '',
        allergies: '',
        currentMedications: '',
        fatherName: String(p.father_name || ''),
        visitDate: '',
        medicinePrescribedDays: '',
        nextFollowUpDate: '',
        category: String(p.category || '')
      }));

      
      setPatients(formattedPatients);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast({
        title: "Error",
        description: "Failed to load patients",
        variant: "destructive"
      });
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const addPatient = async (patient: PatientFormData) => {
    try {
      // Compatibility insert:
      // - Some backends don't expose first_name/last_name via schema cache (PGRST204)
      // - Some backends require s_no to be provided (no sequence default)

      const baseInsertData: any = {
        file_no: patient.fileNo || "",
        patient_name: `${patient.firstName} ${patient.lastName}`.trim(),
        age: patient.dateOfBirth
          ? String(new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear())
          : "",
        father_name: patient.fatherName || "",
        govt_id: patient.govtIdOld || "",
        aadhar_card: patient.aadhar || "",
        phone: patient.phone || "",
        address: patient.address || "",
        new_govt_id: patient.govtIdNew || "",
        category: patient.category || null,
      };

      // Helper: get next s_no from existing patients
      const getNextSNo = async (): Promise<number> => {
        const { data: lastRows, error: lastErr } = await supabase
          .from("patients")
          .select("s_no")
          .order("s_no", { ascending: false })
          .limit(1);

        if (lastErr) throw lastErr;
        const last = (lastRows?.[0] as any)?.s_no ?? 0;
        return Number(last) + 1;
      };

      // Helper: check error type
      const isSNoError = (msg: string) =>
        msg.includes('null value in column "s_no"') || msg.includes("null value in column 's_no'");
      const isFirstNameError = (msg: string) =>
        msg.includes("Could not find the 'first_name' column") ||
        msg.includes('Could not find the "first_name" column') ||
        msg.includes("first_name") && msg.includes("schema cache");

      // Helper: insert once
      const insertOnce = async (data: any) => {
        const { error } = await supabase.from("patients").insert([data]);
        if (error) throw error;
      };

      // Build insert data with first_name/last_name initially
      let dataToUse: any = {
        ...baseInsertData,
        first_name: patient.firstName || "",
        last_name: patient.lastName || "",
      };
      let useFirstName = true;
      let useSNo = false;

      // Retry loop - max 3 attempts to handle different schema configurations
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (useSNo) {
            dataToUse.s_no = await getNextSNo();
          }
          await insertOnce(dataToUse);
          return; // Success!
        } catch (err: any) {
          const msg = String(err?.message || "");

          if (isFirstNameError(msg) && useFirstName) {
            // Remove first_name/last_name and retry
            useFirstName = false;
            dataToUse = { ...baseInsertData };
            if (useSNo) {
              dataToUse.s_no = await getNextSNo();
            }
            continue;
          }

          if (isSNoError(msg) && !useSNo) {
            // Add s_no and retry
            useSNo = true;
            continue;
          }

          // Unknown error - throw
          throw err;
        }
      }

      throw new Error("Failed to add patient after multiple attempts");
    } catch (error) {
      console.error("Error adding patient:", error);
      toast({
        title: "Error",
        description: "Failed to add patient",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePatient = async (patientId: string, updatedPatient: PatientFormData) => {
    try {
      // Using type assertion because original database schema differs from Lovable Cloud types
      const updateData = {
        patient_name: `${updatedPatient.firstName} ${updatedPatient.lastName}`.trim(),
        file_no: updatedPatient.fileNo || '',
        father_name: updatedPatient.fatherName || '',
        govt_id: updatedPatient.govtIdOld || '',
        aadhar_card: updatedPatient.aadhar || '',
        phone: updatedPatient.phone || '',
        address: updatedPatient.address || '',
        new_govt_id: updatedPatient.govtIdNew || '',
        age: updatedPatient.dateOfBirth 
          ? String(new Date().getFullYear() - new Date(updatedPatient.dateOfBirth).getFullYear()) 
          : '',
        category: updatedPatient.category || null
      } as any;
      
      const { error } = await supabase
        .from('patients')
        .update(updateData)
        .eq('id', patientId)
        .select();

      if (error) {
        throw error;
      }
      
      toast({
        title: "Success",
        description: "Patient updated successfully"
      });
      
      // Reload patients to reflect changes
      await loadPatients();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update patient",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deletePatient = async (patientId: string) => {
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast({
        title: "Error",
        description: "Failed to delete patient",
        variant: "destructive"
      });
      throw error;
    }
  };

  const getPatient = (patientId: string) => {
    return patients.find(p => String(p.patientId) === String(patientId));
  };

  const subscribe = (listener: () => void) => {
    // Legacy compatibility - not needed with real-time subscriptions
    return () => {};
  };

  return {
    patients,
    loading,
    addPatient,
    updatePatient,
    deletePatient,
    getPatient,
    subscribe
  };
}
