import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Calendar, Search, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadAllPatients, Patient, formatPhone } from "@/lib/patientUtils";
import { formatLocalISODate } from "@/lib/dateUtils";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";

interface FollowUpData {
  fileNo: string;
  patientName: string;
  fatherName: string;
  govtId: string;
  newGovtId: string;
  aadharNo: string;
  phone: string;
  address: string;
  lastVisitDate: string;
  days: number;
  followUpDate: string;
  remarks: string;
}

export default function FollowUpReport() {
  const [followUpData, setFollowUpData] = useState<FollowUpData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState({
    from: "",
    to: "",
  });

  useEffect(() => {
    loadFollowUpData();
  }, []);

  const loadFollowUpData = async () => {
    setLoading(true);
    try {
      // Load all patients
      const patients = await loadAllPatients();
      const patientMap = new Map<string, Patient>();
      patients.forEach((p) => {
        patientMap.set(String(p.id), p);
      });

      // Load invoices with follow_up_date
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select("*")
        .not("follow_up_date", "is", null)
        .order("follow_up_date", { ascending: true });

      if (error) throw error;

      // Group by patient and get the latest invoice for each
      const patientInvoiceMap = new Map<string, any>();
      invoices?.forEach((invoice) => {
        const existingInvoice = patientInvoiceMap.get(invoice.patient_id);
        if (
          !existingInvoice ||
          new Date(invoice.invoice_date) > new Date(existingInvoice.invoice_date)
        ) {
          patientInvoiceMap.set(invoice.patient_id, invoice);
        }
      });

      // Build follow-up data
      const data: FollowUpData[] = [];
      patientInvoiceMap.forEach((invoice, patientId) => {
        const patient = patientMap.get(patientId);
        const lastVisitDate = invoice.invoice_date;
        const followUpDate = invoice.follow_up_date;
        
        // Calculate days until/since follow-up
        const today = new Date(formatLocalISODate());
        const followUp = new Date(followUpDate);
        const diffTime = followUp.getTime() - today.getTime();
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        data.push({
          fileNo: patient?.file_no || "",
          patientName: patient?.patient_name || invoice.patient_name || "",
          fatherName: patient?.father_name || "",
          govtId: patient?.govt_id || "",
          newGovtId: patient?.new_govt_id || "",
          aadharNo: patient?.aadhar_card || "",
          phone: formatPhone(patient?.phone || invoice.patient_phone),
          address: patient?.address || "",
          lastVisitDate: lastVisitDate,
          days: days,
          followUpDate: followUpDate,
          remarks: invoice.notes || "",
        });
      });

      // Sort by follow-up date
      data.sort((a, b) => new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime());

      setFollowUpData(data);
    } catch (error) {
      console.error("Error loading follow-up data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = followUpData.filter((item) => {
    const matchesSearch =
      searchTerm === "" ||
      item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.fileNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone.includes(searchTerm) ||
      item.govtId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.newGovtId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDateFrom =
      !dateFilter.from || item.followUpDate >= dateFilter.from;
    const matchesDateTo =
      !dateFilter.to || item.followUpDate <= dateFilter.to;

    return matchesSearch && matchesDateFrom && matchesDateTo;
  });

  const exportToExcel = () => {
    if (filteredData.length === 0) {
      alert("No data available to export");
      return;
    }

    const exportData = filteredData.map((item, index) => ({
      "S.No": index + 1,
      "File No.": item.fileNo,
      "Patient Name": item.patientName,
      "Father Name": item.fatherName,
      "Govt. ID": item.govtId,
      "New Govt. ID": item.newGovtId,
      "Aadhar No.": item.aadharNo,
      "Phone No.": item.phone,
      "Address": item.address,
      "Last Visit Date": item.lastVisitDate,
      "Days": item.days,
      "Follow Up Date": item.followUpDate,
      "Remarks": item.remarks,
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Follow Up Report");
    XLSX.writeFile(workbook, `follow-up-report-${formatLocalISODate()}.xlsx`);
  };

  const getDaysBadge = (days: number) => {
    if (days < 0) {
      return <Badge variant="destructive">Overdue by {Math.abs(days)} days</Badge>;
    } else if (days === 0) {
      return <Badge variant="destructive">Today</Badge>;
    } else if (days <= 3) {
      return <Badge className="bg-orange-500 hover:bg-orange-600">{days} days</Badge>;
    } else if (days <= 7) {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">{days} days</Badge>;
    } else {
      return <Badge variant="secondary">{days} days</Badge>;
    }
  };

  // Stats
  const overdueCount = followUpData.filter((d) => d.days < 0).length;
  const todayCount = followUpData.filter((d) => d.days === 0).length;
  const upcomingCount = followUpData.filter((d) => d.days > 0 && d.days <= 7).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Follow-ups</p>
                <p className="text-2xl font-bold">{followUpData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-destructive">{overdueCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Today</p>
                <p className="text-2xl font-bold text-orange-500">{todayCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Next 7 Days</p>
                <p className="text-2xl font-bold text-yellow-500">{upcomingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Follow-Up Report
            </CardTitle>
            <Button onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, file no, phone, govt ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFilter.from}
                onChange={(e) =>
                  setDateFilter((prev) => ({ ...prev, from: e.target.value }))
                }
              />
            </div>
            <div className="w-full md:w-48">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateFilter.to}
                onChange={(e) =>
                  setDateFilter((prev) => ({ ...prev, to: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">S.No</TableHead>
                  <TableHead>File No.</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Father Name</TableHead>
                  <TableHead>Govt. ID</TableHead>
                  <TableHead>New Govt. ID</TableHead>
                  <TableHead>Aadhar No.</TableHead>
                  <TableHead>Phone No.</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Last Visit</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Follow-up Date</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                      No follow-up records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item, index) => (
                    <TableRow key={index} className={item.days < 0 ? "bg-destructive/10" : item.days === 0 ? "bg-orange-50" : ""}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{item.fileNo}</TableCell>
                      <TableCell>{item.patientName}</TableCell>
                      <TableCell>{item.fatherName}</TableCell>
                      <TableCell>{item.govtId}</TableCell>
                      <TableCell>{item.newGovtId}</TableCell>
                      <TableCell>{item.aadharNo}</TableCell>
                      <TableCell>{item.phone}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={item.address}>
                        {item.address}
                      </TableCell>
                      <TableCell>{item.lastVisitDate}</TableCell>
                      <TableCell>{getDaysBadge(item.days)}</TableCell>
                      <TableCell>{item.followUpDate}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={item.remarks}>
                        {item.remarks}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredData.length} of {followUpData.length} records
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
