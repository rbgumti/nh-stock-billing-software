-- Add payment fields to purchase_orders table
ALTER TABLE public.purchase_orders
ADD COLUMN payment_status text DEFAULT 'Pending',
ADD COLUMN payment_due_date text,
ADD COLUMN payment_date text,
ADD COLUMN payment_amount numeric DEFAULT 0,
ADD COLUMN payment_notes text;

-- Create supplier_payments table for independent payment records
CREATE TABLE public.supplier_payments (
  id SERIAL PRIMARY KEY,
  supplier_id integer NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  purchase_order_id integer REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  payment_date text NOT NULL,
  due_date text,
  payment_method text,
  reference_number text,
  status text DEFAULT 'Completed',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on supplier_payments
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for supplier_payments
CREATE POLICY "Authenticated users can view supplier payments"
  ON public.supplier_payments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert supplier payments"
  ON public.supplier_payments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update supplier payments"
  ON public.supplier_payments FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete supplier payments"
  ON public.supplier_payments FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_supplier_payments_updated_at
  BEFORE UPDATE ON public.supplier_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();