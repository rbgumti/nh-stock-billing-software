import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, Plus, Pencil, Trash2, Download, Calculator, 
  Calendar, DollarSign, UserPlus, FileSpreadsheet, FileDown, Loader2 
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSalaryStore, Employee, SalaryRecord } from "@/hooks/useSalaryStore";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import { SalarySlipDocument } from "@/components/forms/SalarySlipDocument";
import { toast } from "sonner";
import { format, startOfMonth, subMonths, addMonths } from "date-fns";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { createRoot } from "react-dom/client";
import { AppSettingsProvider } from "@/hooks/usePerformanceMode";

const Salary = () => {
  const { 
    employees, 
    salaryRecords, 
    addEmployee, 
    updateEmployee, 
    deleteEmployee,
    addSalaryRecord,
    updateSalaryRecord,
    deleteSalaryRecord,
    calculateSalary 
  } = useSalaryStore();

  const [activeTab, setActiveTab] = useState("salary");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [generatingSlipId, setGeneratingSlipId] = useState<string | null>(null);
  const [editingSalaryRecord, setEditingSalaryRecord] = useState<SalaryRecord | null>(null);

  // Employee form state
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    designation: "",
    salaryFixed: 0,
  });

  // Salary record form state
  const [salaryForm, setSalaryForm] = useState({
    employeeId: "",
    workingDays: 31,
    advanceAdjusted: 0,
    advancePending: 0,
  });

  // Get months for dropdown (last 12 months + next 2)
  const availableMonths = useMemo(() => {
    const months = [];
    for (let i = -12; i <= 2; i++) {
      const date = i < 0 
        ? subMonths(new Date(), Math.abs(i)) 
        : addMonths(new Date(), i);
      months.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy"),
      });
    }
    return months.reverse();
  }, []);

  // Get salary data for selected month with employee details
  const monthlySalaryData = useMemo(() => {
    const monthRecords = salaryRecords.filter(r => r.month === selectedMonth);
    
    return employees.map((employee, index) => {
      const record = monthRecords.find(r => r.employeeId === employee.id);
      const workingDays = record?.workingDays ?? 31;
      const advanceAdjusted = record?.advanceAdjusted ?? 0;
      const advancePending = record?.advancePending ?? 0;
      
      // Calculate salary payable
      const perDayRate = employee.salaryFixed / 31;
      const salaryPayable = Math.round((perDayRate * workingDays) - advanceAdjusted);
      
      return {
        sNo: index + 1,
        employee,
        record,
        workingDays,
        advanceAdjusted,
        advancePending,
        salaryPayable,
      };
    });
  }, [employees, salaryRecords, selectedMonth]);

  // Calculate totals
  const totals = useMemo(() => {
    return monthlySalaryData.reduce(
      (acc, item) => ({
        salaryFixed: acc.salaryFixed + item.employee.salaryFixed,
        advanceAdjusted: acc.advanceAdjusted + item.advanceAdjusted,
        advancePending: acc.advancePending + item.advancePending,
        salaryPayable: acc.salaryPayable + item.salaryPayable,
      }),
      { salaryFixed: 0, advanceAdjusted: 0, advancePending: 0, salaryPayable: 0 }
    );
  }, [monthlySalaryData]);

  // Handle employee form submission
  const handleEmployeeSubmit = () => {
    if (!employeeForm.name || !employeeForm.designation || employeeForm.salaryFixed <= 0) {
      toast.error("Please fill all required fields");
      return;
    }

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, employeeForm);
      toast.success("Employee updated successfully");
    } else {
      addEmployee(employeeForm);
      toast.success("Employee added successfully");
    }

    setIsEmployeeDialogOpen(false);
    setEditingEmployee(null);
    setEmployeeForm({ name: "", designation: "", salaryFixed: 0 });
  };

  // Handle salary record update
  const handleSalaryUpdate = (employeeId: string, field: string, value: number) => {
    const existingRecord = salaryRecords.find(
      r => r.employeeId === employeeId && r.month === selectedMonth
    );

    if (existingRecord) {
      updateSalaryRecord(existingRecord.id, { [field]: value });
    } else {
      const employee = employees.find(e => e.id === employeeId);
      if (!employee) return;
      
      const perDayRate = employee.salaryFixed / 31;
      const workingDays = field === 'workingDays' ? value : 31;
      const advanceAdjusted = field === 'advanceAdjusted' ? value : 0;
      const advancePending = field === 'advancePending' ? value : 0;
      
      addSalaryRecord({
        employeeId,
        month: selectedMonth,
        workingDays,
        advanceAdjusted,
        advancePending,
        salaryPayable: Math.round((perDayRate * workingDays) - advanceAdjusted),
      });
    }
  };

  // Edit employee
  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      name: employee.name,
      designation: employee.designation,
      salaryFixed: employee.salaryFixed,
    });
    setIsEmployeeDialogOpen(true);
  };

  // Delete employee
  const handleDeleteEmployee = (id: string) => {
    if (confirm("Are you sure you want to delete this employee? All salary records will also be deleted.")) {
      deleteEmployee(id);
      toast.success("Employee deleted successfully");
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const data = monthlySalaryData.map(item => ({
      "S.No": item.sNo,
      "Name of Employee": item.employee.name,
      "Designation": item.employee.designation,
      "Salary (Fixed)": item.employee.salaryFixed,
      "Working Days": item.workingDays,
      "Advance (Adjusted)": item.advanceAdjusted,
      "Advance Pending": item.advancePending,
      "Salary Payable": item.salaryPayable,
    }));

    // Add totals row
    data.push({
      "S.No": "" as any,
      "Name of Employee": "TOTAL",
      "Designation": "",
      "Salary (Fixed)": totals.salaryFixed,
      "Working Days": "" as any,
      "Advance (Adjusted)": totals.advanceAdjusted,
      "Advance Pending": totals.advancePending,
      "Salary Payable": totals.salaryPayable,
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Salary Report");
    
    const monthLabel = format(new Date(selectedMonth + "-01"), "MMMM-yyyy");
    XLSX.writeFile(wb, `Salary-Report-${monthLabel}.xlsx`);
    toast.success("Salary report exported successfully");
  };

  // Generate salary slip PDF for individual employee
  const generateSalarySlip = async (employeeId: string) => {
    const salaryData = monthlySalaryData.find(item => item.employee.id === employeeId);
    if (!salaryData) {
      toast.error("Employee data not found");
      return;
    }

    setGeneratingSlipId(employeeId);

    try {
      const monthLabel = format(new Date(selectedMonth + "-01"), "MMMM yyyy");
      
      // Create a temporary container
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      document.body.appendChild(container);

      // Render the salary slip component
      const root = createRoot(container);
      
      await new Promise<void>((resolve) => {
        root.render(
          <AppSettingsProvider>
            <SalarySlipDocument
              employee={salaryData.employee}
              month={selectedMonth}
              monthLabel={monthLabel}
              workingDays={salaryData.workingDays}
              advanceAdjusted={salaryData.advanceAdjusted}
              advancePending={salaryData.advancePending}
              salaryPayable={salaryData.salaryPayable}
            />
          </AppSettingsProvider>
        );
        setTimeout(resolve, 100);
      });

      // Generate canvas from the rendered component
      const canvas = await html2canvas(container.firstChild as HTMLElement, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // Create PDF
      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Scale to fit width, maintaining aspect ratio
      const scaledWidth = pdfWidth;
      const scaledHeight = (imgHeight * pdfWidth) / imgWidth;

      // If height exceeds page, scale to fit height instead
      const finalWidth = scaledHeight > pdfHeight ? (imgWidth * pdfHeight) / imgHeight : scaledWidth;
      const finalHeight = scaledHeight > pdfHeight ? pdfHeight : scaledHeight;

      // Center horizontally
      const imgX = (pdfWidth - finalWidth) / 2;
      const imgY = 0;

      pdf.addImage(imgData, "PNG", imgX, imgY, finalWidth, finalHeight);

      // Generate filename
      const sanitizedName = salaryData.employee.name.replace(/[^a-zA-Z0-9]/g, '-');
      const monthFile = format(new Date(selectedMonth + "-01"), "MMM-yyyy");
      pdf.save(`Salary-Slip-${sanitizedName}-${monthFile}.pdf`);

      // Cleanup
      root.unmount();
      document.body.removeChild(container);

      toast.success(`Salary slip generated for ${salaryData.employee.name}`);
    } catch (error) {
      console.error("Error generating salary slip:", error);
      toast.error("Failed to generate salary slip");
    } finally {
      setGeneratingSlipId(null);
    }
  };

  return (
    <div className="relative p-4 sm:p-6 min-h-screen">
      <FloatingOrbs />
      
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Salary Management
            </h1>
            <p className="text-muted-foreground">Manage employee salaries and calculations</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48 bg-card/50 backdrop-blur-sm">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map(month => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button onClick={exportToExcel} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Employees</p>
                  <p className="text-2xl font-bold">{employees.length}</p>
                </div>
                <Users className="w-8 h-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Fixed Salary</p>
                  <p className="text-2xl font-bold">₹{totals.salaryFixed.toLocaleString('en-IN')}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500/60" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Advance Adjusted</p>
                  <p className="text-2xl font-bold">₹{totals.advanceAdjusted.toLocaleString('en-IN')}</p>
                </div>
                <Calculator className="w-8 h-8 text-amber-500/60" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Payable</p>
                  <p className="text-2xl font-bold text-primary">₹{totals.salaryPayable.toLocaleString('en-IN')}</p>
                </div>
                <FileSpreadsheet className="w-8 h-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card/50 backdrop-blur-sm">
            <TabsTrigger value="salary" className="gap-2">
              <Calculator className="w-4 h-4" />
              Salary Calculation
            </TabsTrigger>
            <TabsTrigger value="employees" className="gap-2">
              <Users className="w-4 h-4" />
              Employees
            </TabsTrigger>
          </TabsList>

          {/* Salary Calculation Tab */}
          <TabsContent value="salary" className="mt-4">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span>Monthly Salary Sheet - {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}</span>
                  {employees.length === 0 && (
                    <Button size="sm" onClick={() => setActiveTab("employees")} className="gap-2">
                      <UserPlus className="w-4 h-4" />
                      Add Employees First
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-green-100 dark:bg-green-900/30">
                        <TableHead className="font-bold text-foreground w-14">S.No</TableHead>
                        <TableHead className="font-bold text-foreground min-w-[150px]">Name of Employee</TableHead>
                        <TableHead className="font-bold text-foreground min-w-[120px]">Designation</TableHead>
                        <TableHead className="font-bold text-foreground text-right bg-yellow-100 dark:bg-yellow-900/30">Salary (Fixed)</TableHead>
                        <TableHead className="font-bold text-foreground text-center">Working Days</TableHead>
                        <TableHead className="font-bold text-foreground text-right">Advance (Adjusted)</TableHead>
                        <TableHead className="font-bold text-foreground text-right">Advance Pending</TableHead>
                        <TableHead className="font-bold text-foreground text-right bg-green-200 dark:bg-green-800/50">Salary Payable</TableHead>
                        <TableHead className="font-bold text-foreground text-center w-20">Slip</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlySalaryData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No employees found. Add employees first to calculate salaries.
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {monthlySalaryData.map((item) => (
                            <TableRow key={item.employee.id} className="hover:bg-muted/50">
                              <TableCell>{item.sNo}</TableCell>
                              <TableCell className="font-medium">{item.employee.name}</TableCell>
                              <TableCell>{item.employee.designation}</TableCell>
                              <TableCell className="text-right bg-yellow-50 dark:bg-yellow-900/10">
                                ₹{item.employee.salaryFixed.toLocaleString('en-IN')}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={item.workingDays}
                                  onChange={(e) => handleSalaryUpdate(item.employee.id, 'workingDays', Number(e.target.value))}
                                  className="w-20 text-center mx-auto"
                                  min={0}
                                  max={31}
                                  step={0.5}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={item.advanceAdjusted}
                                  onChange={(e) => handleSalaryUpdate(item.employee.id, 'advanceAdjusted', Number(e.target.value))}
                                  className="w-24 text-right"
                                  min={0}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={item.advancePending}
                                  onChange={(e) => handleSalaryUpdate(item.employee.id, 'advancePending', Number(e.target.value))}
                                  className="w-24 text-right"
                                  min={0}
                                />
                              </TableCell>
                              <TableCell className="text-right font-bold bg-green-50 dark:bg-green-900/10 text-primary">
                                ₹{item.salaryPayable.toLocaleString('en-IN')}
                              </TableCell>
                              <TableCell className="text-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => generateSalarySlip(item.employee.id)}
                                      disabled={generatingSlipId === item.employee.id}
                                    >
                                      {generatingSlipId === item.employee.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <FileDown className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Download Salary Slip</TooltipContent>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                          {/* Totals Row */}
                          <TableRow className="bg-muted/50 font-bold border-t-2">
                            <TableCell colSpan={3} className="text-right">TOTAL</TableCell>
                            <TableCell className="text-right bg-yellow-100 dark:bg-yellow-900/30">
                              ₹{totals.salaryFixed.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-right">₹{totals.advanceAdjusted.toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-right">₹{totals.advancePending.toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-right text-primary bg-green-200 dark:bg-green-800/50">
                              ₹{totals.salaryPayable.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="mt-4">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span>Employee Master</span>
                  <Button 
                    onClick={() => {
                      setEditingEmployee(null);
                      setEmployeeForm({ name: "", designation: "", salaryFixed: 0 });
                      setIsEmployeeDialogOpen(true);
                    }}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Employee
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">S.No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead className="text-right">Fixed Salary</TableHead>
                        <TableHead className="text-right">Per Day Rate</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No employees found. Click "Add Employee" to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        employees.map((employee, index) => (
                          <TableRow key={employee.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-medium">{employee.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{employee.designation}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              ₹{employee.salaryFixed.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              ₹{Math.round(employee.salaryFixed / 31).toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleEditEmployee(employee)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteEmployee(employee.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Employee Name *</Label>
              <Input
                id="name"
                placeholder="Enter employee name"
                value={employeeForm.name}
                onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">Designation *</Label>
              <Input
                id="designation"
                placeholder="e.g., Staff Nurse, Ward Attendant, Counselor"
                value={employeeForm.designation}
                onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">Fixed Monthly Salary (₹) *</Label>
              <Input
                id="salary"
                type="number"
                placeholder="Enter fixed salary"
                value={employeeForm.salaryFixed || ""}
                onChange={(e) => setEmployeeForm({ ...employeeForm, salaryFixed: Number(e.target.value) })}
                min={0}
              />
              {employeeForm.salaryFixed > 0 && (
                <p className="text-sm text-muted-foreground">
                  Per day rate: ₹{Math.round(employeeForm.salaryFixed / 31).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmployeeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEmployeeSubmit}>
              {editingEmployee ? "Update" : "Add"} Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Salary;
