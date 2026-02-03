-- Add missing columns to invoice_items to match existing code
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS medicine_id INTEGER REFERENCES public.stock_items(item_id);

-- Add missing columns to purchase_order_items to match existing code  
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS stock_item_name TEXT;
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS qty_in_tabs INTEGER;

-- Add missing columns to invoices to match existing code
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS patient_phone TEXT;

-- Add missing columns to purchase_orders to match existing code
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS supplier TEXT;

-- Add missing columns to patients to match existing code
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS phone_alt TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS file_no TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS aadhar_card TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS govt_id TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS new_govt_id TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS age TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS category TEXT;

-- Add missing columns to appointments to match existing code
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS patient_phone TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

-- Create a trigger to auto-populate patient_name from first_name + last_name
CREATE OR REPLACE FUNCTION public.update_patient_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.patient_name := COALESCE(NEW.first_name, '') || COALESCE(' ' || NEW.last_name, '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_patient_name_trigger ON public.patients;
CREATE TRIGGER update_patient_name_trigger
BEFORE INSERT OR UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_patient_name();