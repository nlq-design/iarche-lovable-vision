import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Mail, Building, Phone, Video, ExternalLink, X, CheckCircle, Loader2, MapPin, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  start_time: string;
  end_time: string;
  status: string;
  meeting_type: string;
  google_meet_link: string | null;
  zoom_join_url: string | null;
  zoom_meeting_id: string | null;
  additional_guests: string[] | null;
  created_at: string;
  booking_types: {
    name: string;
    slug: string;
    duration_minutes: number;
  };
}

interface BookingType {
  id: string;
  name: string;
  slug: string;
  duration_minutes: number;
  is_active: boolean;
}

interface Availability {
  id: string;
  booking_type_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const DAYS_OF_WEEK = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const getMeetingTypeLabel = (type: string) => {
  switch (type) {
    case 'visio_meet': return 'Google Meet';
    case 'visio_zoom': return 'Zoom';
    case 'telephone': return 'Téléphone';
    case 'presentiel': return 'Présentiel';
    default: return type;
  }
};

const getMeetingTypeIcon = (type: string) => {
  switch (type) {
    case 'visio_meet':
    case 'visio_zoom':
      return <Video className="w-4 h-4" />;
    case 'telephone':
      return <Phone className="w-4 h-4" />;
    case 'presentiel':
      return <MapPin className="w-4 h-4" />;
    default:
      return <Video className="w-4 h-4" />;
  }
};

const AdminRendezVous = () => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeForAvail, setSelectedTypeForAvail] = useState<string>('');
  const [isSavingAvail, setIsSavingAvail] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedTypeForAvail) {
      loadAvailabilities(selectedTypeForAvail);
    }
  }, [selectedTypeForAvail]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bookingsRes, typesRes] = await Promise.all([
        supabase
          .from('bookings')
          .select(`
            *,
            booking_types (name, slug, duration_minutes)
          `)
          .order('start_time', { ascending: false }),
        supabase
          .from('booking_types')
          .select('*')
          .order('name'),
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (typesRes.error) throw typesRes.error;

      setBookings(bookingsRes.data || []);
      setBookingTypes(typesRes.data || []);
      
      // Set first type for availability management
      if (typesRes.data && typesRes.data.length > 0 && !selectedTypeForAvail) {
        setSelectedTypeForAvail(typesRes.data[0].id);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailabilities = async (typeId: string) => {
    try {
      const { data, error } = await supabase
        .from('booking_availability')
        .select('*')
        .eq('booking_type_id', typeId)
        .order('day_of_week');
      
      if (error) throw error;
      setAvailabilities(data || []);
    } catch (err) {
      console.error('Error loading availabilities:', err);
    }
  };

  const toggleAvailability = async (dayOfWeek: number) => {
    if (!selectedTypeForAvail) return;
    setIsSavingAvail(true);
    
    const existing = availabilities.find(a => a.day_of_week === dayOfWeek);
    
    try {
      if (existing) {
        // Toggle is_active
        const { error } = await supabase
          .from('booking_availability')
          .update({ is_active: !existing.is_active })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Create new availability
        const { error } = await supabase
          .from('booking_availability')
          .insert({
            booking_type_id: selectedTypeForAvail,
            day_of_week: dayOfWeek,
            start_time: '09:00:00',
            end_time: '18:00:00',
            is_active: true,
          });
        if (error) throw error;
      }
      
      await loadAvailabilities(selectedTypeForAvail);
      toast({ title: "Disponibilité mise à jour" });
    } catch (err) {
      console.error('Error toggling availability:', err);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la disponibilité.",
        variant: "destructive",
      });
    } finally {
      setIsSavingAvail(false);
    }
  };

  const updateAvailabilityTimes = async (availId: string, startTime: string, endTime: string) => {
    try {
      const { error } = await supabase
        .from('booking_availability')
        .update({ start_time: startTime, end_time: endTime })
        .eq('id', availId);
      
      if (error) throw error;
      await loadAvailabilities(selectedTypeForAvail);
      toast({ title: "Horaires mis à jour" });
    } catch (err) {
      console.error('Error updating times:', err);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les horaires.",
        variant: "destructive",
      });
    }
  };

  const updateStatus = async (bookingId: string, newStatus: string) => {
    try {
      if (newStatus === 'cancelled') {
        // Cancel via edge function to also remove from Google Calendar
        const { error } = await supabase.functions.invoke('calendar-booking', {
          body: { action: 'cancel-booking', bookingId },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bookings')
          .update({ status: newStatus })
          .eq('id', bookingId);
        if (error) throw error;
      }

      toast({
        title: "Statut mis à jour",
        description: `Le rendez-vous a été marqué comme "${newStatus}".`,
      });
      loadData();
    } catch (err) {
      console.error('Error updating status:', err);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut.",
        variant: "destructive",
      });
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (statusFilter !== 'all' && booking.status !== statusFilter) return false;
    if (typeFilter !== 'all' && booking.booking_types?.slug !== typeFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        booking.name.toLowerCase().includes(search) ||
        booking.email.toLowerCase().includes(search) ||
        booking.company?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Confirmé</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Annulé</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Terminé</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    pending: bookings.filter(b => b.status === 'pending').length,
    upcoming: bookings.filter(b => new Date(b.start_time) > new Date() && b.status !== 'cancelled').length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Rendez-vous</h1>
            <p className="text-muted-foreground">Gérez les réservations et créneaux</p>
          </div>
        </div>

        <Tabs defaultValue="bookings" className="w-full">
          <TabsList>
            <TabsTrigger value="bookings">Rendez-vous ({stats.total})</TabsTrigger>
            <TabsTrigger value="availability">
              <Settings className="w-4 h-4 mr-2" />
              Disponibilités
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-6 mt-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total rendez-vous</div>
              </div>
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
                <div className="text-sm text-muted-foreground">Confirmés</div>
              </div>
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-muted-foreground">En attente</div>
              </div>
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="text-2xl font-bold text-primary">{stats.upcoming}</div>
                <div className="text-sm text-muted-foreground">À venir</div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="confirmed">Confirmé</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {bookingTypes.map((type) => (
                    <SelectItem key={type.id} value={type.slug}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bookings Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Heure</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Aucun rendez-vous trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {format(new Date(booking.start_time), 'dd/MM/yyyy', { locale: fr })}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{booking.booking_types?.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {booking.booking_types?.duration_minutes} min
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getMeetingTypeIcon(booking.meeting_type)}
                              <span className="text-sm">{getMeetingTypeLabel(booking.meeting_type)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{booking.name}</div>
                              <div className="text-sm text-muted-foreground">{booking.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(booking.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {(booking.google_meet_link || booking.zoom_join_url) && (
                                <a
                                  href={booking.zoom_join_url || booking.google_meet_link || ''}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 hover:bg-secondary rounded"
                                  title={booking.zoom_join_url ? 'Ouvrir Zoom' : 'Ouvrir Meet'}
                                >
                                  <Video className="w-4 h-4 text-primary" />
                                </a>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedBooking(booking)}
                              >
                                Détails
                              </Button>
                              {booking.status === 'confirmed' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => updateStatus(booking.id, 'cancelled')}
                                >
                                  Annuler
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="availability" className="space-y-6 mt-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Configuration des disponibilités</h3>
              
              <div className="mb-6">
                <Label className="text-muted-foreground mb-2 block">Type de rendez-vous</Label>
                <Select value={selectedTypeForAvail} onValueChange={setSelectedTypeForAvail}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {bookingTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTypeForAvail && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Activez/désactivez les jours disponibles et définissez les horaires.
                  </p>
                  
                  <div className="grid gap-3">
                    {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
                      const avail = availabilities.find(a => a.day_of_week === dayNum);
                      const isActive = avail?.is_active ?? false;
                      
                      return (
                        <div 
                          key={dayNum} 
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            isActive ? 'border-primary/50 bg-primary/5' : 'border-border'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleAvailability(dayNum)}
                              disabled={isSavingAvail}
                              className={`w-10 h-6 rounded-full transition-colors ${
                                isActive ? 'bg-primary' : 'bg-muted'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                isActive ? 'translate-x-5' : 'translate-x-1'
                              }`} />
                            </button>
                            <span className="font-medium">{DAYS_OF_WEEK[dayNum]}</span>
                          </div>
                          
                          {isActive && avail && (
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={avail.start_time.substring(0, 5)}
                                onChange={(e) => updateAvailabilityTimes(avail.id, e.target.value + ':00', avail.end_time)}
                                className="w-28"
                              />
                              <span className="text-muted-foreground">à</span>
                              <Input
                                type="time"
                                value={avail.end_time.substring(0, 5)}
                                onChange={(e) => updateAvailabilityTimes(avail.id, avail.start_time, e.target.value + ':00')}
                                className="w-28"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Booking Detail Modal */}
        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Détails du rendez-vous</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <p className="font-medium">{selectedBooking.booking_types?.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Format</Label>
                    <div className="flex items-center gap-2">
                      {getMeetingTypeIcon(selectedBooking.meeting_type)}
                      <span className="font-medium">{getMeetingTypeLabel(selectedBooking.meeting_type)}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date</Label>
                    <p className="font-medium">
                      {format(new Date(selectedBooking.start_time), "EEEE d MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Horaire</Label>
                    <p className="font-medium">
                      {format(new Date(selectedBooking.start_time), 'HH:mm')} - {format(new Date(selectedBooking.end_time), 'HH:mm')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Statut</Label>
                    <div>{getStatusBadge(selectedBooking.status)}</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Informations client</h4>
                  <div className="space-y-2">
                    <p><User className="w-4 h-4 inline mr-2" />{selectedBooking.name}</p>
                    <p><Mail className="w-4 h-4 inline mr-2" />{selectedBooking.email}</p>
                    {selectedBooking.phone && <p><Phone className="w-4 h-4 inline mr-2" />{selectedBooking.phone}</p>}
                    {selectedBooking.company && <p><Building className="w-4 h-4 inline mr-2" />{selectedBooking.company}</p>}
                  </div>
                </div>

                {selectedBooking.additional_guests && selectedBooking.additional_guests.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Participants invités</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedBooking.additional_guests.map((guest, i) => (
                        <Badge key={i} variant="secondary">{guest}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedBooking.message && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Message</h4>
                    <p className="text-muted-foreground">{selectedBooking.message}</p>
                  </div>
                )}

                {(selectedBooking.google_meet_link || selectedBooking.zoom_join_url) && (
                  <div className="border-t pt-4">
                    <a
                      href={selectedBooking.zoom_join_url || selectedBooking.google_meet_link || ''}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Video className="w-4 h-4" />
                      Rejoindre {selectedBooking.zoom_join_url ? 'Zoom' : 'Google Meet'}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                <div className="border-t pt-4 flex gap-2">
                  {selectedBooking.status === 'confirmed' && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          updateStatus(selectedBooking.id, 'completed');
                          setSelectedBooking(null);
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Marquer terminé
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          updateStatus(selectedBooking.id, 'cancelled');
                          setSelectedBooking(null);
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Annuler
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`text-sm ${className}`}>{children}</div>
);

export default AdminRendezVous;