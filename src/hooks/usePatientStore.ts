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
        .select('*');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('No patient data returned from Supabase');
        setPatients([]);
        return;
      }

      const formattedPatients: PatientFormData[] = data.map(p => ({
        patientId: String(p['S.No.'] || ''),
        firstName: (p['Patient Name'] || '').split(' ')[0] || '',
        lastName: (p['Patient Name'] || '').split(' ').slice(1).join(' ') || '',
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
          "Patient Name": `${updatedPatient.firstName} ${updatedPatient.lastName}`,
          "Father Name": updatedPatient.fatherName,
          "Govt. ID": updatedPatient.govtIdOld,
          "Addhar Card": updatedPatient.aadhar,
          "PH": updatedPatient.phone,
          "Address": updatedPatient.address,
          "New Govt, ID": updatedPatient.govtIdNew,
          "Age": updatedPatient.dateOfBirth ? String(new Date().getFullYear() - new Date(updatedPatient.dateOfBirth).getFullYear()) : ''
        } as any)
        .eq('S.No.', patientId);

      if (error) {
        console.error('Supabase error updating patient:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Patient updated successfully"
      });
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
