import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

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
    <Card className="border-teal/20 bg-white/80 backdrop-blur-sm overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-teal/5 via-transparent to-cyan/5 pointer-events-none" />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-teal to-cyan">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          <span className="bg-gradient-to-r from-teal to-cyan bg-clip-text text-transparent">Visit Details</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        <div>
          <Label htmlFor="fatherName" className="text-teal">Father Name</Label>
          <Input
            id="fatherName"
            value={formData.fatherName}
            onChange={(e) => onInputChange("fatherName", e.target.value)}
            placeholder="Enter father's name"
            className="border-teal/30 focus:border-teal focus:ring-teal/20"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="visitDate" className="text-cyan">Visit Date</Label>
            <Input
              id="visitDate"
              type="date"
              value={formData.visitDate}
              onChange={(e) => onInputChange("visitDate", e.target.value)}
              className="border-teal/30 focus:border-cyan focus:ring-cyan/20"
            />
          </div>
          <div>
            <Label htmlFor="nextFollowUpDate" className="text-lime">Next Follow Up Date</Label>
            <Input
              id="nextFollowUpDate"
              type="date"
              value={formData.nextFollowUpDate}
              onChange={(e) => onInputChange("nextFollowUpDate", e.target.value)}
              className="border-teal/30 focus:border-lime focus:ring-lime/20"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="medicinePrescribedDays" className="text-emerald">PRESCRIPTION VALID FOR ___DAYS</Label>
          <Textarea
            id="medicinePrescribedDays"
            value={formData.medicinePrescribedDays}
            onChange={(e) => onInputChange("medicinePrescribedDays", e.target.value)}
            placeholder="Enter prescription validity period (e.g., 7 days, 15 days)"
            rows={3}
            className="border-teal/30 focus:border-emerald focus:ring-emerald/20"
          />
        </div>
      </CardContent>
    </Card>
  );
}