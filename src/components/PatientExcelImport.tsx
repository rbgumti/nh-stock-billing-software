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

    // Check required fields based on the new template
    if (!data["Patient Name"]) errors.push("Patient Name is required");
    if (!data["ph"]) errors.push("Phone (ph) is required");

    if (errors.length > 0) {
      return {
        isValid: false,
        error: `Row ${rowIndex + 2}: ${errors.join(", ")}`
      };
    }

    // Split patient name into first and last name
    const fullName = data["Patient Name"] || "";
    const nameParts = fullName.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Calculate date of birth from age if provided
    let dateOfBirth = "";
    if (data["Age"]) {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - parseInt(data["Age"]);
      dateOfBirth = `${birthYear}-01-01`; // Default to Jan 1st
    }

    // Create patient object mapping the template fields
    const patient: PatientFormData = {
      patientId: data["Fill no."] || `PT${Date.now()}_${rowIndex}`,
      firstName: firstName,
      lastName: lastName,
      dateOfBirth: dateOfBirth,
      gender: "", // Not in template, will be empty
      aadhar: data["Addhar Card"] || "",
      govtIdOld: data["Govt. ID"] || "",
      govtIdNew: data["New Govt, ID"] || "",
      phone: data["ph"] || "",
      email: "", // Not in template, will be empty
      address: data["Address"] || "",
      emergencyContact: data["Father Name"] || "",
      emergencyPhone: "", // Not in template, will be empty
      medicalHistory: data["VISIT DATE"] ? `Visit Date: ${data["VISIT DATE"]}` : "",
      allergies: data["Days"] ? `Days: ${data["Days"]}` : "",
      currentMedications: data["Follow up date"] ? `Follow up date: ${data["Follow up date"]}` : ""
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
        "S.No.": 1,
        "Fill no.": "PT001",
        "Patient Name": "John Doe",
        "Age": 30,
        "Father Name": "Robert Doe",
        "Govt. ID": "DL123456",
        "New Govt, ID": "AB1234567890",
        "Addhar Card": "1234 5678 9012",
        "ph": "+1 234-567-8900",
        "Address": "123 Main Street, City",
        "VISIT DATE": "2024-01-15",
        "Days": "7",
        "Follow up date": "2024-01-22"
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
          <p><strong>Required fields:</strong> Patient Name, ph (phone)</p>
          <p><strong>Template fields:</strong> S.No., Fill no., Patient Name, Age, Father Name, Govt. ID, New Govt, ID, Addhar Card, ph, Address, VISIT DATE, Days, Follow up date</p>
          <p><strong>Note:</strong> Age will be converted to birth year, Father Name maps to Emergency Contact</p>
          <p><strong>Note:</strong> VISIT DATE, Days, and Follow up date will be stored in medical information fields</p>
        </div>
      </CardContent>
    </Card>
  );
}