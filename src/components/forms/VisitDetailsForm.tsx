import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface VisitDetailsFormProps {
  formData: {
    fatherName: string;
    visitDate: string;
    medicinePrescribedDays: string;
    nextFollowUpDate: string;
  };
  onInputChange: (field: string, value: string) => void;
}

export function VisitDetailsForm({ formData, onInputChange }: VisitDetailsFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visit Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="fatherName">Father Name</Label>
          <Input
            id="fatherName"
            value={formData.fatherName}
            onChange={(e) => onInputChange("fatherName", e.target.value)}
            placeholder="Enter father's name"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="visitDate">Visit Date</Label>
            <Input
              id="visitDate"
              type="date"
              value={formData.visitDate}
              onChange={(e) => onInputChange("visitDate", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="nextFollowUpDate">Next Follow Up Date</Label>
            <Input
              id="nextFollowUpDate"
              type="date"
              value={formData.nextFollowUpDate}
              onChange={(e) => onInputChange("nextFollowUpDate", e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="medicinePrescribedDays">Medicine Prescribed for Days</Label>
          <Textarea
            id="medicinePrescribedDays"
            value={formData.medicinePrescribedDays}
            onChange={(e) => onInputChange("medicinePrescribedDays", e.target.value)}
            placeholder="Enter prescribed medicines and duration (e.g., Paracetamol - 5 days, Amoxicillin - 7 days)"
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}