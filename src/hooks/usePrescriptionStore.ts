import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface PrescriptionItem {
  id?: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
}

export interface Prescription {
  id?: string;
  prescription_number: string;
  patient_id: number;
  patient_name: string;
  patient_phone?: string;
  patient_age?: string;
  diagnosis: string;
  notes?: string;
  prescription_date: string;
  status: 'Active' | 'Dispensed' | 'Cancelled';
  items: PrescriptionItem[];
}

export const usePrescriptionStore = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrescriptions();

    const channel = supabase
      .channel('prescriptions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, () => {
        loadPrescriptions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPrescriptions = async () => {
    try {
      const { data: prescriptionsData, error: prescriptionsError } = await supabase
        .from('prescriptions')
        .select('*')
        .order('prescription_date', { ascending: false });

      if (prescriptionsError) throw prescriptionsError;

      const prescriptionsWithItems = await Promise.all(
        (prescriptionsData || []).map(async (prescription) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('prescription_items')
            .select('*')
            .eq('prescription_id', prescription.id);

          if (itemsError) throw itemsError;

          return {
            ...prescription,
            items: itemsData || []
          };
        })
      );

      setPrescriptions(prescriptionsWithItems as Prescription[]);
    } catch (error: any) {
      toast({
        title: "Error loading prescriptions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addPrescription = async (prescription: Prescription) => {
    try {
      const { data: prescriptionData, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert({
          prescription_number: prescription.prescription_number,
          patient_id: prescription.patient_id,
          patient_name: prescription.patient_name,
          patient_phone: prescription.patient_phone,
          patient_age: prescription.patient_age,
          diagnosis: prescription.diagnosis,
          notes: prescription.notes,
          prescription_date: prescription.prescription_date,
          status: prescription.status,
        })
        .select()
        .single();

      if (prescriptionError) throw prescriptionError;

      if (prescription.items.length > 0) {
        const itemsToInsert = prescription.items.map(item => ({
          prescription_id: prescriptionData.id,
          medicine_name: item.medicine_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          quantity: item.quantity,
          instructions: item.instructions,
        }));

        const { error: itemsError } = await supabase
          .from('prescription_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      toast({
        title: "Success",
        description: "Prescription created successfully",
      });

      await loadPrescriptions();
      return prescriptionData.id;
    } catch (error: any) {
      toast({
        title: "Error creating prescription",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePrescriptionStatus = async (id: string, status: 'Active' | 'Dispensed' | 'Cancelled') => {
    try {
      const { error } = await supabase
        .from('prescriptions')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Prescription status updated",
      });

      await loadPrescriptions();
    } catch (error: any) {
      toast({
        title: "Error updating prescription",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getPrescription = (id: string) => {
    return prescriptions.find(p => p.id === id);
  };

  return {
    prescriptions,
    loading,
    addPrescription,
    updatePrescriptionStatus,
    getPrescription,
  };
};