import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PrescriptionForm from "@/components/forms/PrescriptionForm";
import { usePrescriptionStore, PrescriptionItem } from "@/hooks/usePrescriptionStore";
import { useSequentialNumbers } from "@/hooks/useSequentialNumbers";
import { supabase } from "@/integrations/supabase/client";

interface Patient {
  id: number;
  "Patient Name": string;
  PH: string;
  Age: string;
  "Fill no.": string;
  "Addhar Card": string;
}

export default function NewPrescription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addPrescription } = usePrescriptionStore();
  const { generatePrescriptionNumber } = useSequentialNumbers();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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

  // Load patients on mount
  useEffect(() => {
    loadPatients();
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
      const { data, error } = await supabase
        .from('patients')
        .select('id, "Patient Name", PH, Age, "Fill no.", "Addhar Card"')
        .order('"Patient Name"');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  // Filter patients based on search query (ID, phone, name, file no, aadhar)
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    
    const query = searchQuery.toLowerCase().trim();
    return patients.filter((patient) => {
      const idMatch = patient.id.toString().includes(query);
      const nameMatch = patient["Patient Name"]?.toLowerCase().includes(query);
      const phoneMatch = patient.PH?.toLowerCase().includes(query);
      const fileNoMatch = patient["Fill no."]?.toLowerCase().includes(query);
      const aadharMatch = patient["Addhar Card"]?.toLowerCase().includes(query);
      
      return idMatch || nameMatch || phoneMatch || fileNoMatch || aadharMatch;
    });
  }, [patients, searchQuery]);

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

  const handlePatientChange = (patientId: string) => {
    const patient = patients.find(p => p.id === parseInt(patientId));
    if (patient) {
      setFormData(prev => ({
        ...prev,
        patient_id: patient.id,
        patient_name: patient["Patient Name"],
        patient_phone: patient.PH || '',
        patient_age: patient.Age || '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      alert('Please add at least one medicine');
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
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, Name, Phone, File No, or Aadhar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div>
                <Label>Patient *</Label>
                <Select onValueChange={handlePatientChange} value={formData.patient_id ? formData.patient_id.toString() : undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {filteredPatients.length === 0 ? (
                      <div className="py-2 px-3 text-sm text-muted-foreground">No patients found</div>
                    ) : (
                      filteredPatients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id.toString()}>
                          <span className="font-medium">{patient["Patient Name"]}</span>
                          <span className="text-muted-foreground text-xs ml-2">
                            ID: {patient.id} {patient.PH && `| Ph: ${patient.PH}`} {patient["Fill no."] && `| File: ${patient["Fill no."]}`}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        <PrescriptionForm
          formData={formData}
          items={items}
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