import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, CreditCard, ChevronRight } from "lucide-react";
import { useSupplierPaymentStore } from "@/hooks/useSupplierPaymentStore";
import { usePurchaseOrderStore } from "@/hooks/usePurchaseOrderStore";
import { useNavigate } from "react-router-dom";

interface PaymentRemindersProps {
  compact?: boolean;
  showTitle?: boolean;
}

export function PaymentReminders({ compact = false, showTitle = true }: PaymentRemindersProps) {
  const navigate = useNavigate();
  const { payments, getOutstandingPayments, getUpcomingPayments } = useSupplierPaymentStore();
  const { purchaseOrders } = usePurchaseOrderStore();

  const today = new Date().toISOString().split('T')[0];
  
  // Get overdue payments (past due date and not completed)
  const overduePayments = payments.filter(p => 
    p.status !== 'Completed' && p.due_date && p.due_date < today
  );

  // Get upcoming payments (due within next 7 days)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const upcomingDate = sevenDaysFromNow.toISOString().split('T')[0];
  
  const upcomingPayments = payments.filter(p => 
    p.status !== 'Completed' && p.due_date && p.due_date >= today && p.due_date <= upcomingDate
  );

  // Get overdue POs (payment status is Overdue or Pending with past expected delivery)
  const overduePOs = purchaseOrders.filter(po => 
    po.paymentStatus === 'Overdue' || 
    (po.paymentStatus !== 'Paid' && po.paymentDueDate && po.paymentDueDate < today)
  );

  // Get pending POs with due dates coming up
  const upcomingPOs = purchaseOrders.filter(po =>
    po.paymentStatus !== 'Paid' && 
    po.paymentDueDate && 
    po.paymentDueDate >= today && 
    po.paymentDueDate <= upcomingDate
  );

  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0) +
    overduePOs.reduce((sum, po) => sum + po.totalAmount, 0);

  const totalUpcoming = upcomingPayments.reduce((sum, p) => sum + p.amount, 0) +
    upcomingPOs.reduce((sum, po) => sum + po.totalAmount, 0);

  const hasReminders = overduePayments.length > 0 || upcomingPayments.length > 0 || 
    overduePOs.length > 0 || upcomingPOs.length > 0;

  if (!hasReminders && compact) {
    return null;
  }

  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = now.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Card className={overduePayments.length > 0 || overduePOs.length > 0 ? "border-destructive/50" : ""}>
      {showTitle && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Reminders
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/stock')}
              className="text-sm"
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
      )}
      <CardContent className={showTitle ? "" : "pt-6"}>
        {!hasReminders ? (
          <p className="text-center text-muted-foreground py-4">No payment reminders</p>
        ) : (
          <div className="space-y-4">
            {/* Overdue Section */}
            {(overduePayments.length > 0 || overduePOs.length > 0) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-semibold text-sm">Overdue ({overduePayments.length + overduePOs.length})</span>
                  <span className="text-xs ml-auto">Total: ₹{totalOverdue.toFixed(2)}</span>
                </div>
                
                {!compact && (
                  <div className="space-y-2 pl-6">
                    {overduePOs.slice(0, 3).map((po) => (
                      <div key={`po-${po.id}`} className="flex items-center justify-between text-sm p-2 bg-destructive/10 rounded">
                        <div>
                          <span className="font-medium">PO #{po.poNumber}</span>
                          <span className="text-muted-foreground ml-2">({po.supplier})</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">₹{po.totalAmount.toFixed(2)}</span>
                          {po.paymentDueDate && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              {getDaysOverdue(po.paymentDueDate)}d overdue
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {overduePayments.slice(0, 3).map((payment) => (
                      <div key={`pay-${payment.id}`} className="flex items-center justify-between text-sm p-2 bg-destructive/10 rounded">
                        <div>
                          <span className="font-medium">{payment.supplier_name}</span>
                          {payment.po_number && (
                            <span className="text-muted-foreground ml-2">(PO #{payment.po_number})</span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-medium">₹{payment.amount.toFixed(2)}</span>
                          {payment.due_date && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              {getDaysOverdue(payment.due_date)}d overdue
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Upcoming Section */}
            {(upcomingPayments.length > 0 || upcomingPOs.length > 0) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-600">
                  <Calendar className="h-4 w-4" />
                  <span className="font-semibold text-sm">Due This Week ({upcomingPayments.length + upcomingPOs.length})</span>
                  <span className="text-xs ml-auto">Total: ₹{totalUpcoming.toFixed(2)}</span>
                </div>
                
                {!compact && (
                  <div className="space-y-2 pl-6">
                    {upcomingPOs.slice(0, 3).map((po) => (
                      <div key={`po-${po.id}`} className="flex items-center justify-between text-sm p-2 bg-amber-500/10 rounded">
                        <div>
                          <span className="font-medium">PO #{po.poNumber}</span>
                          <span className="text-muted-foreground ml-2">({po.supplier})</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">₹{po.totalAmount.toFixed(2)}</span>
                          {po.paymentDueDate && (
                            <Badge variant="secondary" className="ml-2 text-xs bg-amber-500/20 text-amber-700">
                              {getDaysUntilDue(po.paymentDueDate) === 0 ? 'Today' : `${getDaysUntilDue(po.paymentDueDate)}d left`}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {upcomingPayments.slice(0, 3).map((payment) => (
                      <div key={`pay-${payment.id}`} className="flex items-center justify-between text-sm p-2 bg-amber-500/10 rounded">
                        <div>
                          <span className="font-medium">{payment.supplier_name}</span>
                          {payment.po_number && (
                            <span className="text-muted-foreground ml-2">(PO #{payment.po_number})</span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-medium">₹{payment.amount.toFixed(2)}</span>
                          {payment.due_date && (
                            <Badge variant="secondary" className="ml-2 text-xs bg-amber-500/20 text-amber-700">
                              {getDaysUntilDue(payment.due_date) === 0 ? 'Today' : `${getDaysUntilDue(payment.due_date)}d left`}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
