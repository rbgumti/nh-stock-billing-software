import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Receipt, Download, Eye, CheckCircle, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import jsPDF from 'jspdf';
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import { useAppSettings } from "@/hooks/usePerformanceMode";
import hospitalLogo from "@/assets/NH_LOGO.png";

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { doctorName } = useAppSettings();

  // Load invoices from Supabase
  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      
      // Fetch invoices with their items
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      if (!invoicesData) {
        setInvoices([]);
        return;
      }

      // Fetch items for each invoice
      const invoicesWithItems = await Promise.all(
        invoicesData.map(async (invoice) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', invoice.id);

          if (itemsError) throw itemsError;

          return {
            id: invoice.id,
            patientName: invoice.patient_name,
            patientId: invoice.patient_id,
            date: invoice.invoice_date,
            amount: Number(invoice.total),
            status: invoice.status,
            items: (itemsData || []).map((item: any) => ({
              name: item.medicine_name,
              quantity: item.quantity,
              price: Number(item.unit_price),
              batchNo: item.batch_no || "",
              expiryDate: item.expiry_date || "",
              mrp: Number(item.mrp),
            })),
            originalData: invoice,
          };
        })
      );

      setInvoices(invoicesWithItems);
    } catch (error: any) {
      console.error("Error loading invoices:", error);
      toast({
        title: "Error",
        description: "Failed to load invoices. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const statuses = ["all", "Paid", "Pending", "Overdue"];

  const filteredInvoices = invoices.filter((invoice: any) => {
    const matchesSearch = invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.patientName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }).sort((a: any, b: any) => {
    // Sort by date descending (latest first)
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Paid": return "default";
      case "Pending": return "secondary";
      case "Overdue": return "destructive";
      default: return "secondary";
    }
  };

  const totalAmount = filteredInvoices.reduce((sum: number, invoice: any) => sum + invoice.amount, 0);
  const paidAmount = filteredInvoices
    .filter((inv: any) => inv.status === "Paid")
    .reduce((sum: number, invoice: any) => sum + invoice.amount, 0);
  const pendingAmount = filteredInvoices
    .filter((inv: any) => inv.status === "Pending")
    .reduce((sum: number, invoice: any) => sum + invoice.amount, 0);

  const generatePDF = async (invoice: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 15;

    // Load and add hospital logo
    try {
      const img = new Image();
      img.src = hospitalLogo;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      const logoWidth = 25;
      const logoHeight = 25;
      doc.addImage(img, "PNG", pageWidth / 2 - logoWidth / 2, y, logoWidth, logoHeight);
      y += logoHeight + 5;
    } catch (error) {
      console.error("Error loading logo:", error);
      y += 10;
    }

    // Hospital Name
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(27, 53, 97); // Navy color
    doc.text("NAVJEEVAN HOSPITAL", pageWidth / 2, y, { align: "center" });
    y += 7;

    // Hospital tagline
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("De-Addiction & Rehabilitation Centre", pageWidth / 2, y, { align: "center" });
    y += 12;

    // Invoice title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("INVOICE", pageWidth / 2, y, { align: "center" });
    y += 10;

    // Divider line
    doc.setDrawColor(212, 175, 55); // Gold color
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    
    // Invoice details
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`Invoice Number: ${invoice.id}`, margin, y);
    doc.text(`Date: ${invoice.date}`, pageWidth - margin, y, { align: "right" });
    y += 8;
    doc.text(`Patient: ${invoice.patientName}`, margin, y);
    doc.text(`Status: ${invoice.status}`, pageWidth - margin, y, { align: "right" });
    y += 15;
    
    // Items table header
    doc.setFillColor(27, 53, 97); // Navy background
    doc.rect(margin, y - 5, pageWidth - margin * 2, 10, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255); // White text
    doc.text("Item", margin + 3, y);
    doc.text("Batch", 70, y);
    doc.text("Expiry", 100, y);
    doc.text("MRP", 130, y);
    doc.text("Qty", 150, y);
    doc.text("Price", 170, y);
    y += 10;
    
    // Items list
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    invoice.items.forEach((item: any, index: number) => {
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y - 5, pageWidth - margin * 2, 10, "F");
      }
      doc.text(item.name.substring(0, 20), margin + 3, y);
      doc.text(item.batchNo || "N/A", 70, y);
      doc.text(item.expiryDate || "N/A", 100, y);
      doc.text(`₹${(item.mrp || 0).toFixed(2)}`, 130, y);
      doc.text(item.quantity.toString(), 150, y);
      doc.text(`₹${item.price.toFixed(2)}`, 170, y);
      y += 10;
      
      if (y > 250) {
        doc.addPage();
        y = 30;
      }
    });
    
    // Total section
    y += 5;
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(27, 53, 97);
    doc.text(`Total Amount: ₹${invoice.amount.toFixed(2)}`, pageWidth - margin, y, { align: "right" });
    y += 15;

    // Payment Terms & Bank Details Section
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Two-column layout: Payment Terms (left) and Bank Details (right)
    const colWidth = (pageWidth - margin * 2) / 2 - 5;
    
    // Payment Terms (left column)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(27, 53, 97);
    doc.text("Payment Terms:", margin, y);
    y += 6;
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    const paymentTermsY = y;
    doc.text("• Payment due within 7 days", margin, y);
    y += 5;
    doc.text("• Cash / UPI / Bank Transfer accepted", margin, y);
    y += 5;
    doc.text("• No refund on medicines dispensed", margin, y);
    y += 5;
    doc.text("• Keep this invoice for your records", margin, y);
    
    // Bank Details (right column)
    const bankX = margin + colWidth + 10;
    y = paymentTermsY - 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(27, 53, 97);
    doc.text("Bank Details:", bankX, y);
    y += 6;
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.text("Bank: State Bank of India", bankX, y);
    y += 5;
    doc.text("A/C Name: Navjeevan Hospital", bankX, y);
    y += 5;
    doc.text("A/C No: XXXXXXXXXXXX", bankX, y);
    y += 5;
    doc.text("IFSC: SBIN0XXXXXX", bankX, y);
    y += 5;
    doc.text("UPI: navjeevan@sbi", bankX, y);

    // Doctor Signature Section
    y += 15;
    const signatureX = pageWidth - margin - 60;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(signatureX, y, pageWidth - margin, y);
    y += 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(27, 53, 97);
    doc.text(doctorName, signatureX + 30, y, { align: "center" });
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text("Navjeevan Hospital", signatureX + 30, y, { align: "center" });
    
    // Footer
    y = doc.internal.pageSize.getHeight() - 25;
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(27, 53, 97);
    doc.text("NAVJEEVAN HOSPITAL", pageWidth / 2, y, { align: "center" });
    y += 5;
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Thank you for choosing us!", pageWidth / 2, y, { align: "center" });
    
    // Save the PDF
    doc.save(`invoice-${invoice.id}.pdf`);
    
    toast({
      title: "Success",
      description: "PDF downloaded successfully!"
    });
  };

  const markAsPaid = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'Paid' })
        .eq('id', invoiceId);

      if (error) throw error;

      // Update local state
      const updatedInvoices = invoices.map((inv: any) => 
        inv.id === invoiceId ? { ...inv, status: "Paid" } : inv
      );
      setInvoices(updatedInvoices);
      
      toast({
        title: "Success",
        description: "Invoice marked as paid!"
      });
    } catch (error: any) {
      console.error("Error updating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to update invoice status.",
        variant: "destructive"
      });
    }
  };

  const bulkMarkAsPaid = async () => {
    const unpaidSelectedIds = Array.from(selectedIds).filter(id => {
      const invoice = invoices.find(inv => inv.id === id);
      return invoice && invoice.status !== "Paid";
    });

    if (unpaidSelectedIds.length === 0) {
      toast({
        title: "No action needed",
        description: "All selected invoices are already paid.",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'Paid' })
        .in('id', unpaidSelectedIds);

      if (error) throw error;

      // Update local state
      const updatedInvoices = invoices.map((inv: any) =>
        unpaidSelectedIds.includes(inv.id) ? { ...inv, status: "Paid" } : inv
      );
      setInvoices(updatedInvoices);
      setSelectedIds(new Set());

      toast({
        title: "Success",
        description: `${unpaidSelectedIds.length} invoice(s) marked as paid!`
      });
    } catch (error: any) {
      console.error("Error updating invoices:", error);
      toast({
        title: "Error",
        description: "Failed to update invoice status.",
        variant: "destructive"
      });
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map(inv => inv.id)));
    }
  };

  const viewInvoiceDetails = (invoice: any) => {
    // Create a detailed view modal or alert
    const itemsList = invoice.items.map((item: any, index: number) => 
      `${index + 1}. ${item.name} - Qty: ${item.quantity} - ₹${item.price.toFixed(2)}`
    ).join('\n');
    
    alert(`INVOICE DETAILS\n\nInvoice ID: ${invoice.id}\nPatient: ${invoice.patientName}\nDate: ${invoice.date}\nStatus: ${invoice.status}\n\nITEMS:\n${itemsList}\n\nTotal Amount: ₹${invoice.amount.toFixed(2)}`);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="p-4 rounded-full bg-gradient-to-r from-purple/10 to-cyan/10 w-fit mx-auto mb-4 animate-pulse">
            <Receipt className="h-8 w-8 text-purple" />
          </div>
          <p className="text-lg text-muted-foreground">Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 relative">
      <FloatingOrbs />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple via-cyan to-pink bg-clip-text text-transparent">
            Invoices
          </h1>
          <p className="text-muted-foreground mt-2">Manage billing and payments</p>
        </div>
        <Button asChild className="bg-gradient-to-r from-gold to-orange hover:shadow-glow-gold text-white font-semibold">
          <Link to="/invoices/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple/10 via-transparent to-cyan/10 opacity-50 group-hover:opacity-100 transition-opacity" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple to-cyan">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-purple to-cyan bg-clip-text text-transparent">{filteredInvoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-orange/10 opacity-50 group-hover:opacity-100 transition-opacity" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-gold to-orange">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-gold to-orange bg-clip-text text-transparent">₹{totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald/10 via-transparent to-teal/10 opacity-50 group-hover:opacity-100 transition-opacity" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-emerald to-teal">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-emerald to-teal bg-clip-text text-transparent">₹{paidAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-orange/10 via-transparent to-pink/10 opacity-50 group-hover:opacity-100 transition-opacity" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-orange to-pink">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-orange to-pink bg-clip-text text-transparent">₹{pendingAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="glass-strong border-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple/5 via-transparent to-cyan/5" />
        <CardContent className="pt-6 relative">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-purple" />
              <Input
                placeholder="Search by invoice ID or patient name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass-subtle border-purple/20 focus:border-purple/40"
              />
            </div>
            <div className="flex gap-2">
              {statuses.map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className={statusFilter === status 
                    ? "bg-gradient-to-r from-purple to-cyan text-white border-0" 
                    : "glass-subtle border-purple/20 hover:border-purple/40"
                  }
                >
                  {status === "all" ? "All Status" : status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <Card className="glass-strong border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gold/10 via-transparent to-orange/10" />
          <CardContent className="py-3 flex items-center justify-between relative">
            <span className="text-sm font-medium text-gold">
              {selectedIds.size} invoice(s) selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())} className="glass-subtle border-purple/20 hover:border-purple/40">
                Clear Selection
              </Button>
              <Button size="sm" onClick={bulkMarkAsPaid} className="bg-gradient-to-r from-gold to-orange hover:shadow-glow-gold text-white">
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Paid
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Select All */}
      {filteredInvoices.length > 0 && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-muted-foreground">Select All</span>
        </div>
      )}

      {/* Invoice List */}
      <div className="space-y-4">
        {filteredInvoices.map((invoice: any, index: number) => (
          <Card key={invoice.id} className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
            <div className={`absolute inset-0 bg-gradient-to-br ${
              index % 4 === 0 ? 'from-purple/5 via-transparent to-cyan/5' :
              index % 4 === 1 ? 'from-cyan/5 via-transparent to-teal/5' :
              index % 4 === 2 ? 'from-gold/5 via-transparent to-orange/5' :
              'from-pink/5 via-transparent to-purple/5'
            } opacity-50 group-hover:opacity-100 transition-opacity`} />
            <CardContent className="pt-6 relative">
              <div className="flex gap-4 items-start">
                <Checkbox
                  checked={selectedIds.has(invoice.id)}
                  onCheckedChange={() => toggleSelect(invoice.id)}
                  className="mt-1 border-purple/40 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple data-[state=checked]:to-cyan"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold bg-gradient-to-r from-purple to-cyan bg-clip-text text-transparent">{invoice.id}</h3>
                      <p className="text-muted-foreground">{invoice.patientName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold bg-gradient-to-r from-gold to-orange bg-clip-text text-transparent">₹{invoice.amount.toFixed(2)}</p>
                      <Badge className={`${
                        invoice.status === 'Paid' ? 'bg-gradient-to-r from-emerald to-teal text-white border-0' :
                        invoice.status === 'Pending' ? 'bg-gradient-to-r from-orange to-gold text-white border-0' :
                        'bg-gradient-to-r from-pink to-destructive text-white border-0'
                      }`}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">{invoice.date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Items</p>
                      <div className="text-sm">
                        {invoice.items.map((item: any, idx: number) => (
                          <span key={idx} className="text-foreground">
                            {item.name}
                            {idx < invoice.items.length - 1 && ", "}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => viewInvoiceDetails(invoice)} className="glass-subtle border-cyan/20 hover:border-cyan/40 hover:bg-cyan/5">
                      <Eye className="h-4 w-4 mr-2 text-cyan" />
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" asChild className="glass-subtle border-purple/20 hover:border-purple/40 hover:bg-purple/5">
                      <Link to={`/invoices/edit/${invoice.id}`}>
                        <Pencil className="h-4 w-4 mr-2 text-purple" />
                        Edit
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => generatePDF(invoice)} className="glass-subtle border-teal/20 hover:border-teal/40 hover:bg-teal/5">
                      <Download className="h-4 w-4 mr-2 text-teal" />
                      Download PDF
                    </Button>
                    {invoice.status !== "Paid" && invoice.status !== "Returned" && (
                      <Button size="sm" onClick={() => markAsPaid(invoice.id)} className="bg-gradient-to-r from-emerald to-teal hover:shadow-lg text-white">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Paid
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInvoices.length === 0 && (
        <Card className="glass-strong border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple/5 via-transparent to-cyan/5" />
          <CardContent className="text-center py-12 relative">
            <div className="p-4 rounded-full bg-gradient-to-r from-purple/10 to-cyan/10 w-fit mx-auto mb-4">
              <Receipt className="h-12 w-12 text-purple" />
            </div>
            <h3 className="text-lg font-medium mb-2">No invoices found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== "all" 
                ? "Try adjusting your search or filter criteria" 
                : "Get started by creating your first invoice"
              }
            </p>
            <Button asChild className="bg-gradient-to-r from-purple to-cyan hover:shadow-glow text-white">
              <Link to="/invoices/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
