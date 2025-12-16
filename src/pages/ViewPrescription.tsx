import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Printer, Pencil } from "lucide-react";
import { usePrescriptionStore, Prescription } from "@/hooks/usePrescriptionStore";
import { format } from "date-fns";

export default function ViewPrescription() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPrescription, updatePrescriptionStatus } = usePrescriptionStore();
  const [prescription, setPrescription] = useState<Prescription | null>(null);

  useEffect(() => {
    if (id) {
      const data = getPrescription(id);
      if (data) {
        setPrescription(data);
      } else {
        navigate('/prescriptions');
      }
    }
  }, [id, getPrescription, navigate]);

  if (!prescription) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading prescription...</div>
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
            {prescription.status === 'Active' && (
              <>
                <Button variant="outline" onClick={() => navigate(`/prescriptions/edit/${prescription.id}`)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button onClick={() => navigate(`/invoices/new?prescriptionId=${prescription.id}`)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Invoice
                </Button>
              </>
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