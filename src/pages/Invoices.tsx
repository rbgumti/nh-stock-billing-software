
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Receipt, Download, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [invoices, setInvoices] = useState<any[]>([]);
  const { toast } = useToast();

  // Load invoices from localStorage
  useEffect(() => {
    const savedInvoices = JSON.parse(localStorage.getItem("invoices") || "[]");
    
    // Transform saved invoices to match expected format
    const transformedInvoices = savedInvoices.map((invoice: any) => ({
      id: String(invoice.id ?? ""),
      patientName:
        (invoice.patientDetails
          ? `${invoice.patientDetails?.firstName ?? ""} ${invoice.patientDetails?.lastName ?? ""}`.trim()
          : "") || invoice.patient || "Unknown Patient",
      patientId: invoice.patientDetails?.patientId || 0,
      date: invoice.invoiceDate,
      amount: Number(invoice.total ?? 0),
      status: invoice.status || "Pending", // Use saved status if available
      items: Array.isArray(invoice.items)
        ? invoice.items.map((item: any) => ({
            name: item.medicineName || item.name || item.medicine || "Item",
            quantity: Number(item.quantity ?? item.qty ?? 0),
            price: Number(item.unitPrice ?? item.price ?? 0),
            batchNo: item.batchNo || "",
            expiryDate: item.expiryDate || "",
            mrp: Number(item.mrp ?? 0),
          }))
        : [],
      originalData: invoice, // Keep original data for detailed PDF generation
    }));
    
    setInvoices(transformedInvoices);
  }, []);

  const statuses = ["all", "Paid", "Pending", "Overdue"];

  const filteredInvoices = invoices.filter((invoice: any) => {
    const matchesSearch = invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.patientName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
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

  const generatePDF = (invoice: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('INVOICE', 105, 30, { align: 'center' });
    
    // Company details (you can customize this)
    doc.setFontSize(12);
    doc.text('Medical Center', 105, 45, { align: 'center' });
    doc.text('123 Health Street, Medical City', 105, 55, { align: 'center' });
    doc.text('Phone: (555) 123-4567', 105, 65, { align: 'center' });
    
    // Line separator
    doc.line(20, 75, 190, 75);
    
    // Invoice details
    doc.setFontSize(12);
    doc.text(`Invoice Number: ${invoice.id}`, 20, 90);
    doc.text(`Date: ${invoice.date}`, 20, 100);
    doc.text(`Patient: ${invoice.patientName}`, 20, 110);
    
    // Items table header
    doc.setFontSize(10);
    const tableTop = 130;
    doc.text('Item', 20, tableTop);
    doc.text('Batch', 70, tableTop);
    doc.text('Expiry', 100, tableTop);
    doc.text('MRP', 130, tableTop);
    doc.text('Qty', 150, tableTop);
    doc.text('Price', 170, tableTop);
    
    // Line under header
    doc.line(20, tableTop + 5, 190, tableTop + 5);
    
    // Items list
    let yPos = tableTop + 15;
    invoice.items.forEach((item: any, index: number) => {
      doc.text(item.name.substring(0, 20), 20, yPos);
      doc.text(item.batchNo || 'N/A', 70, yPos);
      doc.text(item.expiryDate || 'N/A', 100, yPos);
      doc.text(`₹${(item.mrp || 0).toFixed(2)}`, 130, yPos);
      doc.text(item.quantity.toString(), 150, yPos);
      doc.text(`₹${item.price.toFixed(2)}`, 170, yPos);
      yPos += 10;
      
      // Add new page if content exceeds page height
      if (yPos > 250) {
        doc.addPage();
        yPos = 30;
      }
    });
    
    // Line before total
    doc.line(20, yPos + 5, 190, yPos + 5);
    
    // Total
    doc.setFontSize(14);
    doc.text(`Total Amount: ₹${invoice.amount.toFixed(2)}`, 130, yPos + 20);
    doc.text(`Status: ${invoice.status}`, 20, yPos + 20);
    
    // Footer
    doc.setFontSize(10);
    doc.text('Thank you for your business!', 105, yPos + 40, { align: 'center' });
    
    // Save the PDF
    doc.save(`invoice-${invoice.id}.pdf`);
    
    toast({
      title: "Success",
      description: "PDF downloaded successfully!"
    });
  };

  const markAsPaid = (invoiceId: string) => {
    const updatedInvoices = invoices.map((inv: any) => 
      inv.id === invoiceId ? { ...inv, status: "Paid" } : inv
    );
    setInvoices(updatedInvoices);
    
    // Update localStorage
    const savedInvoices = JSON.parse(localStorage.getItem("invoices") || "[]");
    const updatedSavedInvoices = savedInvoices.map((inv: any) => 
      inv.id === invoiceId ? { ...inv, status: "Paid" } : inv
    );
    localStorage.setItem("invoices", JSON.stringify(updatedSavedInvoices));
    
    toast({
      title: "Success",
      description: "Invoice marked as paid!"
    });
  };

  const viewInvoiceDetails = (invoice: any) => {
    // Create a detailed view modal or alert
    const itemsList = invoice.items.map((item: any, index: number) => 
      `${index + 1}. ${item.name} - Qty: ${item.quantity} - ₹${item.price.toFixed(2)}`
    ).join('\n');
    
    alert(`INVOICE DETAILS\n\nInvoice ID: ${invoice.id}\nPatient: ${invoice.patientName}\nDate: ${invoice.date}\nStatus: ${invoice.status}\n\nITEMS:\n${itemsList}\n\nTotal Amount: ₹${invoice.amount.toFixed(2)}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-2">Manage billing and payments</p>
        </div>
        <Button asChild>
          <Link to="/invoices/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold">{filteredInvoices.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-green-600">₹{paidAmount.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-orange-600">₹{pendingAmount.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by invoice ID or patient name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {statuses.map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {status === "all" ? "All Status" : status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice List */}
      <div className="space-y-4">
        {filteredInvoices.map((invoice: any) => (
          <Card key={invoice.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{invoice.id}</h3>
                      <p className="text-gray-600">{invoice.patientName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">₹{invoice.amount.toFixed(2)}</p>
                      <Badge variant={getStatusVariant(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-medium">{invoice.date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Items</p>
                      <div className="text-sm">
                        {invoice.items.map((item: any, index: number) => (
                          <span key={index}>
                            {item.name}
                            {index < invoice.items.length - 1 && ", "}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => viewInvoiceDetails(invoice)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => generatePDF(invoice)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    {invoice.status !== "Paid" && (
                      <Button size="sm" onClick={() => markAsPaid(invoice.id)}>
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
        <Card>
          <CardContent className="text-center py-12">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== "all" 
                ? "Try adjusting your search or filter criteria" 
                : "Get started by creating your first invoice"
              }
            </p>
            <Button asChild>
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
