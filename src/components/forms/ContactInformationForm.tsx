
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone } from "lucide-react";

interface ContactInformationFormProps {
  formData: {
    phone: string;
    email: string;
    address: string;
  };
  onInputChange: (field: string, value: string) => void;
}

export function ContactInformationForm({ formData, onInputChange }: ContactInformationFormProps) {
  return (
    <Card className="border-cyan/20 bg-white/80 backdrop-blur-sm overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-lime/5 pointer-events-none" />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan to-lime">
            <Phone className="h-4 w-4 text-white" />
          </div>
          <span className="bg-gradient-to-r from-cyan to-lime bg-clip-text text-transparent">Contact Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone" className="text-cyan">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => onInputChange("phone", e.target.value)}
              required
              className="border-teal/30 focus:border-cyan focus:ring-cyan/20"
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-cyan">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => onInputChange("email", e.target.value)}
              className="border-teal/30 focus:border-cyan focus:ring-cyan/20"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="address" className="text-lime">Address</Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => onInputChange("address", e.target.value)}
            rows={3}
            className="border-teal/30 focus:border-cyan focus:ring-cyan/20"
          />
        </div>
      </CardContent>
    </Card>
  );
}