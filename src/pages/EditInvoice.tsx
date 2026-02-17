import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, RotateCcw, AlertTriangle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useStockStore } from "@/hooks/useStockStore";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { addDays, format } from "date-fns";
import ExpiryWarningBadge, { getExpiryWarningLevel } from "@/components/ExpiryWarningBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  dbId?: string;
  medicineId: number;
  medicineName: string;
  batchNo: string;
  expiryDate: string;
  mrp: number;
  quantity: number;
  originalQuantity: number;
  unitPrice: number;
  total: number;
  availableStock: number;
  isReturned?: boolean;
  returnQuantity?: number;
  frequency?: string;
  durationDays?: number;
}

export default function EditInvoice() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { stockItems, getMedicines, getStockItem, reduceStock, increaseStock, invalidateCache, forceRefresh } = useStockStore();
  
  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientId, setPatientId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedReturns, setSelectedReturns] = useState<Map<string, number>>(new Map());

  const medicines = getMedicines();

  useEffect(() => {
    if (id) {
      loadInvoice();
    }
  }, [id, stockItems]);

  const loadInvoice = async () => {
    try {
      // Load invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();

      if (invoiceError) throw invoiceError;

      // Load invoice items
      const { data: invoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id);

      if (itemsError) throw itemsError;

      setPatientName(invoice.patient_name);
      setPatientPhone(invoice.patient_phone || "");
      setPatientId(invoice.patient_id);
      setInvoiceDate(invoice.invoice_date);
      setNotes(invoice.notes || "");
      setStatus(invoice.status);

      // Map invoice items
      const mappedItems: InvoiceItem[] = (invoiceItems || []).map((item, index) => {
        const stockItem = stockItems.find(s => s.id === item.medicine_id);
        return {
          id: index.toString(),
          dbId: item.id,
          medicineId: item.medicine_id,
          medicineName: item.medicine_name,
          batchNo: item.batch_no || "",
          expiryDate: item.expiry_date || "",
          mrp: item.mrp || 0,
          quantity: item.quantity,
          originalQuantity: item.quantity,
          unitPrice: item.unit_price,
          total: item.total,
          availableStock: stockItem?.currentStock || 0,
          isReturned: false,
          returnQuantity: 0,
          frequency: (item as any).frequency || "",
          durationDays: (item as any).duration_days || 0
        };
      });

      setItems(mappedItems);
    } catch (error: any) {
      console.error("Error loading invoice:", error);
      toast({
        title: "Error",
        description: "Failed to load invoice.",
        variant: "destructive"
      });
      navigate("/invoices");
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      medicineId: 0,
      medicineName: "",
      batchNo: "",
      expiryDate: "",
      mrp: 0,
      quantity: 1,
      originalQuantity: 0,
      unitPrice: 0,
      total: 0,
      availableStock: 0,
      frequency: "",
      durationDays: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (itemId: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== itemId));
    }
  };

  const updateItem = (itemId: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        if (field === "medicineId") {
          const medicine = getStockItem(value as number);
          if (medicine) {
            updatedItem.medicineName = medicine.name;
            updatedItem.batchNo = medicine.batchNo || "";
            updatedItem.expiryDate = medicine.expiryDate || "";
            updatedItem.mrp = medicine.mrp || 0;
            updatedItem.unitPrice = medicine.unitPrice;
            updatedItem.availableStock = medicine.currentStock;
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
            updatedItem.total = updatedItem.quantity * updatedItem.mrp;
          }
        }
        
        if (field === "quantity") {
          updatedItem.total = (value as number) * updatedItem.mrp;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  // Calculate follow-up date based on max duration
  const maxDuration = Math.max(...items.map(item => item.durationDays || 0), 0);
  const followUpDate = maxDuration > 0 && invoiceDate ? format(addDays(new Date(invoiceDate), maxDuration), 'yyyy-MM-dd') : '';

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.some(item => !item.medicineName)) {
      toast({
        title: "Error",
        description: "Please select medicines for all items.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Handle stock adjustments for quantity changes
      for (const item of items) {
        if (item.originalQuantity > 0) {
          const quantityDiff = item.quantity - item.originalQuantity;
          if (quantityDiff > 0) {
            // Increased quantity - reduce stock
            await reduceStock(item.medicineId, quantityDiff);
          } else if (quantityDiff < 0) {
            // Decreased quantity - increase stock
            await increaseStock(item.medicineId, Math.abs(quantityDiff));
          }
        } else if (!item.dbId) {
          // New item - reduce stock
          await reduceStock(item.medicineId, item.quantity);
        }
      }

      // Update invoice
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          invoice_date: invoiceDate,
          subtotal: subtotal,
          total: total,
          notes: notes,
          follow_up_date: followUpDate || null
        })
        .eq('id', id);

      if (invoiceError) throw invoiceError;

      // Delete existing items
      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id);

      if (deleteError) throw deleteError;

      // Insert updated items
      const itemsToInsert = items.map(item => ({
        invoice_id: id,
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

      // Invalidate stock cache so all pages show fresh data
      invalidateCache();
      setTimeout(() => forceRefresh(), 300);

      toast({
        title: "Success",
        description: "Invoice has been updated successfully!"
      });
      
      navigate("/invoices");
    } catch (error: any) {
      console.error("Error updating invoice:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice.",
        variant: "destructive"
      });
    }
  };

  const openReturnDialog = () => {
    const initialReturns = new Map<string, number>();
    items.forEach(item => {
      initialReturns.set(item.id, 0);
    });
    setSelectedReturns(initialReturns);
    setReturnDialogOpen(true);
  };

  const updateReturnQuantity = (itemId: string, quantity: number) => {
    const item = items.find(i => i.id === itemId);
    if (item && quantity >= 0 && quantity <= item.quantity) {
      setSelectedReturns(new Map(selectedReturns.set(itemId, quantity)));
    }
  };

  const processReturns = async () => {
    const returnsToProcess = Array.from(selectedReturns.entries())
      .filter(([_, qty]) => qty > 0);

    if (returnsToProcess.length === 0) {
      toast({
        title: "No Returns",
        description: "Please select items to return.",
        variant: "destructive"
      });
      return;
    }

    try {
      let totalReturnAmount = 0;

      for (const [itemId, returnQty] of returnsToProcess) {
        const item = items.find(i => i.id === itemId);
        if (item) {
          // Increase stock
          await increaseStock(item.medicineId, returnQty);
          totalReturnAmount += returnQty * item.mrp;
        }
      }

      // Update items with reduced quantities
      const updatedItems = items.map(item => {
        const returnQty = selectedReturns.get(item.id) || 0;
        if (returnQty > 0) {
          const newQuantity = item.quantity - returnQty;
          return {
            ...item,
            quantity: newQuantity,
            originalQuantity: newQuantity,
            total: newQuantity * item.mrp
          };
        }
        return item;
      }).filter(item => item.quantity > 0);

      // Update database
      const newSubtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
      
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          subtotal: newSubtotal,
          total: newSubtotal,
          notes: `${notes ? notes + '\n' : ''}Return processed: ₹${totalReturnAmount.toFixed(2)} on ${new Date().toLocaleDateString()}`
        })
        .eq('id', id);

      if (invoiceError) throw invoiceError;

      // Delete and re-insert items
      await supabase.from('invoice_items').delete().eq('invoice_id', id);

      if (updatedItems.length > 0) {
        const itemsToInsert = updatedItems.map(item => ({
          invoice_id: id,
          medicine_id: item.medicineId,
          medicine_name: item.medicineName,
          batch_no: item.batchNo,
          expiry_date: item.expiryDate,
          mrp: item.mrp,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total
        }));

        await supabase.from('invoice_items').insert(itemsToInsert);
      }

      setItems(updatedItems);
      setReturnDialogOpen(false);

      // Invalidate stock cache after returns
      invalidateCache();
      setTimeout(() => forceRefresh(), 300);

      toast({
        title: "Return Processed",
        description: `Successfully returned items worth ₹${totalReturnAmount.toFixed(2)}. Stock has been updated.`
      });

      if (updatedItems.length === 0) {
        // All items returned - update status
        await supabase.from('invoices').update({ status: 'Returned' }).eq('id', id);
        navigate("/invoices");
      }
    } catch (error: any) {
      console.error("Error processing returns:", error);
      toast({
        title: "Error",
        description: "Failed to process returns.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Loading invoice...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="glass-subtle">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple via-cyan to-pink bg-clip-text text-transparent">
              Edit Invoice
            </h1>
            <p className="text-muted-foreground mt-1">Invoice #{id}</p>
          </div>
        </div>
        <Button 
          type="button" 
          variant="outline" 
          onClick={openReturnDialog}
          className="glass-subtle border-orange/20 hover:border-orange/40 hover:bg-orange/5"
        >
          <RotateCcw className="h-4 w-4 mr-2 text-orange" />
          Return Medicine
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Details (Read-only) */}
        <Card className="glass-strong border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple/5 via-transparent to-cyan/5" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-purple to-cyan bg-clip-text text-transparent">Patient Details</span>
              <Badge variant="secondary" className="bg-purple/10 text-purple">Read-only</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Patient Name</Label>
                <Input value={patientName} disabled className="bg-muted" />
              </div>
              <div>
                <Label>Patient ID</Label>
                <Input value={patientId} disabled className="bg-muted" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={patientPhone} disabled className="bg-muted" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceDate">Invoice Date</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Input value={status} disabled className="bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Items */}
        <Card className="glass-strong border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan/5 via-transparent to-teal/5" />
          <CardHeader className="relative">
            <div className="flex justify-between items-center">
              <CardTitle className="bg-gradient-to-r from-cyan to-teal bg-clip-text text-transparent">Invoice Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="glass-subtle">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 border rounded-lg glass-subtle space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <Label>Medicine *</Label>
                      <Select
                        value={item.medicineId ? item.medicineId.toString() : undefined}
                        onValueChange={(value) => updateItem(item.id, "medicineId", parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose medicine" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50 max-h-60">
                          {medicines.map((medicine) => (
                            <SelectItem key={medicine.id} value={medicine.id.toString()}>
                              {medicine.name} - Batch: {medicine.batchNo} (Stock: {medicine.currentStock})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Frequency</Label>
                      <Select
                        value={item.frequency || ""}
                        onValueChange={(value) => updateItem(item.id, "frequency", value)}
                      >
                        <SelectTrigger>
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
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Duration (Days)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.durationDays || ""}
                        onChange={(e) => updateItem(item.id, "durationDays", parseInt(e.target.value) || 0)}
                        placeholder="Enter days"
                      />
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  
                  {item.medicineName && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Batch:</span> {item.batchNo}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Expiry:</span> 
                        <span className={getExpiryWarningLevel(item.expiryDate) === 'critical' ? 'text-red-600 font-medium' : 
                                         getExpiryWarningLevel(item.expiryDate) === 'warning' ? 'text-orange-600 font-medium' : 
                                         getExpiryWarningLevel(item.expiryDate) === 'caution' ? 'text-yellow-600 font-medium' : ''}>
                          {item.expiryDate}
                        </span>
                        <ExpiryWarningBadge expiryDate={item.expiryDate} />
                      </div>
                      <div>
                        <span className="text-muted-foreground font-semibold">Total:</span>{" "}
                        <span className="font-bold text-emerald">₹{item.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="glass-strong border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gold/5 via-transparent to-orange/5" />
          <CardContent className="pt-6 relative">
            <div className="space-y-4">
              <div className="flex justify-between text-lg">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-2xl font-bold border-t pt-4">
                <span>Total</span>
                <span className="bg-gradient-to-r from-gold to-orange bg-clip-text text-transparent">
                  ₹{total.toFixed(2)}
                </span>
              </div>
              {followUpDate && (
                <div className="flex justify-between items-center text-sm border-t pt-4">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Follow-up Date:
                  </span>
                  <span className="font-medium text-primary">{format(new Date(followUpDate), 'dd MMM yyyy')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="glass-strong border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-pink/5 via-transparent to-purple/5" />
          <CardHeader className="relative">
            <CardTitle className="bg-gradient-to-r from-pink to-purple bg-clip-text text-transparent">Notes</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <Textarea
              placeholder="Add any notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex space-x-4">
          <Button type="submit" className="flex-1 bg-gradient-to-r from-purple to-cyan hover:shadow-glow text-white">
            Update Invoice
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="glass-subtle">
            Cancel
          </Button>
        </div>
      </form>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="glass-strong border-0 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <RotateCcw className="h-5 w-5 text-orange" />
              <span className="bg-gradient-to-r from-orange to-gold bg-clip-text text-transparent">
                Return Medicine
              </span>
            </DialogTitle>
            <DialogDescription>
              Select items and quantities to return. Stock will be updated automatically.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg glass-subtle">
                <div className="flex-1">
                  <p className="font-medium">{item.medicineName}</p>
                  <p className="text-sm text-muted-foreground">
                    Qty: {item.quantity} × ₹{item.unitPrice.toFixed(2)} = ₹{item.total.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Return:</Label>
                  <Input
                    type="number"
                    min="0"
                    max={item.quantity}
                    value={selectedReturns.get(item.id) || 0}
                    onChange={(e) => updateReturnQuantity(item.id, parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">/ {item.quantity}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-medium">Total Return Amount:</span>
              <span className="text-xl font-bold text-orange">
                ₹{Array.from(selectedReturns.entries())
                  .reduce((sum, [itemId, qty]) => {
                    const item = items.find(i => i.id === itemId);
                    return sum + (item ? qty * item.unitPrice : 0);
                  }, 0)
                  .toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-orange/10 rounded-lg mb-4">
              <AlertTriangle className="h-4 w-4 text-orange" />
              <p className="text-sm text-orange">
                Returned medicines will be added back to stock inventory.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)} className="glass-subtle">
              Cancel
            </Button>
            <Button onClick={processReturns} className="bg-gradient-to-r from-orange to-gold hover:shadow-glow-gold text-white">
              Process Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
