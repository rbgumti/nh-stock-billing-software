-- Add "file No." column to patients table
ALTER TABLE patients ADD COLUMN "file No." text NOT NULL DEFAULT '';