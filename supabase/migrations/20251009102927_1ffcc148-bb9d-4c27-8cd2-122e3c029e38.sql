-- Create patients table
CREATE TABLE public.patients (
  patient_id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  gender TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  aadhar TEXT,
  govt_id_old TEXT,
  govt_id_new TEXT,
  blood_group TEXT,
  allergies TEXT,
  current_medications TEXT,
  medical_history TEXT,
  emergency_contact_name TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_phone TEXT,
  visit_date TEXT,
  next_follow_up_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create stock_items table
CREATE TABLE public.stock_items (
  item_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,2) NOT NULL,
  mrp DECIMAL(10,2),
  supplier TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  batch_no TEXT NOT NULL,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create purchase_orders table
CREATE TABLE public.purchase_orders (
  id SERIAL PRIMARY KEY,
  po_number TEXT NOT NULL UNIQUE,
  supplier TEXT NOT NULL,
  order_date TEXT NOT NULL,
  expected_delivery TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Received', 'Cancelled')),
  total_amount DECIMAL(10,2) NOT NULL,
  grn_date TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create purchase_order_items table
CREATE TABLE public.purchase_order_items (
  id SERIAL PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  stock_item_id INTEGER NOT NULL,
  stock_item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public access for now - adjust based on your auth needs)
CREATE POLICY "Allow all access to patients" ON public.patients FOR ALL USING (true);
CREATE POLICY "Allow all access to stock_items" ON public.stock_items FOR ALL USING (true);
CREATE POLICY "Allow all access to purchase_orders" ON public.purchase_orders FOR ALL USING (true);
CREATE POLICY "Allow all access to purchase_order_items" ON public.purchase_order_items FOR ALL USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_items_updated_at
  BEFORE UPDATE ON public.stock_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();