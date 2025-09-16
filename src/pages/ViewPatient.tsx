import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, Phone, Mail, MapPin, Heart, Stethoscope, Pill } from "lucide-react";
import { usePatientStore } from "@/hooks/usePatientStore";
import { useEffect, useState } from "react";
import { PatientFormData } from "@/hooks/usePatientForm";

export default function ViewPatient() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getPatient, patients } = usePatientStore();
  const [patient, setPatient] = useState<PatientFormData | null>(null);

  useEffect(() => {
    if (id) {
      console.log("Looking for patient with ID:", id);
      const foundPatient = getPatient(id);
      if (foundPatient) {
        console.log("Found patient:", foundPatient);
        setPatient(foundPatient);
      } else {
        console.error("Patient not found:", id);
        console.log("Available patients:", patients.map(p => p.patientId));
        navigate("/patients");
      }
    }
  }, [id, getPatient, navigate, patients]);

  if (!patient) {
    return <div>Loading...</div>;
  }

  const age = patient.dateOfBirth 
    ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-gray-600 mt-2">Patient ID: {patient.patientId}</p>
          </div>
        </div>
        <Button asChild>
          <Link to={`/patients/edit/${patient.patientId}`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Patient
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Heart className="h-5 w-5 mr-2" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Full Name</label>
              <p className="text-lg">{patient.firstName} {patient.lastName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Date of Birth</label>
              <p>{patient.dateOfBirth} ({age} years old)</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Gender</label>
              <p>{patient.gender}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Aadhar Number</label>
              <p>{patient.aadhar || "Not provided"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Government ID (Old)</label>
              <p>{patient.govtIdOld || "Not provided"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Government ID (New)</label>
              <p>{patient.govtIdNew || "Not provided"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Phone className="h-5 w-5 mr-2" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-2 text-gray-400" />
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p>{patient.phone}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Mail className="h-4 w-4 mr-2 text-gray-400" />
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p>{patient.email}</p>
              </div>
            </div>
            <div className="flex items-start">
              <MapPin className="h-4 w-4 mr-2 mt-1 text-gray-400" />
              <div>
                <label className="text-sm font-medium text-gray-500">Address</label>
                <p>{patient.address || "Not provided"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Phone className="h-5 w-5 mr-2 text-red-500" />
              Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Contact Name</label>
              <p>{patient.emergencyContact || "Not provided"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Contact Phone</label>
              <p>{patient.emergencyPhone || "Not provided"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Medical Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Stethoscope className="h-5 w-5 mr-2 text-blue-500" />
              Medical Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Medical History</label>
              <p className="whitespace-pre-wrap">{patient.medicalHistory || "No medical history recorded"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Allergies</label>
              <p className="whitespace-pre-wrap">{patient.allergies || "No known allergies"}</p>
            </div>
            <div className="flex items-start">
              <Pill className="h-4 w-4 mr-2 mt-1 text-green-500" />
              <div>
                <label className="text-sm font-medium text-gray-500">Current Medications</label>
                <p className="whitespace-pre-wrap">{patient.currentMedications || "No current medications"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}