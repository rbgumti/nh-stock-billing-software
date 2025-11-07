-- Create invoices table
CREATE TABLE public.invoices (
  id text PRIMARY KEY,
  invoice_number text NOT NULL,
  patient_id text NOT NULL,
  patient_name text NOT NULL,
  patient_phone text,
  invoice_date text NOT NULL,
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'Pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create invoice_items table
CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  medicine_id integer NOT NULL,
  medicine_name text NOT NULL,
  batch_no text,
  expiry_date text,
  mrp numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Allow public to view invoices"
  ON public.invoices
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public to insert invoices"
  ON public.invoices
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to update invoices"
  ON public.invoices
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow public to delete invoices"
  ON public.invoices
  FOR DELETE
  USING (true);

-- RLS Policies for invoice_items
CREATE POLICY "Allow public to view invoice items"
  ON public.invoice_items
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public to insert invoice items"
  ON public.invoice_items
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to update invoice items"
  ON public.invoice_items
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow public to delete invoice items"
  ON public.invoice_items
  FOR DELETE
  USING (true);

-- Create trigger for updating updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_invoices_patient_id ON public.invoices(patient_id);
CREATE INDEX idx_invoices_date ON public.invoices(invoice_date);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);