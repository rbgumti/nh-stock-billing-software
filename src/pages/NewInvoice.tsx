
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePatientStore } from "@/hooks/usePatientStore";
import { useStockStore } from "@/hooks/useStockStore";

interface InvoiceItem {
  id: string;
  medicineId: number;
  medicineName: string;
  batchNo: string;
  quantity: number;
  unitPrice: number;
  total: number;
  availableStock: number;
  stockAfterInvoice: number;
}

export default function NewInvoice() {
  const navigate = useNavigate();
  const { patients, getPatient } = usePatientStore();
  const { getMedicines, getStockItem, reduceStock } = useStockStore();
  
  const [selectedPatient, setSelectedPatient] = useState("");
  const [patientSearchId, setPatientSearchId] = useState("");
  const [foundPatient, setFoundPatient] = useState<any>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([
    { 
      id: "1", 
      medicineId: 0,
      medicineName: "", 
      batchNo: "",
      quantity: 1, 
      unitPrice: 0, 
      total: 0,
      availableStock: 0,
      stockAfterInvoice: 0
    }
  ]);

  const medicines = getMedicines();

  // Search patient by ID
  const handlePatientSearch = () => {
    if (!patientSearchId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Patient ID to search.",
        variant: "destructive"
      });
      return;
    }

    const patient = getPatient(patientSearchId.trim());
    if (patient) {
      setFoundPatient(patient);
      setSelectedPatient(patient.patientId);
      toast({
        title: "Patient Found",
        description: `${patient.firstName} ${patient.lastName} selected successfully!`
      });
    } else {
      setFoundPatient(null);
      setSelectedPatient("");
      toast({
        title: "Patient Not Found",
        description: "No patient found with the provided ID.",
        variant: "destructive"
      });
    }
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      medicineId: 0,
      medicineName: "",
      batchNo: "",
      quantity: 1,
      unitPrice: 0,
      total: 0,
      availableStock: 0,
      stockAfterInvoice: 0
    };
    setItems([...items, newItem]);
  };

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
            updatedItem.batchNo = medicine.batchNo;
            updatedItem.unitPrice = medicine.unitPrice;
            updatedItem.availableStock = medicine.currentStock;
            updatedItem.stockAfterInvoice = medicine.currentStock - updatedItem.quantity;
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
          }
        }
        
        // Recalculate when quantity changes
        if (field === "quantity") {
          updatedItem.stockAfterInvoice = updatedItem.availableStock - (value as number);
          updatedItem.total = (value as number) * updatedItem.unitPrice;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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

    // Reduce stock for each item
    items.forEach(item => {
      reduceStock(item.medicineId, item.quantity);
    });

    const invoiceData = {
      patient: selectedPatient,
      patientDetails: foundPatient,
      invoiceDate,
      items,
      subtotal,
      tax,
      total,
      notes
    };

    console.log("New invoice data:", invoiceData);
    
    toast({
      title: "Success",
      description: "Invoice has been created successfully!"
    });
    
    navigate("/invoices");
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
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="patientSearch">Search Patient by ID *</Label>
                  <Input
                    id="patientSearch"
                    value={patientSearchId}
                    onChange={(e) => setPatientSearchId(e.target.value)}
                    placeholder="Enter Patient ID (e.g., PT001)"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={handlePatientSearch}>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>
              
              {foundPatient && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800">Patient Details:</h4>
                  <p className="text-sm text-green-700">
                    <strong>Name:</strong> {foundPatient.firstName} {foundPatient.lastName}
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>ID:</strong> {foundPatient.patientId}
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
                <div key={item.id} className="p-4 border rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor={`medicine-${item.id}`}>Select Medicine *</Label>
                      <Select onValueChange={(value) => updateItem(item.id, "medicineId", parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose medicine" />
                        </SelectTrigger>
                        <SelectContent>
                          {medicines.map((medicine) => (
                            <SelectItem key={medicine.id} value={medicine.id.toString()}>
                              {medicine.name} - Batch: {medicine.batchNo} (Stock: {medicine.currentStock})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`quantity-${item.id}`}>Quantity</Label>
                      <Input
                        id={`quantity-${item.id}`}
                        type="number"
                        min="1"
                        max={item.availableStock}
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                  
                  {item.medicineName && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Batch No:</span>
                        <p className="font-semibold">{item.batchNo}</p>
                      </div>
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
                <div className="flex justify-between">
                  <span>Tax (10%):</span>
                  <span className="font-medium">₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
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
