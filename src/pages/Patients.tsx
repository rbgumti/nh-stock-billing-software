import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Phone, Mail, Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock patient data
  const patients = [
    {
      id: 1,
      patientId: "PT001",
      name: "John Doe",
      age: 45,
      gender: "Male",
      phone: "+1 234-567-8900",
      email: "john.doe@email.com",
      aadhar: "1234 5678 9012",
      govtIdOld: "DL123456",
      govtIdNew: "AB1234567890",
      lastVisit: "2024-01-15",
      status: "Active"
    },
    {
      id: 2,
      patientId: "PT002",
      name: "Jane Smith",
      age: 32,
      gender: "Female",
      phone: "+1 234-567-8901",
      email: "jane.smith@email.com",
      aadhar: "2345 6789 0123",
      govtIdOld: "DL234567",
      govtIdNew: "CD2345678901",
      lastVisit: "2024-01-14",
      status: "Active"
    },
    {
      id: 3,
      patientId: "PT003",
      name: "Mike Johnson",
      age: 58,
      gender: "Male",
      phone: "+1 234-567-8902",
      email: "mike.johnson@email.com",
      aadhar: "3456 7890 1234",
      govtIdOld: "DL345678",
      govtIdNew: "EF3456789012",
      lastVisit: "2024-01-10",
      status: "Inactive"
    },
    {
      id: 4,
      patientId: "PT004",
      name: "Sarah Wilson",
      age: 28,
      gender: "Female",
      phone: "+1 234-567-8903",
      email: "sarah.wilson@email.com",
      aadhar: "4567 8901 2345",
      govtIdOld: "DL456789",
      govtIdNew: "GH4567890123",
      lastVisit: "2024-01-12",
      status: "Active"
    }
  ];

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
                  <Button variant="outline" size="sm" className="flex-1">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to={`/patients/edit/${patient.id}`}>
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
