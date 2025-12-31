import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Plus, Clock, User, Phone, FileText, Pill, ChevronLeft, ChevronRight, ArrowUpDown, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addWeeks, subWeeks, addMonths, subMonths, isToday } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AppointmentForm } from "@/components/forms/AppointmentForm";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  reminder_sent: boolean;
}

type ViewMode = "day" | "week" | "month";

export default function Appointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [sortOrder, setSortOrder] = useState<"earliest" | "latest">("latest");
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [dropTargetDate, setDropTargetDate] = useState<Date | null>(null);
  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return aptDate.toDateString() === date.toDateString();
    }).sort((a, b) => {
      const timeA = new Date(a.appointment_date).getTime();
      const timeB = new Date(b.appointment_date).getTime();
      return sortOrder === "latest" ? timeB - timeA : timeA - timeB;
    });
  };

  const getDatesWithAppointments = () => {
    return appointments.map(apt => new Date(apt.appointment_date));
  };

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;
      
      await loadAppointments();
      toast.success('Appointment status updated');
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    }
  };

  const handleDelete = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;
      
      await loadAppointments();
      toast.success('Appointment deleted');
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast.error('Failed to delete appointment');
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setEditingAppointment(null);
    loadAppointments();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-gradient-to-r from-lime to-emerald text-white border-0';
      case 'Completed': return 'bg-gradient-to-r from-teal to-cyan text-white border-0';
      case 'Cancelled': return 'bg-gradient-to-r from-destructive to-orange text-white border-0';
      case 'No-Show': return 'bg-gradient-to-r from-destructive to-orange text-white border-0';
      default: return 'bg-gradient-to-r from-cyan to-teal text-white border-0';
    }
  };

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-lime';
      case 'Completed': return 'bg-teal';
      case 'Cancelled': return 'bg-destructive';
      case 'No-Show': return 'bg-destructive';
      default: return 'bg-cyan';
    }
  };

  // Navigation functions
  const navigatePrev = () => {
    if (viewMode === "week") {
      setSelectedDate(subWeeks(selectedDate, 1));
    } else if (viewMode === "month") {
      setSelectedDate(subMonths(selectedDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === "week") {
      setSelectedDate(addWeeks(selectedDate, 1));
    } else if (viewMode === "month") {
      setSelectedDate(addMonths(selectedDate, 1));
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Get week days
  const getWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  // Get month days
  const getMonthDays = () => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    return eachDayOfInterval({ start, end });
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, appointment: Appointment) => {
    setDraggedAppointment(appointment);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', appointment.id);
  };

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetDate(date);
  };

  const handleDragLeave = () => {
    setDropTargetDate(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    setDropTargetDate(null);
    
    if (!draggedAppointment) return;

    const originalDate = new Date(draggedAppointment.appointment_date);
    const newDate = new Date(targetDate);
    // Keep the original time, just change the date
    newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds());

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ appointment_date: newDate.toISOString() })
        .eq('id', draggedAppointment.id);

      if (error) throw error;

      await loadAppointments();
      toast.success(`Appointment moved to ${format(newDate, 'MMM d, yyyy')}`);
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast.error('Failed to reschedule appointment');
    }

    setDraggedAppointment(null);
  };

  const handleDragEnd = () => {
    setDraggedAppointment(null);
    setDropTargetDate(null);
  };

  const dayAppointments = getAppointmentsForDate(selectedDate);
  const upcomingAppointments = appointments
    .filter(apt => new Date(apt.appointment_date) >= new Date() && apt.status !== 'Cancelled' && apt.status !== 'Completed')
    .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground">Loading appointments...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderAppointmentCard = (appointment: Appointment, compact: boolean = false) => (
    <div
      key={appointment.id}
      className={cn(
        "border border-teal/20 rounded-lg bg-white/80 backdrop-blur-sm",
        compact ? "p-2 text-xs" : "p-4 space-y-2"
      )}
    >
      <div className={cn("flex items-start", compact ? "flex-col gap-1" : "justify-between")}>
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Clock className={cn("text-teal", compact ? "h-3 w-3" : "h-4 w-4")} />
            <span className={cn("font-medium text-teal", compact && "text-xs")}>
              {format(new Date(appointment.appointment_date), 'h:mm a')}
            </span>
            <Badge className={cn(getStatusColor(appointment.status), compact && "text-[10px] px-1 py-0")}>
              {appointment.status}
            </Badge>
          </div>
          <div className={cn("flex items-center gap-2", compact && "text-xs")}>
            <User className={cn("text-cyan", compact ? "h-3 w-3" : "h-4 w-4")} />
            <span className="truncate">{appointment.patient_name}</span>
          </div>
          {!compact && appointment.patient_phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 text-lime" />
              <span>{appointment.patient_phone}</span>
            </div>
          )}
          {!compact && (
            <div className="text-sm">
              <span className="font-medium text-teal">Reason:</span> {appointment.reason}
            </div>
          )}
          {!compact && appointment.notes && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-cyan">Notes:</span> {appointment.notes}
            </div>
          )}
        </div>
        {!compact && (
          <div className="flex flex-wrap gap-2">
            {appointment.status === 'Scheduled' && (
              <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(appointment.id, 'Confirmed')} className="border-lime/30 hover:bg-lime/10 hover:border-lime">
                Confirm
              </Button>
            )}
            {(appointment.status === 'Scheduled' || appointment.status === 'Confirmed') && (
              <>
                <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(appointment.id, 'Completed')} className="border-teal/30 hover:bg-teal/10 hover:border-teal">
                  Complete
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-lime to-emerald hover:from-lime/90 hover:to-emerald/90 text-white"
                  onClick={() => navigate(`/prescriptions/new?appointmentId=${appointment.id}`)}
                >
                  <Pill className="h-3 w-3 mr-1" />
                  Prescribe
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={() => handleEdit(appointment)} className="border-cyan/30 hover:bg-cyan/10 hover:border-cyan">
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleDelete(appointment.id)}>
              Delete
            </Button>
          </div>
        )}
      </div>
      {compact && (
        <div className="flex gap-1 mt-1">
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs hover:bg-teal/10" onClick={() => handleEdit(appointment)}>
            Edit
          </Button>
          {(appointment.status === 'Scheduled' || appointment.status === 'Confirmed') && (
            <Button
              size="sm"
              className="h-6 px-2 text-xs bg-gradient-to-r from-lime to-emerald hover:from-lime/90 hover:to-emerald/90 text-white"
              onClick={() => navigate(`/prescriptions/new?appointmentId=${appointment.id}`)}
            >
              Rx
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    
    return (
      <Card className="border-teal/20 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="bg-gradient-to-r from-teal to-cyan bg-clip-text text-transparent">
              Week of {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday} className="border-teal/30 hover:bg-teal/10 hover:border-teal">Today</Button>
              <Button variant="outline" size="icon" onClick={navigatePrev} className="border-teal/30 hover:bg-teal/10 hover:border-teal">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={navigateNext} className="border-teal/30 hover:bg-teal/10 hover:border-teal">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayAppts = getAppointmentsForDate(day);
              const isDropTarget = dropTargetDate && isSameDay(day, dropTargetDate);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border border-teal/20 rounded-lg p-2 min-h-[200px] cursor-pointer transition-colors bg-white/60",
                    isToday(day) && "border-teal border-2",
                    isSameDay(day, selectedDate) && "bg-teal/10",
                    isDropTarget && "bg-lime/20 border-lime border-dashed",
                    !isDropTarget && "hover:bg-teal/5"
                  )}
                  onClick={() => {
                    if (!draggedAppointment) {
                      setSelectedDate(day);
                      setViewMode("day");
                    }
                  }}
                  onDragOver={(e) => handleDragOver(e, day)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day)}
                >
                  <div className={cn(
                    "text-sm font-medium mb-2 text-center",
                    isToday(day) && "text-teal"
                  )}>
                    <div>{format(day, 'EEE')}</div>
                    <div className={cn(
                      "text-lg",
                      isToday(day) && "bg-gradient-to-r from-teal to-cyan text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                    )}>
                      {format(day, 'd')}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {dayAppts.slice(0, 3).map((apt) => (
                      <div
                        key={apt.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, apt)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "text-xs p-1 rounded bg-gradient-to-r from-teal/10 to-cyan/10 truncate flex items-center gap-1 cursor-grab active:cursor-grabbing",
                          draggedAppointment?.id === apt.id && "opacity-50"
                        )}
                        title={`${apt.patient_name} - ${apt.reason} (Drag to reschedule)`}
                      >
                        <GripVertical className="h-3 w-3 text-teal flex-shrink-0" />
                        <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", getStatusDotColor(apt.status))} />
                        <span className="truncate">{format(new Date(apt.appointment_date), 'h:mm a')} {apt.patient_name}</span>
                      </div>
                    ))}
                    {dayAppts.length > 3 && (
                      <div className="text-xs text-teal text-center">
                        +{dayAppts.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMonthView = () => {
    const monthDays = getMonthDays();
    const startDay = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 });
    const endDay = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start: startDay, end: endDay });

    return (
      <Card className="border-teal/20 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="bg-gradient-to-r from-teal to-cyan bg-clip-text text-transparent">{format(selectedDate, 'MMMM yyyy')}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday} className="border-teal/30 hover:bg-teal/10 hover:border-teal">Today</Button>
              <Button variant="outline" size="icon" onClick={navigatePrev} className="border-teal/30 hover:bg-teal/10 hover:border-teal">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={navigateNext} className="border-teal/30 hover:bg-teal/10 hover:border-teal">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-teal py-2">
                {day}
              </div>
            ))}
            {allDays.map((day) => {
              const dayAppts = getAppointmentsForDate(day);
              const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
              const isDropTarget = dropTargetDate && isSameDay(day, dropTargetDate);
              
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border border-teal/10 rounded p-1 min-h-[80px] cursor-pointer transition-colors bg-white/60",
                    !isCurrentMonth && "opacity-40",
                    isToday(day) && "border-teal border-2",
                    isSameDay(day, selectedDate) && "bg-teal/10",
                    isDropTarget && "bg-lime/20 border-lime border-dashed",
                    !isDropTarget && "hover:bg-teal/5"
                  )}
                  onClick={() => {
                    if (!draggedAppointment) {
                      setSelectedDate(day);
                      setViewMode("day");
                    }
                  }}
                  onDragOver={(e) => handleDragOver(e, day)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day)}
                >
                  <div className={cn(
                    "text-xs font-medium mb-1",
                    isToday(day) && "text-teal"
                  )}>
                    <span className={cn(
                      isToday(day) && "bg-gradient-to-r from-teal to-cyan text-white rounded-full w-5 h-5 flex items-center justify-center"
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {dayAppts.slice(0, 2).map((apt) => (
                      <div
                        key={apt.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, apt)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "text-[10px] p-0.5 rounded bg-gradient-to-r from-teal/10 to-cyan/10 truncate flex items-center gap-0.5 cursor-grab active:cursor-grabbing",
                          draggedAppointment?.id === apt.id && "opacity-50"
                        )}
                        title={`${apt.patient_name} - ${apt.reason} (Drag to reschedule)`}
                      >
                        <div className={cn("w-1 h-1 rounded-full flex-shrink-0", getStatusDotColor(apt.status))} />
                        <span className="truncate">{apt.patient_name}</span>
                      </div>
                    ))}
                    {dayAppts.length > 2 && (
                      <div className="text-[10px] text-teal">
                        +{dayAppts.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal via-cyan to-lime bg-clip-text text-transparent">Appointments</h1>
          <p className="text-muted-foreground mt-1">Manage patient appointments and schedules</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingAppointment(null);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-teal to-cyan hover:from-teal/90 hover:to-cyan/90 text-white shadow-lg hover:shadow-teal/25 transition-all duration-300">
              <Plus className="mr-2 h-4 w-4" />
              New Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-teal/20">
            <DialogHeader>
              <DialogTitle className="bg-gradient-to-r from-teal to-cyan bg-clip-text text-transparent">{editingAppointment ? 'Edit Appointment' : 'Schedule New Appointment'}</DialogTitle>
            </DialogHeader>
            <AppointmentForm 
              appointment={editingAppointment} 
              onSuccess={handleFormSuccess}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList className="bg-gradient-to-r from-teal/10 via-cyan/10 to-lime/10 p-1">
            <TabsTrigger value="day" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal data-[state=active]:to-cyan data-[state=active]:text-white">Day</TabsTrigger>
            <TabsTrigger value="week" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal data-[state=active]:to-cyan data-[state=active]:text-white">Week</TabsTrigger>
            <TabsTrigger value="month" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal data-[state=active]:to-cyan data-[state=active]:text-white">Month</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder(sortOrder === "latest" ? "earliest" : "latest")}
          className="gap-2 border-teal/30 hover:bg-teal/10 hover:border-teal"
        >
          <ArrowUpDown className="h-4 w-4 text-teal" />
          {sortOrder === "latest" ? "Latest First" : "Earliest First"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="group relative overflow-hidden border-teal/20 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-teal/10 via-transparent to-cyan/10 opacity-50 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-teal to-cyan">
              <CalendarIcon className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold bg-gradient-to-r from-teal to-cyan bg-clip-text text-transparent">{appointments.length}</div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-cyan/20 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan/10 via-transparent to-lime/10 opacity-50 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan to-lime">
              <Clock className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold bg-gradient-to-r from-cyan to-lime bg-clip-text text-transparent">{upcomingAppointments.length}</div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-lime/20 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-lime/10 via-transparent to-emerald/10 opacity-50 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-lime to-emerald">
              <CalendarIcon className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold bg-gradient-to-r from-lime to-emerald bg-clip-text text-transparent">{getAppointmentsForDate(new Date()).length}</div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-emerald/20 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald/10 via-transparent to-teal/10 opacity-50 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald to-teal">
              <FileText className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold bg-gradient-to-r from-emerald to-teal bg-clip-text text-transparent">
              {appointments.filter(a => a.status === 'Completed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Views */}
      {viewMode === "week" && renderWeekView()}
      {viewMode === "month" && renderMonthView()}

      {viewMode === "day" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-1 border-teal/20 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-teal">Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className={cn("rounded-md border border-teal/20 pointer-events-auto")}
                modifiers={{
                  booked: getDatesWithAppointments(),
                }}
                modifiersStyles={{
                  booked: { fontWeight: 'bold', textDecoration: 'underline', color: 'hsl(var(--teal))' }
                }}
              />
            </CardContent>
          </Card>

          {/* Selected Day Appointments */}
          <Card className="lg:col-span-2 border-cyan/20 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-teal to-cyan bg-clip-text text-transparent">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-teal/10 to-cyan/10 text-teal text-xs">
                  {dayAppointments.length} appointment{dayAppointments.length !== 1 ? 's' : ''}
                </span>
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dayAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal/20 to-cyan/20 flex items-center justify-center">
                      <CalendarIcon className="h-8 w-8 text-teal" />
                    </div>
                    <p className="text-muted-foreground">No appointments scheduled</p>
                  </div>
                ) : (
                  dayAppointments.map((appointment) => renderAppointmentCard(appointment))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Appointments */}
      <Card className="border-teal/20 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-teal to-cyan bg-clip-text text-transparent">Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal/20 to-cyan/20 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-teal" />
                </div>
                <p className="text-muted-foreground">No upcoming appointments</p>
              </div>
            ) : (
              upcomingAppointments.map((appointment, index) => (
                <div
                  key={appointment.id}
                  className={`flex items-center justify-between p-3 border border-teal/20 rounded-lg bg-gradient-to-br ${
                    index % 3 === 0 ? 'from-teal/5 to-cyan/5' :
                    index % 3 === 1 ? 'from-cyan/5 to-lime/5' :
                    'from-lime/5 to-emerald/5'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-teal">{appointment.patient_name}</span>
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(appointment.appointment_date), 'MMM d, yyyy • h:mm a')} • {appointment.reason}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(appointment)} className="border-teal/30 hover:bg-teal/10 hover:border-teal">
                      Edit
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
