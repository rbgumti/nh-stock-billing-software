
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface EmergencyContactFormProps {
  formData: {
    emergencyContact: string;
    emergencyPhone: string;
  };
  onInputChange: (field: string, value: string) => void;
}

export function EmergencyContactForm({ formData, onInputChange }: EmergencyContactFormProps) {
  return (
    <Card className="border-lime/20 bg-white/80 backdrop-blur-sm overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-lime/5 via-transparent to-emerald/5 pointer-events-none" />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-lime to-emerald">
            <AlertTriangle className="h-4 w-4 text-white" />
          </div>
          <span className="bg-gradient-to-r from-lime to-emerald bg-clip-text text-transparent">Emergency Contact</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="emergencyContact" className="text-lime">Emergency Contact Name</Label>
            <Input
              id="emergencyContact"
              value={formData.emergencyContact}
              onChange={(e) => onInputChange("emergencyContact", e.target.value)}
              className="border-teal/30 focus:border-lime focus:ring-lime/20"
            />
          </div>
          <div>
            <Label htmlFor="emergencyPhone" className="text-lime">Emergency Contact Phone</Label>
            <Input
              id="emergencyPhone"
              type="tel"
              value={formData.emergencyPhone}
              onChange={(e) => onInputChange("emergencyPhone", e.target.value)}
              className="border-teal/30 focus:border-lime focus:ring-lime/20"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}