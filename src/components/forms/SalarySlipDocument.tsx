import * as React from "react";
import navjeevanLogo from "@/assets/NH_LOGO.png";
import { useAppSettings } from "@/hooks/usePerformanceMode";
import { Employee, getBaseWorkingDays } from "@/hooks/useSalaryStore";

export interface SalarySlipProps {
  employee: Employee;
  month: string; // YYYY-MM format
  monthLabel: string; // "January 2025" format
  workingDays: number;
  advanceAdjusted: number;
  advancePending: number;
  salaryPayable: number;
  slipNumber?: string;
  effectiveDaysForSalary?: number;
}

export const SalarySlipDocument = React.forwardRef<HTMLDivElement, SalarySlipProps>(
  (
    {
      employee,
      month,
      monthLabel,
      workingDays,
      advanceAdjusted,
      advancePending,
      salaryPayable,
      slipNumber,
      effectiveDaysForSalary,
    },
    ref
  ) => {
    const { doctorName } = useAppSettings();
    
    // Use new 30-day base calculation
    const baseWorkingDays = getBaseWorkingDays(month);
    const perDayRate = employee.salaryFixed / 30;
    
    // Calculate effective days if not provided
    const effectiveDays = effectiveDaysForSalary ?? (
      workingDays <= baseWorkingDays
        ? (workingDays / baseWorkingDays) * 30
        : 30 + (workingDays - baseWorkingDays)
    );
    
    const grossSalary = Math.round(perDayRate * effectiveDays);
    const totalDeductions = advanceAdjusted;
    const netPayable = salaryPayable;

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).replace(/\//g, "-");
    };

    const currentDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).replace(/\//g, "-");

    return (
      <div
        ref={ref}
        className="p-8 bg-white text-black flex flex-col"
        style={{
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: "12pt",
          lineHeight: "1.6",
          minHeight: "842px",
          width: "595px",
        }}
      >
        {/* Header with Logo */}
        <div className="text-center mb-6 border-b-2 border-gray-300 pb-4">
          <div className="flex justify-center mb-3">
            <img src={navjeevanLogo} alt="Logo" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-2xl font-bold mb-1 tracking-wide" style={{ color: "#003366" }}>
            NAVJEEVAN HOSPITAL
          </h1>
          <p className="text-sm italic text-gray-500 mb-2">Healthcare with Compassion</p>
          <p className="text-sm text-gray-700">
            Near Bus Stand, Main Road, Malout - 152107
          </p>
          <p className="text-sm text-gray-700 mb-3">
            Phone: +91-1637-123456 | Email: info@navjeevanhospital.com
          </p>
          
          <div 
            className="inline-block px-6 py-2 rounded-md mt-2"
            style={{ backgroundColor: "#003366" }}
          >
            <h2 className="text-lg font-bold text-white tracking-wider">
              SALARY SLIP
            </h2>
          </div>
        </div>

        {/* Slip Details */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="space-y-1">
            <div className="flex">
              <span className="font-semibold w-32">Slip No:</span>
              <span>{slipNumber || `SS-${month.replace('-', '')}-${employee.id.slice(0, 4).toUpperCase()}`}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-32">Pay Period:</span>
              <span>{monthLabel}</span>
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="flex justify-end">
              <span className="font-semibold w-32">Date:</span>
              <span className="w-28">{currentDate}</span>
            </div>
          </div>
        </div>

        {/* Employee Details */}
        <div className="border border-gray-300 rounded-md mb-6">
          <div className="px-4 py-2 font-bold text-white" style={{ backgroundColor: "#003366" }}>
            Employee Details
          </div>
          <div className="grid grid-cols-2 gap-4 p-4 text-sm">
            <div className="space-y-2">
              <div className="flex">
                <span className="font-semibold w-32">Name:</span>
                <span className="font-medium">{employee.name}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-32">Designation:</span>
                <span>{employee.designation}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex">
                <span className="font-semibold w-32">Fixed Salary:</span>
                <span>₹{employee.salaryFixed.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-32">Per Day Rate:</span>
                <span>₹{Math.round(perDayRate).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Earnings & Deductions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Earnings */}
          <div className="border border-gray-300 rounded-md">
            <div className="px-4 py-2 font-bold text-white" style={{ backgroundColor: "#28a745" }}>
              Earnings
            </div>
            <div className="p-4 text-sm space-y-3">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span>Basic Salary</span>
                <span>₹{employee.salaryFixed.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span>Base Working Days</span>
                <span>{baseWorkingDays} days</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span>Actual Working Days</span>
                <span>{workingDays} days</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span>Effective Days (for calc)</span>
                <span>{Math.round(effectiveDays * 10) / 10} days</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t-2 border-gray-300">
                <span>Gross Earnings</span>
                <span>₹{grossSalary.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="border border-gray-300 rounded-md">
            <div className="px-4 py-2 font-bold text-white" style={{ backgroundColor: "#dc3545" }}>
              Deductions
            </div>
            <div className="p-4 text-sm space-y-3">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span>Advance Adjusted</span>
                <span>₹{advanceAdjusted.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span>Advance Pending</span>
                <span className="text-amber-600">₹{advancePending.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t-2 border-gray-300">
                <span>Total Deductions</span>
                <span>₹{totalDeductions.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Payable */}
        <div 
          className="border-2 rounded-md p-4 mb-8"
          style={{ borderColor: "#003366", backgroundColor: "#f0f7ff" }}
        >
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold" style={{ color: "#003366" }}>
              NET SALARY PAYABLE
            </span>
            <span className="text-2xl font-bold" style={{ color: "#003366" }}>
              ₹{netPayable.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            (Rupees {numberToWords(netPayable)} Only)
          </p>
        </div>

        {/* Spacer to push footer to bottom */}
        <div className="flex-grow" />

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-8 pt-4 border-t border-gray-300">
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2 mt-12">
              <p className="font-semibold">Employee Signature</p>
              <p className="text-sm text-gray-500">{employee.name}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2 mt-12">
              <p className="font-semibold">Authorized Signatory</p>
              <p className="text-sm text-gray-500">{doctorName || "Navjeevan Hospital"}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 mt-6 pt-4 border-t border-gray-200">
          <p>This is a computer-generated document. No signature is required.</p>
          <p>Generated on {currentDate} | Navjeevan Hospital Management System</p>
        </div>
      </div>
    );
  }
);

SalarySlipDocument.displayName = "SalarySlipDocument";

// Helper function to convert number to words
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  function convertLessThanThousand(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
  }

  function convert(n: number): string {
    if (n < 1000) return convertLessThanThousand(n);
    if (n < 100000) {
      return convertLessThanThousand(Math.floor(n / 1000)) + ' Thousand' + 
        (n % 1000 !== 0 ? ' ' + convertLessThanThousand(n % 1000) : '');
    }
    if (n < 10000000) {
      return convertLessThanThousand(Math.floor(n / 100000)) + ' Lakh' + 
        (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
    }
    return convertLessThanThousand(Math.floor(n / 10000000)) + ' Crore' + 
      (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
  }

  return convert(Math.abs(Math.round(num)));
}
