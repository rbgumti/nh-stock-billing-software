import { useState, useEffect, useRef } from "react";
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
import { loadAllPatients, Patient } from "@/lib/patientUtils";

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
  const { stockItems, getMedicines, getStockItem, reduceStock } = useStockStore();
  const { getNextInvoiceNumber } = useSequentialNumbers();
  const { prescriptions, getPrescription, updatePrescriptionStatus } = usePrescriptionStore();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [foundPatient, setFoundPatient] = useState<Patient | null>(null);
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

  // Load patients on mount
  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const data = await loadAllPatients();
      setPatients(data);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

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
        
        // Convert prescription items to invoice items and auto-match medicines from stock
        const invoiceItems: InvoiceItem[] = prescription.items.map((item, index) => {
          // Try to find matching medicine in stock (case-insensitive partial match)
          const matchedMedicine = medicines.find(med => 
            med.name.toLowerCase().includes(item.medicine_name.toLowerCase()) ||
            item.medicine_name.toLowerCase().includes(med.name.toLowerCase())
          );
          
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
  const handlePatientSelect = (patient: Patient) => {
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
        
        // Recalculate quantity when frequency or duration changes
        if (field === "frequency" || field === "durationDays") {
          const freq = field === "frequency" ? value as string : updatedItem.frequency;
          const days = field === "durationDays" ? value as number : updatedItem.durationDays;
          const freqOption = FREQUENCY_OPTIONS.find(f => f.value === freq);
          if (freqOption && days && days > 0) {
            updatedItem.quantity = freqOption.multiplier * days;
            updatedItem.stockAfterInvoice = updatedItem.availableStock - updatedItem.quantity;
            updatedItem.total = updatedItem.quantity * updatedItem.mrp;
          }
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Invoice</h1>
          <p className="text-gray-600 mt-2">Generate an invoice for patient services</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Patient Search */}
            <div className="space-y-4 relative">
              <PatientSearchSelect
                patients={patients}
                selectedPatientId={foundPatient?.id}
                onPatientSelect={handlePatientSelect}
                label="Select Patient *"
              />
              
              {foundPatient && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800">Patient Details:</h4>
                  <p className="text-sm text-green-700">
                    <strong>Name:</strong> {foundPatient.patient_name}
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>ID:</strong> {foundPatient.id}
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Phone:</strong> {foundPatient.phone}
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="invoiceDate">Invoice Date</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Items */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Invoice Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {items.map((item, index) => (
                <div key={item.id} className={`p-4 border rounded-lg space-y-4 ${item.quantity > item.availableStock && item.medicineId > 0 ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : ''}`}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Label htmlFor={`medicine-${item.id}`}>Select Medicine *</Label>
                        {item.fromPrescription ? (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            <FileText className="h-3 w-3 mr-1" />
                            From Rx
                          </Badge>
                        ) : item.medicineId > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Hand className="h-3 w-3 mr-1" />
                            Manual
                          </Badge>
                        )}
                      </div>
                      <MedicineSearchSelect
                        medicines={medicines}
                        value={item.medicineId || undefined}
                        onValueChange={(value) => updateItem(item.id, "medicineId", value)}
                        triggerRef={(el) => { selectRefs.current[item.id] = el; }}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`frequency-${item.id}`}>Frequency</Label>
                      <Select
                        value={item.frequency || ""}
                        onValueChange={(value) => updateItem(item.id, "frequency", value)}
                      >
                        <SelectTrigger id={`frequency-${item.id}`}>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`duration-${item.id}`}>Duration (Days)</Label>
                      <Input
                        id={`duration-${item.id}`}
                        type="number"
                        min="1"
                        value={item.durationDays || ""}
                        onChange={(e) => updateItem(item.id, "durationDays", parseInt(e.target.value) || 0)}
                        placeholder="Enter days"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`quantity-${item.id}`}>Quantity</Label>
                      <Input
                        id={`quantity-${item.id}`}
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                        className={item.quantity > item.availableStock && item.medicineId > 0 ? 'border-red-500' : ''}
                      />
                      {item.quantity > item.availableStock && item.medicineId > 0 && (
                        <p className="text-xs text-red-500 mt-1">Exceeds available stock ({item.availableStock})</p>
                      )}
                    </div>
                  </div>
                  
                  {item.medicineName && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor={`batchNo-${item.id}`}>Batch No</Label>
                          <Input
                            id={`batchNo-${item.id}`}
                            value={item.batchNo}
                            onChange={(e) => updateItem(item.id, "batchNo", e.target.value)}
                            placeholder="Enter batch number"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`expiryDate-${item.id}`}>Expiry Date</Label>
                          <Input
                            id={`expiryDate-${item.id}`}
                            type="date"
                            value={item.expiryDate}
                            onChange={(e) => updateItem(item.id, "expiryDate", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`mrp-${item.id}`}>MRP (₹)</Label>
                          <Input
                            id={`mrp-${item.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.mrp}
                            onChange={(e) => updateItem(item.id, "mrp", parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Unit Price:</span>
                          <p className="font-semibold">₹{item.unitPrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Available Stock:</span>
                          <p className="font-semibold text-blue-600">{item.availableStock}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Stock After Invoice:</span>
                          <p className={`font-semibold ${item.stockAfterInvoice < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {item.stockAfterInvoice}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-medium text-gray-600">Total: </span>
                      <span className="text-xl font-bold">₹{item.total.toFixed(2)}</span>
                    </div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Invoice Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                {/* Tax removed */}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
                {followUpDate && (
                  <div className="flex justify-between items-center text-sm border-t pt-2 mt-2">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Follow-up Date:
                    </span>
                    <span className="font-medium text-primary">{format(new Date(followUpDate), 'dd MMM yyyy')}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes or payment terms..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex space-x-4">
          <Button type="submit" className="flex-1">
            Create Invoice
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
