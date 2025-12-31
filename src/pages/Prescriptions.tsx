import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, FileText, Calendar, User, Search, Pencil, Download, XCircle, CheckSquare } from "lucide-react";
import { usePrescriptionStore, Prescription } from "@/hooks/usePrescriptionStore";
import { format } from "date-fns";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

export default function Prescriptions() {
  const navigate = useNavigate();
  const { prescriptions, loading, updatePrescriptionStatus } = usePrescriptionStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredPrescriptions = prescriptions.filter(prescription =>
    prescription.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prescription.prescription_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prescription.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-gradient-to-r from-emerald to-teal text-white border-0';
      case 'Dispensed': return 'bg-gradient-to-r from-cyan to-teal text-white border-0';
      case 'Cancelled': return 'bg-gradient-to-r from-destructive to-orange text-white border-0';
      default: return 'bg-gradient-to-r from-muted to-muted-foreground text-white border-0';
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredPrescriptions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPrescriptions.map(p => p.id!)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkCancel = async () => {
    const activeSelected = filteredPrescriptions.filter(
      p => selectedIds.has(p.id!) && p.status === 'Active'
    );
    
    if (activeSelected.length === 0) {
      toast({
        title: "No active prescriptions selected",
        description: "Only active prescriptions can be cancelled",
        variant: "destructive",
      });
      return;
    }

    for (const prescription of activeSelected) {
      await updatePrescriptionStatus(prescription.id!, 'Cancelled');
    }

    toast({
      title: "Success",
      description: `${activeSelected.length} prescription(s) cancelled`,
    });
    clearSelection();
  };

  const handleBulkExport = () => {
    const selectedPrescriptions = filteredPrescriptions.filter(p => selectedIds.has(p.id!));
    
    if (selectedPrescriptions.length === 0) {
      toast({
        title: "No prescriptions selected",
        description: "Please select prescriptions to export",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Prescriptions Export", pageWidth / 2, y, { align: "center" });
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, pageWidth / 2, y, { align: "center" });
    y += 15;

    selectedPrescriptions.forEach((prescription, index) => {
      // Check if we need a new page
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      // Prescription header
      doc.setDrawColor(200);
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y - 5, pageWidth - margin * 2, 10, 'F');
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}. ${prescription.prescription_number}`, margin + 2, y);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Status: ${prescription.status}`, pageWidth - margin - 30, y);
      y += 12;

      // Patient info
      doc.setFontSize(10);
      doc.text(`Patient: ${prescription.patient_name}`, margin, y);
      doc.text(`Date: ${format(new Date(prescription.prescription_date), "dd MMM yyyy")}`, margin + 80, y);
      y += 6;
      doc.text(`Diagnosis: ${prescription.diagnosis}`, margin, y);
      y += 8;

      // Medicines
      if (prescription.items.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Medicines:", margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        
        prescription.items.forEach((item, itemIndex) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(`  ${itemIndex + 1}. ${item.medicine_name} - ${item.dosage}, ${item.frequency}, ${item.duration} days (Qty: ${item.quantity})`, margin, y);
          y += 5;
        });
      }

      y += 10;
    });

    doc.save(`prescriptions-export-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    
    toast({
      title: "Export complete",
      description: `${selectedPrescriptions.length} prescription(s) exported to PDF`,
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground">Loading prescriptions...</p>
          </div>
        </div>
      </div>
    );
  }

  const hasSelection = selectedIds.size > 0;
  const allSelected = filteredPrescriptions.length > 0 && selectedIds.size === filteredPrescriptions.length;

  return (
    <div className="container mx-auto p-6 relative">
      <FloatingOrbs />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal via-cyan to-lime bg-clip-text text-transparent">Prescriptions</h1>
          <p className="text-muted-foreground mt-1">Manage patient prescriptions</p>
        </div>
        <Button 
          onClick={() => navigate('/prescriptions/new')} 
          className="bg-gradient-to-r from-teal to-cyan hover:from-teal/90 hover:to-cyan/90 text-white shadow-lg hover:shadow-teal/25 transition-all duration-300"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Prescription
        </Button>
      </div>

      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal h-4 w-4" />
          <Input
            placeholder="Search by patient name, prescription number, or diagnosis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-teal/30 focus:border-teal focus:ring-teal/20 bg-white/80 backdrop-blur-sm"
          />
        </div>

        {/* Bulk Actions Bar */}
        {filteredPrescriptions.length > 0 && (
          <div className="flex items-center justify-between bg-gradient-to-r from-teal/10 via-cyan/10 to-lime/10 backdrop-blur-sm rounded-lg p-3 border border-teal/20">
            <div className="flex items-center gap-3">
              <Checkbox 
                checked={allSelected}
                onCheckedChange={selectAll}
                aria-label="Select all"
                className="border-teal data-[state=checked]:bg-teal data-[state=checked]:border-teal"
              />
              <span className="text-sm text-muted-foreground">
                {hasSelection 
                  ? `${selectedIds.size} selected` 
                  : 'Select all'}
              </span>
            </div>
            {hasSelection && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleBulkExport} className="border-teal/30 hover:bg-teal/10 hover:border-teal">
                  <Download className="mr-2 h-4 w-4 text-teal" />
                  Export PDF
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkCancel} className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10">
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Selected
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection} className="hover:bg-teal/10">
                  Clear
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {filteredPrescriptions.length === 0 ? (
        <Card className="border-teal/20 bg-white/80 backdrop-blur-sm">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal/20 to-cyan/20 flex items-center justify-center">
              <FileText className="h-8 w-8 text-teal" />
            </div>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'No prescriptions found' : 'No prescriptions yet'}
            </p>
            {!searchTerm && (
              <Button onClick={() => navigate('/prescriptions/new')} className="bg-gradient-to-r from-teal to-cyan hover:from-teal/90 hover:to-cyan/90 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Create First Prescription
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPrescriptions.map((prescription, index) => (
            <Card 
              key={prescription.id} 
              className={`group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-teal/20 bg-white/80 backdrop-blur-sm ${selectedIds.has(prescription.id!) ? 'ring-2 ring-teal shadow-lg shadow-teal/20' : ''}`}
            >
              {/* Gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${
                index % 4 === 0 ? 'from-teal/10 via-transparent to-cyan/10' :
                index % 4 === 1 ? 'from-cyan/10 via-transparent to-lime/10' :
                index % 4 === 2 ? 'from-lime/10 via-transparent to-emerald/10' :
                'from-emerald/10 via-transparent to-teal/10'
              } opacity-50 group-hover:opacity-100 transition-opacity`} />
              
              <CardHeader className="relative">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.has(prescription.id!)}
                      onCheckedChange={() => toggleSelection(prescription.id!)}
                      aria-label={`Select ${prescription.prescription_number}`}
                      className="border-teal data-[state=checked]:bg-teal data-[state=checked]:border-teal"
                    />
                    <CardTitle className="text-lg bg-gradient-to-r from-teal to-cyan bg-clip-text text-transparent">{prescription.prescription_number}</CardTitle>
                  </div>
                  <Badge className={getStatusColor(prescription.status)}>
                    {prescription.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 relative">
                <div className="flex items-center text-sm">
                  <User className="mr-2 h-4 w-4 text-teal" />
                  <span className="font-medium">{prescription.patient_name}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4 text-cyan" />
                  <span>{format(new Date(prescription.prescription_date), 'dd MMM yyyy')}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-teal">Diagnosis:</span> {prescription.diagnosis}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-teal/10 to-cyan/10 text-teal text-xs">
                    {prescription.items.length} medicine(s)
                  </span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/prescriptions/view/${prescription.id}`)}
                    className="flex-1 border-teal/30 hover:bg-teal/10 hover:border-teal"
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/prescriptions/edit/${prescription.id}`)}
                    className="border-cyan/30 hover:bg-cyan/10 hover:border-cyan"
                  >
                    <Pencil className="h-4 w-4 text-cyan" />
                  </Button>
                  {prescription.status === 'Active' && (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/invoices/new?prescriptionId=${prescription.id}`)}
                      className="flex-1 bg-gradient-to-r from-lime to-emerald hover:from-lime/90 hover:to-emerald/90 text-white"
                    >
                      Invoice
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}