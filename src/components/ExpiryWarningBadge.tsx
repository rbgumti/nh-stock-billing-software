import { AlertTriangle, Clock } from "lucide-react";
import { differenceInDays } from "date-fns";

interface ExpiryWarningBadgeProps {
  expiryDate: string;
  showDaysRemaining?: boolean;
}

export function getExpiryWarningLevel(expiryDate: string): 'critical' | 'warning' | 'caution' | null {
  if (!expiryDate) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const daysUntilExpiry = differenceInDays(expiry, today);
  
  if (daysUntilExpiry <= 30) return 'critical';
  if (daysUntilExpiry <= 60) return 'warning';
  if (daysUntilExpiry <= 90) return 'caution';
  return null;
}

export function getDaysUntilExpiry(expiryDate: string): number {
  if (!expiryDate) return Infinity;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  return differenceInDays(expiry, today);
}

export default function ExpiryWarningBadge({ expiryDate, showDaysRemaining = true }: ExpiryWarningBadgeProps) {
  const level = getExpiryWarningLevel(expiryDate);
  const daysRemaining = getDaysUntilExpiry(expiryDate);
  
  if (!level) return null;
  
  const isExpired = daysRemaining < 0;
  
  const styles = {
    critical: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    warning: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    caution: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  };
  
  const labels = {
    critical: isExpired ? 'EXPIRED' : '≤30 days',
    warning: '≤60 days',
    caution: '≤90 days',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded border ${styles[level]}`}>
      {isExpired ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      {showDaysRemaining && daysRemaining >= 0 ? (
        <span>{daysRemaining}d left</span>
      ) : (
        <span>{labels[level]}</span>
      )}
    </span>
  );
}
