import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { generatePatientId } from "@/utils/patientIdGenerator";
import { PatientIdConfiguration } from "@/components/forms/PatientIdConfiguration";
import { PatientInformationForm } from "@/components/forms/PatientInformationForm";
import { ContactInformationForm } from "@/components/forms/ContactInformationForm";
import { EmergencyContactForm } from "@/components/forms/EmergencyContactForm";
import { MedicalInformationForm } from "@/components/forms/MedicalInformationForm";

export default function NewPatient() {
  console.log("NewPatient component mounted");
  
  const navigate = useNavigate();
  const [patientIdPrefix, setPatientIdPrefix] = useState("NH");
  const [idConfig, setIdConfig] = useState({
    includeDate: true,
    includeTime: true,
    includeRandom: true,
    separator: "-",
    randomLength: 3
  });
  const [patientId, setPatientId] = useState(
    generatePatientId(
      "NH",
      idConfig.includeDate,
      idConfig.includeTime,
      idConfig.includeRandom,
      idConfig.separator,
      idConfig.randomLength
    )
  );
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    email: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    medicalHistory: "",
    allergies: "",
    currentMedications: ""
  });

  console.log("Current form data:", formData);
  console.log("Current patient ID:", patientId);

  const handlePrefixChange = (newPrefix: string) => {
    setPatientIdPrefix(newPrefix);
    regenerateIdWithNewConfig(newPrefix, idConfig);
  };

  const handleConfigChange = (newConfig: any) => {
    setIdConfig(newConfig);
    regenerateIdWithNewConfig(patientIdPrefix, newConfig);
  };

  const regenerateIdWithNewConfig = (prefix: string, config: any) => {
    setPatientId(
      generatePatientId(
        prefix,
        config.includeDate,
        config.includeTime,
        config.includeRandom,
        config.separator,
        config.randomLength
      )
    );
  };

  const regenerateId = () => {
    regenerateIdWithNewConfig(patientIdPrefix, idConfig);
  };

  const handleInputChange = (field: string, value: string) => {
    console.log(`Updating field ${field} with value:`, value);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted with data:", formData);
    
    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    // In a real app, this would send data to the backend
    const newPatientData = {
      id: patientId,
      ...formData
    };
    console.log("New patient data:", newPatientData);
    
    toast({
      title: "Success",
      description: `Patient ${formData.firstName} ${formData.lastName} has been added with ID: ${patientId}!`
    });
    
    navigate("/patients");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Patient</h1>
          <p className="text-gray-600 mt-2">Patient ID: <span className="font-medium text-blue-600">{patientId}</span></p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <PatientIdConfiguration
          patientIdPrefix={patientIdPrefix}
          patientId={patientId}
          onPrefixChange={handlePrefixChange}
          onRegenerateId={regenerateId}
          idConfig={idConfig}
          onConfigChange={handleConfigChange}
        />

        <PatientInformationForm
          formData={{
            firstName: formData.firstName,
            lastName: formData.lastName,
            dateOfBirth: formData.dateOfBirth,
            gender: formData.gender
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
