
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Function to generate unique patient ID with custom prefix
const generatePatientId = (prefix: string = "NH") => {
  const timestamp = Date.now().toString();
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp.slice(-6)}${randomNum}`;
};

export default function NewPatient() {
  const navigate = useNavigate();
  const [patientIdPrefix, setPatientIdPrefix] = useState("NH");
  const [patientId, setPatientId] = useState(generatePatientId("NH"));
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

  const handlePrefixChange = (newPrefix: string) => {
    setPatientIdPrefix(newPrefix);
    setPatientId(generatePatientId(newPrefix));
  };

  const regenerateId = () => {
    setPatientId(generatePatientId(patientIdPrefix));
  };

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
        {/* Patient ID Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Patient ID Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="patientIdPrefix">ID Prefix</Label>
                <Input
                  id="patientIdPrefix"
                  value={patientIdPrefix}
                  onChange={(e) => handlePrefixChange(e.target.value.toUpperCase())}
                  placeholder="NH"
                  maxLength={5}
                />
              </div>
              <div>
                <Label htmlFor="patientId">Generated Patient ID</Label>
                <Input
                  id="patientId"
                  value={patientId}
                  disabled
                  className="bg-gray-50 font-medium text-blue-600"
                />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="outline" onClick={regenerateId}>
                  Regenerate ID
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patient Information */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select onValueChange={(value) => handleInputChange("gender", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                <Input
                  id="emergencyPhone"
                  type="tel"
                  value={formData.emergencyPhone}
                  onChange={(e) => handleInputChange("emergencyPhone", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medical Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="medicalHistory">Medical History</Label>
              <Textarea
                id="medicalHistory"
                value={formData.medicalHistory}
                onChange={(e) => handleInputChange("medicalHistory", e.target.value)}
                rows={3}
                placeholder="Enter relevant medical history..."
              />
            </div>

            <div>
              <Label htmlFor="allergies">Allergies</Label>
              <Textarea
                id="allergies"
                value={formData.allergies}
                onChange={(e) => handleInputChange("allergies", e.target.value)}
                rows={2}
                placeholder="Enter known allergies..."
              />
            </div>

            <div>
              <Label htmlFor="currentMedications">Current Medications</Label>
              <Textarea
                id="currentMedications"
                value={formData.currentMedications}
                onChange={(e) => handleInputChange("currentMedications", e.target.value)}
                rows={3}
                placeholder="Enter current medications..."
              />
            </div>
          </CardContent>
        </Card>

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
