
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EmergencyContactFormProps {
  formData: {
    emergencyContact: string;
    emergencyPhone: string;
  };
  onInputChange: (field: string, value: string) => void;
}

export function EmergencyContactForm({ formData, onInputChange }: EmergencyContactFormProps) {
  return (
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
              onChange={(e) => onInputChange("emergencyContact", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
            <Input
              id="emergencyPhone"
              type="tel"
              value={formData.emergencyPhone}
              onChange={(e) => onInputChange("emergencyPhone", e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
