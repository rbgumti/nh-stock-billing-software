import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, X, FileStack } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import PrescriptionForm from "@/components/forms/PrescriptionForm";
import { usePrescriptionStore, PrescriptionItem } from "@/hooks/usePrescriptionStore";
import { useSequentialNumbers } from "@/hooks/useSequentialNumbers";
import { supabase } from "@/integrations/supabase/client";
import { PatientSearchSelect } from "@/components/PatientSearchSelect";
import { loadAllPatients, Patient } from "@/lib/patientUtils";
import { toast } from "@/hooks/use-toast";
import { prescriptionTemplates, calculateQuantity } from "@/lib/prescriptionTemplates";
import { prescriptionFormSchema, prescriptionItemsArraySchema } from "@/lib/validationSchemas";
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
    patient_id: '',
    patient_name: '',
    patient_phone: '',
    patient_age: '',
    diagnosis: '',
    notes: '',
    appointment_id: '',
  });

  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

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
        // Also fetch patient age from patients table
        let patientAge = '';
        if (data.patient_id) {
          const { data: patientData } = await supabase
            .from('patients')
            .select('age')
            .eq('id', data.patient_id)
            .single();
          patientAge = patientData?.age || '';
        }

        setFormData(prev => ({
          ...prev,
          patient_id: data.patient_id || '',
          patient_name: data.patient_name,
          patient_phone: data.patient_phone || '',
          patient_age: patientAge,
          diagnosis: data.reason || '',
          notes: data.notes || '',
          appointment_id: appointmentId,
        }));
      }
    } catch (error) {
      console.error('Error loading appointment:', error);
      toast({
        title: "Error",
        description: "Failed to load appointment data",
        variant: "destructive",
      });
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setFormData(prev => ({
      ...prev,
      patient_id: String(patient.id),
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

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    
    if (templateId === "none") {
      return;
    }

    const template = prescriptionTemplates.find(t => t.id === templateId);
    if (!template) return;

    // Apply template
    setFormData(prev => ({
      ...prev,
      diagnosis: template.diagnosis,
      notes: template.notes || '',
    }));

    // Convert template items to prescription items with calculated quantities
    const templateItems: PrescriptionItem[] = template.items.map(item => ({
      medicine_name: item.medicine_name,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      quantity: calculateQuantity(item.frequency, item.duration),
      instructions: item.instructions || '',
    }));

    setItems(templateItems);

    toast({
      title: "Template applied",
      description: `"${template.name}" template has been applied. You can modify the details as needed.`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate form data with zod
    const formValidation = prescriptionFormSchema.safeParse(formData);
    if (!formValidation.success) {
      const firstError = formValidation.error.errors[0];
      setFormError(firstError.message);
      return;
    }

    // Validate prescription items with zod
    const itemsValidation = prescriptionItemsArraySchema.safeParse(items);
    if (!itemsValidation.success) {
      const firstError = itemsValidation.error.errors[0];
      setFormError(firstError.message);
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

      toast({
        title: "Success",
        description: "Prescription created successfully",
      });

      navigate('/prescriptions');
    } catch (error: any) {
      setFormError(error?.message || "Failed to create prescription. Please try again.");
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

        {/* Template Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileStack className="h-5 w-5" />
              Quick Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Select a template to auto-fill diagnosis and medicines</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50 max-h-60">
                  <SelectItem value="none">-- No template --</SelectItem>
                  {prescriptionTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Templates provide a starting point. You can modify all fields after applying.
              </p>
            </div>
          </CardContent>
        </Card>

        <PrescriptionForm
          formData={formData}
          items={items}
          stockItems={stockItems}
          onFormChange={handleFormChange}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
          onItemChange={handleItemChange}
        />

        {/* Inline Error Banner */}
        {formError && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{formError}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-destructive/20"
                onClick={() => setFormError(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

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
