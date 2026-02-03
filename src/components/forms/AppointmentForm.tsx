import { useState, useEffect } from "react";
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
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PatientSearchSelect } from "@/components/PatientSearchSelect";
import { loadAllPatients, Patient } from "@/lib/patientUtils";
import { PATIENT_CATEGORIES } from "@/hooks/usePatientForm";

// Get next available time slot (rounded to next 5 minutes)
const getNextTimeSlot = (): string => {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 5) * 5;
  now.setMinutes(roundedMinutes);
  now.setSeconds(0);
  if (roundedMinutes >= 60) {
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
  }
  return format(now, 'HH:mm');
};

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    appointment ? new Date(appointment.appointment_date) : new Date()
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
          appointment_date: new Date(),
          appointment_time: getNextTimeSlot(),
          duration_minutes: 2,
          status: "Confirmed",
        },
  });

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const data = await loadAllPatients();
      setPatients(data);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast.error('Failed to load patients');
    }
  };

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

  const handlePatientSelect = (patient: Patient) => {
    setValue('patient_id', patient.id);
    setValue('patient_name', patient.patient_name);
    setValue('patient_phone', patient.phone || '');
  };

  const selectedPatient = patients.find(p => p.id === watch('patient_id'));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2 relative">
        <PatientSearchSelect
          patients={patients}
          selectedPatientId={watch("patient_id")}
          onPatientSelect={handlePatientSelect}
        />
        {errors.patient_id && (
          <p className="text-sm text-destructive">{errors.patient_id.message}</p>
        )}
      </div>

      {selectedPatient && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1 border">
          <div className="font-medium text-foreground">{selectedPatient.patient_name}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
            <div><span className="font-medium">S/O, D/O:</span> {selectedPatient.father_name || '-'}</div>
            <div><span className="font-medium">Age:</span> {selectedPatient.age || '-'}</div>
            <div><span className="font-medium">Phone:</span> {selectedPatient.phone || '-'}</div>
            <div><span className="font-medium">Category:</span> {selectedPatient.category || '-'}</div>
            <div className="col-span-2"><span className="font-medium">Address:</span> {selectedPatient.address || '-'}</div>
          </div>
        </div>
      )}

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
        <Select
          onValueChange={(value) => setValue('reason', value)}
          defaultValue={watch('reason')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {PATIENT_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
