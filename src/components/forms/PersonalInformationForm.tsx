
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PATIENT_CATEGORIES } from "@/hooks/usePatientForm";
import { User } from "lucide-react";

interface PersonalInformationFormProps {
  formData: {
    patientId: string;
    fileNo: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    aadhar: string;
    govtIdOld: string;
    govtIdNew: string;
    category: string;
  };
  onInputChange: (field: string, value: string) => void;
  isEditing?: boolean;
}

export function PersonalInformationForm({ formData, onInputChange, isEditing = false }: PersonalInformationFormProps) {
  return (
    <Card className="border-teal/20 bg-white/80 backdrop-blur-sm overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-teal/5 via-transparent to-cyan/5 pointer-events-none" />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-teal to-cyan">
            <User className="h-4 w-4 text-white" />
          </div>
          <span className="bg-gradient-to-r from-teal to-cyan bg-clip-text text-transparent">Personal Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="patientId" className="text-teal">Patient ID *</Label>
            <Input
              id="patientId"
              value={formData.patientId}
              onChange={(e) => onInputChange("patientId", e.target.value)}
              required
              disabled={isEditing}
              className={`border-teal/30 focus:border-teal focus:ring-teal/20 ${isEditing ? "bg-muted" : ""}`}
              placeholder={isEditing ? "Auto-generated" : "Enter patient ID"}
            />
          </div>
          <div>
            <Label htmlFor="fileNo" className="text-cyan">File No.</Label>
            <Input
              id="fileNo"
              value={formData.fileNo}
              onChange={(e) => onInputChange("fileNo", e.target.value)}
              placeholder="Enter file number"
              className="border-teal/30 focus:border-teal focus:ring-teal/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName" className="text-teal">First Name *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => onInputChange("firstName", e.target.value)}
              required
              className="border-teal/30 focus:border-teal focus:ring-teal/20"
            />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-teal">Last Name *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => onInputChange("lastName", e.target.value)}
              required
              className="border-teal/30 focus:border-teal focus:ring-teal/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dateOfBirth" className="text-cyan">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => onInputChange("dateOfBirth", e.target.value)}
              className="border-teal/30 focus:border-teal focus:ring-teal/20"
            />
          </div>
          <div>
            <Label htmlFor="gender" className="text-cyan">Gender</Label>
            <Select value={formData.gender} onValueChange={(value) => onInputChange("gender", value)}>
              <SelectTrigger className="border-teal/30 focus:border-teal focus:ring-teal/20">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category" className="text-lime">Patient Category</Label>
            <Select value={formData.category} onValueChange={(value) => onInputChange("category", value)}>
              <SelectTrigger className="border-teal/30 focus:border-teal focus:ring-teal/20">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {PATIENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="aadhar" className="text-emerald">Aadhar Number</Label>
            <Input
              id="aadhar"
              value={formData.aadhar}
              onChange={(e) => onInputChange("aadhar", e.target.value)}
              placeholder="Enter Aadhar number"
              className="border-teal/30 focus:border-teal focus:ring-teal/20"
            />
          </div>
          <div>
            <Label htmlFor="govtIdOld" className="text-emerald">Govt ID Old</Label>
            <Input
              id="govtIdOld"
              value={formData.govtIdOld}
              onChange={(e) => onInputChange("govtIdOld", e.target.value)}
              placeholder="Enter old govt ID"
              className="border-teal/30 focus:border-teal focus:ring-teal/20"
            />
          </div>
          <div>
            <Label htmlFor="govtIdNew" className="text-emerald">Govt ID New</Label>
            <Input
              id="govtIdNew"
              value={formData.govtIdNew}
              onChange={(e) => onInputChange("govtIdNew", e.target.value)}
              placeholder="Enter new govt ID"
              className="border-teal/30 focus:border-teal focus:ring-teal/20"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}