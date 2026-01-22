import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  ChevronRight,
  Building2
} from 'lucide-react';
import { useSupplierStore } from '@/hooks/useSupplierStore';
import { useSupplierPaymentStore } from '@/hooks/useSupplierPaymentStore';
import { usePurchaseOrderStore } from '@/hooks/usePurchaseOrderStore';
import { useNavigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { formatNumber } from '@/lib/formatUtils';

interface AgingBucket {
  key: string;
  label: string;
  amount: number;
  count: number;
  color: string;
  bgColor: string;
}

export function AgingSummaryWidget() {
  const navigate = useNavigate();
  const { suppliers } = useSupplierStore();
  const { payments } = useSupplierPaymentStore();
  const { purchaseOrders } = usePurchaseOrderStore();

  const today = new Date();

  const agingData = useMemo(() => {
    const buckets: Record<string, { amount: number; count: number }> = {
      current: { amount: 0, count: 0 },
      days1to30: { amount: 0, count: 0 },
      days31to60: { amount: 0, count: 0 },
      days61to90: { amount: 0, count: 0 },
      days91to120: { amount: 0, count: 0 },
      days120plus: { amount: 0, count: 0 },
    };

    let totalOverdue = 0;
    let overdueCount = 0;
    const suppliersWithOverdue = new Set<string>();

    // Get unpaid POs
    const unpaidPOs = purchaseOrders.filter(po => 
      po.status === 'Received' && po.paymentStatus !== 'Paid'
    );

    unpaidPOs.forEach(po => {
      const supplier = suppliers.find(s => s.name === po.supplier);
      
      // Get payments made for this PO
      const paidAmount = payments
        .filter(p => p.purchase_order_id === po.id && p.status === 'Completed')
        .reduce((sum, p) => sum + p.amount, 0);
      
      const pendingAmount = po.totalAmount - paidAmount;
      if (pendingAmount <= 0) return;

      // Calculate days overdue
      const dueDate = po.paymentDueDate || po.grnDate || po.orderDate;
      const dueDateObj = new Date(dueDate);
      const daysOverdue = differenceInDays(today, dueDateObj);

      // Assign to bucket
      let bucketKey: string;
      if (daysOverdue <= 0) {
        bucketKey = 'current';
      } else if (daysOverdue <= 30) {
        bucketKey = 'days1to30';
        totalOverdue += pendingAmount;
        overdueCount++;
        suppliersWithOverdue.add(po.supplier);
      } else if (daysOverdue <= 60) {
        bucketKey = 'days31to60';
        totalOverdue += pendingAmount;
        overdueCount++;
        suppliersWithOverdue.add(po.supplier);
      } else if (daysOverdue <= 90) {
        bucketKey = 'days61to90';
        totalOverdue += pendingAmount;
        overdueCount++;
        suppliersWithOverdue.add(po.supplier);
      } else if (daysOverdue <= 120) {
        bucketKey = 'days91to120';
        totalOverdue += pendingAmount;
        overdueCount++;
        suppliersWithOverdue.add(po.supplier);
      } else {
        bucketKey = 'days120plus';
        totalOverdue += pendingAmount;
        overdueCount++;
        suppliersWithOverdue.add(po.supplier);
      }

      buckets[bucketKey].amount += pendingAmount;
      buckets[bucketKey].count += 1;
    });

    const totalPending = Object.values(buckets).reduce((sum, b) => sum + b.amount, 0);

    return {
      buckets,
      totalPending,
      totalOverdue,
      overdueCount,
      suppliersWithOverdue: suppliersWithOverdue.size,
    };
  }, [purchaseOrders, payments, suppliers, today]);

  const bucketConfig: AgingBucket[] = [
    { key: 'current', label: 'Current', amount: agingData.buckets.current.amount, count: agingData.buckets.current.count, color: 'text-emerald-600', bgColor: 'bg-emerald-500' },
    { key: 'days1to30', label: '1-30d', amount: agingData.buckets.days1to30.amount, count: agingData.buckets.days1to30.count, color: 'text-cyan-600', bgColor: 'bg-cyan-500' },
    { key: 'days31to60', label: '31-60d', amount: agingData.buckets.days31to60.amount, count: agingData.buckets.days31to60.count, color: 'text-amber-600', bgColor: 'bg-amber-500' },
    { key: 'days61to90', label: '61-90d', amount: agingData.buckets.days61to90.amount, count: agingData.buckets.days61to90.count, color: 'text-orange-600', bgColor: 'bg-orange-500' },
    { key: 'days91to120', label: '91-120d', amount: agingData.buckets.days91to120.amount, count: agingData.buckets.days91to120.count, color: 'text-pink-600', bgColor: 'bg-pink-500' },
    { key: 'days120plus', label: '120+d', amount: agingData.buckets.days120plus.amount, count: agingData.buckets.days120plus.count, color: 'text-red-600', bgColor: 'bg-red-500' },
  ];

  const hasOverdue = agingData.totalOverdue > 0;
  const overduePercentage = agingData.totalPending > 0 
    ? (agingData.totalOverdue / agingData.totalPending) * 100 
    : 0;

  return (
    <Card className={`glass-strong border-0 overflow-hidden relative ${hasOverdue ? 'border-l-4 border-l-destructive' : ''}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-orange/5 via-transparent to-red/5" />
      
      <CardHeader className="pb-3 relative">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg">
              <Clock className="h-4 w-4 text-white" />
            </div>
            Supplier Payment Aging
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/stock?tab=payments')}
            className="text-sm hover:bg-orange-500/10"
          >
            View Details
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <p className="text-2xl font-bold text-foreground">₹{formatNumber(agingData.totalPending)}</p>
            <p className="text-xs text-muted-foreground">Total Pending</p>
          </div>
          <div className={`text-center p-3 rounded-xl ${hasOverdue ? 'bg-destructive/10' : 'bg-emerald-500/10'}`}>
            <p className={`text-2xl font-bold ${hasOverdue ? 'text-destructive' : 'text-emerald-600'}`}>
              ₹{formatNumber(agingData.totalOverdue)}
            </p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <p className="text-2xl font-bold text-foreground">{agingData.suppliersWithOverdue}</p>
            <p className="text-xs text-muted-foreground">Suppliers Overdue</p>
          </div>
        </div>

        {/* Aging Distribution Bar */}
        {agingData.totalPending > 0 && (
          <div className="space-y-2">
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
              {bucketConfig.map((bucket) => {
                const percentage = (bucket.amount / agingData.totalPending) * 100;
                if (percentage === 0) return null;
                return (
                  <div
                    key={bucket.key}
                    className={`${bucket.bgColor} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                    title={`${bucket.label}: ₹${formatNumber(bucket.amount)}`}
                  />
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {bucketConfig.filter(b => b.amount > 0).map((bucket) => (
                <div key={bucket.key} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${bucket.bgColor}`} />
                  <span className={bucket.color}>{bucket.label}</span>
                  <span className="text-muted-foreground">({bucket.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overdue Alert */}
        {hasOverdue && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">
                {agingData.overdueCount} overdue payment{agingData.overdueCount !== 1 ? 's' : ''} requiring attention
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {overduePercentage.toFixed(1)}% of total pending amount is overdue
              </p>
            </div>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => navigate('/stock?tab=payments')}
              className="flex-shrink-0"
            >
              Review
            </Button>
          </div>
        )}

        {/* Quick Links */}
        {agingData.totalPending > 0 && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/stock?tab=payments')}
              className="text-xs h-9"
            >
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              Supplier Ledgers
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/stock?tab=payments')}
              className="text-xs h-9"
            >
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
              Aging Report
            </Button>
          </div>
        )}

        {agingData.totalPending === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pending supplier payments</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
