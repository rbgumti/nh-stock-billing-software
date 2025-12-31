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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Download, Calendar as CalendarIcon, Search, AlertCircle, CheckCircle, CalendarClock, Settings, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadAllPatients, Patient, formatPhone } from "@/lib/patientUtils";
import { formatLocalISODate } from "@/lib/dateUtils";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, addDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface FollowUpData {
  invoiceId: string;
  patientId: string;
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
  const [rescheduleDialog, setRescheduleDialog] = useState<{
    open: boolean;
    item: FollowUpData | null;
  }>({ open: false, item: null });
  const [newFollowUpDate, setNewFollowUpDate] = useState<Date | undefined>();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Backfill state
  const [backfillDialog, setBackfillDialog] = useState(false);
  const [backfillDays, setBackfillDays] = useState("15");
  const [backfillDateRange, setBackfillDateRange] = useState({ from: "", to: "" });
  const [backfillPreview, setBackfillPreview] = useState<{ count: number; invoices: any[] } | null>(null);
  const [backfillLoading, setBackfillLoading] = useState(false);

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
          invoiceId: invoice.id,
          patientId: patientId,
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

  const handleMarkCompleted = async (item: FollowUpData) => {
    setActionLoading(item.invoiceId);
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ follow_up_date: null })
        .eq("id", item.invoiceId);

      if (error) throw error;

      toast.success(`Follow-up for ${item.patientName} marked as completed`);
      // Remove from local state
      setFollowUpData((prev) => prev.filter((d) => d.invoiceId !== item.invoiceId));
    } catch (error) {
      console.error("Error marking follow-up as completed:", error);
      toast.error("Failed to mark follow-up as completed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDialog.item || !newFollowUpDate) return;

    setActionLoading(rescheduleDialog.item.invoiceId);
    try {
      const newDate = formatLocalISODate(newFollowUpDate);
      const { error } = await supabase
        .from("invoices")
        .update({ follow_up_date: newDate })
        .eq("id", rescheduleDialog.item.invoiceId);

      if (error) throw error;

      toast.success(`Follow-up rescheduled to ${newDate}`);
      
      // Update local state
      setFollowUpData((prev) =>
        prev.map((d) => {
          if (d.invoiceId === rescheduleDialog.item?.invoiceId) {
            const today = new Date(formatLocalISODate());
            const followUp = new Date(newDate);
            const diffTime = followUp.getTime() - today.getTime();
            const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return { ...d, followUpDate: newDate, days };
          }
          return d;
        }).sort((a, b) => new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime())
      );

      setRescheduleDialog({ open: false, item: null });
      setNewFollowUpDate(undefined);
    } catch (error) {
      console.error("Error rescheduling follow-up:", error);
      toast.error("Failed to reschedule follow-up");
    } finally {
      setActionLoading(null);
    }
  };

  const openRescheduleDialog = (item: FollowUpData) => {
    setRescheduleDialog({ open: true, item });
    setNewFollowUpDate(new Date(item.followUpDate));
  };

  // Backfill functions
  const previewBackfill = async () => {
    setBackfillLoading(true);
    try {
      let query = supabase
        .from("invoices")
        .select("id, invoice_date, patient_name, follow_up_date")
        .is("follow_up_date", null);

      if (backfillDateRange.from) {
        query = query.gte("invoice_date", backfillDateRange.from);
      }
      if (backfillDateRange.to) {
        query = query.lte("invoice_date", backfillDateRange.to);
      }

      const { data, error } = await query.order("invoice_date", { ascending: false });

      if (error) throw error;

      setBackfillPreview({
        count: data?.length || 0,
        invoices: data?.slice(0, 10) || [], // Show first 10 for preview
      });
    } catch (error) {
      console.error("Error previewing backfill:", error);
      toast.error("Failed to load preview");
    } finally {
      setBackfillLoading(false);
    }
  };

  const executeBackfill = async () => {
    if (!backfillPreview || backfillPreview.count === 0) return;

    setBackfillLoading(true);
    try {
      const daysToAdd = parseInt(backfillDays);
      
      // Fetch all invoices to update
      let query = supabase
        .from("invoices")
        .select("id, invoice_date")
        .is("follow_up_date", null);

      if (backfillDateRange.from) {
        query = query.gte("invoice_date", backfillDateRange.from);
      }
      if (backfillDateRange.to) {
        query = query.lte("invoice_date", backfillDateRange.to);
      }

      const { data: invoices, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (!invoices || invoices.length === 0) {
        toast.info("No invoices to update");
        return;
      }

      // Update each invoice with calculated follow-up date
      let successCount = 0;
      let errorCount = 0;

      for (const invoice of invoices) {
        const invoiceDate = parseISO(invoice.invoice_date);
        const followUpDate = formatLocalISODate(addDays(invoiceDate, daysToAdd));

        const { error } = await supabase
          .from("invoices")
          .update({ follow_up_date: followUpDate })
          .eq("id", invoice.id);

        if (error) {
          errorCount++;
          console.error(`Failed to update invoice ${invoice.id}:`, error);
        } else {
          successCount++;
        }
      }

      toast.success(`Updated ${successCount} invoices with follow-up dates`);
      if (errorCount > 0) {
        toast.warning(`Failed to update ${errorCount} invoices`);
      }

      // Close dialog and reload data
      setBackfillDialog(false);
      setBackfillPreview(null);
      loadFollowUpData();
    } catch (error) {
      console.error("Error executing backfill:", error);
      toast.error("Failed to backfill follow-up dates");
    } finally {
      setBackfillLoading(false);
    }
  };

  const openBackfillDialog = () => {
    // Set default date range to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setBackfillDateRange({
      from: formatLocalISODate(firstDay),
      to: formatLocalISODate(lastDay),
    });
    setBackfillPreview(null);
    setBackfillDialog(true);
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
              <CalendarIcon className="h-8 w-8 text-primary" />
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
              <CalendarIcon className="h-8 w-8 text-orange-500" />
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
              <CalendarIcon className="h-8 w-8 text-yellow-500" />
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
              <CalendarIcon className="h-5 w-5" />
              Follow-Up Report
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={openBackfillDialog}>
                <Settings className="h-4 w-4 mr-2" />
                Backfill Dates
              </Button>
              <Button onClick={exportToExcel}>
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
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
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                      No follow-up records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item, index) => (
                    <TableRow key={item.invoiceId} className={item.days < 0 ? "bg-destructive/10" : item.days === 0 ? "bg-orange-50" : ""}>
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
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Mark as Completed"
                            onClick={() => handleMarkCompleted(item)}
                            disabled={actionLoading === item.invoiceId}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reschedule"
                            onClick={() => openRescheduleDialog(item)}
                            disabled={actionLoading === item.invoiceId}
                          >
                            <CalendarClock className="h-4 w-4 text-blue-600" />
                          </Button>
                        </div>
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

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialog.open} onOpenChange={(open) => {
        if (!open) {
          setRescheduleDialog({ open: false, item: null });
          setNewFollowUpDate(undefined);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Follow-Up</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Rescheduling follow-up for <strong>{rescheduleDialog.item?.patientName}</strong>
            </p>
            <div className="space-y-2">
              <Label>New Follow-Up Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newFollowUpDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newFollowUpDate ? format(newFollowUpDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newFollowUpDate}
                    onSelect={setNewFollowUpDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialog({ open: false, item: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={!newFollowUpDate || actionLoading === rescheduleDialog.item?.invoiceId}
            >
              {actionLoading === rescheduleDialog.item?.invoiceId ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backfill Dialog */}
      <Dialog open={backfillDialog} onOpenChange={(open) => {
        if (!open) {
          setBackfillDialog(false);
          setBackfillPreview(null);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Backfill Follow-Up Dates</DialogTitle>
            <DialogDescription>
              Set follow-up dates for invoices that don't have one. The follow-up date will be calculated as invoice date + the number of days you specify.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Invoice Date From</Label>
                <Input
                  type="date"
                  value={backfillDateRange.from}
                  onChange={(e) =>
                    setBackfillDateRange((prev) => ({ ...prev, from: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Invoice Date To</Label>
                <Input
                  type="date"
                  value={backfillDateRange.to}
                  onChange={(e) =>
                    setBackfillDateRange((prev) => ({ ...prev, to: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label>Days to Add for Follow-Up</Label>
              <Select value={backfillDays} onValueChange={setBackfillDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="10">10 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="15">15 days</SelectItem>
                  <SelectItem value="21">21 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="45">45 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={previewBackfill}
              disabled={backfillLoading}
              className="w-full"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", backfillLoading && "animate-spin")} />
              Preview Changes
            </Button>

            {backfillPreview && (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Invoices to Update:</span>
                  <Badge variant="secondary" className="text-lg">{backfillPreview.count}</Badge>
                </div>
                
                {backfillPreview.invoices.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Sample invoices:</p>
                    <div className="max-h-40 overflow-auto space-y-1">
                      {backfillPreview.invoices.map((inv) => (
                        <div key={inv.id} className="text-sm flex justify-between items-center py-1 border-b last:border-0">
                          <span>{inv.patient_name}</span>
                          <span className="text-muted-foreground">
                            {inv.invoice_date} → {formatLocalISODate(addDays(parseISO(inv.invoice_date), parseInt(backfillDays)))}
                          </span>
                        </div>
                      ))}
                    </div>
                    {backfillPreview.count > 10 && (
                      <p className="text-xs text-muted-foreground">
                        ...and {backfillPreview.count - 10} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBackfillDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={executeBackfill}
              disabled={!backfillPreview || backfillPreview.count === 0 || backfillLoading}
            >
              {backfillLoading ? "Processing..." : `Update ${backfillPreview?.count || 0} Invoices`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}