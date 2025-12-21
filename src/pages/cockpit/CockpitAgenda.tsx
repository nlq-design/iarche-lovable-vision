import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Video, MapPin, ChevronLeft, ChevronRight, User, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCockpitBookings } from "@/hooks/cockpit";
import { format, isSameDay, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getBookingStatusConfig } from "@/lib/formatters";

const CockpitAgenda = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { 
    bookings, 
    isLoading, 
    stats, 
    todayBookings, 
    loadingToday, 
    upcomingBookings, 
    loadingUpcoming 
  } = useCockpitBookings();

  const formattedDate = format(currentDate, "EEEE d MMMM yyyy", { locale: fr });

  // Week days for mini calendar
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getStatusBadge = (status: string) => {
    const config = getBookingStatusConfig(status);
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const BookingCard = ({ booking }: { booking: any }) => (
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
      {booking.google_meet_link && (
        <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
          <a href={booking.google_meet_link} target="_blank" rel="noopener noreferrer">
            <Video className="h-3 w-3 mr-2" />
            Rejoindre
          </a>
        </Button>
      )}
    </div>
  );

  return (
    <CockpitLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
            <p className="text-muted-foreground capitalize">{formattedDate}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Video className="h-4 w-4 mr-2" />
              Sync Calendrier
            </Button>
            <Button size="sm">
              + Nouveau RDV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.thisWeek}</p>
                <p className="text-xs text-muted-foreground">Cette semaine</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.upcoming}</p>
                <p className="text-xs text-muted-foreground">À venir</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Terminés</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
                <p className="text-xs text-muted-foreground">Annulés</p>
              </div>
            </CardContent>
          </Card>
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

              {/* Day view */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">
                  {format(currentDate, "EEEE d MMMM", { locale: fr })}
                </h4>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : (
                  <>
                    {bookings.filter(b => 
                      isSameDay(new Date(b.start_time), currentDate) && b.status !== "cancelled"
                    ).length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <Calendar className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Aucun RDV ce jour</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {bookings
                          .filter(b => isSameDay(new Date(b.start_time), currentDate) && b.status !== "cancelled")
                          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                          .map((booking) => (
                            <BookingCard key={booking.id} booking={booking} />
                          ))}
                      </div>
                    )}
                  </>
                )}
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
              {loadingToday ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : todayBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Calendar className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm font-medium">Aucun RDV prévu</p>
                  <p className="text-xs text-center">Planifiez vos rendez-vous clients</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todayBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
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
    </CockpitLayout>
  );
};

export default CockpitAgenda;
