import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { PrescriptionItem } from "@/hooks/usePrescriptionStore";

interface PrescriptionFormProps {
  formData: {
    patient_id: number;
    patient_name: string;
    patient_phone: string;
    patient_age: string;
    diagnosis: string;
    notes: string;
  };
  items: PrescriptionItem[];
  onFormChange: (field: string, value: string | number) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onItemChange: (index: number, field: string, value: string | number) => void;
}

export default function PrescriptionForm({
  formData,
  items,
  onFormChange,
  onAddItem,
  onRemoveItem,
  onItemChange,
}: PrescriptionFormProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="patient_name">Patient Name *</Label>
              <Input
                id="patient_name"
                value={formData.patient_name}
                onChange={(e) => onFormChange('patient_name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="patient_age">Age</Label>
              <Input
                id="patient_age"
                value={formData.patient_age}
                onChange={(e) => onFormChange('patient_age', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="patient_phone">Phone</Label>
              <Input
                id="patient_phone"
                value={formData.patient_phone}
                onChange={(e) => onFormChange('patient_phone', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="diagnosis">Diagnosis *</Label>
              <Input
                id="diagnosis"
                value={formData.diagnosis}
                onChange={(e) => onFormChange('diagnosis', e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => onFormChange('notes', e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Medicines</CardTitle>
          <Button type="button" onClick={onAddItem} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Medicine
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No medicines added yet. Click "Add Medicine" to start.
            </p>
          ) : (
            items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">Medicine {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Medicine Name *</Label>
                    <Input
                      value={item.medicine_name}
                      onChange={(e) => onItemChange(index, 'medicine_name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Dosage *</Label>
                    <Input
                      placeholder="e.g., 500mg"
                      value={item.dosage}
                      onChange={(e) => onItemChange(index, 'dosage', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Frequency *</Label>
                    <Input
                      placeholder="e.g., Twice daily"
                      value={item.frequency}
                      onChange={(e) => onItemChange(index, 'frequency', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Duration *</Label>
                    <Input
                      placeholder="e.g., 7 days"
                      value={item.duration}
                      onChange={(e) => onItemChange(index, 'duration', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => onItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <Label>Instructions</Label>
                    <Input
                      placeholder="e.g., After meals"
                      value={item.instructions || ''}
                      onChange={(e) => onItemChange(index, 'instructions', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}