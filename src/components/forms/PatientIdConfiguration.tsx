
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PatientIdConfigurationProps {
  patientIdPrefix: string;
  patientId: string;
  onPrefixChange: (prefix: string) => void;
  onRegenerateId: () => void;
}

export function PatientIdConfiguration({
  patientIdPrefix,
  patientId,
  onPrefixChange,
  onRegenerateId
}: PatientIdConfigurationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient ID Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="patientIdPrefix">ID Prefix</Label>
            <Input
              id="patientIdPrefix"
              value={patientIdPrefix}
              onChange={(e) => onPrefixChange(e.target.value.toUpperCase())}
              placeholder="NH"
              maxLength={5}
            />
          </div>
          <div>
            <Label htmlFor="patientId">Generated Patient ID</Label>
            <Input
              id="patientId"
              value={patientId}
              disabled
              className="bg-gray-50 font-medium text-blue-600"
            />
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={onRegenerateId}>
              Regenerate ID
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
