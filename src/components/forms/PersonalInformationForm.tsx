
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PersonalInformationFormProps {
  formData: {
    patientId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    aadhar: string;
    govtIdOld: string;
    govtIdNew: string;
  };
  onInputChange: (field: string, value: string) => void;
}

export function PersonalInformationForm({ formData, onInputChange }: PersonalInformationFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="patientId">Patient ID *</Label>
          <Input
            id="patientId"
            value={formData.patientId}
            onChange={(e) => onInputChange("patientId", e.target.value)}
            required
            disabled
            className="bg-muted"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => onInputChange("firstName", e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => onInputChange("lastName", e.target.value)}
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
              onChange={(e) => onInputChange("dateOfBirth", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select value={formData.gender} onValueChange={(value) => onInputChange("gender", value)}>
              <SelectTrigger>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="aadhar">Aadhar Number</Label>
            <Input
              id="aadhar"
              value={formData.aadhar}
              onChange={(e) => onInputChange("aadhar", e.target.value)}
              placeholder="Enter Aadhar number"
            />
          </div>
          <div>
            <Label htmlFor="govtIdOld">Govt ID Old</Label>
            <Input
              id="govtIdOld"
              value={formData.govtIdOld}
              onChange={(e) => onInputChange("govtIdOld", e.target.value)}
              placeholder="Enter old govt ID"
            />
          </div>
          <div>
            <Label htmlFor="govtIdNew">Govt ID New</Label>
            <Input
              id="govtIdNew"
              value={formData.govtIdNew}
              onChange={(e) => onInputChange("govtIdNew", e.target.value)}
              placeholder="Enter new govt ID"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
