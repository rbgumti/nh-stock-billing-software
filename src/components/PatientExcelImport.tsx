import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePatientStore } from "@/hooks/usePatientStore";
import { PatientFormData } from "@/hooks/usePatientForm";
import * as XLSX from 'xlsx';

interface ImportResult {
  success: number;
  errors: string[];
  total: number;
}

export function PatientExcelImport() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addPatient } = usePatientStore();
  const { toast } = useToast();

  const validatePatientData = (data: any, rowIndex: number): { isValid: boolean; patient?: PatientFormData; error?: string } => {
    const errors: string[] = [];

    // Check required fields
    if (!data.firstName) errors.push("First Name is required");
    if (!data.lastName) errors.push("Last Name is required");
    if (!data.phone) errors.push("Phone is required");

    if (errors.length > 0) {
      return {
        isValid: false,
        error: `Row ${rowIndex + 2}: ${errors.join(", ")}`
      };
    }

    // Create patient object with default values for missing fields
    const patient: PatientFormData = {
      patientId: data.patientId || `PT${Date.now()}_${rowIndex}`,
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      dateOfBirth: data.dateOfBirth || "",
      gender: data.gender || "",
      aadhar: data.aadhar || "",
      govtIdOld: data.govtIdOld || "",
      govtIdNew: data.govtIdNew || "",
      phone: data.phone || "",
      email: data.email || "",
      address: data.address || "",
      emergencyContact: data.emergencyContact || "",
      emergencyPhone: data.emergencyPhone || "",
      medicalHistory: data.medicalHistory || "",
      allergies: data.allergies || "",
      currentMedications: data.currentMedications || ""
    };

    return { isValid: true, patient };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const result: ImportResult = {
        success: 0,
        errors: [],
        total: jsonData.length
      };

      for (let i = 0; i < jsonData.length; i++) {
        const validation = validatePatientData(jsonData[i], i);
        
        if (validation.isValid && validation.patient) {
          try {
            addPatient(validation.patient);
            result.success++;
          } catch (error) {
            result.errors.push(`Row ${i + 2}: Failed to add patient - ${error}`);
          }
        } else if (validation.error) {
          result.errors.push(validation.error);
        }
      }

      setImportResult(result);

      if (result.success > 0) {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${result.success} out of ${result.total} patients.`,
        });
      }

    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to process the Excel file. Please check the file format.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        patientId: "PT001",
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1990-01-15",
        gender: "Male",
        aadhar: "1234 5678 9012",
        govtIdOld: "DL123456",
        govtIdNew: "AB1234567890",
        phone: "+1 234-567-8900",
        email: "john.doe@email.com",
        address: "123 Main St",
        emergencyContact: "Jane Doe",
        emergencyPhone: "+1 234-567-8901",
        medicalHistory: "No significant history",
        allergies: "None",
        currentMedications: "None"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Patients Template");
    XLSX.writeFile(wb, "patient_import_template.xlsx");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import Patients from Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="w-full"
          >
            <FileText className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <p className="text-sm text-gray-600">
            Download the template file to see the required format for patient data.
          </p>
        </div>

        <div className="space-y-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            disabled={isProcessing}
          />
          <p className="text-sm text-gray-600">
            Select an Excel file (.xlsx or .xls) with patient data to import.
          </p>
        </div>

        {isProcessing && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Processing Excel file... Please wait.
            </AlertDescription>
          </Alert>
        )}

        {importResult && (
          <div className="space-y-2">
            <Alert className={importResult.success > 0 ? "border-green-500" : "border-red-500"}>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p><strong>Import Results:</strong></p>
                  <p>✅ Successfully imported: {importResult.success} patients</p>
                  <p>❌ Failed: {importResult.total - importResult.success} patients</p>
                  <p>📊 Total processed: {importResult.total} rows</p>
                </div>
              </AlertDescription>
            </Alert>

            {importResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p><strong>Errors:</strong></p>
                    <ul className="list-disc list-inside space-y-1">
                      {importResult.errors.slice(0, 5).map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li className="text-sm">... and {importResult.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Required fields:</strong> firstName, lastName, phone</p>
          <p><strong>Optional fields:</strong> All other patient information fields</p>
          <p><strong>Note:</strong> If patientId is not provided, it will be auto-generated</p>
        </div>
      </CardContent>
    </Card>
  );
}