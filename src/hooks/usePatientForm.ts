
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export interface PatientFormData {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  aadhar: string;
  govtIdOld: string;
  govtIdNew: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalHistory: string;
  allergies: string;
  currentMedications: string;
}

export function usePatientForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<PatientFormData>({
    patientId: `PT${Date.now()}`,
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    aadhar: "",
    govtIdOld: "",
    govtIdNew: "",
    phone: "",
    email: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    medicalHistory: "",
    allergies: "",
    currentMedications: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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
    console.log("New patient data:", formData);
    
    toast({
      title: "Success",
      description: "Patient has been added successfully!"
    });
    
    navigate("/patients");
  };

  return {
    formData,
    handleInputChange,
    handleSubmit
  };
}
