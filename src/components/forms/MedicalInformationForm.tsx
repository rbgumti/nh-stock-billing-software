
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MedicalInformationFormProps {
  formData: {
    medicalHistory: string;
    allergies: string;
    currentMedications: string;
  };
  onInputChange: (field: string, value: string) => void;
}

export function MedicalInformationForm({ formData, onInputChange }: MedicalInformationFormProps) {
  return (
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
            onChange={(e) => onInputChange("medicalHistory", e.target.value)}
            rows={3}
            placeholder="Enter relevant medical history..."
          />
        </div>

        <div>
          <Label htmlFor="allergies">Allergies</Label>
          <Textarea
            id="allergies"
            value={formData.allergies}
            onChange={(e) => onInputChange("allergies", e.target.value)}
            rows={2}
            placeholder="Enter known allergies..."
          />
        </div>

        <div>
          <Label htmlFor="currentMedications">Current Medications</Label>
          <Textarea
            id="currentMedications"
            value={formData.currentMedications}
            onChange={(e) => onInputChange("currentMedications", e.target.value)}
            rows={3}
            placeholder="Enter current medications..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
