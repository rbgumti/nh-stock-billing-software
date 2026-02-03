import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Search } from "lucide-react";
import { usePrescriptionStore, PrescriptionItem, Prescription } from "@/hooks/usePrescriptionStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { PatientSearchSelect } from "@/components/PatientSearchSelect";
import { loadAllPatients, Patient } from "@/lib/patientUtils";

interface StockItem {
  item_id: number;
  name: string;
}

const FREQUENCY_OPTIONS = [
  { value: "OD", label: "OD (Once daily)", multiplier: 1 },
  { value: "BD", label: "BD (Twice daily)", multiplier: 2 },
  { value: "TDS", label: "TDS (Three times daily)", multiplier: 3 },
  { value: "4 Times a day", label: "4 Times a day", multiplier: 4 },
  { value: "5 Times a day", label: "5 Times a day", multiplier: 5 },
  { value: "6 Times a day", label: "6 Times a day", multiplier: 6 },
  { value: "7 Times a day", label: "7 Times a day", multiplier: 7 },
  { value: "8 Times a day", label: "8 Times a day", multiplier: 8 },
];

export default function EditPrescription() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { prescriptions, loading: storeLoading, getPrescription, updatePrescription } = usePrescriptionStore();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [medicineSearches, setMedicineSearches] = useState<Record<number, string>>({});
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
  const [dataLoaded, setDataLoaded] = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(true);

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

  // Load stock items and patients
  useEffect(() => {
    loadStockItems();
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setPatientsLoading(true);
      const data = await loadAllPatients();
      setPatients(data);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setPatientsLoading(false);
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

  const handlePatientSelect = (patient: Patient) => {
    if (patient) {
      setFormData(prev => ({
        ...prev,
        patient_id: String(patient.id),
        patient_name: patient.patient_name,
        patient_phone: patient.phone || '',
        patient_age: patient.age || '',
      }));
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

  const handleFrequencyChange = (index: number, frequency: string) => {
    handleItemChange(index, 'frequency', frequency);
    const item = items[index];
    const durationDays = parseInt(item.duration) || 0;
    const freqOption = FREQUENCY_OPTIONS.find(f => f.value === frequency);
    if (freqOption && durationDays > 0) {
      handleItemChange(index, 'quantity', durationDays * freqOption.multiplier);
    }
  };

  const handleDurationChange = (index: number, duration: string) => {
    handleItemChange(index, 'duration', duration);
    const item = items[index];
    const durationDays = parseInt(duration) || 0;
    const freqOption = FREQUENCY_OPTIONS.find(f => f.value === item.frequency);
    if (freqOption && durationDays > 0) {
      handleItemChange(index, 'quantity', durationDays * freqOption.multiplier);
    }
  };

  const getFilteredMedicines = (index: number) => {
    const search = medicineSearches[index]?.toLowerCase() || "";
    if (!search) return stockItems;
    return stockItems.filter((item) =>
      item.name.toLowerCase().includes(search)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.patient_id) {
      setFormError("Please select a patient");
      return;
    }

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
        patient_id: formData.patient_id,
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

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        {/* Patient Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select Patient *</Label>
              <PatientSearchSelect
                patients={patients}
                selectedPatientId={formData.patient_id}
                onPatientSelect={handlePatientSelect}
                disabled={patientsLoading}
                placeholder={patientsLoading ? "Loading patients..." : "Search patient by name, phone, file no..."}
              />
            </div>
          </CardContent>
        </Card>

        {/* Prescription Details */}
        <Card>
          <CardHeader>
            <CardTitle>Prescription Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="diagnosis">Diagnosis *</Label>
              <Input
                id="diagnosis"
                value={formData.diagnosis}
                onChange={(e) => handleFormChange('diagnosis', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Medicines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Medicines</CardTitle>
            <Button type="button" onClick={handleAddItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Medicine
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No medicines added yet. Click "Add Medicine" to start.
              </p>
            ) : (
              items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Medicine {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Medicine Name *</Label>
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search medicine..."
                            value={medicineSearches[index] || ""}
                            onChange={(e) =>
                              setMedicineSearches((prev) => ({
                                ...prev,
                                [index]: e.target.value,
                              }))
                            }
                            className="pl-9"
                          />
                        </div>
                        <Select
                          value={item.medicine_name}
                          onValueChange={(value) => {
                            handleItemChange(index, 'medicine_name', value);
                            setMedicineSearches((prev) => ({ ...prev, [index]: "" }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select medicine" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 bg-background z-50">
                            {getFilteredMedicines(index).length === 0 ? (
                              <div className="py-2 px-3 text-sm text-muted-foreground">
                                No medicines found
                              </div>
                            ) : (
                              getFilteredMedicines(index).map((med) => (
                                <SelectItem key={med.item_id} value={med.name}>
                                  {med.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Dosage *</Label>
                      <Input
                        placeholder="e.g., 500mg"
                        value={item.dosage}
                        onChange={(e) => handleItemChange(index, 'dosage', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label>Frequency *</Label>
                      <Select
                        value={item.frequency}
                        onValueChange={(value) => handleFrequencyChange(index, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {FREQUENCY_OPTIONS.map((freq) => (
                            <SelectItem key={freq.value} value={freq.value}>
                              {freq.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Duration (days) *</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 7"
                        value={item.duration}
                        onChange={(e) => handleDurationChange(index, e.target.value)}
                        required
                        min="1"
                      />
                    </div>
                    <div>
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        readOnly
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Auto-calculated</p>
                    </div>
                    <div>
                      <Label>Instructions</Label>
                      <Input
                        placeholder="e.g., After meals"
                        value={item.instructions || ''}
                        onChange={(e) => handleItemChange(index, 'instructions', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

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
