import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MedicineSearchSelect } from "@/components/MedicineSearchSelect";
import { ArrowLeft, Plus, Trash2, FileText, Hand, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { addDays, format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useStockStore } from "@/hooks/useStockStore";
import { useSequentialNumbers } from "@/hooks/useSequentialNumbers";
import { usePrescriptionStore } from "@/hooks/usePrescriptionStore";
import { supabase } from "@/integrations/supabase/client";
import { PatientSearchSelect } from "@/components/PatientSearchSelect";
import { usePatientCache, CachedPatient } from "@/hooks/usePatientCache";
import ExpiryWarningBadge, { getExpiryWarningLevel } from "@/components/ExpiryWarningBadge";

const FREQUENCY_OPTIONS = [
  { value: "OD", label: "OD (Once Daily)", multiplier: 1 },
  { value: "BD", label: "BD (Twice Daily)", multiplier: 2 },
  { value: "TDS", label: "TDS (Thrice Daily)", multiplier: 3 },
  { value: "4x", label: "4 Times a day", multiplier: 4 },
  { value: "5x", label: "5 Times a day", multiplier: 5 },
  { value: "6x", label: "6 Times a day", multiplier: 6 },
  { value: "7x", label: "7 Times a day", multiplier: 7 },
  { value: "8x", label: "8 Times a day", multiplier: 8 },
];

interface InvoiceItem {
  id: string;
  medicineId: number;
  medicineName: string;
  batchNo: string;
  expiryDate: string;
  mrp: number;
  quantity: number;
  unitPrice: number;
  total: number;
  availableStock: number;
  stockAfterInvoice: number;
  fromPrescription?: boolean;
  frequency?: string;
  durationDays?: number;
}

export default function NewInvoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { stockItems, loading: stockLoading, getMedicines, getStockItem, reduceStock } = useStockStore();
  const { getNextInvoiceNumber } = useSequentialNumbers();
  const { prescriptions, getPrescription, updatePrescriptionStatus } = usePrescriptionStore();
  
  // Use cached patients for instant load
  const { patients, loading: patientsLoading } = usePatientCache();
  
  const [selectedPatient, setSelectedPatient] = useState("");
  const [foundPatient, setFoundPatient] = useState<CachedPatient | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([
    { 
      id: "1", 
      medicineId: 0,
      medicineName: "", 
      batchNo: "",
      expiryDate: "",
      mrp: 0,
      quantity: 1, 
      unitPrice: 0, 
      total: 0,
      availableStock: 0,
      stockAfterInvoice: 0,
      frequency: "",
      durationDays: 0
    }
  ]);
  const [newItemId, setNewItemId] = useState<string | null>(null);
  const selectRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const medicines = getMedicines();

  // Helper to check if expiry date is valid
  const isValidExpiryDate = (date?: string): boolean => {
    if (!date || date === 'N/A' || date.trim() === '') return false;
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  };

  // FIFO helper: Find the batch with earliest valid expiry date for a medicine name
  const findFIFOBatch = useMemo(() => (medicineName: string) => {
    const matchingMedicines = medicines.filter(med => 
      med.name.toLowerCase().includes(medicineName.toLowerCase()) ||
      medicineName.toLowerCase().includes(med.name.toLowerCase())
    ).filter(med => med.currentStock > 0);
    
    if (matchingMedicines.length === 0) return null;
    
    const sorted = [...matchingMedicines].sort((a, b) => {
      const aValid = isValidExpiryDate(a.expiryDate);
      const bValid = isValidExpiryDate(b.expiryDate);
      if (!aValid && !bValid) return 0;
      if (!aValid) return 1;
      if (!bValid) return -1;
      return new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime();
    });
    
    return sorted[0];
  }, [medicines]);

  // Load prescription data if prescriptionId is in URL
  useEffect(() => {
    const rxId = searchParams.get('prescriptionId');
    if (rxId && medicines.length > 0 && patients.length > 0 && prescriptions.length > 0) {
      const prescription = getPrescription(rxId);
      if (prescription) {
        setPrescriptionId(rxId);
        // Find patient in loaded patients list
        const patient = patients.find(p => p.id === prescription.patient_id);
        if (patient) {
          setFoundPatient(patient);
          setSelectedPatient(patient.id.toString());
        } else {
          // Create a temporary patient object from prescription data
          setFoundPatient({
            id: prescription.patient_id,
            patient_name: prescription.patient_name,
            phone: prescription.patient_phone || '',
            file_no: '',
            aadhar_card: '',
            govt_id: '',
            new_govt_id: '',
            address: ''
          });
          setSelectedPatient(prescription.patient_id.toString());
        }
        setNotes(prescription.notes || '');
        
        // Convert prescription items to invoice items and auto-match medicines using FIFO
        const invoiceItems: InvoiceItem[] = prescription.items.map((item, index) => {
          // Use FIFO logic to find the batch with earliest expiry date
          const matchedMedicine = findFIFOBatch(item.medicine_name);
          
          if (matchedMedicine) {
            return {
              id: index.toString(),
              medicineId: matchedMedicine.id,
              medicineName: matchedMedicine.name,
              batchNo: matchedMedicine.batchNo || "",
              expiryDate: matchedMedicine.expiryDate || "",
              mrp: matchedMedicine.mrp || 0,
              quantity: item.quantity,
              unitPrice: matchedMedicine.unitPrice,
              total: item.quantity * (matchedMedicine.mrp || 0),
              availableStock: matchedMedicine.currentStock,
              stockAfterInvoice: matchedMedicine.currentStock - item.quantity,
              fromPrescription: true
            };
          }
          
          // No match found - show prescription medicine name but no stock data
          return {
            id: index.toString(),
            medicineId: 0,
            medicineName: item.medicine_name,
            batchNo: "",
            expiryDate: "",
            mrp: 0,
            quantity: item.quantity,
            unitPrice: 0,
            total: 0,
            availableStock: 0,
            stockAfterInvoice: 0,
            fromPrescription: true
          };
        });
        
        setItems(invoiceItems.length > 0 ? invoiceItems : items);
      }
    }
  }, [searchParams, medicines, patients, prescriptions]);

  // Handle patient selection
  const handlePatientSelect = (patient: CachedPatient) => {
    setFoundPatient(patient);
    setSelectedPatient(patient.id.toString());
  };

  const addItem = () => {
    const itemId = Date.now().toString();
    const newItem: InvoiceItem = {
      id: itemId,
      medicineId: 0,
      medicineName: "",
      batchNo: "",
      expiryDate: "",
      mrp: 0,
      quantity: 1,
      unitPrice: 0,
      total: 0,
      availableStock: 0,
      stockAfterInvoice: 0,
      frequency: "",
      durationDays: 0
    };
    setItems([newItem, ...items]);
    setNewItemId(itemId);
  };

  // Auto-focus the new item's select dropdown
  useEffect(() => {
    if (newItemId && selectRefs.current[newItemId]) {
      setTimeout(() => {
        selectRefs.current[newItemId]?.focus();
        setNewItemId(null);
      }, 100);
    }
  }, [newItemId, items]);

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Handle medicine selection
        if (field === "medicineId") {
          const medicine = getStockItem(value as number);
          if (medicine) {
            updatedItem.medicineName = medicine.name;
            updatedItem.batchNo = medicine.batchNo || "";
            updatedItem.expiryDate = medicine.expiryDate || "";
            updatedItem.mrp = medicine.mrp || 0;
            updatedItem.unitPrice = medicine.unitPrice;
            updatedItem.availableStock = medicine.currentStock;
            updatedItem.stockAfterInvoice = medicine.currentStock - updatedItem.quantity;
            updatedItem.total = updatedItem.quantity * updatedItem.mrp;
          }
        }
        
        // No auto-calculation for quantity - manual entry only
        // Just update totals if frequency/duration change (for reference purposes)
        if (field === "frequency" || field === "durationDays") {
          // Keep frequency/duration as reference but don't auto-calculate quantity
        }
        
        // Recalculate when quantity changes directly
        if (field === "quantity") {
          updatedItem.stockAfterInvoice = updatedItem.availableStock - (value as number);
          updatedItem.total = (value as number) * updatedItem.mrp;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  // Calculate follow-up date based on max duration
  const maxDuration = Math.max(...items.map(item => item.durationDays || 0), 0);
  const followUpDate = maxDuration > 0 ? format(addDays(new Date(invoiceDate), maxDuration), 'yyyy-MM-dd') : '';

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  // Removed tax; total equals subtotal now
  const total = subtotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark prescription as dispensed if this invoice is from a prescription
    if (prescriptionId) {
      await updatePrescriptionStatus(prescriptionId, 'Dispensed');
    }
    
    if (!selectedPatient) {
      toast({
        title: "Error",
        description: "Please select a patient.",
        variant: "destructive"
      });
      return;
    }

    if (items.some(item => !item.medicineName)) {
      toast({
        title: "Error",
        description: "Please select medicines for all items.",
        variant: "destructive"
      });
      return;
    }

    // Check stock availability
    const stockIssues = items.filter(item => item.quantity > item.availableStock);
    if (stockIssues.length > 0) {
      toast({
        title: "Insufficient Stock",
        description: `Not enough stock for: ${stockIssues.map(item => item.medicineName).join(", ")}`,
        variant: "destructive"
      });
      return;
    }

    try {
      // Reduce stock for each item
      items.forEach(item => {
        reduceStock(item.medicineId, item.quantity);
      });

      const invoiceNumber = getNextInvoiceNumber();
      
      // Insert invoice into database
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          id: invoiceNumber,
          invoice_number: invoiceNumber,
          patient_id: selectedPatient,
          patient_name: foundPatient?.patient_name || selectedPatient,
          patient_phone: foundPatient?.phone || '',
          invoice_date: invoiceDate,
          subtotal: subtotal,
          tax: 0,
          total: total,
          notes: notes,
          status: 'Pending',
          follow_up_date: followUpDate || null
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Insert invoice items
      const itemsToInsert = items.map(item => ({
        invoice_id: invoiceNumber,
        medicine_id: item.medicineId,
        medicine_name: item.medicineName,
        batch_no: item.batchNo,
        expiry_date: item.expiryDate,
        mrp: item.mrp,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total,
        frequency: item.frequency || null,
        duration_days: item.durationDays || null
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      console.log("New invoice created:", invoiceData);
      
      toast({
        title: "Success",
        description: "Invoice has been created successfully!"
      });
      
      navigate("/invoices");
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Show minimal loading state while critical data loads
  const isInitialLoading = stockLoading && patients.length === 0;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center space-x-3">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Create New Invoice</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Invoice Details - Compact */}
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <PatientSearchSelect
                  patients={patients}
                  selectedPatientId={foundPatient?.id}
                  onPatientSelect={handlePatientSelect}
                  label="Patient *"
                  disabled={patientsLoading}
                />
              </div>
              <div>
                <Label htmlFor="invoiceDate" className="text-xs">Date</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            {foundPatient && (
              <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded text-xs flex gap-4">
                <span><strong>Name:</strong> {foundPatient.patient_name}</span>
                <span><strong>ID:</strong> {foundPatient.id}</span>
                <span><strong>Phone:</strong> {foundPatient.phone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Items */}
        <Card className="shadow-sm">
          <CardHeader className="p-3 pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Items</CardTitle>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addItem}>
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className={`p-3 border rounded-lg space-y-2 ${item.quantity > item.availableStock && item.medicineId > 0 ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : ''}`}>
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 md:col-span-6">
                      <div className="flex items-center gap-1 mb-1">
                        <Label className="text-xs">Medicine *</Label>
                        {item.fromPrescription && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Rx</Badge>
                        )}
                      </div>
                      <MedicineSearchSelect
                        medicines={medicines}
                        value={item.medicineId || undefined}
                        onValueChange={(value) => updateItem(item.id, "medicineId", value)}
                        triggerRef={(el) => { selectRefs.current[item.id] = el; }}
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Label className="text-xs">Qty *</Label>
                      <Input
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                        className={`h-9 ${item.quantity > item.availableStock && item.medicineId > 0 ? 'border-red-500' : ''}`}
                      />
                      {item.quantity > item.availableStock && item.medicineId > 0 && (
                        <p className="text-[10px] text-red-500">Max: {item.availableStock}</p>
                      )}
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Label className="text-xs">MRP/Tab</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.mrp}
                        onChange={(e) => updateItem(item.id, "mrp", parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2 flex items-end gap-1">
                      <div className="flex-1">
                        <Label className="text-xs">Total</Label>
                        <div className="h-9 flex items-center font-semibold text-sm">₹{item.total.toFixed(2)}</div>
                      </div>
                      {items.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  
                  {item.medicineName && (
                    <div className="grid grid-cols-12 gap-2 text-xs bg-muted/50 rounded p-2">
                      <div className="col-span-3">
                        <span className="text-muted-foreground">Batch:</span>
                        <p className="font-medium truncate">{item.batchNo || '-'}</p>
                      </div>
                      <div className="col-span-3">
                        <span className="text-muted-foreground flex items-center gap-1">
                          Exp: <ExpiryWarningBadge expiryDate={item.expiryDate} />
                        </span>
                        <p className="font-medium">{item.expiryDate || '-'}</p>
                      </div>
                      <div className="col-span-3">
                        <span className="text-muted-foreground">Stock:</span>
                        <p className="font-medium text-blue-600">{item.availableStock}</p>
                      </div>
                      <div className="col-span-3">
                        <span className="text-muted-foreground">After:</span>
                        <p className={`font-medium ${item.stockAfterInvoice < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {item.stockAfterInvoice}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Invoice Summary - Compact */}
            <div className="mt-3 p-3 bg-muted/50 rounded-lg flex justify-between items-center">
              <span className="font-semibold">Total:</span>
              <span className="text-lg font-bold">₹{total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Notes - Compact */}
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="text-sm"
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1 h-9">Create Invoice</Button>
          <Button type="button" variant="outline" className="h-9" onClick={() => navigate(-1)}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
