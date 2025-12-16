import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PrescriptionForm from "@/components/forms/PrescriptionForm";
import { usePrescriptionStore, PrescriptionItem } from "@/hooks/usePrescriptionStore";
import { useSequentialNumbers } from "@/hooks/useSequentialNumbers";
import { supabase } from "@/integrations/supabase/client";
import { PatientSearchSelect } from "@/components/PatientSearchSelect";
import { loadAllPatients, Patient } from "@/lib/patientUtils";
import { toast } from "@/hooks/use-toast";

interface StockItem {
  item_id: number;
  name: string;
}

export default function NewPrescription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addPrescription } = usePrescriptionStore();
  const { generatePrescriptionNumber } = useSequentialNumbers();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [formData, setFormData] = useState({
    patient_id: 0,
    patient_name: '',
    patient_phone: '',
    patient_age: '',
    diagnosis: '',
    notes: '',
    appointment_id: '',
  });

  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load patients and stock items on mount
  useEffect(() => {
    loadPatients();
    loadStockItems();
  }, []);

  // Load appointment data if appointmentId is in URL
  useEffect(() => {
    const appointmentId = searchParams.get('appointmentId');
    if (appointmentId) {
      loadAppointmentData(appointmentId);
    }
  }, [searchParams]);

  const loadPatients = async () => {
    try {
      const data = await loadAllPatients();
      setPatients(data);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const loadStockItems = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('item_id, name')
        .order('name');

      if (error) throw error;
      setStockItems(data || []);
    } catch (error) {
      console.error('Error loading stock items:', error);
    }
  };

  const loadAppointmentData = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (error) throw error;
      if (data) {
        setFormData(prev => ({
          ...prev,
          patient_id: data.patient_id,
          patient_name: data.patient_name,
          patient_phone: data.patient_phone || '',
          diagnosis: data.reason || '',
          notes: data.notes || '',
          appointment_id: appointmentId,
        }));
      }
    } catch (error) {
      console.error('Error loading appointment:', error);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setFormData(prev => ({
      ...prev,
      patient_id: patient.id,
      patient_name: patient.patient_name,
      patient_phone: patient.phone || '',
      patient_age: patient.age || '',
    }));
  };

  const handleFormChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddItem = () => {
    setItems(prev => [...prev, {
      medicine_name: '',
      dosage: '',
      frequency: '',
      duration: '',
      quantity: 1,
      instructions: '',
    }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patient_id || formData.patient_id === 0) {
      toast({
        title: "Patient Required",
        description: "Please select a patient before creating a prescription",
        variant: "destructive",
      });
      return;
    }

    if (!formData.diagnosis.trim()) {
      toast({
        title: "Diagnosis Required",
        description: "Please enter a diagnosis",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "Medicines Required",
        description: "Please add at least one medicine to the prescription",
        variant: "destructive",
      });
      return;
    }

    // Validate all medicine items have required fields
    const invalidItems = items.filter(item => 
      !item.medicine_name.trim() || !item.dosage.trim() || !item.frequency.trim() || !item.duration.trim()
    );
    if (invalidItems.length > 0) {
      toast({
        title: "Incomplete Medicine Details",
        description: "Please fill in all required fields for each medicine (name, dosage, frequency, duration)",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const prescriptionNumber = await generatePrescriptionNumber();
      
      await addPrescription({
        prescription_number: prescriptionNumber,
        patient_id: formData.patient_id,
        patient_name: formData.patient_name,
        patient_phone: formData.patient_phone,
        patient_age: formData.patient_age,
        diagnosis: formData.diagnosis,
        notes: formData.notes,
        prescription_date: new Date().toISOString(),
        status: 'Active',
        items,
        appointment_id: formData.appointment_id || undefined,
      });

      // Update appointment status to completed if linked
      if (formData.appointment_id) {
        await supabase
          .from('appointments')
          .update({ status: 'Completed' })
          .eq('id', formData.appointment_id);
      }

      navigate('/prescriptions');
    } catch (error) {
      console.error('Error creating prescription:', error);
      toast({
        title: "Error",
        description: "Failed to create prescription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/prescriptions')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Prescriptions
        </Button>
        <h1 className="text-3xl font-bold">New Prescription</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        {/* Patient Selection */}
        {!formData.appointment_id && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Select Patient</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <PatientSearchSelect
                patients={patients}
                selectedPatientId={formData.patient_id || undefined}
                onPatientSelect={handlePatientSelect}
              />
            </CardContent>
          </Card>
        )}

        <PrescriptionForm
          formData={formData}
          items={items}
          stockItems={stockItems}
          onFormChange={handleFormChange}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
          onItemChange={handleItemChange}
        />

        <div className="flex gap-4 mt-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Prescription'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/prescriptions')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}