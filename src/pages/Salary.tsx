import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, Plus, Pencil, Trash2, Download, Calculator, 
  Calendar, DollarSign, UserPlus, FileSpreadsheet, FileDown, Loader2,
  TrendingUp, BarChart3, CheckCircle, XCircle, Clock, Sun, CalendarDays, RefreshCcw, ChevronLeft, ChevronRight, Wallet, LockKeyhole, HardDrive, RotateCcw
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSalaryStore, Employee, SalaryRecord, AttendanceStatus, getSundaysInMonth, getBaseWorkingDays, getCalendarDaysInMonth } from "@/hooks/useSalaryStore";
import { useAdvancesFromDayReports } from "@/hooks/useAdvancesFromDayReports";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import { SalarySlipDocument } from "@/components/forms/SalarySlipDocument";
import { SalaryPasswordGate } from "@/components/SalaryPasswordGate";
import { useSalaryAccess } from "@/hooks/useSalaryAccess";
// Backup now handled via Supabase - useSalaryBackup removed
import { toast } from "sonner";
import { format, startOfMonth, subMonths, addMonths, getDaysInMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, parseISO, isSameDay } from "date-fns";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { createRoot } from "react-dom/client";
import { AppSettingsProvider } from "@/hooks/usePerformanceMode";
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from "recharts";

