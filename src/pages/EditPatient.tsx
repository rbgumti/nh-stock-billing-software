import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
      <div className="p-6 flex items-center justify-center">
        <p className="text-lg text-gray-600">Loading patient data...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Edit Patient</h1>
          <p className="text-gray-600 mt-2">Update patient information below</p>
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