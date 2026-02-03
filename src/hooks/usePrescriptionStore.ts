import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const formatSupabaseError = (error: any) => {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;

  const parts: string[] = [];
  if (error.code) parts.push(`Code: ${error.code}`);
  if (error.message) parts.push(String(error.message));
  if (error.details) parts.push(String(error.details));
  if (error.hint) parts.push(String(error.hint));

  return parts.filter(Boolean).join(" • ");
};

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
  patient_id: string;
  patient_name: string;
  patient_phone?: string;
  patient_age?: string;
  diagnosis: string;
  notes?: string;
  prescription_date: string;
  status: 'Active' | 'Dispensed' | 'Cancelled';
  items: PrescriptionItem[];
  appointment_id?: string;
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
      // Use edge function for server-side validation
      const { data, error } = await supabase.functions.invoke("create-prescription", {
        body: {
          prescription_number: prescription.prescription_number,
          patient_id: prescription.patient_id,
          patient_name: prescription.patient_name,
          patient_phone: prescription.patient_phone,
          patient_age: prescription.patient_age,
          diagnosis: prescription.diagnosis,
          notes: prescription.notes,
          prescription_date: prescription.prescription_date,
          status: prescription.status,
          appointment_id: prescription.appointment_id || null,
          items: prescription.items,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to create prescription");
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to create prescription");
      }

      toast({
        title: "Success",
        description: "Prescription created successfully",
      });

      await loadPrescriptions();
      return data.prescription_id;
    } catch (error: any) {
      toast({
        title: "Error creating prescription",
        description: formatSupabaseError(error),
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

  const updatePrescription = async (id: string, updates: {
    patient_id?: string;
    patient_name?: string;
    patient_phone?: string;
    patient_age?: string;
    diagnosis?: string;
    notes?: string;
    items?: PrescriptionItem[];
  }) => {
    try {
      // Update prescription details
      const { error: prescriptionError } = await supabase
        .from('prescriptions')
        .update({
          patient_id: updates.patient_id,
          patient_name: updates.patient_name,
          patient_phone: updates.patient_phone,
          patient_age: updates.patient_age,
          diagnosis: updates.diagnosis,
          notes: updates.notes,
        })
        .eq('id', id);

      if (prescriptionError) throw prescriptionError;

      // Update items if provided
      if (updates.items) {
        // Delete existing items
        const { error: deleteError } = await supabase
          .from('prescription_items')
          .delete()
          .eq('prescription_id', id);

        if (deleteError) throw deleteError;

        // Insert new items
        const itemsToInsert = updates.items.map(item => ({
          prescription_id: id,
          medicine_name: item.medicine_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          quantity: item.quantity,
          instructions: item.instructions || null,
        }));

        const { error: insertError } = await supabase
          .from('prescription_items')
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: "Prescription updated successfully",
      });

      await loadPrescriptions();
    } catch (error: any) {
      toast({
        title: "Error updating prescription",
        description: formatSupabaseError(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  const getPrescription = (id: string) => {
    return prescriptions.find(p => p.id === id);
  };

  return {
    prescriptions,
    loading,
    addPrescription,
    updatePrescription,
    updatePrescriptionStatus,
    getPrescription,
  };
};