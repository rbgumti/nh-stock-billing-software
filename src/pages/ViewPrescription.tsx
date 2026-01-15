import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Printer, Pencil, Download } from "lucide-react";
import { usePrescriptionStore, Prescription } from "@/hooks/usePrescriptionStore";
import { useAppSettings } from "@/hooks/usePerformanceMode";
import { format } from "date-fns";
import jsPDF from "jspdf";
import hospitalLogo from "@/assets/NH_LOGO.png";

export default function ViewPrescription() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { prescriptions, loading, getPrescription, updatePrescriptionStatus } = usePrescriptionStore();
  const { doctorName } = useAppSettings();
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      navigate('/prescriptions');
      return;
    }

    // Wait for prescriptions to load, then find the one we need
    if (!loading) {
      const data = getPrescription(id);
      if (data) {
        setPrescription(data);
        setLocalLoading(false);
      } else {
        // Prescription not found after loading completed
        navigate('/prescriptions');
      }
    }
  }, [id, loading, prescriptions, getPrescription, navigate]);

  if (loading || localLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading prescription...</div>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Prescription not found</div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500';
      case 'Dispensed': return 'bg-blue-500';
      case 'Cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!prescription) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = 12;

    // Load and add hospital logo
    try {
      const img = new Image();
      img.src = hospitalLogo;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      const logoWidth = 22;
      const logoHeight = 22;
      doc.addImage(img, "PNG", pageWidth / 2 - logoWidth / 2, y, logoWidth, logoHeight);
      y += logoHeight + 3;
    } catch (error) {
      console.error("Error loading logo:", error);
      y += 8;
    }

    // Hospital Name
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 51, 102); // Navy #003366
    doc.text("NAVJEEVAN HOSPITAL", pageWidth / 2, y, { align: "center" });
    y += 5;

    // Hospital tagline
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text("Healthcare with Compassion", pageWidth / 2, y, { align: "center" });
    y += 5;

    // Address
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text("Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)", pageWidth / 2, y, { align: "center" });
    y += 4;

    // Phone and Doctor
    doc.text(`Phone: 6284942412 | ${doctorName}`, pageWidth / 2, y, { align: "center" });
    y += 4;

    // Licence
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("Licence No: PSMHC/Pb./2024/863 | Regd. Govt of Punjab", pageWidth / 2, y, { align: "center" });
    y += 6;

    // Header border
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Prescription title badge
    doc.setFillColor(0, 51, 102);
    doc.roundedRect(pageWidth / 2 - 30, y - 4, 60, 10, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("PRESCRIPTION", pageWidth / 2, y + 3, { align: "center" });
    y += 12;

    // Prescription number
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 51, 102);
    doc.text(prescription.prescription_number, pageWidth / 2, y, { align: "center" });
    y += 10;

    // Patient Information Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y - 3, pageWidth - margin * 2, 38, 2, 2, 'FD');
    y += 3;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    const patientInfo = [
      ["Patient Name:", prescription.patient_name],
      ["Age:", prescription.patient_age || "N/A"],
      ["Phone:", prescription.patient_phone || "N/A"],
      ["Date:", format(new Date(prescription.prescription_date), "dd MMM yyyy, hh:mm a")],
      ["Diagnosis:", prescription.diagnosis],
    ];

    patientInfo.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 51, 102);
      doc.text(label, margin + 3, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(value, margin + 35, y);
      y += 6;
    });

    if (prescription.notes) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 51, 102);
      doc.text("Notes:", margin + 3, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const notesLines = doc.splitTextToSize(prescription.notes, pageWidth - margin * 2 - 40);
      doc.text(notesLines, margin + 35, y);
      y += notesLines.length * 5;
    }

    y += 8;

    // Medicines Section
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 51, 102);
    doc.text("Prescribed Medicines", margin, y);
    y += 8;

    prescription.items.forEach((item, index) => {
      if (y > pageHeight - 80) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`${index + 1}. ${item.medicine_name}`, margin, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      const medicineDetails = `Dosage: ${item.dosage} | Frequency: ${item.frequency} | Duration: ${item.duration} days | Qty: ${item.quantity}`;
      doc.text(medicineDetails, margin + 5, y);
      y += 5;

      if (item.instructions) {
        doc.setFont("helvetica", "italic");
        doc.text(`Instructions: ${item.instructions}`, margin + 5, y);
        y += 5;
      }

      y += 4;
    });

    // Doctor Signature Section - positioned near bottom
    const signatureY = Math.max(y + 20, pageHeight - 55);
    
    // For Navjeevan Hospital text
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 51, 102);
    doc.text("For Navjeevan Hospital,", pageWidth - margin - 50, signatureY, { align: "center" });
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("Opp. New Bus Stand, G.T. Road, Sirhind", pageWidth - margin - 50, signatureY + 4, { align: "center" });
    
    // Signature line
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.3);
    doc.line(pageWidth - margin - 80, signatureY + 25, pageWidth - margin - 20, signatureY + 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 51, 102);
    doc.text(doctorName, pageWidth - margin - 50, signatureY + 30, { align: "center" });
    
    // Date on left side
    doc.setDrawColor(100, 100, 100);
    doc.line(margin + 20, signatureY + 25, margin + 80, signatureY + 25);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("Date: " + format(new Date(prescription.prescription_date), "dd-MM-yyyy"), margin + 50, signatureY + 30, { align: "center" });

    // Footer
    const footerY = pageHeight - 15;
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("This is a computer generated document | For queries contact: 6284942412", pageWidth / 2, footerY, { align: "center" });
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 51, 102);
    doc.text("NAVJEEVAN HOSPITAL - Opp. Bus Stand, Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)", pageWidth / 2, footerY + 5, { align: "center" });

    // Download PDF
    doc.save(`${prescription.prescription_number}.pdf`);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 print:hidden">
        <Button
          variant="ghost"
          onClick={() => navigate('/prescriptions')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Prescriptions
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{prescription.prescription_number}</h1>
            <Badge className={`${getStatusColor(prescription.status)} mt-2`}>
              {prescription.status}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={() => navigate(`/prescriptions/edit/${prescription.id}`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            {prescription.status === 'Active' && (
              <Button onClick={() => navigate(`/invoices/new?prescriptionId=${prescription.id}`)}>
                <FileText className="mr-2 h-4 w-4" />
                Generate Invoice
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Patient Name</p>
              <p className="font-medium">{prescription.patient_name}</p>
            </div>
            {prescription.patient_age && (
              <div>
                <p className="text-sm text-muted-foreground">Age</p>
                <p className="font-medium">{prescription.patient_age}</p>
              </div>
            )}
            {prescription.patient_phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{prescription.patient_phone}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">
                {format(new Date(prescription.prescription_date), 'dd MMM yyyy, hh:mm a')}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">Diagnosis</p>
              <p className="font-medium">{prescription.diagnosis}</p>
            </div>
            {prescription.notes && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium">{prescription.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prescribed Medicines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {prescription.items.map((item, index) => (
                <div key={item.id || index} className="border-b pb-4 last:border-0">
                  <h4 className="font-medium mb-2">{item.medicine_name}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Dosage:</span> {item.dosage}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Frequency:</span> {item.frequency}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration:</span> {item.duration}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quantity:</span> {item.quantity}
                    </div>
                    {item.instructions && (
                      <div className="col-span-2 md:col-span-4">
                        <span className="text-muted-foreground">Instructions:</span> {item.instructions}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {prescription.status === 'Active' && (
          <div className="flex gap-2 print:hidden">
            <Button
              variant="outline"
              onClick={() => {
                if (prescription.id) {
                  updatePrescriptionStatus(prescription.id, 'Cancelled');
                  navigate('/prescriptions');
                }
              }}
            >
              Cancel Prescription
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}