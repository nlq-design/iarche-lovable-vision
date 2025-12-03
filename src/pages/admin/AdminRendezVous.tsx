import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Mail, Building, Phone, Video, ExternalLink, X, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  google_meet_link: string | null;
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

const AdminRendezVous = () => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

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
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
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
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{booking.booking_types?.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {booking.booking_types?.duration_minutes} min
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{booking.name}</div>
                            {booking.company && (
                              <div className="text-sm text-muted-foreground">{booking.company}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="w-3 h-3" />
                            {booking.email}
                          </div>
                          {booking.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {booking.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {booking.google_meet_link && (
                            <a
                              href={booking.google_meet_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-secondary rounded"
                              title="Ouvrir Google Meet"
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
                    <Label className="text-muted-foreground">Statut</Label>
                    <div>{getStatusBadge(selectedBooking.status)}</div>
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

                {selectedBooking.message && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Message</h4>
                    <p className="text-muted-foreground">{selectedBooking.message}</p>
                  </div>
                )}

                {selectedBooking.google_meet_link && (
                  <div className="border-t pt-4">
                    <a
                      href={selectedBooking.google_meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Video className="w-4 h-4" />
                      Rejoindre Google Meet
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