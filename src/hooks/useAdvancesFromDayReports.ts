import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface AdvanceFromDayReport {
  date: string;
  employeeId: string;
  employeeName: string;
  amount: number;
}

export interface MonthlyAdvanceSummary {
  employeeId: string;
  employeeName: string;
  totalAdvances: number;
  advances: AdvanceFromDayReport[];
}

export const useAdvancesFromDayReports = () => {
  const [loading, setLoading] = useState(false);
  const [advances, setAdvances] = useState<AdvanceFromDayReport[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlyAdvanceSummary[]>([]);

  const fetchAdvancesForMonth = useCallback(async (month: Date) => {
    setLoading(true);
    try {
      const startDate = format(startOfMonth(month), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(month), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('day_reports')
        .select('report_date, advances')
        .gte('report_date', startDate)
        .lte('report_date', endDate);

      if (error) throw error;

      const allAdvances: AdvanceFromDayReport[] = [];

      (data || []).forEach((report) => {
        const reportAdvances = (report as any).advances as Array<{
          employeeId: string;
          employeeName: string;
          amount: number;
        }> || [];

        reportAdvances.forEach((adv) => {
          if (adv.employeeId && adv.amount > 0) {
            allAdvances.push({
              date: report.report_date,
              employeeId: adv.employeeId,
              employeeName: adv.employeeName,
              amount: adv.amount,
            });
          }
        });
      });

      setAdvances(allAdvances);

      // Calculate monthly summary per employee
      const summaryMap = new Map<string, MonthlyAdvanceSummary>();

      allAdvances.forEach((adv) => {
        if (!summaryMap.has(adv.employeeId)) {
          summaryMap.set(adv.employeeId, {
            employeeId: adv.employeeId,
            employeeName: adv.employeeName,
            totalAdvances: 0,
            advances: [],
          });
        }

        const summary = summaryMap.get(adv.employeeId)!;
        summary.totalAdvances += adv.amount;
        summary.advances.push(adv);
      });

      setMonthlySummary(Array.from(summaryMap.values()));

      return {
        advances: allAdvances,
        summary: Array.from(summaryMap.values()),
      };
    } catch (error) {
      console.error('Error fetching advances:', error);
      return { advances: [], summary: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  const getEmployeeAdvancesForMonth = useCallback((employeeId: string) => {
    return advances.filter((a) => a.employeeId === employeeId);
  }, [advances]);

  const getEmployeeTotalAdvances = useCallback((employeeId: string) => {
    return advances
      .filter((a) => a.employeeId === employeeId)
      .reduce((sum, a) => sum + a.amount, 0);
  }, [advances]);

  return {
    loading,
    advances,
    monthlySummary,
    fetchAdvancesForMonth,
    getEmployeeAdvancesForMonth,
    getEmployeeTotalAdvances,
  };
};
