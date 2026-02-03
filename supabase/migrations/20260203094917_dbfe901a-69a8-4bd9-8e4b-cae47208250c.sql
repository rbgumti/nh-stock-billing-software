-- Add missing columns for purchase_order_items to match existing code
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS total_price NUMERIC(12,2);
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS pack_size TEXT;
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS qty_in_strips INTEGER;

-- Add missing columns for purchase_orders to match existing code
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS expected_delivery DATE;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2);
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS invoice_url TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS po_type TEXT DEFAULT 'Stock';
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS service_description TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS service_amount NUMERIC(12,2);

-- Add missing columns for prescriptions to match existing code
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS prescription_date TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add patient_id column as integer alias for old code compatibility
-- The patients table now has id as UUID, but old code expects numeric patient IDs
-- We'll add a serial s_no column for backward compatibility
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS s_no SERIAL;

-- Create the prescription_items table if it doesn't exist (referenced by usePrescriptionStore)
CREATE TABLE IF NOT EXISTS public.prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  duration TEXT,
  quantity INTEGER,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on prescription_items
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

-- Create policy for prescription_items
CREATE POLICY "Authenticated users can manage prescription items"
ON public.prescription_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);