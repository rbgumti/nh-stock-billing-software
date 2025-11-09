-- Create prescriptions table
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_number TEXT NOT NULL UNIQUE,
  patient_id INTEGER NOT NULL,
  patient_name TEXT NOT NULL,
  patient_phone TEXT,
  patient_age TEXT,
  diagnosis TEXT NOT NULL,
  notes TEXT,
  prescription_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Dispensed', 'Cancelled'))
);

-- Create prescription items table
CREATE TABLE prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for prescriptions
CREATE POLICY "Authenticated users can view prescriptions"
ON prescriptions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert prescriptions"
ON prescriptions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update prescriptions"
ON prescriptions FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete prescriptions"
ON prescriptions FOR DELETE
USING (auth.uid() IS NOT NULL);

-- RLS policies for prescription items
CREATE POLICY "Authenticated users can view prescription items"
ON prescription_items FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert prescription items"
ON prescription_items FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update prescription items"
ON prescription_items FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete prescription items"
ON prescription_items FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Add updated_at trigger for prescriptions
CREATE TRIGGER update_prescriptions_updated_at
BEFORE UPDATE ON prescriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_prescriptions_date ON prescriptions(prescription_date);
CREATE INDEX idx_prescription_items_prescription_id ON prescription_items(prescription_id);