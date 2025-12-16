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
          console.error('Supabase error:', error);
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
        console.warn('No patient data returned from Supabase');
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

      console.log(`Loaded ${formattedPatients.length} patients successfully`);
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
      const { error } = await supabase
        .from('patients')
        .insert([{
          s_no: patient.patientId,
          file_no: patient.fileNo || '',
          patient_name: `${patient.firstName} ${patient.lastName}`.trim(),
          age: patient.dateOfBirth 
            ? String(new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()) 
            : '',
          father_name: patient.fatherName || '',
          govt_id: patient.govtIdOld || '',
          aadhar_card: patient.aadhar || '',
          phone: patient.phone || '',
          address: patient.address || '',
          new_govt_id: patient.govtIdNew || '',
          category: patient.category || null
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding patient:', error);
      toast({
        title: "Error",
        description: "Failed to add patient",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updatePatient = async (patientId: string, updatedPatient: PatientFormData) => {
    try {
      console.log('=== UPDATE PATIENT START ===');
      console.log('Patient ID to update:', patientId, 'Type:', typeof patientId);
      console.log('Update data:', updatedPatient);
      
      // Prepare update data with all required fields
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
      };
      
      console.log('Update payload:', updateData);
      
      const { data, error } = await supabase
        .from('patients')
        .update(updateData)
        .eq('id', parseInt(patientId))
        .select();

      console.log('Update result:', { data, error });

      if (error) {
        console.error('Supabase update error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error hint:', error.hint);
        throw error;
      }

      console.log('=== UPDATE PATIENT SUCCESS ===');
      
      toast({
        title: "Success",
        description: "Patient updated successfully"
      });
      
      // Reload patients to reflect changes
      await loadPatients();
    } catch (error: any) {
      console.error('=== UPDATE PATIENT ERROR ===', error);
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
        .eq('id', parseInt(patientId));

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
