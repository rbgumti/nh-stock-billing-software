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
import { SkeletonCard } from "@/components/ui/skeleton";
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion";
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
      case 'Active': return 'bg-green-500';
      case 'Dispensed': return 'bg-blue-500';
      case 'Cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
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
      <div className="container mx-auto p-6 relative min-h-screen">
        <FloatingOrbs />
        
        {/* Ambient liquid blobs */}
        <div className="fixed top-20 left-20 w-96 h-96 bg-gradient-to-br from-gold/8 via-purple/5 to-cyan/8 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-20 right-20 w-80 h-80 bg-gradient-to-br from-cyan/8 via-pink/5 to-gold/8 rounded-full blur-3xl pointer-events-none" />
        
        {/* Header skeleton */}
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gradient-to-r from-gold/30 via-amber-400/20 to-gold/30 rounded-lg animate-pulse" />
            <div className="h-4 w-56 bg-muted/50 rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-gradient-to-r from-gold/30 to-orange/30 rounded-lg animate-pulse" />
        </div>
        
        {/* Search skeleton */}
        <div className="mb-6 relative z-10">
          <div className="h-10 w-full bg-muted/30 rounded-lg animate-pulse glass-strong border-0" />
        </div>
        
        {/* Prescription cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 relative z-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const hasSelection = selectedIds.size > 0;
  const allSelected = filteredPrescriptions.length > 0 && selectedIds.size === filteredPrescriptions.length;

  return (
    <PageTransition className="container mx-auto p-6 relative min-h-screen">
      <FloatingOrbs />
      
      {/* Ambient liquid blobs */}
      <div className="fixed top-20 left-20 w-96 h-96 bg-gradient-to-br from-gold/8 via-purple/5 to-cyan/8 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-20 w-80 h-80 bg-gradient-to-br from-cyan/8 via-pink/5 to-gold/8 rounded-full blur-3xl pointer-events-none" />
      
      <FadeIn direction="down">
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gold via-amber-400 to-gold bg-clip-text text-transparent">Prescriptions</h1>
            <p className="text-muted-foreground">Manage patient prescriptions</p>
          </div>
          <Button onClick={() => navigate('/prescriptions/new')} className="bg-gold hover:bg-gold/90 text-navy">
            <Plus className="mr-2 h-4 w-4" />
            New Prescription
          </Button>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="mb-6 space-y-4 relative z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by patient name, prescription number, or diagnosis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 glass-strong border-white/10"
            />
          </div>

          {/* Bulk Actions Bar */}
          {filteredPrescriptions.length > 0 && (
            <div className="flex items-center justify-between glass-strong border border-white/10 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <Checkbox 
                  checked={allSelected}
                  onCheckedChange={selectAll}
                  aria-label="Select all"
                />
                <span className="text-sm text-muted-foreground">
                  {hasSelection 
                    ? `${selectedIds.size} selected` 
                    : 'Select all'}
                </span>
              </div>
              {hasSelection && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleBulkExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleBulkCancel} className="text-destructive hover:text-destructive">
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Selected
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </FadeIn>

      {filteredPrescriptions.length === 0 ? (
        <FadeIn delay={0.2}>
          <Card className="glass-strong border border-white/10 relative z-10">
            <CardContent className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No prescriptions found' : 'No prescriptions yet'}
              </p>
              {!searchTerm && (
                <Button onClick={() => navigate('/prescriptions/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Prescription
                </Button>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      ) : (
        <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 relative z-10">
          {filteredPrescriptions.map((prescription) => (
            <StaggerItem key={prescription.id}>
              <Card 
                className={`glass-strong border border-white/10 hover:border-gold/30 transition-all duration-300 group overflow-hidden ${selectedIds.has(prescription.id!) ? 'ring-2 ring-gold' : ''}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardHeader className="relative z-10">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedIds.has(prescription.id!)}
                        onCheckedChange={() => toggleSelection(prescription.id!)}
                        aria-label={`Select ${prescription.prescription_number}`}
                      />
                      <CardTitle className="text-lg bg-gradient-to-r from-gold to-amber-400 bg-clip-text text-transparent">{prescription.prescription_number}</CardTitle>
                    </div>
                    <Badge className={getStatusColor(prescription.status)}>
                      {prescription.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 relative z-10">
                  <div className="flex items-center text-sm">
                    <User className="mr-2 h-4 w-4 text-gold" />
                    <span className="font-medium">{prescription.patient_name}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>{format(new Date(prescription.prescription_date), 'dd MMM yyyy')}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Diagnosis:</span> {prescription.diagnosis}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {prescription.items.length} medicine(s)
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/prescriptions/view/${prescription.id}`)}
                      className="flex-1"
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/prescriptions/edit/${prescription.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {prescription.status === 'Active' && (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/invoices/new?prescriptionId=${prescription.id}`)}
                        className="flex-1 bg-gold hover:bg-gold/90 text-navy"
                      >
                        Invoice
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </PageTransition>
  );
}
