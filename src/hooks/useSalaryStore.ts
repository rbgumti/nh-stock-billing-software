import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  addEmployee: (employee: Omit<Employee, 'id' | 'createdAt'>) => void;
  updateEmployee: (id: string, employee: Partial<Omit<Employee, 'id' | 'createdAt'>>) => void;
  deleteEmployee: (id: string) => void;
  addSalaryRecord: (record: Omit<SalaryRecord, 'id' | 'createdAt'>) => void;
  updateSalaryRecord: (id: string, record: Partial<Omit<SalaryRecord, 'id' | 'createdAt'>>) => void;
  deleteSalaryRecord: (id: string) => void;
  getSalaryRecordsByMonth: (month: string) => SalaryRecord[];
  calculateSalary: (employeeId: string, workingDays: number, advanceAdjusted: number, advancePending: number) => number;
  // Attendance methods
  markAttendance: (employeeId: string, date: string, status: AttendanceStatus, notes?: string) => void;
  updateAttendance: (id: string, updates: Partial<Pick<AttendanceRecord, 'status' | 'notes'>>) => void;
  deleteAttendance: (id: string) => void;
  getAttendanceByDate: (date: string) => AttendanceRecord[];
  getAttendanceByMonth: (month: string) => AttendanceRecord[];
  getEmployeeAttendanceByMonth: (employeeId: string, month: string) => AttendanceRecord[];
  calculateWorkingDaysFromAttendance: (employeeId: string, month: string) => number;
  bulkMarkAttendance: (date: string, status: AttendanceStatus) => void;
}

export const useSalaryStore = create<SalaryStore>()(
  persist(
    (set, get) => ({
      employees: [],
      salaryRecords: [],
      attendanceRecords: [],
      
      addEmployee: (employee) => {
        const newEmployee: Employee = {
          ...employee,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ employees: [...state.employees, newEmployee] }));
      },
      
      updateEmployee: (id, employee) => {
        set((state) => ({
          employees: state.employees.map((e) =>
            e.id === id ? { ...e, ...employee } : e
          ),
        }));
      },
      
      deleteEmployee: (id) => {
        set((state) => ({
          employees: state.employees.filter((e) => e.id !== id),
          salaryRecords: state.salaryRecords.filter((r) => r.employeeId !== id),
          attendanceRecords: state.attendanceRecords.filter((r) => r.employeeId !== id),
        }));
      },
      
      addSalaryRecord: (record) => {
        const newRecord: SalaryRecord = {
          ...record,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ salaryRecords: [...state.salaryRecords, newRecord] }));
      },
      
      updateSalaryRecord: (id, record) => {
        set((state) => ({
          salaryRecords: state.salaryRecords.map((r) =>
            r.id === id ? { ...r, ...record } : r
          ),
        }));
      },
      
      deleteSalaryRecord: (id) => {
        set((state) => ({
          salaryRecords: state.salaryRecords.filter((r) => r.id !== id),
        }));
      },
      
      getSalaryRecordsByMonth: (month) => {
        return get().salaryRecords.filter((r) => r.month === month);
      },
      
      calculateSalary: (employeeId, workingDays, advanceAdjusted, advancePending) => {
        const employee = get().employees.find((e) => e.id === employeeId);
        if (!employee) return 0;
        
        // Standard month = 31 days, calculate per day rate
        const perDayRate = employee.salaryFixed / 31;
        const calculatedSalary = perDayRate * workingDays;
        
        // Subtract advance adjusted
        return Math.round(calculatedSalary - advanceAdjusted);
      },

      // Attendance methods
      markAttendance: (employeeId, date, status, notes) => {
        const existing = get().attendanceRecords.find(
          (r) => r.employeeId === employeeId && r.date === date
        );

        if (existing) {
          // Update existing
          set((state) => ({
            attendanceRecords: state.attendanceRecords.map((r) =>
              r.id === existing.id ? { ...r, status, notes } : r
            ),
          }));
        } else {
          // Create new
          const newRecord: AttendanceRecord = {
            id: crypto.randomUUID(),
            employeeId,
            date,
            status,
            notes,
            createdAt: new Date().toISOString(),
          };
          set((state) => ({
            attendanceRecords: [...state.attendanceRecords, newRecord],
          }));
        }
      },

      updateAttendance: (id, updates) => {
        set((state) => ({
          attendanceRecords: state.attendanceRecords.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
      },

      deleteAttendance: (id) => {
        set((state) => ({
          attendanceRecords: state.attendanceRecords.filter((r) => r.id !== id),
        }));
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

      bulkMarkAttendance: (date, status) => {
        const { employees, markAttendance } = get();
        employees.forEach((employee) => {
          markAttendance(employee.id, date, status);
        });
      },
    }),
    {
      name: 'salary-store',
    }
  )
);
