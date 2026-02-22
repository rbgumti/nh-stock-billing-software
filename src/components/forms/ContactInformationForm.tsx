
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ContactInformationFormProps {
  formData: {
    phone: string;
    email: string;
    fatherName?: string;
    address: string;
  };
  onInputChange: (field: string, value: string) => void;
}

export function ContactInformationForm({ formData, onInputChange }: ContactInformationFormProps) {
  return (
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
              onChange={(e) => onInputChange("phone", e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => onInputChange("email", e.target.value)}
            />
          </div>
        </div>

        {formData.fatherName !== undefined && (
          <div>
            <Label htmlFor="fatherName">Father Name</Label>
            <Input
              id="fatherName"
              value={formData.fatherName}
              onChange={(e) => onInputChange("fatherName", e.target.value)}
              placeholder="Enter father's name"
            />
          </div>
        )}

        <div>
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => onInputChange("address", e.target.value)}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}
