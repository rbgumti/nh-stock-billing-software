import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import PrescriptionForm from "@/components/forms/PrescriptionForm";
import { usePrescriptionStore, PrescriptionItem, Prescription } from "@/hooks/usePrescriptionStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface StockItem {
  item_id: number;
  name: string;
}

export default function EditPrescription() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { prescriptions, loading: storeLoading, getPrescription, updatePrescription } = usePrescriptionStore();
  
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
  const [formError, setFormError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load prescription data after store has loaded
  useEffect(() => {
    if (storeLoading || !id) return;
    
    const prescription = getPrescription(id);
    if (prescription) {
      setFormData({
        patient_id: prescription.patient_id,
        patient_name: prescription.patient_name,
        patient_phone: prescription.patient_phone || '',
        patient_age: prescription.patient_age || '',
        diagnosis: prescription.diagnosis,
        notes: prescription.notes || '',
        appointment_id: prescription.appointment_id || '',
      });
      setItems(prescription.items.map(item => ({
        id: item.id,
        medicine_name: item.medicine_name,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        quantity: item.quantity,
        instructions: item.instructions || '',
      })));
      setDataLoaded(true);
    } else {
      toast({
        title: "Error",
        description: "Prescription not found",
        variant: "destructive",
      });
      navigate('/prescriptions');
    }
  }, [id, storeLoading, prescriptions, getPrescription, navigate]);

  // Load stock items
  useEffect(() => {
    loadStockItems();
  }, []);

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
    setFormError(null);

    if (!formData.diagnosis.trim()) {
      setFormError("Please enter a diagnosis");
      return;
    }

    if (items.length === 0) {
      setFormError("Please add at least one medicine to the prescription");
      return;
    }

    // Validate all medicine items have required fields
    const invalidItems = items.filter(item => 
      !item.medicine_name.trim() || !item.dosage.trim() || !item.frequency.trim() || !item.duration.trim()
    );
    if (invalidItems.length > 0) {
      setFormError("Please fill in all required fields for each medicine (name, dosage, frequency, duration)");
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePrescription(id!, {
        patient_name: formData.patient_name,
        patient_phone: formData.patient_phone,
        patient_age: formData.patient_age,
        diagnosis: formData.diagnosis,
        notes: formData.notes,
        items,
      });

      toast({
        title: "Success",
        description: "Prescription updated successfully",
      });

      navigate(`/prescriptions/view/${id}`);
    } catch (error: any) {
      setFormError(error?.message || "Failed to update prescription. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (storeLoading || !dataLoaded) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading prescription...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/prescriptions/view/${id}`)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Prescription
        </Button>
        <h1 className="text-3xl font-bold">Edit Prescription</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        {/* Patient Info (Read-only) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Patient Name</p>
                <p className="font-medium">{formData.patient_name}</p>
              </div>
              {formData.patient_age && (
                <div>
                  <p className="text-sm text-muted-foreground">Age</p>
                  <p className="font-medium">{formData.patient_age}</p>
                </div>
              )}
              {formData.patient_phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{formData.patient_phone}</p>
                </div>
              )}
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
          hidePatientFields={true}
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
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/prescriptions/view/${id}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
