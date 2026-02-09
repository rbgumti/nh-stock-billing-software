import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { eachDayOfInterval, endOfMonth, getDay } from 'date-fns';

// Helper function to count Sundays in a given month (YYYY-MM format)
export function getSundaysInMonth(month: string): number {
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = endOfMonth(startDate);
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  return days.filter(day => getDay(day) === 0).length;
}

// Get total calendar days in a month
export function getCalendarDaysInMonth(month: string): number {
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = endOfMonth(startDate);
  return endDate.getDate(); // Returns actual days: 31 for Jan, 28/29 for Feb, etc.
}

// Get base working days for a month (calendar days - Sundays)
export function getBaseWorkingDays(month: string): number {
  const calendarDays = getCalendarDaysInMonth(month);
  const sundaysCount = getSundaysInMonth(month);
  return calendarDays - sundaysCount; // e.g., 31 - 4 = 27 days for Jan
}

export interface Employee {
  id: string;
  name: string;
  designation: string;
  salaryFixed: number;
  createdAt: string;
}

export interface SalaryRecord {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM format
  workingDays: number;
  advanceAdjusted: number;
  advancePending: number;
  salaryPayable: number;
  createdAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'half-day' | 'leave' | 'holiday';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD format
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
}

interface SalaryStore {
  employees: Employee[];
  salaryRecords: SalaryRecord[];
  attendanceRecords: AttendanceRecord[];
  loading: boolean;
  initialized: boolean;
  
  // Data fetching
  fetchAll: () => Promise<void>;
  
