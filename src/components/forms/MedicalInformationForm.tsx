
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";

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
    <Card className="border-emerald/20 bg-white/80 backdrop-blur-sm overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald/5 via-transparent to-teal/5 pointer-events-none" />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald to-teal">
            <Heart className="h-4 w-4 text-white" />
          </div>
          <span className="bg-gradient-to-r from-emerald to-teal bg-clip-text text-transparent">Medical Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        <div>
          <Label htmlFor="medicalHistory" className="text-emerald">Medical History</Label>
          <Textarea
            id="medicalHistory"
            value={formData.medicalHistory}
            onChange={(e) => onInputChange("medicalHistory", e.target.value)}
            rows={3}
            placeholder="Enter relevant medical history..."
            className="border-teal/30 focus:border-emerald focus:ring-emerald/20"
          />
        </div>

        <div>
          <Label htmlFor="allergies" className="text-orange">Allergies</Label>
          <Textarea
            id="allergies"
            value={formData.allergies}
            onChange={(e) => onInputChange("allergies", e.target.value)}
            rows={2}
            placeholder="Enter known allergies..."
            className="border-teal/30 focus:border-orange focus:ring-orange/20"
          />
        </div>

        <div>
          <Label htmlFor="currentMedications" className="text-teal">Current Medications</Label>
          <Textarea
            id="currentMedications"
            value={formData.currentMedications}
            onChange={(e) => onInputChange("currentMedications", e.target.value)}
            rows={3}
            placeholder="Enter current medications..."
            className="border-teal/30 focus:border-teal focus:ring-teal/20"
          />
        </div>
      </CardContent>
    </Card>
  );
}