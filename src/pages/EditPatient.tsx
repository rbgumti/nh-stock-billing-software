import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PersonalInformationForm } from "@/components/forms/PersonalInformationForm";
import { ContactInformationForm } from "@/components/forms/ContactInformationForm";
import { EmergencyContactForm } from "@/components/forms/EmergencyContactForm";
import { MedicalInformationForm } from "@/components/forms/MedicalInformationForm";
import { usePatientForm } from "@/hooks/usePatientForm";
import { useEffect } from "react";

export default function EditPatient() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formData, handleInputChange, handleSubmit, loadPatientData } = usePatientForm();

  useEffect(() => {
    if (id) {
      // Mock patient data - in real app, this would fetch from API
      const mockPatient = {
        patientId: `PT${id}`,
        firstName: id === "1" ? "John" : id === "2" ? "Jane" : id === "3" ? "Mike" : "Sarah",
        lastName: id === "1" ? "Doe" : id === "2" ? "Smith" : id === "3" ? "Johnson" : "Wilson",
        dateOfBirth: id === "1" ? "1979-01-15" : id === "2" ? "1992-05-20" : id === "3" ? "1966-03-10" : "1996-08-25",
        gender: id === "1" ? "male" : id === "2" ? "female" : id === "3" ? "male" : "female",
        aadhar: "",
        govtIdOld: "",
        govtIdNew: "",
        phone: id === "1" ? "+1 234-567-8900" : id === "2" ? "+1 234-567-8901" : id === "3" ? "+1 234-567-8902" : "+1 234-567-8903",
        email: id === "1" ? "john.doe@email.com" : id === "2" ? "jane.smith@email.com" : id === "3" ? "mike.johnson@email.com" : "sarah.wilson@email.com",
        address: "",
        emergencyContact: "",
        emergencyPhone: "",
        medicalHistory: "",
        allergies: "",
        currentMedications: ""
      };
      loadPatientData(mockPatient);
    }
  }, [id, loadPatientData]);

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
          formData={{
            patientId: formData.patientId,
            firstName: formData.firstName,
            lastName: formData.lastName,
            dateOfBirth: formData.dateOfBirth,
            gender: formData.gender,
            aadhar: formData.aadhar,
            govtIdOld: formData.govtIdOld,
            govtIdNew: formData.govtIdNew
          }}
          onInputChange={handleInputChange}
        />

        <ContactInformationForm
          formData={{
            phone: formData.phone,
            email: formData.email,
            address: formData.address
          }}
          onInputChange={handleInputChange}
        />

        <EmergencyContactForm
          formData={{
            emergencyContact: formData.emergencyContact,
            emergencyPhone: formData.emergencyPhone
          }}
          onInputChange={handleInputChange}
        />

        <MedicalInformationForm
          formData={{
            medicalHistory: formData.medicalHistory,
            allergies: formData.allergies,
            currentMedications: formData.currentMedications
          }}
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