import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, FileText, Calendar, User, Search } from "lucide-react";
import { usePrescriptionStore } from "@/hooks/usePrescriptionStore";
import { format } from "date-fns";
import { FloatingOrbs } from "@/components/ui/floating-orbs";

export default function Prescriptions() {
  const navigate = useNavigate();
  const { prescriptions, loading, updatePrescriptionStatus } = usePrescriptionStore();
  const [searchTerm, setSearchTerm] = useState('');

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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading prescriptions...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 relative">
      <FloatingOrbs />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy">Prescriptions</h1>
          <p className="text-muted-foreground">Manage patient prescriptions</p>
        </div>
        <Button onClick={() => navigate('/prescriptions/new')} className="bg-gold hover:bg-gold/90 text-navy">
          <Plus className="mr-2 h-4 w-4" />
          New Prescription
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by patient name, prescription number, or diagnosis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredPrescriptions.length === 0 ? (
        <Card>
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
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPrescriptions.map((prescription) => (
            <Card key={prescription.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{prescription.prescription_number}</CardTitle>
                  <Badge className={getStatusColor(prescription.status)}>
                    {prescription.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center text-sm">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
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
                  {prescription.status === 'Active' && (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/invoices/new?prescriptionId=${prescription.id}`)}
                      className="flex-1"
                    >
                      Generate Invoice
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