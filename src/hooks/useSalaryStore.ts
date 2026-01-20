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

interface SalaryStore {
  employees: Employee[];
  salaryRecords: SalaryRecord[];
  addEmployee: (employee: Omit<Employee, 'id' | 'createdAt'>) => void;
  updateEmployee: (id: string, employee: Partial<Omit<Employee, 'id' | 'createdAt'>>) => void;
  deleteEmployee: (id: string) => void;
  addSalaryRecord: (record: Omit<SalaryRecord, 'id' | 'createdAt'>) => void;
  updateSalaryRecord: (id: string, record: Partial<Omit<SalaryRecord, 'id' | 'createdAt'>>) => void;
  deleteSalaryRecord: (id: string) => void;
  getSalaryRecordsByMonth: (month: string) => SalaryRecord[];
  calculateSalary: (employeeId: string, workingDays: number, advanceAdjusted: number, advancePending: number) => number;
}

export const useSalaryStore = create<SalaryStore>()(
  persist(
    (set, get) => ({
      employees: [],
      salaryRecords: [],
      
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
        
        // Subtract advance adjusted, add back pending amount
        return Math.round(calculatedSalary - advanceAdjusted);
      },
    }),
    {
      name: 'salary-store',
    }
  )
);
