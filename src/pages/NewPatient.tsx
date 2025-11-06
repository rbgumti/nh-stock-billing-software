
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PersonalInformationForm } from "@/components/forms/PersonalInformationForm";
import { ContactInformationForm } from "@/components/forms/ContactInformationForm";
import { EmergencyContactForm } from "@/components/forms/EmergencyContactForm";
import { MedicalInformationForm } from "@/components/forms/MedicalInformationForm";
import { VisitDetailsForm } from "@/components/forms/VisitDetailsForm";
import { usePatientForm } from "@/hooks/usePatientForm";

export default function NewPatient() {
  const navigate = useNavigate();
  const { formData, handleInputChange, handleSubmit } = usePatientForm();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Patient</h1>
          <p className="text-gray-600 mt-2">Enter patient information below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <PersonalInformationForm
          formData={{
            patientId: formData.patientId,
            fileNo: formData.fileNo,
            firstName: formData.firstName,
            lastName: formData.lastName,
            dateOfBirth: formData.dateOfBirth,
            gender: formData.gender,
            aadhar: formData.aadhar,
            govtIdOld: formData.govtIdOld,
            govtIdNew: formData.govtIdNew
          }}
          onInputChange={handleInputChange}
          isEditing={false}
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

        <VisitDetailsForm
          formData={{
            fatherName: formData.fatherName,
            visitDate: formData.visitDate,
            medicinePrescribedDays: formData.medicinePrescribedDays,
            nextFollowUpDate: formData.nextFollowUpDate
          }}
          onInputChange={handleInputChange}
        />

        <div className="flex space-x-4">
          <Button type="submit" className="flex-1">
            Add Patient
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
