import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PersonalInformationForm } from "@/components/forms/PersonalInformationForm";
import { ContactInformationForm } from "@/components/forms/ContactInformationForm";
import { EmergencyContactForm } from "@/components/forms/EmergencyContactForm";
import { MedicalInformationForm } from "@/components/forms/MedicalInformationForm";
import { usePatientForm } from "@/hooks/usePatientForm";
import { usePatientStore } from "@/hooks/usePatientStore";
import { useEffect } from "react";

export default function EditPatient() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formData, handleInputChange, handleSubmit, loadPatientData } = usePatientForm(true);
  const { getPatient, patients } = usePatientStore();

  useEffect(() => {
    if (id) {
      console.log("EditPatient: Looking for patient with ID:", id);
      console.log("EditPatient: Available patients:", patients.map(p => ({ id: p.patientId, name: p.firstName })));
      const patient = getPatient(id);
      if (patient) {
        console.log("EditPatient: Found patient:", patient);
        loadPatientData(patient);
      } else {
        console.error("EditPatient: Patient not found:", id);
        navigate("/patients");
      }
    }
  }, [id, patients, getPatient, loadPatientData, navigate]);

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