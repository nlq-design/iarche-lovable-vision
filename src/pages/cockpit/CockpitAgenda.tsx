import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Video, MapPin, ChevronLeft, ChevronRight, User, Building, RefreshCw, FileText, CheckSquare, AlertCircle, Phone, Mail, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCockpitBookings, useCockpitTasks } from "@/hooks/cockpit";
import { useGoogleCalendarEvents, type GoogleCalendarEvent } from "@/hooks/cockpit/useGoogleCalendarEvents";
import { format, isSameDay, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getBookingStatusConfig } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MeetingNoteSheet } from "@/components/cockpit/MeetingNoteSheet";
import type { Database } from "@/integrations/supabase/types";

type Booking = Database['public']['Tables']['bookings']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];

const CockpitAgenda = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const { 
    bookings, 
    isLoading, 
    stats, 
    todayBookings, 
    loadingToday, 
    upcomingBookings, 
    loadingUpcoming,
    refetch,
  } = useCockpitBookings();
  
  const { tasks, isLoading: tasksLoading } = useCockpitTasks();
  const { events: googleEvents, isLoading: loadingGoogleEvents, refetch: refetchGoogle } = useGoogleCalendarEvents();
  
  // Get Google Calendar events for a specific day (only non-synced ones to avoid duplicates)
  const getGoogleEventsForDay = (day: Date) => {
    return googleEvents.filter(e => 
      !e.isSynced && isSameDay(new Date(e.start), day)
    );
  };
  
  // Get tasks for current day
  const getTasksForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return tasks?.filter(t => 
      t.due_date === dateStr && t.status !== 'completed' && t.status !== 'cancelled'
    ) || [];
  };
  
  const currentDayTasks = getTasksForDay(currentDate);
  const todayTasks = getTasksForDay(new Date());

    const handleSyncCalendar = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-calendar', {
        body: { action: 'sync', daysAhead: 30, daysBefore: 7 }
      });

      if (error) throw error;

      if (data?.success) {
        const { results } = data;
        toast.success(`Synchronisation terminée`, {
          description: `${results.synced} nouveau(x) RDV importé(s), ${results.skipped} ignoré(s)`,
        });
        refetch();
        refetchGoogle();
      } else {
        throw new Error(data?.error || 'Erreur inconnue');
      }
    } catch (err) {
      console.error('Sync error:', err);
      toast.error('Erreur de synchronisation', {
        description: err instanceof Error ? err.message : 'Impossible de synchroniser avec Google Calendar',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const formattedDate = format(currentDate, "EEEE d MMMM yyyy", { locale: fr });

  // Week days for mini calendar
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getStatusBadge = (status: string) => {
    const config = getBookingStatusConfig(status);
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleCreateNote = (booking: Booking) => {
    setSelectedBooking(booking);
    setNoteSheetOpen(true);
  };

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <div className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-medium">
              {format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")}
            </span>
          </div>
          <p className="font-medium truncate">{booking.name}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{booking.email}</span>
          </div>
          {booking.company && (
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Building className="h-3 w-3" />
              <span className="truncate">{booking.company}</span>
            </div>
          )}
        </div>
        {getStatusBadge(booking.status)}
      </div>
      <div className="flex gap-2 mt-2">
        {booking.google_meet_link && (
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <a href={booking.google_meet_link} target="_blank" rel="noopener noreferrer">
              <Video className="h-3 w-3 mr-2" />
              Rejoindre
            </a>
          </Button>
        )}
        <Button 
          variant="secondary" 
          size="sm" 
          className="flex-1"
          onClick={() => handleCreateNote(booking)}
        >
          <FileText className="h-3 w-3 mr-2" />
          Créer CR
        </Button>
      </div>
    </div>
  );

  const TaskCard = ({ task }: { task: Task }) => {
    const getTaskIcon = (type: string | null) => {
      switch (type) {
        case 'call': return <Phone className="h-3 w-3" />;
        case 'email': return <Mail className="h-3 w-3" />;
        case 'meeting': return <Calendar className="h-3 w-3" />;
        default: return <CheckSquare className="h-3 w-3" />;
      }
    };

    // Check if task is AI-generated with transcription source
    const aiMeta = task.ai_metadata as any;
    const hasTranscriptionSource = aiMeta?.source_transcription_id;

    return (
      <div className="p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {task.priority === 'high' || task.priority === 'urgent' ? (
                <AlertCircle className="h-3 w-3 text-destructive" />
              ) : (
                getTaskIcon(task.task_type)
              )}
              {task.due_time && (
                <span className="text-sm font-medium">
                  {task.due_time.slice(0, 5)}
                </span>
              )}
            </div>
            <p className="font-medium truncate">{task.title}</p>
            {task.description && (
              <p className="text-xs text-muted-foreground truncate mt-1">{task.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="capitalize text-xs">{task.task_type}</Badge>
            {task.ai_generated && (
              <Badge 
                variant="secondary" 
                className="text-xs"
                title={hasTranscriptionSource ? "Créée depuis transcription" : "Générée par IA"}
              >
                {hasTranscriptionSource ? '🎙️ IA' : 'IA'}
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  const GoogleEventCard = ({ event }: { event: GoogleCalendarEvent }) => (
    <div className="p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-medium">
              {format(new Date(event.start), "HH:mm")} - {format(new Date(event.end), "HH:mm")}
            </span>
          </div>
          <p className="font-medium truncate">{event.summary}</p>
          {event.location && (
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
        <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 dark:text-blue-300">
          <Globe className="h-3 w-3 mr-1" />
          Google
        </Badge>
      </div>
      {event.meetLink && (
        <div className="mt-2">
          <Button variant="outline" size="sm" className="w-full" asChild>
            <a href={event.meetLink} target="_blank" rel="noopener noreferrer">
              <Video className="h-3 w-3 mr-2" />
              Rejoindre
            </a>
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <CockpitLayout>
      <div className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Agenda</h1>
            <p className="text-sm text-muted-foreground capitalize">{formattedDate}</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 text-sm"
              onClick={handleSyncCalendar}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Sync...' : 'Sync Google'}</span>
            </Button>
            <Button size="sm" className="h-8 text-sm">
              Nouveau RDV
            </Button>
          </div>
        </div>

        {/* Stats inline */}
        <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/40 rounded-lg border text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Semaine</span>
            <span className="font-semibold">{stats.thisWeek}</span>
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">À venir</span>
            <span className="font-semibold">{stats.upcoming}</span>
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Terminés</span>
            <span className="font-semibold text-emerald-600">{stats.completed}</span>
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Annulés</span>
            <span className="font-semibold text-red-500">{stats.cancelled}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar View */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Calendrier</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subDays(currentDate, 7))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {format(currentDate, "MMMM yyyy", { locale: fr })}
                </span>
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mini week view */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {weekDays.map((day) => {
                  const dayBookings = bookings.filter(b => 
                    isSameDay(new Date(b.start_time), day) && b.status !== "cancelled"
                  );
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setCurrentDate(day)}
                      className={`p-2 rounded-lg text-center transition-colors ${
                        isSameDay(day, currentDate) 
                          ? "bg-primary text-primary-foreground" 
                          : isToday 
                            ? "bg-primary/10 border border-primary"
                            : "hover:bg-accent"
                      }`}
                    >
                      <p className="text-xs font-medium uppercase">
                        {format(day, "EEE", { locale: fr })}
                      </p>
                      <p className="text-lg font-bold">{format(day, "d")}</p>
                      {dayBookings.length > 0 && (
                        <Badge variant="secondary" className="text-xs px-1">
                          {dayBookings.length}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Day view - Unified Timeline */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">
                  {format(currentDate, "EEEE d MMMM", { locale: fr })}
                </h4>
                {isLoading || tasksLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : (() => {
                  // Merge and sort tasks + bookings by time
                  const dayBookings = bookings.filter(b => 
                    isSameDay(new Date(b.start_time), currentDate) && b.status !== "cancelled"
                  );
                  
                  type TimelineItem = 
                    | { type: 'booking'; data: Booking; time: string }
                    | { type: 'task'; data: Task; time: string };
                  
                  const timeline: TimelineItem[] = [
                    ...dayBookings.map(b => ({ 
                      type: 'booking' as const, 
                      data: b, 
                      time: format(new Date(b.start_time), 'HH:mm') 
                    })),
                    ...currentDayTasks.map(t => ({ 
                      type: 'task' as const, 
                      data: t, 
                      time: t.due_time?.slice(0, 5) || '23:59' 
                    })),
                  ].sort((a, b) => a.time.localeCompare(b.time));
                  
                  if (timeline.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <Calendar className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Aucun événement ce jour</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-2">
                      {timeline.map((item, idx) => (
                        <div key={`${item.type}-${item.type === 'booking' ? item.data.id : item.data.id}-${idx}`} className="relative">
                          {/* Time indicator */}
                          <div className="absolute -left-1 top-3 text-xs text-muted-foreground font-mono w-10">
                            {item.time !== '23:59' ? item.time : ''}
                          </div>
                          <div className="ml-12">
                            {item.type === 'booking' ? (
                              <BookingCard booking={item.data} />
                            ) : (
                              <TaskCard task={item.data} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Today's Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Aujourd'hui
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingToday || tasksLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : todayBookings.length === 0 && todayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Calendar className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm font-medium">Aucun événement prévu</p>
                  <p className="text-xs text-center">Planifiez vos rendez-vous et tâches</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Today's tasks */}
                  {todayTasks.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Tâches</p>
                      <div className="space-y-2">
                        {todayTasks.map((task) => (
                          <TaskCard key={task.id} task={task} />
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Today's bookings */}
                  {todayBookings.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Rendez-vous</p>
                      <div className="space-y-2">
                        {todayBookings.map((booking) => (
                          <BookingCard key={booking.id} booking={booking} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Meetings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prochains rendez-vous</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUpcoming ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <p className="text-sm">Aucun rendez-vous à venir</p>
                <Button className="mt-4" variant="outline" size="sm">
                  <MapPin className="h-4 w-4 mr-2" />
                  Planifier un RDV
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingBookings.map((booking) => (
                  <div key={booking.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        {format(new Date(booking.start_time), "EEE d MMM", { locale: fr })}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(booking.start_time), "HH:mm")}
                      </span>
                    </div>
                    <p className="font-medium truncate">{booking.name}</p>
                    {booking.company && (
                      <p className="text-xs text-muted-foreground truncate">{booking.company}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Meeting Note Sheet */}
      <MeetingNoteSheet
        open={noteSheetOpen}
        onOpenChange={setNoteSheetOpen}
        booking={selectedBooking}
      />
    </CockpitLayout>
  );
};

export default CockpitAgenda;
