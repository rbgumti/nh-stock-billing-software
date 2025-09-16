import { useState } from "react";
import { PatientFormData } from "./usePatientForm";

// Mock initial data
const initialPatients: PatientFormData[] = [
  {
    patientId: "PT001",
    firstName: "John",
    lastName: "Doe",
    dateOfBirth: "1979-01-15",
    gender: "Male",
    phone: "+1 234-567-8900",
    email: "john.doe@email.com",
    address: "123 Main St",
    aadhar: "1234 5678 9012",
    govtIdOld: "DL123456",
    govtIdNew: "AB1234567890",
    emergencyContact: "Jane Doe",
    emergencyPhone: "+1 234-567-8901",
    medicalHistory: "",
    allergies: "",
    currentMedications: ""
  },
  {
    patientId: "PT002",
    firstName: "Jane",
    lastName: "Smith",
    dateOfBirth: "1992-06-20",
    gender: "Female",
    phone: "+1 234-567-8901",
    email: "jane.smith@email.com",
    address: "456 Oak Ave",
    aadhar: "2345 6789 0123",
    govtIdOld: "DL234567",
    govtIdNew: "CD2345678901",
    emergencyContact: "John Smith",
    emergencyPhone: "+1 234-567-8902",
    medicalHistory: "",
    allergies: "",
    currentMedications: ""
  },
  {
    patientId: "PT003",
    firstName: "Mike",
    lastName: "Johnson",
    dateOfBirth: "1966-03-10",
    gender: "Male",
    phone: "+1 234-567-8902",
    email: "mike.johnson@email.com",
    address: "789 Pine St",
    aadhar: "3456 7890 1234",
    govtIdOld: "DL345678",
    govtIdNew: "EF3456789012",
    emergencyContact: "Sarah Johnson",
    emergencyPhone: "+1 234-567-8903",
    medicalHistory: "",
    allergies: "",
    currentMedications: ""
  },
  {
    patientId: "PT004",
    firstName: "Sarah",
    lastName: "Wilson",
    dateOfBirth: "1996-08-12",
    gender: "Female",
    phone: "+1 234-567-8903",
    email: "sarah.wilson@email.com",
    address: "321 Elm Dr",
    aadhar: "4567 8901 2345",
    govtIdOld: "DL456789",
    govtIdNew: "GH4567890123",
    emergencyContact: "Tom Wilson",
    emergencyPhone: "+1 234-567-8904",
    medicalHistory: "",
    allergies: "",
    currentMedications: ""
  }
];

// Load from localStorage if available, otherwise use initial data
const loadPatientsFromStorage = (): PatientFormData[] => {
  try {
    const stored = localStorage.getItem('patients');
    return stored ? JSON.parse(stored) : initialPatients;
  } catch {
    return initialPatients;
  }
};

// Initialize store with data from localStorage
let patientsStore: PatientFormData[] = loadPatientsFromStorage();
let listeners: (() => void)[] = [];

// Save to localStorage whenever store changes
const saveToStorage = () => {
  localStorage.setItem('patients', JSON.stringify(patientsStore));
};

export function usePatientStore() {
  const [patients, setPatients] = useState<PatientFormData[]>(patientsStore);

  const addPatient = (patient: PatientFormData) => {
    patientsStore = [...patientsStore, patient];
    saveToStorage();
    notifyListeners();
  };

  const updatePatient = (patientId: string, updatedPatient: PatientFormData) => {
    patientsStore = patientsStore.map(p => 
      String(p.patientId) === String(patientId) ? updatedPatient : p
    );
    saveToStorage();
    notifyListeners();
  };

  const deletePatient = (patientId: string) => {
    patientsStore = patientsStore.filter(p => String(p.patientId) !== String(patientId));
    saveToStorage();
    notifyListeners();
  };

  const getPatient = (patientId: string) => {
    return patientsStore.find(p => String(p.patientId) === String(patientId));
  };

  const notifyListeners = () => {
    listeners.forEach(listener => listener());
    setPatients([...patientsStore]);
  };

  // Subscribe to changes
  const subscribe = (listener: () => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  };

  return {
    patients,
    addPatient,
    updatePatient,
    deletePatient,
    getPatient,
    subscribe
  };
}