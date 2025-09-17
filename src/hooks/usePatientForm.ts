import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { usePatientStore } from "./usePatientStore";

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

export function usePatientForm(isEditing: boolean = false) {
  const navigate = useNavigate();
  const { addPatient, updatePatient } = usePatientStore();
  const [originalPatientId, setOriginalPatientId] = useState<string>("");
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
    console.log(`[DEBUG] Updating field "${field}" with value:`, value);
    console.log(`[DEBUG] Previous value for ${field}:`, formData[field as keyof PatientFormData]);
    
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      console.log(`[DEBUG] Updated form data:`, updated);
      console.log(`[DEBUG] Field ${field} changed from "${prev[field as keyof PatientFormData]}" to "${value}"`);
      return updated;
    });
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

    if (isEditing && originalPatientId) {
      // Update existing patient
      updatePatient(originalPatientId, formData);
      toast({
        title: "Success",
        description: "Patient has been updated successfully!"
      });
    } else {
      // Add new patient
      addPatient(formData);
      toast({
        title: "Success",
        description: "Patient has been added successfully!"
      });
    }
    
    navigate("/patients");
  };

  const loadPatientData = (patientData: PatientFormData) => {
    console.log("Loading patient data:", patientData);
    // Convert numeric values to strings to ensure form compatibility
    const formattedData = {
      ...patientData,
      patientId: String(patientData.patientId),
      aadhar: String(patientData.aadhar || ''),
      govtIdOld: String(patientData.govtIdOld || ''),
      govtIdNew: String(patientData.govtIdNew || ''),
      phone: String(patientData.phone || ''),
      email: String(patientData.email || ''),
      address: String(patientData.address || ''),
      emergencyContact: String(patientData.emergencyContact || ''),
      emergencyPhone: String(patientData.emergencyPhone || ''),
      medicalHistory: String(patientData.medicalHistory || ''),
      allergies: String(patientData.allergies || ''),
      currentMedications: String(patientData.currentMedications || '')
    };
    console.log("Formatted patient data for form:", formattedData);
    setFormData(formattedData);
    setOriginalPatientId(String(patientData.patientId));
  };

  return {
    formData,
    handleInputChange,
    handleSubmit,
    loadPatientData
  };
}