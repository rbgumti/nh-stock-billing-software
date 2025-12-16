import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const appointmentSchema = z.object({
  patient_id: z.number({ required_error: "Please select a patient" }),
  patient_name: z.string().min(1, "Patient name is required"),
  patient_phone: z.string().optional(),
  appointment_date: z.date({ required_error: "Please select a date" }),
  appointment_time: z.string().min(1, "Please select a time"),
  duration_minutes: z.number().min(2, "Duration must be at least 2 minutes"),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
  status: z.string(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface Patient {
  id: number;
  patient_name: string;
  phone: string;
  file_no: string;
  aadhar_card: string;
}

interface Appointment {
  id: string;
  patient_id: number;
  patient_name: string;
  patient_phone: string | null;
  appointment_date: string;
  duration_minutes: number;
  reason: string;
  notes: string | null;
  status: string;
}

interface AppointmentFormProps {
  appointment?: Appointment | null;
  onSuccess: () => void;
}

export function AppointmentForm({ appointment, onSuccess }: AppointmentFormProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    appointment ? new Date(appointment.appointment_date) : undefined
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: appointment
      ? {
          patient_id: appointment.patient_id,
          patient_name: appointment.patient_name,
          patient_phone: appointment.patient_phone || "",
          appointment_date: new Date(appointment.appointment_date),
          appointment_time: format(new Date(appointment.appointment_date), 'HH:mm'),
          duration_minutes: appointment.duration_minutes,
          reason: appointment.reason,
          notes: appointment.notes || "",
          status: appointment.status,
        }
      : {
          duration_minutes: 30,
          status: "Scheduled",
        },
  });

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, patient_name, phone, file_no, aadhar_card')
        .order('patient_name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast.error('Failed to load patients');
    }
  };

  // Filter patients based on search query (ID, phone, name, file no, aadhar)
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    
    const query = searchQuery.toLowerCase().trim();
    return patients.filter((patient) => {
      const idMatch = patient.id.toString().includes(query);
      const nameMatch = patient.patient_name?.toLowerCase().includes(query);
      const phoneMatch = patient.phone?.toLowerCase().includes(query);
      const fileNoMatch = patient.file_no?.toLowerCase().includes(query);
      const aadharMatch = patient.aadhar_card?.toLowerCase().includes(query);
      
      return idMatch || nameMatch || phoneMatch || fileNoMatch || aadharMatch;
    });
  }, [patients, searchQuery]);

  const onSubmit = async (data: AppointmentFormData) => {
    setLoading(true);
    try {
      // Combine date and time
      const [hours, minutes] = data.appointment_time.split(':');
      const appointmentDateTime = new Date(data.appointment_date);
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const appointmentData = {
        patient_id: data.patient_id,
        patient_name: data.patient_name,
        patient_phone: data.patient_phone || null,
        appointment_date: appointmentDateTime.toISOString(),
        duration_minutes: data.duration_minutes,
        reason: data.reason,
        notes: data.notes || null,
        status: data.status,
        reminder_sent: false,
      };

      if (appointment) {
        // Update existing appointment
        const { error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', appointment.id);

        if (error) throw error;
        toast.success('Appointment updated successfully');
      } else {
        // Create new appointment
        const { error } = await supabase
          .from('appointments')
          .insert(appointmentData);

        if (error) throw error;
        toast.success('Appointment scheduled successfully');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast.error('Failed to save appointment');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientChange = (patientId: string) => {
    const patient = patients.find(p => p.id === parseInt(patientId));
    if (patient) {
      setValue('patient_id', patient.id);
      setValue('patient_name', patient.patient_name);
      setValue('patient_phone', patient.phone || '');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="patient">Patient *</Label>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, Name, Phone, File No, or Aadhar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          onValueChange={handlePatientChange}
          defaultValue={appointment?.patient_id.toString()}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a patient" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {filteredPatients.length === 0 ? (
              <div className="py-2 px-3 text-sm text-muted-foreground">No patients found</div>
            ) : (
              filteredPatients.map((patient) => (
                <SelectItem key={patient.id} value={patient.id.toString()}>
                  <span className="font-medium">{patient.patient_name}</span>
                  <span className="text-muted-foreground text-xs ml-2">
                    ID: {patient.id} {patient.phone && `| Ph: ${patient.phone}`} {patient.file_no && `| File: ${patient.file_no}`}
                  </span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.patient_id && (
          <p className="text-sm text-destructive">{errors.patient_id.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Appointment Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  if (date) setValue('appointment_date', date);
                }}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {errors.appointment_date && (
            <p className="text-sm text-destructive">{errors.appointment_date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="appointment_time">Time *</Label>
          <Input
            id="appointment_time"
            type="time"
            {...register('appointment_time')}
          />
          {errors.appointment_time && (
            <p className="text-sm text-destructive">{errors.appointment_time.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration_minutes">Duration (minutes) *</Label>
        <Select
          onValueChange={(value) => setValue('duration_minutes', parseInt(value))}
          defaultValue={watch('duration_minutes')?.toString()}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 minutes</SelectItem>
            <SelectItem value="5">5 minutes</SelectItem>
            <SelectItem value="10">10 minutes</SelectItem>
            <SelectItem value="15">15 minutes</SelectItem>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="45">45 minutes</SelectItem>
            <SelectItem value="60">60 minutes</SelectItem>
          </SelectContent>
        </Select>
        {errors.duration_minutes && (
          <p className="text-sm text-destructive">{errors.duration_minutes.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason for Visit *</Label>
        <Input
          id="reason"
          placeholder="e.g., Annual checkup, Follow-up visit"
          {...register('reason')}
        />
        {errors.reason && (
          <p className="text-sm text-destructive">{errors.reason.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          onValueChange={(value) => setValue('status', value)}
          defaultValue={watch('status')}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Scheduled">Scheduled</SelectItem>
            <SelectItem value="Confirmed">Confirmed</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
            <SelectItem value="No-Show">No-Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes or special instructions"
          rows={3}
          {...register('notes')}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : appointment ? 'Update Appointment' : 'Schedule Appointment'}
        </Button>
      </div>
    </form>
  );
}
