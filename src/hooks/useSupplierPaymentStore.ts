import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SupplierPayment {
  id: number;
  supplier_id: number;
  purchase_order_id?: number;
  amount: number;
  payment_date: string;
  due_date?: string;
  payment_method?: string;
  reference_number?: string;
  status: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Joined fields
  supplier_name?: string;
  po_number?: string;
}

export function useSupplierPaymentStore() {
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();

    const channel = supabase
      .channel('supplier-payments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_payments' }, () => {
        loadPayments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('supplier_payments')
        .select(`
          *,
          suppliers (name),
          purchase_orders (po_number)
        `)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      const formattedPayments: SupplierPayment[] = (data || []).map((p: any) => ({
        id: p.id,
        supplier_id: p.supplier_id,
        purchase_order_id: p.purchase_order_id,
        amount: Number(p.amount),
        payment_date: p.payment_date,
        due_date: p.due_date,
        payment_method: p.payment_method,
        reference_number: p.reference_number,
        status: p.status,
        notes: p.notes,
        created_at: p.created_at,
        updated_at: p.updated_at,
        supplier_name: p.suppliers?.name,
        po_number: p.purchase_orders?.po_number
      }));

      setPayments(formattedPayments);
    } catch (error) {
      console.error('Error loading supplier payments:', error);
      toast({
        title: "Error",
        description: "Failed to load supplier payments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addPayment = async (payment: Omit<SupplierPayment, 'id' | 'created_at' | 'updated_at' | 'supplier_name' | 'po_number'>) => {
    const { data, error } = await supabase
      .from('supplier_payments')
      .insert({
        supplier_id: payment.supplier_id,
        purchase_order_id: payment.purchase_order_id || null,
        amount: payment.amount,
        payment_date: payment.payment_date,
        due_date: payment.due_date || null,
        payment_method: payment.payment_method || null,
        reference_number: payment.reference_number || null,
        status: payment.status,
        notes: payment.notes || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding payment:', error);
      throw error;
    }

    return data;
  };

  const updatePayment = async (id: number, payment: Partial<SupplierPayment>) => {
    const { error } = await supabase
      .from('supplier_payments')
      .update({
        supplier_id: payment.supplier_id,
        purchase_order_id: payment.purchase_order_id || null,
        amount: payment.amount,
        payment_date: payment.payment_date,
        due_date: payment.due_date || null,
        payment_method: payment.payment_method || null,
        reference_number: payment.reference_number || null,
        status: payment.status,
        notes: payment.notes || null
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  };

  const deletePayment = async (id: number) => {
    const { error } = await supabase
      .from('supplier_payments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  };

  const getPaymentsBySupplier = (supplierId: number) => {
    return payments.filter(p => p.supplier_id === supplierId);
  };

  const getOutstandingPayments = () => {
    const today = new Date().toISOString().split('T')[0];
    return payments.filter(p => p.status !== 'Completed' && p.due_date && p.due_date < today);
  };

  const getUpcomingPayments = () => {
    const today = new Date().toISOString().split('T')[0];
    return payments.filter(p => p.status !== 'Completed' && p.due_date && p.due_date >= today);
  };

  return {
    payments,
    loading,
    addPayment,
    updatePayment,
    deletePayment,
    getPaymentsBySupplier,
    getOutstandingPayments,
    getUpcomingPayments,
    refresh: loadPayments
  };
}
