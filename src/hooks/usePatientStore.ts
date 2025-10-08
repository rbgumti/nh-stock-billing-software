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
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPatients: PatientFormData[] = (data || []).map(p => ({
        patientId: p.patient_id,
        firstName: p.first_name,
        lastName: p.last_name,
        dateOfBirth: p.date_of_birth,
        gender: p.gender,
        phone: p.phone || '',
        email: p.email || '',
        address: p.address || '',
        aadhar: p.aadhar || '',
        govtIdOld: p.govt_id_old || '',
        govtIdNew: p.govt_id_new || '',
        emergencyContact: p.emergency_contact || '',
        emergencyPhone: p.emergency_phone || '',
        medicalHistory: p.medical_history || '',
        allergies: p.allergies || '',
        currentMedications: p.current_medications || '',
        fatherName: p.father_name || '',
        visitDate: p.visit_date || '',
        medicinePrescribedDays: p.medicine_prescribed_days || '',
        nextFollowUpDate: p.next_follow_up_date || ''
      }));

      setPatients(formattedPatients);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast({
        title: "Error",
        description: "Failed to load patients",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addPatient = async (patient: PatientFormData) => {
    try {
      const { error } = await supabase
        .from('patients')
        .insert({
          patient_id: patient.patientId,
          first_name: patient.firstName,
          last_name: patient.lastName,
          date_of_birth: patient.dateOfBirth,
          gender: patient.gender,
          phone: patient.phone,
          email: patient.email,
          address: patient.address,
          aadhar: patient.aadhar,
          govt_id_old: patient.govtIdOld,
          govt_id_new: patient.govtIdNew,
          emergency_contact: patient.emergencyContact,
          emergency_phone: patient.emergencyPhone,
          medical_history: patient.medicalHistory,
          allergies: patient.allergies,
          current_medications: patient.currentMedications,
          father_name: patient.fatherName,
          visit_date: patient.visitDate || null,
          medicine_prescribed_days: patient.medicinePrescribedDays,
          next_follow_up_date: patient.nextFollowUpDate || null
        });

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
      const { error } = await supabase
        .from('patients')
        .update({
          patient_id: updatedPatient.patientId,
          first_name: updatedPatient.firstName,
          last_name: updatedPatient.lastName,
          date_of_birth: updatedPatient.dateOfBirth,
          gender: updatedPatient.gender,
          phone: updatedPatient.phone,
          email: updatedPatient.email,
          address: updatedPatient.address,
          aadhar: updatedPatient.aadhar,
          govt_id_old: updatedPatient.govtIdOld,
          govt_id_new: updatedPatient.govtIdNew,
          emergency_contact: updatedPatient.emergencyContact,
          emergency_phone: updatedPatient.emergencyPhone,
          medical_history: updatedPatient.medicalHistory,
          allergies: updatedPatient.allergies,
          current_medications: updatedPatient.currentMedications,
          father_name: updatedPatient.fatherName,
          visit_date: updatedPatient.visitDate || null,
          medicine_prescribed_days: updatedPatient.medicinePrescribedDays,
          next_follow_up_date: updatedPatient.nextFollowUpDate || null
        })
        .eq('patient_id', patientId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating patient:', error);
      toast({
        title: "Error",
        description: "Failed to update patient",
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
        .eq('patient_id', patientId);

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
