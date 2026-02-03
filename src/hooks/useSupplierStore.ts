import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_terms?: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  ifsc_code?: string;
  upi_id?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export function useSupplierStore() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuppliers();

    const channel = supabase
      .channel('suppliers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => {
        loadSuppliers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading suppliers:', error);
    } else {
      setSuppliers(data || []);
    }
    setLoading(false);
  };

  const addSupplier = async (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(supplier)
      .select()
      .single();

    if (error) {
      console.error('Error adding supplier:', error);
      throw error;
    }

    return data;
  };

  const updateSupplier = async (id: string, supplier: Partial<Supplier>) => {
    const { error } = await supabase
      .from('suppliers')
      .update(supplier)
      .eq('id', id);

    if (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  };

  const deleteSupplier = async (id: string) => {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  };

  const getSupplierByName = (name: string) => {
    return suppliers.find(s => s.name.toLowerCase() === name.toLowerCase());
  };

  return {
    suppliers,
    loading,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierByName,
    refresh: loadSuppliers
  };
}
