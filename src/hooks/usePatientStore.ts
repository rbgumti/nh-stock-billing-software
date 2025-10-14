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
      console.log('Loading patients from Supabase...');
      const { data, error } = await supabase
        .from('patients')
        .select('*');

      console.log('Supabase response:', { data, error, count: data?.length });

      if (error) throw error;

      const formattedPatients: PatientFormData[] = (data || []).map(p => {
        // S.No. might be a number, so convert to string
        const patientId = String(p['S.No.'] || '');
        const fullName = p['Patient Name'] || '';
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const formatted = {
          patientId: patientId,
          firstName: firstName,
          lastName: lastName,
          dateOfBirth: '',
          gender: '',
          phone: String(p['PH'] || ''),
          email: '',
          address: String(p['Address'] || ''),
          aadhar: String(p['Addhar Card'] || ''),
          govtIdOld: String(p['Govt. ID'] || ''),
          govtIdNew: String(p['New Govt, ID'] || ''),
          emergencyContact: '',
          emergencyPhone: '',
          medicalHistory: '',
          allergies: '',
          currentMedications: '',
          fatherName: String(p['Father Name'] || ''),
          visitDate: '',
          medicinePrescribedDays: '',
          nextFollowUpDate: ''
        };
        return formatted;
      });

      console.log('Formatted patients:', formattedPatients.length, 'First patient:', formattedPatients[0]);
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
        .insert([{
          "S.No.": patient.patientId,
          "Fill no.": '',
          "Patient Name": `${patient.firstName} ${patient.lastName}`,
          "Age": '',
          "Father Name": patient.fatherName,
          "Govt. ID": patient.govtIdOld,
          "Addhar Card": patient.aadhar,
          "PH": patient.phone,
          "Address": patient.address,
          "New Govt, ID": patient.govtIdNew
        }] as any);

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
          "S.No.": updatedPatient.patientId,
          "Patient Name": `${updatedPatient.firstName} ${updatedPatient.lastName}`,
          "Father Name": updatedPatient.fatherName,
          "Govt. ID": updatedPatient.govtIdOld,
          "Addhar Card": updatedPatient.aadhar,
          "PH": updatedPatient.phone,
          "Address": updatedPatient.address,
          "New Govt, ID": updatedPatient.govtIdNew
        } as any)
        .eq('S.No.', patientId);

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
        .eq('S.No.', patientId);

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
    console.log('getPatient - Looking for ID:', patientId, 'Type:', typeof patientId);
    console.log('getPatient - Available patients:', patients.map(p => ({ id: p.patientId, type: typeof p.patientId })));
    const found = patients.find(p => String(p.patientId) === String(patientId));
    console.log('getPatient - Found patient:', found);
    return found;
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
