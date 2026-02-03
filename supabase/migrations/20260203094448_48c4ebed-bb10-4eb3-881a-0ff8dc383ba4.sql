-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'staff');

-- =============================================
-- PROFILES TABLE (User profiles linked to auth)
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  username TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =============================================
-- USER ROLES TABLE (Separate for security)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get email by username
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE username = p_username LIMIT 1
$$;

-- =============================================
-- SUPPLIERS TABLE
-- =============================================
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  payment_terms TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- STOCK ITEMS TABLE
-- =============================================
CREATE TABLE public.stock_items (
  item_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'BNX',
  current_stock INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 10,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  mrp NUMERIC(10,2),
  supplier TEXT,
  expiry_date TEXT,
  batch_no TEXT,
  status TEXT,
  composition TEXT,
  packing TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_stock_item_name CHECK (name ~ '^[a-zA-Z0-9\s\-\.\(\)\/\+\%\,]+$')
);

ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage stock" ON public.stock_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- PATIENTS TABLE
-- =============================================
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  date_of_birth DATE,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  blood_group TEXT,
  allergies TEXT,
  chronic_conditions TEXT,
  current_medications TEXT,
  medical_notes TEXT,
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  referred_by TEXT,
  visit_type TEXT,
  chief_complaint TEXT,
  notes TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage patients" ON public.patients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- APPOINTMENTS TABLE
-- =============================================
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME,
  duration_minutes INTEGER DEFAULT 30,
  type TEXT DEFAULT 'Consultation',
  status TEXT DEFAULT 'Scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage appointments" ON public.appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- PRESCRIPTIONS TABLE
-- =============================================
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_number TEXT UNIQUE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  diagnosis TEXT,
  medicines JSONB,
  instructions TEXT,
  follow_up_date DATE,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage prescriptions" ON public.prescriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- INVOICES TABLE
-- =============================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  invoice_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  subtotal NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'Pending',
  status TEXT DEFAULT 'Draft',
  notes TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage invoices" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- INVOICE ITEMS TABLE
-- =============================================
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  stock_item_id INTEGER REFERENCES public.stock_items(item_id) ON DELETE SET NULL,
  medicine_name TEXT NOT NULL,
  batch_no TEXT,
  expiry_date TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  mrp NUMERIC(10,2),
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  frequency TEXT,
  duration_days INTEGER,
  is_returned BOOLEAN DEFAULT false,
  returned_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage invoice items" ON public.invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- PURCHASE ORDERS TABLE
-- =============================================
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  status TEXT DEFAULT 'Draft',
  subtotal NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  grn_date TIMESTAMPTZ,
  grn_number TEXT,
  invoice_number TEXT,
  invoice_date TEXT,
  payment_status TEXT DEFAULT 'Unpaid',
  payment_due_date DATE,
  payment_date DATE,
  payment_amount NUMERIC(10,2),
  payment_notes TEXT,
  is_service_po BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage purchase orders" ON public.purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- PURCHASE ORDER ITEMS TABLE
-- =============================================
CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  stock_item_id INTEGER REFERENCES public.stock_items(item_id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  received_quantity INTEGER DEFAULT 0,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  mrp NUMERIC(10,2),
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  batch_no TEXT,
  expiry_date TEXT,
  free_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage PO items" ON public.purchase_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- SUPPLIER PAYMENTS TABLE
-- =============================================
CREATE TABLE public.supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  payment_method TEXT,
  reference_number TEXT,
  status TEXT DEFAULT 'Completed',
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage supplier payments" ON public.supplier_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- EMPLOYEES TABLE
-- =============================================
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  designation TEXT,
  department TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  date_of_joining DATE,
  salary NUMERIC(10,2) DEFAULT 0,
  bank_account_number TEXT,
  bank_name TEXT,
  ifsc_code TEXT,
  pan_number TEXT,
  aadhar_number TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view employees" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage employees" ON public.employees FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- =============================================
-- SALARY RECORDS TABLE
-- =============================================
CREATE TABLE public.salary_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  basic_salary NUMERIC(10,2) DEFAULT 0,
  allowances NUMERIC(10,2) DEFAULT 0,
  deductions NUMERIC(10,2) DEFAULT 0,
  advances NUMERIC(10,2) DEFAULT 0,
  net_salary NUMERIC(10,2) DEFAULT 0,
  payment_date DATE,
  payment_method TEXT,
  status TEXT DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, month, year)
);

ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage salary records" ON public.salary_records FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- =============================================
-- DAY REPORTS TABLE
-- =============================================
CREATE TABLE public.day_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL UNIQUE,
  new_patients INTEGER DEFAULT 0,
  follow_up_patients INTEGER DEFAULT 0,
  cash_previous_day NUMERIC(10,2) DEFAULT 0,
  loose_balance NUMERIC(10,2) DEFAULT 0,
  deposit_in_bank NUMERIC(10,2) DEFAULT 0,
  paytm_gpay NUMERIC(10,2) DEFAULT 0,
  cash_handover_amarjeet NUMERIC(10,2) DEFAULT 0,
  cash_handover_mandeep NUMERIC(10,2) DEFAULT 0,
  cash_handover_sir NUMERIC(10,2) DEFAULT 0,
  adjustments NUMERIC(10,2) DEFAULT 0,
  tapentadol_patients INTEGER DEFAULT 0,
  psychiatry_patients INTEGER DEFAULT 0,
  fees NUMERIC(10,2) DEFAULT 0,
  lab_collection NUMERIC(10,2) DEFAULT 0,
  psychiatry_collection NUMERIC(10,2) DEFAULT 0,
  stock_snapshot JSONB,
  cash_denominations JSONB,
  expenses JSONB,
  advances JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

ALTER TABLE public.day_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage day reports" ON public.day_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- APP SETTINGS TABLE
-- =============================================
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage settings" ON public.app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- SEQUENCE NUMBERS TABLE
-- =============================================
CREATE TABLE public.sequence_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_type TEXT NOT NULL UNIQUE,
  current_value INTEGER NOT NULL DEFAULT 0,
  prefix TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sequence_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage sequences" ON public.sequence_numbers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Initialize sequence numbers
INSERT INTO public.sequence_numbers (sequence_type, current_value, prefix) VALUES
  ('invoice', 0, 'NH/INV-'),
  ('patient', 0, 'NH/PAT-'),
  ('prescription', 0, 'NH/RX-'),
  ('purchase_order', 0, 'NH/PO-'),
  ('grn', 0, 'NH/GRN-');

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_supplier_payments_updated_at BEFORE UPDATE ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_salary_records_updated_at BEFORE UPDATE ON public.salary_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_day_reports_updated_at BEFORE UPDATE ON public.day_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- DAILY STOCK SNAPSHOT FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.snapshot_opening_stock()
RETURNS void AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  snapshot_data JSONB;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'item_id', item_id,
    'name', name,
    'category', category,
    'current_stock', current_stock,
    'batch_no', batch_no
  ))
  INTO snapshot_data
  FROM public.stock_items;
  
  INSERT INTO public.day_reports (report_date, stock_snapshot)
  VALUES (today_date, snapshot_data)
  ON CONFLICT (report_date) 
  DO UPDATE SET stock_snapshot = snapshot_data, updated_at = now();
END;
$$ LANGUAGE plpgsql SET search_path = public;