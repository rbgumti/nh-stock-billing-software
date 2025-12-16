export interface PrescriptionTemplateItem {
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface PrescriptionTemplate {
  id: string;
  name: string;
  diagnosis: string;
  notes?: string;
  items: PrescriptionTemplateItem[];
}

export const prescriptionTemplates: PrescriptionTemplate[] = [
  {
    id: "common-cold",
    name: "Common Cold / Flu",
    diagnosis: "Upper Respiratory Tract Infection",
    notes: "Rest advised. Drink plenty of fluids.",
    items: [
      { medicine_name: "Paracetamol 500mg", dosage: "500mg", frequency: "TDS", duration: "5", instructions: "After meals" },
      { medicine_name: "Cetirizine 10mg", dosage: "10mg", frequency: "OD", duration: "5", instructions: "At bedtime" },
      { medicine_name: "Ambroxol Syrup", dosage: "10ml", frequency: "TDS", duration: "5", instructions: "After meals" },
    ],
  },
  {
    id: "fever",
    name: "Fever",
    diagnosis: "Pyrexia of Unknown Origin",
    notes: "Sponging advised if temperature exceeds 101°F",
    items: [
      { medicine_name: "Paracetamol 650mg", dosage: "650mg", frequency: "TDS", duration: "3", instructions: "After meals, SOS if fever" },
    ],
  },
  {
    id: "gastritis",
    name: "Gastritis / Acidity",
    diagnosis: "Acute Gastritis",
    notes: "Avoid spicy food, alcohol, and smoking",
    items: [
      { medicine_name: "Pantoprazole 40mg", dosage: "40mg", frequency: "OD", duration: "14", instructions: "Before breakfast" },
      { medicine_name: "Domperidone 10mg", dosage: "10mg", frequency: "TDS", duration: "7", instructions: "Before meals" },
      { medicine_name: "Antacid Gel", dosage: "10ml", frequency: "TDS", duration: "7", instructions: "After meals" },
    ],
  },
  {
    id: "headache",
    name: "Headache / Migraine",
    diagnosis: "Tension Headache",
    notes: "Avoid screen time. Rest in dark room if migraine.",
    items: [
      { medicine_name: "Paracetamol 500mg", dosage: "500mg", frequency: "BD", duration: "3", instructions: "After meals" },
      { medicine_name: "Naproxen 250mg", dosage: "250mg", frequency: "BD", duration: "3", instructions: "After meals" },
    ],
  },
  {
    id: "allergy",
    name: "Allergic Reaction",
    diagnosis: "Allergic Rhinitis / Urticaria",
    notes: "Identify and avoid allergen",
    items: [
      { medicine_name: "Cetirizine 10mg", dosage: "10mg", frequency: "OD", duration: "7", instructions: "At bedtime" },
      { medicine_name: "Montelukast 10mg", dosage: "10mg", frequency: "OD", duration: "7", instructions: "At bedtime" },
    ],
  },
  {
    id: "diarrhea",
    name: "Diarrhea / Loose Motion",
    diagnosis: "Acute Gastroenteritis",
    notes: "ORS after every loose stool. Plenty of fluids.",
    items: [
      { medicine_name: "ORS Powder", dosage: "1 sachet", frequency: "4 Times a day", duration: "3", instructions: "Dissolve in 1L water" },
      { medicine_name: "Racecadotril 100mg", dosage: "100mg", frequency: "TDS", duration: "3", instructions: "Before meals" },
      { medicine_name: "Probiotics", dosage: "1 cap", frequency: "BD", duration: "5", instructions: "After meals" },
    ],
  },
  {
    id: "body-pain",
    name: "Body Pain / Muscle Pain",
    diagnosis: "Myalgia",
    notes: "Hot fomentation advised",
    items: [
      { medicine_name: "Diclofenac 50mg", dosage: "50mg", frequency: "BD", duration: "5", instructions: "After meals" },
      { medicine_name: "Thiocolchicoside 4mg", dosage: "4mg", frequency: "BD", duration: "5", instructions: "After meals" },
    ],
  },
  {
    id: "uti",
    name: "Urinary Tract Infection",
    diagnosis: "Lower Urinary Tract Infection",
    notes: "Increase water intake. Avoid holding urine.",
    items: [
      { medicine_name: "Norfloxacin 400mg", dosage: "400mg", frequency: "BD", duration: "5", instructions: "After meals" },
      { medicine_name: "Cranberry Extract", dosage: "1 cap", frequency: "BD", duration: "14", instructions: "After meals" },
    ],
  },
  {
    id: "hypertension",
    name: "Hypertension",
    diagnosis: "Essential Hypertension",
    notes: "Low salt diet. Regular BP monitoring.",
    items: [
      { medicine_name: "Amlodipine 5mg", dosage: "5mg", frequency: "OD", duration: "30", instructions: "Morning" },
    ],
  },
  {
    id: "diabetes",
    name: "Diabetes Type 2",
    diagnosis: "Type 2 Diabetes Mellitus",
    notes: "Diet control. Regular blood sugar monitoring.",
    items: [
      { medicine_name: "Metformin 500mg", dosage: "500mg", frequency: "BD", duration: "30", instructions: "After meals" },
    ],
  },
];

// Calculate quantity based on frequency and duration
export const calculateQuantity = (frequency: string, duration: string): number => {
  const durationDays = parseInt(duration) || 0;
  const frequencyMultipliers: Record<string, number> = {
    "OD": 1,
    "BD": 2,
    "TDS": 3,
    "4 Times a day": 4,
    "5 Times a day": 5,
  };
  return durationDays * (frequencyMultipliers[frequency] || 1);
};
