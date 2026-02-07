import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { usePatientStore } from "./usePatientStore";

export interface PatientFormData {
  patientId: string;
  fileNo: string;
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
  fatherName: string;
  visitDate: string;
  medicinePrescribedDays: string;
  nextFollowUpDate: string;
  category: string;
}

export const PATIENT_CATEGORIES = ['BNX', 'TPN', 'PSHY', 'BNX + PSHY', 'TPN + PSHY'] as const;

export function usePatientForm(isEditing: boolean = false) {
  const navigate = useNavigate();
  const { addPatient, updatePatient } = usePatientStore();
  const [originalPatientId, setOriginalPatientId] = useState<string>("");
  const [formData, setFormData] = useState<PatientFormData>({
    patientId: `PT${Date.now()}`,
    fileNo: "",
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
    currentMedications: "",
    fatherName: "",
    visitDate: "",
    medicinePrescribedDays: "",
    nextFollowUpDate: "",
    category: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      if (isEditing && originalPatientId) {
        // Update existing patient
        await updatePatient(originalPatientId, formData);
      } else {
        // Add new patient
        await addPatient(formData);
        toast({
          title: "Success",
          description: "Patient has been added successfully!"
        });
      }
      
      navigate("/patients");
    } catch (error: any) {
      console.error('Error submitting patient form:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to add patient. Please try again.",
        variant: "destructive"
      });
    }
  };

  const loadPatientData = (patientData: PatientFormData) => {
    // Convert numeric values to strings to ensure form compatibility
    const formattedData = {
      ...patientData,
      patientId: String(patientData.patientId),
      fileNo: String(patientData.fileNo || ''),
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
      currentMedications: String(patientData.currentMedications || ''),
      fatherName: String(patientData.fatherName || ''),
      visitDate: String(patientData.visitDate || ''),
      medicinePrescribedDays: String(patientData.medicinePrescribedDays || ''),
      nextFollowUpDate: String(patientData.nextFollowUpDate || ''),
      category: String(patientData.category || '')
    };
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