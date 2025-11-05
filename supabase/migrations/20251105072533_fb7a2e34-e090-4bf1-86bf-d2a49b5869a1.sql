-- Add new auto-incrementing ID column
ALTER TABLE patients ADD COLUMN id SERIAL;

-- Drop the old primary key constraint on 'Fill no.'
ALTER TABLE patients DROP CONSTRAINT patients_pkey;

-- Set the new id column as the primary key
ALTER TABLE patients ADD PRIMARY KEY (id);

-- Create an index on 'S.No.' for lookups (keeping it for display purposes)
CREATE INDEX IF NOT EXISTS idx_patients_sno ON patients ("S.No.");