  // Employee methods
  addEmployee: (employee: Omit<Employee, 'id' | 'createdAt'>) => Promise<void>;
  updateEmployee: (id: string, employee: Partial<Omit<Employee, 'id' | 'createdAt'>>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  
  // Salary record methods
  addSalaryRecord: (record: Omit<SalaryRecord, 'id' | 'createdAt'>) => Promise<void>;
  updateSalaryRecord: (id: string, record: Partial<Omit<SalaryRecord, 'id' | 'createdAt'>>) => Promise<void>;
  deleteSalaryRecord: (id: string) => Promise<void>;
  getSalaryRecordsByMonth: (month: string) => SalaryRecord[];
  calculateSalary: (employeeId: string, workingDays: number, advanceAdjusted: number, advancePending: number, month?: string) => number;
  
  // Attendance methods
  markAttendance: (employeeId: string, date: string, status: AttendanceStatus, notes?: string) => Promise<void>;
  updateAttendance: (id: string, updates: Partial<Pick<AttendanceRecord, 'status' | 'notes'>>) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;
  getAttendanceByDate: (date: string) => AttendanceRecord[];
  getAttendanceByMonth: (month: string) => AttendanceRecord[];
  getEmployeeAttendanceByMonth: (employeeId: string, month: string) => AttendanceRecord[];
  calculateWorkingDaysFromAttendance: (employeeId: string, month: string) => number;
  bulkMarkAttendance: (date: string, status: AttendanceStatus) => Promise<void>;
}

// Helper to convert DB row to Employee
const toEmployee = (row: any): Employee => ({
  id: row.id,
  name: row.name,
  designation: row.designation || '',
  salaryFixed: Number(row.salary || 0),
  createdAt: row.created_at,
});

// Helper to convert DB row to SalaryRecord
const toSalaryRecord = (row: any): SalaryRecord => ({
  id: row.id,
  employeeId: row.employee_id,
  month: `${row.year}-${String(row.month).padStart(2, '0')}`,
  workingDays: row.working_days !== null ? Number(row.working_days) : 0,
  advanceAdjusted: Number(row.advances || 0),
  advancePending: Number(row.advance_pending || 0),
  salaryPayable: Number(row.net_salary || 0),
  createdAt: row.created_at,
});

// Helper to convert DB row to AttendanceRecord
const toAttendanceRecord = (row: any): AttendanceRecord => ({
  id: row.id,
  employeeId: row.employee_id,
  date: row.date,
  status: row.status as AttendanceStatus,
  notes: row.notes || undefined,
  createdAt: row.created_at,
});

export const useSalaryStore = create<SalaryStore>()((set, get) => ({
  employees: [],
  salaryRecords: [],
  attendanceRecords: [],
  loading: false,
  initialized: false,
  
  fetchAll: async () => {
    set({ loading: true });
    try {
      const [employeesRes, salaryRes, attendanceRes] = await Promise.all([
        supabase.from('employees').select('*').order('name'),
        supabase.from('salary_records').select('*').order('month', { ascending: false }),
        supabase.from('attendance_records').select('*').order('date', { ascending: false }),
      ]);

      if (employeesRes.error) throw employeesRes.error;
      if (salaryRes.error) throw salaryRes.error;
      if (attendanceRes.error) throw attendanceRes.error;

      set({
        employees: (employeesRes.data || []).map(toEmployee),
        salaryRecords: (salaryRes.data || []).map(toSalaryRecord),
        attendanceRecords: (attendanceRes.data || []).map(toAttendanceRecord),
        initialized: true,
      });
    } catch (error: any) {
      console.error('Failed to fetch salary data:', error);
      // Don't show error toast for RLS permission errors (user not admin/manager)
      if (!error.message?.includes('row-level security')) {
        toast.error('Failed to load salary data');
      }
    } finally {
      set({ loading: false });
    }
  },
  
  addEmployee: async (employee) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert({
          name: employee.name,
          designation: employee.designation,
          salary: employee.salaryFixed,
        })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        employees: [...state.employees, toEmployee(data)],
      }));
      toast.success('Employee added successfully');
    } catch (error: any) {
      console.error('Failed to add employee:', error);
      toast.error('Failed to add employee');
      throw error;
    }
  },
  
  updateEmployee: async (id, employee) => {
    try {
      const updateData: any = {};
      if (employee.name !== undefined) updateData.name = employee.name;
      if (employee.designation !== undefined) updateData.designation = employee.designation;
      if (employee.salaryFixed !== undefined) updateData.salary = employee.salaryFixed;

      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        employees: state.employees.map((e) =>
          e.id === id ? { ...e, ...employee } : e
        ),
      }));
      toast.success('Employee updated');
    } catch (error: any) {
      console.error('Failed to update employee:', error);
      toast.error('Failed to update employee');
      throw error;
    }
  },
  
  deleteEmployee: async (id) => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        employees: state.employees.filter((e) => e.id !== id),
        salaryRecords: state.salaryRecords.filter((r) => r.employeeId !== id),
        attendanceRecords: state.attendanceRecords.filter((r) => r.employeeId !== id),
      }));
      toast.success('Employee deleted');
    } catch (error: any) {
      console.error('Failed to delete employee:', error);
      toast.error('Failed to delete employee');
      throw error;
    }
  },
  
  addSalaryRecord: async (record) => {
    try {
      const { data, error } = await supabase
        .from('salary_records')
        .insert([{
          employee_id: record.employeeId,
          month: parseInt(record.month.split('-')[1]),
          year: parseInt(record.month.split('-')[0]),
          working_days: record.workingDays,
          advances: record.advanceAdjusted,
          advance_pending: record.advancePending,
          net_salary: record.salaryPayable,
        }])
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        salaryRecords: [...state.salaryRecords, toSalaryRecord(data)],
      }));
    } catch (error: any) {
      console.error('Failed to add salary record:', error);
      toast.error('Failed to save salary record');
      throw error;
    }
  },
  
  updateSalaryRecord: async (id, record) => {
    try {
      const updateData: any = {};
      if (record.employeeId !== undefined) updateData.employee_id = record.employeeId;
      if (record.month !== undefined) {
        const [year, month] = record.month.split('-');
        updateData.year = parseInt(year);
        updateData.month = parseInt(month);
      }
      if (record.workingDays !== undefined) updateData.working_days = record.workingDays;
      if (record.advanceAdjusted !== undefined) updateData.advances = record.advanceAdjusted;
      if (record.advancePending !== undefined) updateData.advance_pending = record.advancePending;
      if (record.salaryPayable !== undefined) updateData.net_salary = record.salaryPayable;

      const { error } = await supabase
        .from('salary_records')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        salaryRecords: state.salaryRecords.map((r) =>
          r.id === id ? { ...r, ...record } : r
        ),
      }));
    } catch (error: any) {
      console.error('Failed to update salary record:', error);
      toast.error('Failed to update salary record');
      throw error;
    }
  },
  
  deleteSalaryRecord: async (id) => {
    try {
      const { error } = await supabase
        .from('salary_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        salaryRecords: state.salaryRecords.filter((r) => r.id !== id),
      }));
    } catch (error: any) {
      console.error('Failed to delete salary record:', error);
      toast.error('Failed to delete salary record');
      throw error;
    }
  },
  
  getSalaryRecordsByMonth: (month) => {
    return get().salaryRecords.filter((r) => r.month === month);
  },
  
  calculateSalary: (employeeId, workingDays, advanceAdjusted, advancePending, month?: string) => {
    const employee = get().employees.find((e) => e.id === employeeId);
    if (!employee) return 0;
    
    // Use actual calendar days in the month (31 for Jan, 28/29 for Feb, etc.)
    // If month not provided, default to current month
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    const daysInMonth = getCalendarDaysInMonth(currentMonth);
    
    // Salary per day = Fixed salary / no. of days in month
    const perDayRate = employee.salaryFixed / daysInMonth;
    
    // Salary payable = Salary per day * effective working days - advance adjusted
    const calculatedSalary = perDayRate * workingDays;
    
    return Math.round(calculatedSalary - advanceAdjusted);
  },

  // Attendance methods
  markAttendance: async (employeeId, date, status, notes) => {
    const existing = get().attendanceRecords.find(
      (r) => r.employeeId === employeeId && r.date === date
    );

    try {
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('attendance_records')
          .update({ status, notes })
          .eq('id', existing.id);

        if (error) throw error;

        set((state) => ({
          attendanceRecords: state.attendanceRecords.map((r) =>
            r.id === existing.id ? { ...r, status, notes } : r
          ),
        }));
      } else {
        // Create new
        const { data, error } = await supabase
          .from('attendance_records')
          .insert({
            employee_id: employeeId,
            date,
            status,
            notes,
          })
          .select()
          .single();

        if (error) throw error;

        set((state) => ({
          attendanceRecords: [...state.attendanceRecords, toAttendanceRecord(data)],
        }));
      }
    } catch (error: any) {
      console.error('Failed to mark attendance:', error);
      toast.error('Failed to save attendance');
      throw error;
    }
  },

  updateAttendance: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('attendance_records')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        attendanceRecords: state.attendanceRecords.map((r) =>
          r.id === id ? { ...r, ...updates } : r
        ),
      }));
    } catch (error: any) {
      console.error('Failed to update attendance:', error);
      toast.error('Failed to update attendance');
      throw error;
    }
  },

  deleteAttendance: async (id) => {
    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        attendanceRecords: state.attendanceRecords.filter((r) => r.id !== id),
      }));
    } catch (error: any) {
      console.error('Failed to delete attendance:', error);
      toast.error('Failed to delete attendance');
      throw error;
    }
  },

  getAttendanceByDate: (date) => {
    return get().attendanceRecords.filter((r) => r.date === date);
  },

  getAttendanceByMonth: (month) => {
    return get().attendanceRecords.filter((r) => r.date.startsWith(month));
  },

  getEmployeeAttendanceByMonth: (employeeId, month) => {
    return get().attendanceRecords.filter(
      (r) => r.employeeId === employeeId && r.date.startsWith(month)
    );
  },

  calculateWorkingDaysFromAttendance: (employeeId, month) => {
    const records = get().getEmployeeAttendanceByMonth(employeeId, month);
    let workingDays = 0;

    records.forEach((record) => {
      switch (record.status) {
        case 'present':
          workingDays += 1;
          break;
        case 'half-day':
          workingDays += 0.5;
          break;
        // absent, leave, holiday = 0
      }
    });

    return workingDays;
  },

  bulkMarkAttendance: async (date, status) => {
    const { employees, markAttendance } = get();
    
    // Mark attendance for all employees in parallel
    await Promise.all(
      employees.map((employee) => markAttendance(employee.id, date, status))
    );
  },
}));
