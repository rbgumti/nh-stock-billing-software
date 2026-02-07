import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PrescriptionItem {
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
}

interface PrescriptionRequest {
  prescription_number: string;
  patient_id: number;
  patient_name: string;
  patient_phone?: string;
  patient_age?: string;
  diagnosis: string;
  notes?: string;
  prescription_date: string;
  status: string;
  appointment_id?: string;
  items: PrescriptionItem[];
}

function validatePrescription(data: PrescriptionRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required field validation
  if (!data.prescription_number || data.prescription_number.trim() === "") {
    errors.push("Prescription number is required");
  }

  if (!data.patient_id || data.patient_id <= 0) {
    errors.push("Valid patient ID is required");
  }

  if (!data.patient_name || data.patient_name.trim() === "") {
    errors.push("Patient name is required");
  }

  if (!data.diagnosis || data.diagnosis.trim() === "") {
    errors.push("Diagnosis is required");
  }

  if (!data.prescription_date) {
    errors.push("Prescription date is required");
  }

  if (!data.status) {
    errors.push("Status is required");
  }

  // Items validation
  if (!data.items || data.items.length === 0) {
    errors.push("At least one medicine is required");
  } else {
    data.items.forEach((item, index) => {
      const itemNum = index + 1;
      if (!item.medicine_name || item.medicine_name.trim() === "") {
        errors.push(`Medicine ${itemNum}: Name is required`);
      }
      if (!item.dosage || item.dosage.trim() === "") {
        errors.push(`Medicine ${itemNum}: Dosage is required`);
      }
      if (!item.frequency || item.frequency.trim() === "") {
        errors.push(`Medicine ${itemNum}: Frequency is required`);
      }
      if (!item.duration || item.duration.trim() === "") {
        errors.push(`Medicine ${itemNum}: Duration is required`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Medicine ${itemNum}: Valid quantity is required`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Parse request body
    const prescriptionData: PrescriptionRequest = await req.json();
    console.log("Received prescription data:", JSON.stringify(prescriptionData, null, 2));

    // Validate
    const validation = validatePrescription(prescriptionData);
    if (!validation.valid) {
      console.log("Validation failed:", validation.errors);
      return new Response(
        JSON.stringify({ success: false, error: validation.errors.join("; ") }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify patient exists
    const { data: patientCheck, error: patientError } = await supabase
      .from("patients")
      .select("id")
      .eq("id", prescriptionData.patient_id)
      .single();

    if (patientError || !patientCheck) {
      console.error("Patient not found:", patientError);
      return new Response(
        JSON.stringify({ success: false, error: "Patient not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert prescription
    const { data: prescriptionResult, error: prescriptionError } = await supabase
      .from("prescriptions")
      .insert({
        prescription_number: prescriptionData.prescription_number,
        patient_id: prescriptionData.patient_id,
        patient_name: prescriptionData.patient_name,
        patient_phone: prescriptionData.patient_phone || null,
        patient_age: prescriptionData.patient_age || null,
        diagnosis: prescriptionData.diagnosis,
        notes: prescriptionData.notes || null,
        prescription_date: prescriptionData.prescription_date,
        status: prescriptionData.status,
        appointment_id: prescriptionData.appointment_id || null,
      })
      .select()
      .single();

    if (prescriptionError) {
      console.error("Prescription insert error:", prescriptionError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create prescription: ${prescriptionError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Prescription created:", prescriptionResult.id);

    // Insert prescription items
    if (prescriptionData.items.length > 0) {
      const itemsToInsert = prescriptionData.items.map((item) => ({
        prescription_id: prescriptionResult.id,
        medicine_name: item.medicine_name,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        quantity: item.quantity,
        instructions: item.instructions || "",
      }));

      const { error: itemsError } = await supabase
        .from("prescription_items")
        .insert(itemsToInsert);

      if (itemsError) {
        console.error("Prescription items insert error:", itemsError);
        // Rollback: delete the prescription
        await supabase.from("prescriptions").delete().eq("id", prescriptionResult.id);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to add medicines: ${itemsError.message}` 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Prescription created successfully:", prescriptionResult.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        prescription_id: prescriptionResult.id,
        message: "Prescription created successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
