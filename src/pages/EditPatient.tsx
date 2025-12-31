import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import { PersonalInformationForm } from "@/components/forms/PersonalInformationForm";
import { ContactInformationForm } from "@/components/forms/ContactInformationForm";
import { EmergencyContactForm } from "@/components/forms/EmergencyContactForm";
import { MedicalInformationForm } from "@/components/forms/MedicalInformationForm";
import { VisitDetailsForm } from "@/components/forms/VisitDetailsForm";
import { usePatientForm } from "@/hooks/usePatientForm";
import { usePatientStore } from "@/hooks/usePatientStore";
import { useEffect } from "react";

export default function EditPatient() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formData, handleInputChange, handleSubmit, loadPatientData } = usePatientForm(true);
  const { getPatient, patients, loading } = usePatientStore();

  useEffect(() => {
    if (id && !loading && patients.length > 0) {
      const patient = getPatient(id);
      if (patient) {
        loadPatientData(patient);
      } else {
        navigate("/patients");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loading, patients]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading patient data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="border-teal/30 hover:bg-teal/10 hover:border-teal"
        >
          <ArrowLeft className="h-4 w-4 text-teal" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal via-cyan to-lime bg-clip-text text-transparent">Edit Patient</h1>
          <p className="text-muted-foreground mt-1">Update patient information below</p>
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
          <Button 
            type="submit" 
            className="flex-1 bg-gradient-to-r from-lime to-emerald hover:from-lime/90 hover:to-emerald/90 text-white shadow-lg hover:shadow-lime/25 transition-all duration-300"
          >
            <Save className="mr-2 h-4 w-4" />
            Update Patient
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="border-teal/30 hover:bg-teal/10 hover:border-teal"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}