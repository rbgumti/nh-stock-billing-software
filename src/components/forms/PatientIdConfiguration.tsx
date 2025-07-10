
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PatientIdConfigurationProps {
  patientIdPrefix: string;
  patientId: string;
  onPrefixChange: (prefix: string) => void;
  onRegenerateId: () => void;
  idConfig: {
    includeDate: boolean;
    includeTime: boolean;
    includeRandom: boolean;
    separator: string;
    randomLength: number;
  };
  onConfigChange: (config: any) => void;
}

export function PatientIdConfiguration({
  patientIdPrefix,
  patientId,
  onPrefixChange,
  onRegenerateId,
  idConfig,
  onConfigChange
}: PatientIdConfigurationProps) {
  const handleConfigChange = (field: string, value: any) => {
    onConfigChange({
      ...idConfig,
      [field]: value
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient ID Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="patientIdPrefix">ID Prefix</Label>
            <Input
              id="patientIdPrefix"
              value={patientIdPrefix}
              onChange={(e) => onPrefixChange(e.target.value.toUpperCase())}
              placeholder="NH"
              maxLength={10}
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
            <Button type="button" variant="outline" onClick={onRegenerateId} className="w-full">
              Regenerate ID
            </Button>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">ID Components</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeDate"
                checked={idConfig.includeDate}
                onCheckedChange={(checked) => handleConfigChange("includeDate", checked)}
              />
              <Label htmlFor="includeDate" className="text-sm">Include Date</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeTime"
                checked={idConfig.includeTime}
                onCheckedChange={(checked) => handleConfigChange("includeTime", checked)}
              />
              <Label htmlFor="includeTime" className="text-sm">Include Time</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeRandom"
                checked={idConfig.includeRandom}
                onCheckedChange={(checked) => handleConfigChange("includeRandom", checked)}
              />
              <Label htmlFor="includeRandom" className="text-sm">Include Random</Label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="separator">Separator</Label>
            <Select 
              value={idConfig.separator} 
              onValueChange={(value) => handleConfigChange("separator", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-">Dash (-)</SelectItem>
                <SelectItem value="_">Underscore (_)</SelectItem>
                <SelectItem value=".">Dot (.)</SelectItem>
                <SelectItem value="">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="randomLength">Random Digits</Label>
            <Select 
              value={idConfig.randomLength.toString()} 
              onValueChange={(value) => handleConfigChange("randomLength", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 digits</SelectItem>
                <SelectItem value="3">3 digits</SelectItem>
                <SelectItem value="4">4 digits</SelectItem>
                <SelectItem value="5">5 digits</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          <p><strong>Preview format:</strong> {patientIdPrefix || "PREFIX"}{idConfig.separator}
          {idConfig.includeDate && "YYMMDD"}{idConfig.separator}
          {idConfig.includeTime && "HHMM"}{idConfig.separator}
          {idConfig.includeRandom && "X".repeat(idConfig.randomLength)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