const SalaryContent = () => {
  const { 
    employees, 
    salaryRecords,
    attendanceRecords,
    loading,
    initialized,
    fetchAll,
    addEmployee, 
    updateEmployee, 
    deleteEmployee,
    addSalaryRecord,
    updateSalaryRecord,
    deleteSalaryRecord,
    calculateSalary,
    markAttendance,
    getAttendanceByMonth,
    getEmployeeAttendanceByMonth,
    calculateWorkingDaysFromAttendance,
    bulkMarkAttendance
  } = useSalaryStore();

  const { revokeAccess } = useSalaryAccess();

  // Fetch data from Supabase on mount
  useEffect(() => {
    if (!initialized) {
      fetchAll();
    }
  }, [initialized, fetchAll]);

  // Auto-lock when navigating away from the Salary page
  useEffect(() => {
    return () => {
      revokeAccess();
    };
  }, [revokeAccess]);

  const { 
    monthlySummary: advancesSummary, 
    fetchAdvancesForMonth, 
    getEmployeeTotalAdvances,
    loading: advancesLoading 
  } = useAdvancesFromDayReports();

  const [activeTab, setActiveTab] = useState("salary");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [attendanceMonth, setAttendanceMonth] = useState(new Date());
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [generatingSlipId, setGeneratingSlipId] = useState<string | null>(null);

  // Fetch advances when month changes
  useEffect(() => {
    const monthDate = new Date(selectedMonth + "-01");
    fetchAdvancesForMonth(monthDate);
  }, [selectedMonth, fetchAdvancesForMonth]);

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
    const sundaysInMonth = getSundaysInMonth(selectedMonth);
    const calendarDays = getCalendarDaysInMonth(selectedMonth); // Actual days: 31 for Jan, 28/29 for Feb
    const baseWorkingDays = getBaseWorkingDays(selectedMonth); // calendar days - sundays (e.g., 27 for Jan with 4 Sundays)
    
    return employees.map((employee, index) => {
      const record = monthRecords.find(r => r.employeeId === employee.id);
      
      // Get attendance-based working days
      const attendanceWorkingDays = calculateWorkingDaysFromAttendance(employee.id, selectedMonth);
      
      // Use record working days if set, otherwise attendance-based, otherwise base working days
      // Working days now represents actual days worked including any Sundays
      const workingDays = record?.workingDays ?? (attendanceWorkingDays > 0 ? attendanceWorkingDays : baseWorkingDays);
      
      const advanceAdjusted = record?.advanceAdjusted ?? 0;
      const advancePending = record?.advancePending ?? 0;
      
      // NEW SALARY CALCULATION:
      // Base = calendar days of month (31 for Jan, 28 for Feb, etc.)
      // Per day rate = Fixed Salary / calendar days
      // If workingDays <= baseWorkingDays, count as proportional of calendar days
      // If workingDays > baseWorkingDays, extra days (Sundays worked) count as bonus days
      const perDayRate = employee.salaryFixed / calendarDays;
      
      // Calculate effective days for salary:
      // If workingDays <= baseWorkingDays: scale up to calendar days equivalent
      // If workingDays > baseWorkingDays: calendar days + extra Sunday days
      let effectiveDaysForSalary: number;
      if (workingDays <= baseWorkingDays) {
        // Proportional: (workingDays / baseWorkingDays) * calendarDays
        effectiveDaysForSalary = (workingDays / baseWorkingDays) * calendarDays;
      } else {
        // Full calendar days + extra Sundays worked
        const sundaysWorked = workingDays - baseWorkingDays;
        effectiveDaysForSalary = calendarDays + sundaysWorked;
      }
      
      const salaryPayable = Math.round((perDayRate * effectiveDaysForSalary) - advanceAdjusted);
      
      return {
        sNo: index + 1,
        employee,
        record,
        workingDays,
        attendanceWorkingDays,
        baseWorkingDays,
        calendarDays,
        sundaysInMonth,
        effectiveDaysForSalary: Math.round(effectiveDaysForSalary * 10) / 10,
        advanceAdjusted,
        advancePending,
        salaryPayable,
      };
    });
  }, [employees, salaryRecords, selectedMonth, attendanceRecords, calculateWorkingDaysFromAttendance]);

  // Calculate totals - use attendance-based working days if available
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

  // Calculate monthly attendance summary
  const monthlyAttendanceSummary = useMemo(() => {
    const monthRecords = getAttendanceByMonth(format(attendanceMonth, "yyyy-MM"));
    
    return employees.map((employee) => {
      const empRecords = monthRecords.filter((r) => r.employeeId === employee.id);
      const present = empRecords.filter((r) => r.status === "present").length;
      const halfDay = empRecords.filter((r) => r.status === "half-day").length;
      const absent = empRecords.filter((r) => r.status === "absent").length;
      const leave = empRecords.filter((r) => r.status === "leave").length;
      const holiday = empRecords.filter((r) => r.status === "holiday").length;
      const workingDays = present + halfDay * 0.5;

      return {
        employee,
        present,
        halfDay,
        absent,
        leave,
        holiday,
        workingDays,
        totalMarked: empRecords.length,
      };
    });
  }, [employees, attendanceRecords, attendanceMonth]);

  // Generate calendar days for attendance view
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(attendanceMonth), { weekStartsOn: 0 });
    const end = endOfWeek(new Date(attendanceMonth.getFullYear(), attendanceMonth.getMonth() + 1, 0), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [attendanceMonth]);

  // Calculate history data for charts (last 12 months)
  const historyData = useMemo(() => {
    const months: { month: string; label: string; shortLabel: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      months.push({
        month: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy"),
        shortLabel: format(date, "MMM yy"),
      });
    }

    return months.map(monthData => {
      const monthRecords = salaryRecords.filter(r => r.month === monthData.month);
      const calendarDays = getCalendarDaysInMonth(monthData.month);
      const baseWorkingDays = getBaseWorkingDays(monthData.month);
      
      let totalPayable = 0;
      let totalAdvanceAdjusted = 0;
      let totalAdvancePending = 0;
      let employeeCount = 0;

      employees.forEach(employee => {
        const record = monthRecords.find(r => r.employeeId === employee.id);
        const workingDays = record?.workingDays ?? baseWorkingDays;
        const advanceAdjusted = record?.advanceAdjusted ?? 0;
        const advancePending = record?.advancePending ?? 0;
        
        const perDayRate = employee.salaryFixed / calendarDays;
        
        let effectiveDays: number;
        if (workingDays <= baseWorkingDays) {
          effectiveDays = (workingDays / baseWorkingDays) * calendarDays;
        } else {
          effectiveDays = calendarDays + (workingDays - baseWorkingDays);
        }
        
        const salaryPayable = Math.round((perDayRate * effectiveDays) - advanceAdjusted);
        
        if (record) {
          totalPayable += salaryPayable;
          totalAdvanceAdjusted += advanceAdjusted;
          totalAdvancePending += advancePending;
          employeeCount++;
        }
      });

      return {
        month: monthData.shortLabel,
        fullMonth: monthData.label,
        totalPayable,
        totalAdvanceAdjusted,
        totalAdvancePending,
        employeeCount,
        avgSalary: employeeCount > 0 ? Math.round(totalPayable / employeeCount) : 0,
      };
    });
  }, [employees, salaryRecords]);

  // Employee-wise salary comparison for current vs previous month
  const employeeComparison = useMemo(() => {
    const currentMonth = selectedMonth;
    const previousMonth = format(subMonths(new Date(selectedMonth + "-01"), 1), "yyyy-MM");
    const currentCalendarDays = getCalendarDaysInMonth(currentMonth);
    const currentBaseWorkingDays = getBaseWorkingDays(currentMonth);
    const previousCalendarDays = getCalendarDaysInMonth(previousMonth);
    const previousBaseWorkingDays = getBaseWorkingDays(previousMonth);

    return employees.map(employee => {
      const currentRecord = salaryRecords.find(r => r.employeeId === employee.id && r.month === currentMonth);
      const previousRecord = salaryRecords.find(r => r.employeeId === employee.id && r.month === previousMonth);

      const currentPerDayRate = employee.salaryFixed / currentCalendarDays;
      const previousPerDayRate = employee.salaryFixed / previousCalendarDays;
      
      const currentWorkingDays = currentRecord?.workingDays ?? currentBaseWorkingDays;
      const currentAdvance = currentRecord?.advanceAdjusted ?? 0;
      const currentEffective = currentWorkingDays <= currentBaseWorkingDays 
        ? (currentWorkingDays / currentBaseWorkingDays) * currentCalendarDays 
        : currentCalendarDays + (currentWorkingDays - currentBaseWorkingDays);
      const currentPayable = Math.round((currentPerDayRate * currentEffective) - currentAdvance);

      const previousWorkingDays = previousRecord?.workingDays ?? previousBaseWorkingDays;
      const previousAdvance = previousRecord?.advanceAdjusted ?? 0;
      const previousEffective = previousWorkingDays <= previousBaseWorkingDays
        ? (previousWorkingDays / previousBaseWorkingDays) * previousCalendarDays
        : previousCalendarDays + (previousWorkingDays - previousBaseWorkingDays);
      const previousPayable = Math.round((previousPerDayRate * previousEffective) - previousAdvance);

      const change = currentPayable - previousPayable;
      const changePercent = previousPayable !== 0 ? ((change / previousPayable) * 100).toFixed(1) : 0;

      return {
        name: employee.name.split(' ')[0], // First name only for chart
        fullName: employee.name,
        designation: employee.designation,
        currentMonth: currentPayable,
        previousMonth: previousPayable,
        change,
        changePercent,
      };
    });
  }, [employees, salaryRecords, selectedMonth]);

  // Designation-wise breakdown
  const designationBreakdown = useMemo(() => {
    const breakdown: { [key: string]: { count: number; totalSalary: number } } = {};
    
    monthlySalaryData.forEach(item => {
      const designation = item.employee.designation;
      if (!breakdown[designation]) {
        breakdown[designation] = { count: 0, totalSalary: 0 };
      }
      breakdown[designation].count++;
      breakdown[designation].totalSalary += item.salaryPayable;
    });

    return Object.entries(breakdown).map(([name, data]) => ({
      name,
      count: data.count,
      totalSalary: data.totalSalary,
      avgSalary: Math.round(data.totalSalary / data.count),
    }));
  }, [monthlySalaryData]);

  const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042', '#0088FE'];

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
      
      const baseWorkingDays = getBaseWorkingDays(selectedMonth);
      const perDayRate = employee.salaryFixed / 30;
      const workingDays = field === 'workingDays' ? value : baseWorkingDays;
      const advanceAdjusted = field === 'advanceAdjusted' ? value : 0;
      const advancePending = field === 'advancePending' ? value : 0;
      
      // Calculate effective days
      let effectiveDays: number;
      if (workingDays <= baseWorkingDays) {
        effectiveDays = (workingDays / baseWorkingDays) * 30;
      } else {
        effectiveDays = 30 + (workingDays - baseWorkingDays);
      }
      
      addSalaryRecord({
        employeeId,
        month: selectedMonth,
        workingDays,
        advanceAdjusted,
        advancePending,
        salaryPayable: Math.round((perDayRate * effectiveDays) - advanceAdjusted),
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
    if (confirm("Are you sure you want to delete this employee? All salary and attendance records will also be deleted.")) {
      deleteEmployee(id);
      toast.success("Employee deleted successfully");
    }
  };

  // Handle attendance marking
  const handleMarkAttendance = (employeeId: string, date: string, status: AttendanceStatus) => {
    markAttendance(employeeId, date, status);
  };

  // Get attendance status for employee on a date
  const getAttendanceStatus = (employeeId: string, date: string): AttendanceStatus | null => {
    const record = attendanceRecords.find(
      (r) => r.employeeId === employeeId && r.date === date
    );
    return record?.status || null;
  };

  // Sync attendance to salary
  const syncAttendanceToSalary = () => {
    const month = format(attendanceMonth, "yyyy-MM");
    employees.forEach((employee) => {
      const workingDays = calculateWorkingDaysFromAttendance(employee.id, month);
      handleSalaryUpdate(employee.id, "workingDays", workingDays);
    });
    toast.success("Working days synced from attendance records");
  };

  // Bulk mark attendance for a date
  const handleBulkMark = (date: string, status: AttendanceStatus) => {
    employees.forEach((employee) => {
      markAttendance(employee.id, date, status);
    });
    toast.success(`Marked all employees as ${status} for ${format(parseISO(date), "dd MMM yyyy")}`);
  };

  // Copy attendance from last month to current month
  const copyFromLastMonth = () => {
    const currentMonthStr = format(attendanceMonth, "yyyy-MM");
    const lastMonth = subMonths(attendanceMonth, 1);
    const lastMonthStr = format(lastMonth, "yyyy-MM");
    const daysInCurrentMonth = getDaysInMonth(attendanceMonth);
    const daysInLastMonth = getDaysInMonth(lastMonth);
    
    let copiedCount = 0;
    
    employees.forEach((employee) => {
      // Get all attendance records from last month for this employee
      const lastMonthRecords = attendanceRecords.filter(
        (r) => r.employeeId === employee.id && r.date.startsWith(lastMonthStr)
      );
      
      // For each day in current month, check if there's a corresponding day in last month
      for (let day = 1; day <= daysInCurrentMonth; day++) {
        // Only copy if the day existed in last month
        if (day <= daysInLastMonth) {
          const lastMonthDate = format(new Date(lastMonth.getFullYear(), lastMonth.getMonth(), day), "yyyy-MM-dd");
          const currentMonthDate = format(new Date(attendanceMonth.getFullYear(), attendanceMonth.getMonth(), day), "yyyy-MM-dd");
          
          // Find the record from last month for this day
          const lastMonthRecord = lastMonthRecords.find((r) => r.date === lastMonthDate);
          
          if (lastMonthRecord) {
            markAttendance(employee.id, currentMonthDate, lastMonthRecord.status);
            copiedCount++;
          }
        }
      }
    });
    
    if (copiedCount > 0) {
      toast.success(`Copied ${copiedCount} attendance records from ${format(lastMonth, "MMMM yyyy")}`);
    } else {
      toast.info(`No attendance records found in ${format(lastMonth, "MMMM yyyy")} to copy`);
    }
  };

  // Attendance status config
  const attendanceStatusConfig: Record<AttendanceStatus, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
    present: { icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30", label: "P" },
    absent: { icon: XCircle, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30", label: "A" },
    "half-day": { icon: Clock, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30", label: "H" },
    leave: { icon: Calendar, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30", label: "L" },
    holiday: { icon: Sun, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30", label: "Ho" },
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

  // Backup all salary data to JSON
  const backupToJSON = () => {
    const backupData = {
      exportDate: new Date().toISOString(),
      version: 1,
      employees,
      salaryRecords,
      attendanceRecords,
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `salary-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Backup exported successfully");
  };

  // Export attendance to Excel
  const exportAttendanceToExcel = () => {
    const monthStr = format(attendanceMonth, "yyyy-MM");
    const monthLabel = format(attendanceMonth, "MMMM yyyy");
    const daysInMonth = getDaysInMonth(attendanceMonth);
    
    const workbook = XLSX.utils.book_new();
    
    // Sheet 1: Monthly Summary
    const summaryData = monthlyAttendanceSummary.map((item, index) => ({
      "S.No": index + 1,
      "Employee Name": item.employee.name,
      "Designation": item.employee.designation,
      "Present Days": item.present,
      "Absent Days": item.absent,
      "Half Days": item.halfDay,
      "Leaves": item.leave,
      "Holidays": item.holiday,
      "Total Working Days": item.workingDays,
      "Attendance %": daysInMonth > 0 ? `${((item.workingDays / daysInMonth) * 100).toFixed(1)}%` : "0%",
    }));
    
    // Add totals row
    const totalPresent = monthlyAttendanceSummary.reduce((sum, i) => sum + i.present, 0);
    const totalAbsent = monthlyAttendanceSummary.reduce((sum, i) => sum + i.absent, 0);
    const totalHalfDay = monthlyAttendanceSummary.reduce((sum, i) => sum + i.halfDay, 0);
    const totalLeave = monthlyAttendanceSummary.reduce((sum, i) => sum + i.leave, 0);
    const totalHoliday = monthlyAttendanceSummary.reduce((sum, i) => sum + i.holiday, 0);
    const totalWorkingDays = monthlyAttendanceSummary.reduce((sum, i) => sum + i.workingDays, 0);
    
    summaryData.push({
      "S.No": "" as any,
      "Employee Name": "TOTAL",
      "Designation": "",
      "Present Days": totalPresent,
      "Absent Days": totalAbsent,
      "Half Days": totalHalfDay,
      "Leaves": totalLeave,
      "Holidays": totalHoliday,
      "Total Working Days": totalWorkingDays,
      "Attendance %": "",
    });
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet['!cols'] = [
      { wch: 6 },  // S.No
      { wch: 25 }, // Employee Name
      { wch: 20 }, // Designation
      { wch: 12 }, // Present
      { wch: 12 }, // Absent
      { wch: 10 }, // Half Days
      { wch: 10 }, // Leaves
      { wch: 10 }, // Holidays
      { wch: 18 }, // Total Working Days
      { wch: 14 }, // Attendance %
    ];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Monthly Summary");
    
    // Sheet 2: Daily Records
    const dailyData: any[][] = [
      [`Attendance Report - ${monthLabel}`],
      [],
    ];
    
    // Header row with dates
    const headerRow = ["S.No", "Employee Name", "Designation"];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(attendanceMonth.getFullYear(), attendanceMonth.getMonth(), day);
      headerRow.push(format(date, "d"));
    }
    headerRow.push("Working Days");
    dailyData.push(headerRow);
    
    // Day names row
    const dayNamesRow = ["", "", ""];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(attendanceMonth.getFullYear(), attendanceMonth.getMonth(), day);
      dayNamesRow.push(format(date, "EEE").charAt(0));
    }
    dayNamesRow.push("");
    dailyData.push(dayNamesRow);
    
    // Employee rows
    employees.forEach((employee, index) => {
      const row: any[] = [index + 1, employee.name, employee.designation];
      let workingDays = 0;
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = format(new Date(attendanceMonth.getFullYear(), attendanceMonth.getMonth(), day), "yyyy-MM-dd");
        const record = attendanceRecords.find(r => r.employeeId === employee.id && r.date === dateStr);
        
        if (record) {
          const statusLabel = attendanceStatusConfig[record.status].label;
          row.push(statusLabel);
          if (record.status === "present") workingDays += 1;
          else if (record.status === "half-day") workingDays += 0.5;
        } else {
          row.push("-");
        }
      }
      row.push(workingDays);
      dailyData.push(row);
    });
    
    const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
    
    // Set column widths
    const colWidths = [{ wch: 6 }, { wch: 25 }, { wch: 20 }];
    for (let i = 0; i < daysInMonth; i++) {
      colWidths.push({ wch: 4 });
    }
    colWidths.push({ wch: 14 });
    dailySheet['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, dailySheet, "Daily Records");
    
    XLSX.writeFile(workbook, `Attendance-Report-${format(attendanceMonth, "MMMM-yyyy")}.xlsx`);
    toast.success("Attendance report exported successfully");
  };

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
              effectiveDaysForSalary={salaryData.effectiveDaysForSalary}
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

  // Show loading state while fetching from Supabase
  if (loading && !initialized) {
    return (
      <div className="relative p-4 sm:p-6 min-h-screen flex items-center justify-center">
        <FloatingOrbs />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading salary data...</p>
        </div>
      </div>
    );
  }

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
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={backupToJSON} variant="outline" className="gap-2">
                  <HardDrive className="w-4 h-4" />
                  Backup
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export all salary data as JSON backup</TooltipContent>
            </Tooltip>

            
            <Button 
              onClick={revokeAccess} 
              variant="outline" 
              className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <LockKeyhole className="w-4 h-4" />
              Lock
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
          <TabsList className="bg-card/50 backdrop-blur-sm flex-wrap">
            <TabsTrigger value="salary" className="gap-2">
              <Calculator className="w-4 h-4" />
              Salary Calculation
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="employees" className="gap-2">
              <Users className="w-4 h-4" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              History & Analytics
            </TabsTrigger>
          </TabsList>

          {/* Salary Calculation Tab */}
          <TabsContent value="salary" className="mt-4">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                  <span>Monthly Salary Sheet - {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}</span>
                  <div className="flex items-center gap-2">
                    {advancesSummary.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="gap-2"
                            disabled={advancesLoading}
                            onClick={() => {
                              let synced = 0;
                              advancesSummary.forEach((summary) => {
                                const currentRecord = salaryRecords.find(
                                  r => r.employeeId === summary.employeeId && r.month === selectedMonth
                                );
                                handleSalaryUpdate(summary.employeeId, 'advanceAdjusted', summary.totalAdvances);
                                synced++;
                              });
                              toast.success(`Synced advances for ${synced} employee(s) from Day Reports`);
                            }}
                          >
                            <Wallet className="w-4 h-4" />
                            Sync Advances (₹{advancesSummary.reduce((s, a) => s + a.totalAdvances, 0).toLocaleString('en-IN')})
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Sync advances recorded in Day Reports to salary sheet</TooltipContent>
                      </Tooltip>
                    )}
                    {employees.length === 0 && (
                      <Button size="sm" onClick={() => setActiveTab("employees")} className="gap-2">
                        <UserPlus className="w-4 h-4" />
                        Add Employees First
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-w-full">
                  <Table className="relative">
                    <TableHeader>
                      <TableRow className="bg-green-100 dark:bg-green-900/30">
                        <TableHead className="font-bold text-foreground w-14 sticky left-0 z-20 bg-green-100 dark:bg-green-900/80">S.No</TableHead>
                        <TableHead className="font-bold text-foreground min-w-[180px] sticky left-14 z-20 bg-green-100 dark:bg-green-900/80 border-r border-border/50">Name of Employee</TableHead>
                        <TableHead className="font-bold text-foreground min-w-[120px]">Designation</TableHead>
                        <TableHead className="font-bold text-foreground text-right bg-yellow-100 dark:bg-yellow-900/30">Salary (Fixed)</TableHead>
                        <TableHead className="font-bold text-foreground text-center">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help underline decoration-dotted">
                              Working Days ({monthlySalaryData[0]?.baseWorkingDays || getBaseWorkingDays(selectedMonth)} base)
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-left">
                              <p className="font-medium mb-1">30-Day Salary Calculation:</p>
                              <ul className="text-xs space-y-1">
                                <li>• Base = 30 days − Sundays in month</li>
                                <li>• Full month worked = 30 days salary</li>
                                <li>• Extra Sundays worked = bonus days</li>
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
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
                              <TableCell className="sticky left-0 z-10 bg-background">{item.sNo}</TableCell>
                              <TableCell className="font-medium sticky left-14 z-10 bg-background border-r border-border/50">{item.employee.name}</TableCell>
                              <TableCell>{item.employee.designation}</TableCell>
                              <TableCell className="text-right bg-yellow-50 dark:bg-yellow-900/10">
                                ₹{item.employee.salaryFixed.toLocaleString('en-IN')}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col items-center gap-1">
                                  <Input
                                    type="number"
                                    value={item.workingDays}
                                    onChange={(e) => handleSalaryUpdate(item.employee.id, 'workingDays', Number(e.target.value))}
                                    className="w-20 text-center mx-auto"
                                    min={0}
                                    max={35}
                                    step={0.5}
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    = {item.effectiveDaysForSalary} eff
                                  </span>
                                </div>
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
                            <TableCell className="sticky left-0 z-10 bg-muted/80"></TableCell>
                            <TableCell className="sticky left-14 z-10 bg-muted/80 border-r border-border/50 text-right" colSpan={1}>TOTAL</TableCell>
                            <TableCell></TableCell>
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

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="mt-4 space-y-4">
            {/* Attendance Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setAttendanceMonth(subMonths(attendanceMonth, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h3 className="text-lg font-semibold min-w-[160px] text-center">
                  {format(attendanceMonth, "MMMM yyyy")}
                </h3>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setAttendanceMonth(addMonths(attendanceMonth, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={copyFromLastMonth} variant="outline" className="gap-2">
                      <CalendarDays className="w-4 h-4" />
                      Copy from Last Month
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Copy attendance pattern from {format(subMonths(attendanceMonth, 1), "MMMM yyyy")}
                  </TooltipContent>
                </Tooltip>
                <Button onClick={exportAttendanceToExcel} variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
                <Button onClick={syncAttendanceToSalary} className="gap-2">
                  <RefreshCcw className="w-4 h-4" />
                  Sync to Salary
                </Button>
              </div>
            </div>

            {/* Attendance Legend */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(attendanceStatusConfig).map(([status, config]) => (
                <Badge key={status} variant="outline" className={`${config.bgColor} ${config.color} gap-1`}>
                  <config.icon className="w-3 h-3" />
                  {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
                </Badge>
              ))}
            </div>

            {/* Attendance Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {monthlyAttendanceSummary.slice(0, 6).map((item) => (
                <Card key={item.employee.id} className="glass-card">
                  <CardContent className="p-3">
                    <p className="text-sm font-medium truncate">{item.employee.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-green-600">P: {item.present}</span>
                      <span className="text-xs text-amber-600">H: {item.halfDay}</span>
                      <span className="text-xs text-red-600">A: {item.absent}</span>
                    </div>
                    <p className="text-sm font-bold text-primary mt-1">{item.workingDays} days</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Calendar Grid */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-base">Daily Attendance</span>
                  <p className="text-xs text-muted-foreground font-normal">Click column headers for bulk marking</p>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-w-full">
                  <Table className="relative">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 z-20 bg-card min-w-[140px] border-r border-border/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Employee</TableHead>
                        {calendarDays.filter(day => isSameMonth(day, attendanceMonth)).map((day) => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          return (
                            <TableHead 
                              key={day.toISOString()} 
                              className={`text-center p-1 min-w-[40px] ${isToday(day) ? "bg-primary/20" : ""} cursor-pointer hover:bg-muted/50 group`}
                            >
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] text-muted-foreground">{format(day, "EEE")}</span>
                                <span className="text-xs font-bold">{format(day, "d")}</span>
                                {/* Bulk action dropdown on hover */}
                                <div className="flex flex-wrap gap-0.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity justify-center">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-4 w-4 p-0 text-green-600 hover:bg-green-100"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleBulkMark(dateStr, "present");
                                        }}
                                      >
                                        <CheckCircle className="w-3 h-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Mark all Present</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-4 w-4 p-0 text-red-600 hover:bg-red-100"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleBulkMark(dateStr, "absent");
                                        }}
                                      >
                                        <XCircle className="w-3 h-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Mark all Absent</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-4 w-4 p-0 text-blue-600 hover:bg-blue-100"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleBulkMark(dateStr, "leave");
                                        }}
                                      >
                                        <Calendar className="w-3 h-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Mark all Leave</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-4 w-4 p-0 text-purple-600 hover:bg-purple-100"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleBulkMark(dateStr, "holiday");
                                        }}
                                      >
                                        <Sun className="w-3 h-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Mark all Holiday</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            </TableHead>
                          );
                        })}
                        <TableHead className="text-center bg-green-100 dark:bg-green-900/30">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={getDaysInMonth(attendanceMonth) + 2} className="text-center py-8 text-muted-foreground">
                            No employees found. Add employees first.
                          </TableCell>
                        </TableRow>
                      ) : (
                        employees.map((employee) => {
                          const summary = monthlyAttendanceSummary.find(s => s.employee.id === employee.id);
                          return (
                            <TableRow key={employee.id}>
                              <TableCell className="sticky left-0 z-10 bg-card font-medium text-sm border-r border-border/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                {employee.name}
                              </TableCell>
                              {calendarDays.filter(day => isSameMonth(day, attendanceMonth)).map((day) => {
                                const dateStr = format(day, "yyyy-MM-dd");
                                const status = getAttendanceStatus(employee.id, dateStr);
                                const config = status ? attendanceStatusConfig[status] : null;

                                return (
                                  <TableCell 
                                    key={day.toISOString()} 
                                    className={`p-0.5 text-center ${isToday(day) ? "bg-primary/10" : ""}`}
                                  >
                                    <Select
                                      value={status || ""}
                                      onValueChange={(value) => handleMarkAttendance(employee.id, dateStr, value as AttendanceStatus)}
                                    >
                                      <SelectTrigger 
                                        className={`w-9 h-8 p-0 text-xs font-bold border-0 ${config ? config.bgColor : "bg-muted/50"} ${config ? config.color : "text-muted-foreground"}`}
                                      >
                                        <SelectValue placeholder="-">
                                          {config?.label || "-"}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="present">
                                          <div className="flex items-center gap-2">
                                            <CheckCircle className="w-3 h-3 text-green-600" />
                                            Present
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="absent">
                                          <div className="flex items-center gap-2">
                                            <XCircle className="w-3 h-3 text-red-600" />
                                            Absent
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="half-day">
                                          <div className="flex items-center gap-2">
                                            <Clock className="w-3 h-3 text-amber-600" />
                                            Half Day
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="leave">
                                          <div className="flex items-center gap-2">
                                            <Calendar className="w-3 h-3 text-blue-600" />
                                            Leave
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="holiday">
                                          <div className="flex items-center gap-2">
                                            <Sun className="w-3 h-3 text-purple-600" />
                                            Holiday
                                          </div>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-center font-bold text-primary bg-green-50 dark:bg-green-900/10">
                                {summary?.workingDays || 0}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Attendance Summary Table */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Monthly Summary - {format(attendanceMonth, "MMMM yyyy")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead className="text-center text-green-600">Present</TableHead>
                        <TableHead className="text-center text-amber-600">Half Day</TableHead>
                        <TableHead className="text-center text-red-600">Absent</TableHead>
                        <TableHead className="text-center text-blue-600">Leave</TableHead>
                        <TableHead className="text-center text-purple-600">Holiday</TableHead>
                        <TableHead className="text-center font-bold">Working Days</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyAttendanceSummary.map((item) => (
                        <TableRow key={item.employee.id}>
                          <TableCell className="font-medium">{item.employee.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.employee.designation}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30">{item.present}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30">{item.halfDay}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30">{item.absent}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30">{item.leave}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30">{item.holiday}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-bold text-primary text-lg">
                            {item.workingDays}
                          </TableCell>
                        </TableRow>
                      ))}
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

          {/* History & Analytics Tab */}
          <TabsContent value="history" className="mt-4 space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">12-Month Total Payout</p>
                      <p className="text-2xl font-bold text-primary">
                        ₹{historyData.reduce((sum, m) => sum + m.totalPayable, 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-primary/60" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">12-Month Avg. Payout</p>
                      <p className="text-2xl font-bold">
                        ₹{Math.round(historyData.reduce((sum, m) => sum + m.totalPayable, 0) / 12).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-blue-500/60" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Advances (12M)</p>
                      <p className="text-2xl font-bold text-amber-600">
                        ₹{historyData.reduce((sum, m) => sum + m.totalAdvanceAdjusted, 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-amber-500/60" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trend Chart */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Monthly Salary Trend (Last 12 Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData}>
                      <defs>
                        <linearGradient id="colorPayable" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorAdvance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ffc658" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`} />
                      <RechartsTooltip 
                        formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']}
                        labelFormatter={(label) => historyData.find(d => d.month === label)?.fullMonth || label}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="totalPayable" 
                        name="Total Payable" 
                        stroke="#8884d8" 
                        fillOpacity={1} 
                        fill="url(#colorPayable)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="totalAdvanceAdjusted" 
                        name="Advances Adjusted" 
                        stroke="#ffc658" 
                        fillOpacity={1} 
                        fill="url(#colorAdvance)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Employee Comparison Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Employee Comparison (Current vs Previous Month)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={employeeComparison} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                        <RechartsTooltip 
                          formatter={(value: number, name: string) => [
                            `₹${value.toLocaleString('en-IN')}`, 
                            name === 'currentMonth' ? 'Current Month' : 'Previous Month'
                          ]}
                          labelFormatter={(label) => employeeComparison.find(e => e.name === label)?.fullName || label}
                        />
                        <Legend />
                        <Bar dataKey="currentMonth" name="Current Month" fill="#8884d8" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="previousMonth" name="Previous Month" fill="#82ca9d" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Designation Breakdown Pie Chart */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Salary by Designation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={designationBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="totalSalary"
                          nameKey="name"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {designationBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          formatter={(value: number, name: string, props: any) => [
                            `₹${value.toLocaleString('en-IN')} (${props.payload.count} employees)`,
                            props.payload.name
                          ]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly History Table */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Monthly History Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Total Payable</TableHead>
                        <TableHead className="text-right">Advances Adjusted</TableHead>
                        <TableHead className="text-right">Advances Pending</TableHead>
                        <TableHead className="text-center">Employees</TableHead>
                        <TableHead className="text-right">Avg. Salary</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.map((month, index) => (
                        <TableRow key={month.month} className={index === historyData.length - 1 ? "bg-primary/5" : ""}>
                          <TableCell className="font-medium">{month.fullMonth}</TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            ₹{month.totalPayable.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right">
                            ₹{month.totalAdvanceAdjusted.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right text-amber-600">
                            ₹{month.totalAdvancePending.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{month.employeeCount}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            ₹{month.avgSalary.toLocaleString('en-IN')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Employee Change Summary */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Month-over-Month Change
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead className="text-right">Previous Month</TableHead>
                        <TableHead className="text-right">Current Month</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeComparison.map((emp) => (
                        <TableRow key={emp.fullName}>
                          <TableCell className="font-medium">{emp.fullName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{emp.designation}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            ₹{emp.previousMonth.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            ₹{emp.currentMonth.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={emp.change > 0 ? "text-green-600" : emp.change < 0 ? "text-red-600" : ""}>
                              {emp.change > 0 ? "+" : ""}₹{emp.change.toLocaleString('en-IN')}
                              {emp.changePercent !== 0 && ` (${emp.changePercent}%)`}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
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

// Wrapper component with password protection
const Salary = () => {
  return (
    <SalaryPasswordGate>
      <SalaryContent />
    </SalaryPasswordGate>
  );
};

export default Salary;
