import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Phone, Mail, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { usePatientStore } from "@/hooks/usePatientStore";

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");
  const { patients: storePatients, subscribe } = usePatientStore();

  // Force re-render when patients are updated
  useEffect(() => {
    const unsubscribe = subscribe(() => {
      // This will trigger a re-render
    });
    return unsubscribe;
  }, [subscribe]);

  // Transform patient data for display
  const patients = storePatients.map((patient, index) => ({
    id: index + 1,
    patientId: patient.patientId,
    name: `${patient.firstName} ${patient.lastName}`,
    age: patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : 0,
    gender: patient.gender,
    phone: patient.phone,
    email: patient.email,
    aadhar: patient.aadhar,
    govtIdOld: patient.govtIdOld,
    govtIdNew: patient.govtIdNew,
    lastVisit: "2024-01-15", // Default for now
    status: "Active" // Default for now
  }));

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.includes(searchTerm) ||
    patient.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.aadhar.includes(searchTerm) ||
    patient.govtIdOld.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.govtIdNew.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-600 mt-2">Manage your patient records</p>
        </div>
        <Button asChild>
          <Link to="/patients/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Patient
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search patients by name, email, phone, patient ID, Aadhar, or govt ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.map((patient) => (
          <Card key={patient.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{patient.name}</CardTitle>
                  <p className="text-sm text-gray-500">{patient.age} years old • {patient.gender}</p>
                </div>
                <Badge variant={patient.status === "Active" ? "default" : "secondary"}>
                  {patient.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {patient.phone}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  {patient.email}
                </div>
                <div className="text-sm text-gray-500">
                  Last visit: {patient.lastVisit}
                </div>
                <div className="flex space-x-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to={`/patients/view/${patient.patientId}`}>
                      View Details
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to={`/patients/edit/${patient.patientId}`}>
                      Edit
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPatients.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first patient"}
            </p>
            <Button asChild>
              <Link to="/patients/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Patient
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
