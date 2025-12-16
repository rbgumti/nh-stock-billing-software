import { z } from 'zod';

// Prescription validation schemas
export const prescriptionFormSchema = z.object({
  patient_id: z.number().positive('Patient must be selected'),
  patient_name: z.string().trim().min(1, 'Patient name is required').max(200, 'Name must be less than 200 characters'),
  patient_phone: z.string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number format')
    .optional()
    .or(z.literal('')),
  patient_age: z.string()
    .regex(/^\d{1,3}$/, 'Age must be a valid number')
    .optional()
    .or(z.literal('')),
  diagnosis: z.string().trim().min(1, 'Diagnosis is required').max(500, 'Diagnosis must be less than 500 characters'),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional().or(z.literal('')),
  appointment_id: z.string().optional().or(z.literal('')),
});

export const prescriptionItemSchema = z.object({
  medicine_name: z.string().trim().min(1, 'Medicine name is required').max(200, 'Medicine name too long'),
  dosage: z.string().trim().min(1, 'Dosage is required').max(50, 'Dosage too long'),
  frequency: z.string().trim().min(1, 'Frequency is required').max(100, 'Frequency too long'),
  duration: z.string().trim().min(1, 'Duration is required').max(50, 'Duration too long'),
  quantity: z.number().int().positive('Quantity must be positive').max(10000, 'Quantity too large'),
  instructions: z.string().max(500, 'Instructions too long').optional().or(z.literal('')),
});

export const prescriptionItemsArraySchema = z.array(prescriptionItemSchema).min(1, 'At least one medicine is required');

// Type exports
export type PrescriptionFormInput = z.infer<typeof prescriptionFormSchema>;
export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;
