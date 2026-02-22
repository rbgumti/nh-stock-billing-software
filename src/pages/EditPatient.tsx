import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PersonalInformationForm } from "@/components/forms/PersonalInformationForm";
import { ContactInformationForm } from "@/components/forms/ContactInformationForm";
import { EmergencyContactForm } from "@/components/forms/EmergencyContactForm";
import { MedicalInformationForm } from "@/components/forms/MedicalInformationForm";
import { VisitDetailsForm } from "@/components/forms/VisitDetailsForm";
import { usePatientForm } from "@/hooks/usePatientForm";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function EditPatient() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formData, handleInputChange, handleSubmit, loadPatientData } = usePatientForm(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const fetchPatient = async () => {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          loadPatientData({
            patientId: data.id,
            fileNo: String(data.file_no || ''),
            firstName: data.first_name || (data.patient_name || '').split(' ')[0] || '',
            lastName: data.last_name || (data.patient_name || '').split(' ').slice(1).join(' ') || '',
            dateOfBirth: data.date_of_birth || '',
            gender: data.gender || '',
            phone: String(data.phone || ''),
            email: String(data.email || ''),
            address: String(data.address || ''),
            aadhar: String(data.aadhar_card || ''),
            govtIdOld: String(data.govt_id || ''),
            govtIdNew: String(data.new_govt_id || ''),
            emergencyContact: String(data.emergency_contact_name || ''),
            emergencyPhone: String(data.emergency_contact_phone || ''),
            medicalHistory: String(data.medical_notes || ''),
            allergies: String(data.allergies || ''),
            currentMedications: String(data.current_medications || ''),
            fatherName: String(data.father_name || ''),
            visitDate: '',
            medicinePrescribedDays: '',
            nextFollowUpDate: '',
            category: String(data.category || '')
          });
        } else {
          navigate("/patients");
        }
      } catch (error) {
        console.error('Error fetching patient:', error);
        toast({ title: "Error", description: "Failed to load patient data", variant: "destructive" });
        navigate("/patients");
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Loading patient data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Patient</h1>
          <p className="text-muted-foreground mt-2">Update patient information below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <PersonalInformationForm
          formData={formData}
          onInputChange={handleInputChange}
          isEditing={true}
        />

        <ContactInformationForm
          formData={formData}
          onInputChange={handleInputChange}
        />

        <EmergencyContactForm
          formData={formData}
          onInputChange={handleInputChange}
        />

        <MedicalInformationForm
          formData={formData}
          onInputChange={handleInputChange}
        />

        <VisitDetailsForm
          formData={formData}
          onInputChange={handleInputChange}
        />

        <div className="flex space-x-4">
          <Button type="submit" className="flex-1">
            Update Patient
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
