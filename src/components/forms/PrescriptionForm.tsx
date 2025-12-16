import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Search } from "lucide-react";
import { PrescriptionItem } from "@/hooks/usePrescriptionStore";

interface StockItem {
  item_id: number;
  name: string;
}

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
  stockItems: StockItem[];
  onFormChange: (field: string, value: string | number) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onItemChange: (index: number, field: string, value: string | number) => void;
  hidePatientFields?: boolean;
}

const FREQUENCY_OPTIONS = [
  { value: "OD", label: "OD (Once daily)", multiplier: 1 },
  { value: "BD", label: "BD (Twice daily)", multiplier: 2 },
  { value: "TDS", label: "TDS (Three times daily)", multiplier: 3 },
  { value: "4 Times a day", label: "4 Times a day", multiplier: 4 },
  { value: "5 Times a day", label: "5 Times a day", multiplier: 5 },
];

export default function PrescriptionForm({
  formData,
  items,
  stockItems,
  onFormChange,
  onAddItem,
  onRemoveItem,
  onItemChange,
  hidePatientFields = false,
}: PrescriptionFormProps) {
  const [medicineSearches, setMedicineSearches] = useState<Record<number, string>>({});

  const getFilteredMedicines = (index: number) => {
    const search = medicineSearches[index]?.toLowerCase() || "";
    if (!search) return stockItems;
    return stockItems.filter((item) =>
      item.name.toLowerCase().includes(search)
    );
  };

  const handleMedicineSelect = (index: number, medicineName: string) => {
    onItemChange(index, 'medicine_name', medicineName);
    setMedicineSearches((prev) => ({ ...prev, [index]: "" }));
  };

  const handleFrequencyChange = (index: number, frequency: string) => {
    onItemChange(index, 'frequency', frequency);
    // Auto-calculate quantity
    const item = items[index];
    const durationDays = parseInt(item.duration) || 0;
    const freqOption = FREQUENCY_OPTIONS.find(f => f.value === frequency);
    if (freqOption && durationDays > 0) {
      onItemChange(index, 'quantity', durationDays * freqOption.multiplier);
    }
  };

  const handleDurationChange = (index: number, duration: string) => {
    onItemChange(index, 'duration', duration);
    // Auto-calculate quantity
    const item = items[index];
    const durationDays = parseInt(duration) || 0;
    const freqOption = FREQUENCY_OPTIONS.find(f => f.value === item.frequency);
    if (freqOption && durationDays > 0) {
      onItemChange(index, 'quantity', durationDays * freqOption.multiplier);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{hidePatientFields ? 'Prescription Details' : 'Patient Information'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {!hidePatientFields && (
              <>
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
              </>
            )}
            <div className={hidePatientFields ? "col-span-2" : ""}>
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
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search medicine..."
                          value={medicineSearches[index] || ""}
                          onChange={(e) =>
                            setMedicineSearches((prev) => ({
                              ...prev,
                              [index]: e.target.value,
                            }))
                          }
                          className="pl-9"
                        />
                      </div>
                      <Select
                        value={item.medicine_name}
                        onValueChange={(value) => handleMedicineSelect(index, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select medicine" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 bg-background z-50">
                          {getFilteredMedicines(index).length === 0 ? (
                            <div className="py-2 px-3 text-sm text-muted-foreground">
                              No medicines found
                            </div>
                          ) : (
                            getFilteredMedicines(index).map((med) => (
                              <SelectItem key={med.item_id} value={med.name}>
                                {med.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
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
                    <Select
                      value={item.frequency}
                      onValueChange={(value) => handleFrequencyChange(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {FREQUENCY_OPTIONS.map((freq) => (
                          <SelectItem key={freq.value} value={freq.value}>
                            {freq.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Duration (days) *</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 7"
                      value={item.duration}
                      onChange={(e) => handleDurationChange(index, e.target.value)}
                      required
                      min="1"
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
                      className="bg-muted"
                      readOnly
                    />
                    <p className="text-xs text-muted-foreground mt-1">Auto-calculated</p>
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
