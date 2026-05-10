import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, CheckCircle, Loader2, Video, ArrowRight, Phone, MapPin, Users, X, Plus } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import GradientLink from '@/components/ui/GradientLink';
import LogoArc from '@/components/ui/LogoArc';

interface BookingType {
  id: string;
  name: string;
  slug: string;
  description: string;
  duration_minutes: number;
  color: string;
}

type MeetingType = 'visio' | 'telephone' | 'presentiel';

const MEETING_TYPE_OPTIONS = [
  { value: 'visio' as MeetingType, label: 'Visio', icon: Video, description: 'Visioconférence via Zoom' },
  { value: 'telephone' as MeetingType, label: 'Téléphone', icon: Phone, description: 'Nous vous appelons' },
  { value: 'presentiel' as MeetingType, label: 'Présentiel', icon: MapPin, description: 'Dans nos locaux à Bayonne' },
];

// Slugs that should NOT show telephone option
const SLUGS_WITHOUT_TELEPHONE = ['presentation'];

const RendezVous = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  // Get solution slug from query params (for presentation bookings from solutions pages)
  const solutionSlug = searchParams.get('solution');
  
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([]);
  const [bookingType, setBookingType] = useState<BookingType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(addDays(new Date(), 1)));
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [meetLink, setMeetLink] = useState<string | null>(null);
  const [zoomPassword, setZoomPassword] = useState<string | null>(null);
  const [meetingType, setMeetingType] = useState<MeetingType>('visio');
  const [additionalGuests, setAdditionalGuests] = useState<string[]>([]);
  const [newGuestEmail, setNewGuestEmail] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  });

  const addGuest = () => {
    if (newGuestEmail && !additionalGuests.includes(newGuestEmail) && newGuestEmail.includes('@')) {
      setAdditionalGuests([...additionalGuests, newGuestEmail]);
      setNewGuestEmail('');
    }
  };

  const removeGuest = (email: string) => {
    setAdditionalGuests(additionalGuests.filter(g => g !== email));
  };

  // Generate dates for the next 14 days - memoized to prevent duplicate rendering
  const availableDates = useMemo(() => 
    Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1)),
  []);

  // Load booking types list (when no slug)
  useEffect(() => {
    if (!slug) {
      loadBookingTypes();
    }
  }, [slug]);

  // Load slots when slug is provided
  useEffect(() => {
    if (slug) {
      loadSlots(selectedDate);
    }
  }, [slug, selectedDate]);

  const loadBookingTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBookingTypes(data || []);
    } catch (err) {
      console.error('Error loading booking types:', err);
      toast({
        title: "Erreur",
        description: "Impossible de charger les types de rendez-vous.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSlots = async (date: Date) => {
    setIsLoadingSlots(true);
    try {
      const { data, error } = await supabase.functions.invoke('calendar-booking', {
        body: {
          action: 'get-slots',
          bookingTypeSlug: slug,
          date: format(date, 'yyyy-MM-dd'),
        },
      });

      if (error) throw error;
      
      setBookingType(data.bookingType);
      // Deduplicate slots to prevent duplicate key warnings
      const uniqueSlots = [...new Set(data.slots || [])] as string[];
      setSlots(uniqueSlots);
      setSelectedSlot(null);
    } catch (err) {
      console.error('Error loading slots:', err);
      toast({
        title: "Erreur",
        description: "Impossible de charger les créneaux disponibles.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsLoadingSlots(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !bookingType) return;

    // Validate phone required for telephone meeting
    if (meetingType === 'telephone' && !formData.phone) {
      toast({
        title: "Téléphone requis",
        description: "Veuillez indiquer votre numéro de téléphone pour un rendez-vous téléphonique.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('calendar-booking', {
        body: {
          action: 'create-booking',
          bookingData: {
            ...formData,
            startTime: selectedSlot,
            bookingTypeId: bookingType.id,
            meetingType,
            additionalGuests: additionalGuests.length > 0 ? additionalGuests : undefined,
            solutionSlug: solutionSlug || undefined, // Track which solution the booking came from
          },
        },
      });

      if (error) throw error;

      setIsSuccess(true);
      setMeetLink(data.googleMeetLink || data.zoomJoinUrl);
      setZoomPassword(data.zoomPassword || null);
      
      toast({
        title: "Rendez-vous confirmé !",
        description: `Vous allez recevoir un email de confirmation${meetingType === 'visio' ? ' avec le lien Visio' : ''}.`,
      });
    } catch (err) {
      console.error('Error creating booking:', err);
      toast({
        title: "Erreur",
        description: "Impossible de créer le rendez-vous. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <BackgroundLayout>
        <Header />
        <main className="min-h-screen pt-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </BackgroundLayout>
    );
  }

  // No slug: show booking types list
  if (!slug) {
    return (
      <BackgroundLayout>
        <Helmet>
          <title>Prendre rendez-vous · IArche</title>
          <meta name="description" content="Réservez un rendez-vous avec IArche pour discuter de vos projets IA." />
        </Helmet>
        
        <Header />
        <BreadcrumbNav />
        
        <main className="min-h-screen pt-4">
          <section className="max-w-4xl mx-auto px-6 py-8">
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-bold hero-gradient-text mb-2 animate-fadeIn">
                Prendre rendez-vous
              </h1>
              <LogoArc size="md" className="mx-auto mb-4 animate-fadeIn [animation-delay:0.1s]" />
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fadeIn [animation-delay:0.2s]">
                Choisissez le type de rendez-vous qui correspond à votre besoin
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bookingTypes.map((type, index) => (
                <Link
                  key={type.id}
                  to={`/rendez-vous/${type.slug}`}
                  className="group bg-secondary/30 rounded-lg p-6 border border-border hover:border-primary/50 transition-all duration-300 animate-fadeIn"
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                        {type.name}
                      </h2>
                      {type.description && (
                        <p className="text-muted-foreground text-sm mb-4">
                          {type.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {type.duration_minutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Video className="w-4 h-4" />
                          Visio
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))}
            </div>

            {bookingTypes.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Aucun type de rendez-vous disponible pour le moment.</p>
              </div>
            )}
          </section>
        </main>
        
        <Footer />
      </BackgroundLayout>
    );
  }

  if (!bookingType) {
    return (
      <BackgroundLayout>
        <Header />
        <main className="min-h-screen pt-20 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Type de rendez-vous non trouvé</h1>
            <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
          </div>
        </main>
        <Footer />
      </BackgroundLayout>
    );
  }

  if (isSuccess) {
    const currentMeetingOption = MEETING_TYPE_OPTIONS.find(o => o.value === meetingType);
    return (
      <BackgroundLayout>
        <Helmet>
          <title>Rendez-vous confirmé · IArche</title>
        </Helmet>
        <Header />
        <BreadcrumbNav />
        <main className="min-h-screen pt-4">
          <section className="max-w-2xl mx-auto px-6 py-12">
            <div className="bg-primary/5 rounded-lg p-8 border-2 border-primary/20 text-center animate-fadeIn">
              <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Rendez-vous confirmé !</h1>
              <p className="text-muted-foreground mb-6">
                Votre rendez-vous <strong>{bookingType.name}</strong> est confirmé pour le{' '}
                <strong>{format(new Date(selectedSlot!), "EEEE d MMMM 'à' HH:mm", { locale: fr })}</strong>.
              </p>
              
              {/* Meeting link section based on type */}
              {meetLink && meetingType === 'visio' && (
                <div className="bg-secondary/50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-center gap-2 text-primary mb-2">
                    <Video className="w-5 h-5" />
                    <span className="font-semibold">Lien Visio</span>
                  </div>
                  <a 
                    href={meetLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-accent hover:underline break-all"
                  >
                    {meetLink}
                  </a>
                  {zoomPassword && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Mot de passe : <strong>{zoomPassword}</strong>
                    </p>
                  )}
                </div>
              )}
              
              {meetingType === 'telephone' && (
                <div className="bg-secondary/50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-center gap-2 text-primary mb-2">
                    <Phone className="w-5 h-5" />
                    <span className="font-semibold">Appel téléphonique</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Nous vous appellerons au numéro indiqué à l'heure du rendez-vous.
                  </p>
                </div>
              )}
              
              {meetingType === 'presentiel' && (
                <div className="bg-secondary/50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-center gap-2 text-primary mb-2">
                    <MapPin className="w-5 h-5" />
                    <span className="font-semibold">Rendez-vous en présentiel</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    L'adresse exacte vous sera communiquée par email.
                  </p>
                </div>
              )}
              
              {(() => {
                const start = new Date(selectedSlot!);
                const end = new Date(start.getTime() + bookingType.duration_minutes * 60000);
                const fmtUtc = (d: Date) =>
                  d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
                const title = `${bookingType.name} · IArche`;
                const details = [
                  bookingType.description || '',
                  meetLink ? `Lien visio : ${meetLink}` : '',
                  zoomPassword ? `Mot de passe : ${zoomPassword}` : '',
                ].filter(Boolean).join('\n\n');
                const location = meetingType === 'visio'
                  ? (meetLink || 'Visioconférence')
                  : meetingType === 'telephone'
                  ? 'Appel téléphonique'
                  : 'Bayonne (adresse communiquée par email)';
                // Use UTC ISO format (Z suffix) for both providers — they convert to the user's local timezone automatically.
                // ctz=Europe/Paris forces Google to display the event in Paris time regardless of the viewer's account timezone.
                const tz = 'Europe/Paris';
                const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmtUtc(start)}/${fmtUtc(end)}&ctz=${encodeURIComponent(tz)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
                const outlookBase = (host: 'live' | 'office') =>
                  `https://outlook.${host}.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=${encodeURIComponent(title)}&startdt=${encodeURIComponent(start.toISOString())}&enddt=${encodeURIComponent(end.toISOString())}&body=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}&allday=false`;
                return (
                  <div className="mb-6">
                    <p className="text-sm text-muted-foreground mb-3">
                      Ajouter à votre agenda :
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <a
                        href={googleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background hover:bg-secondary/50 text-sm font-medium transition-colors"
                      >
                        <Calendar className="w-4 h-4" />
                        Google Agenda
                      </a>
                      <a
                        href={outlookBase('office')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background hover:bg-secondary/50 text-sm font-medium transition-colors"
                      >
                        <Calendar className="w-4 h-4" />
                        Outlook 365
                      </a>
                      <a
                        href={outlookBase('live')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background hover:bg-secondary/50 text-sm font-medium transition-colors"
                      >
                        <Calendar className="w-4 h-4" />
                        Outlook.com
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Un fichier .ics (Apple Calendar / iCloud / autres) est également joint à l'email de confirmation.
                    </p>
                  </div>
                );
              })()}
              <GradientLink to="/">Retour à l'accueil</GradientLink>
            </div>
          </section>
        </main>
        <Footer />
      </BackgroundLayout>
    );
  }

  return (
    <BackgroundLayout>
      <Helmet>
        <title>{bookingType.name} · Prendre rendez-vous · IArche</title>
        <meta name="description" content={bookingType.description || `Réservez un rendez-vous ${bookingType.name} avec IArche`} />
        <link rel="canonical" href={`https://iarche.fr/rendez-vous/${slug}`} />
        <meta property="og:title" content={`${bookingType.name} · Prendre rendez-vous · IArche`} />
        <meta property="og:description" content={bookingType.description || `Réservez un rendez-vous ${bookingType.name} avec IArche`} />
        <meta property="og:url" content={`https://iarche.fr/rendez-vous/${slug}`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://iarche.fr/og-image-v4.png" />
      </Helmet>
      
      <Header />
      <BreadcrumbNav />
      
      <main className="min-h-screen pt-4">
        <section className="max-w-5xl mx-auto px-6 py-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold hero-gradient-text mb-2 animate-fadeIn">
              {bookingType.name}
            </h1>
            <LogoArc size="md" className="mx-auto mb-4 animate-fadeIn [animation-delay:0.1s]" />
            {bookingType.description && (
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fadeIn [animation-delay:0.2s]">
                {bookingType.description}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground animate-fadeIn [animation-delay:0.3s]">
              <Clock className="w-4 h-4" />
              <span>{bookingType.duration_minutes} minutes</span>
            </div>
          </div>

          {/* Meeting Type Selection */}
          {(() => {
            const availableOptions = SLUGS_WITHOUT_TELEPHONE.includes(slug || '')
              ? MEETING_TYPE_OPTIONS.filter(o => o.value !== 'telephone')
              : MEETING_TYPE_OPTIONS;
            return (
              <div className="mb-8 animate-fadeIn [animation-delay:0.35s]">
                <h2 className="text-xl font-semibold text-foreground mb-4 text-center">
                  Format du rendez-vous
                </h2>
                <div className={`grid gap-3 max-w-2xl mx-auto ${availableOptions.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {availableOptions.map((option) => {
                const IconComponent = option.icon;
                const isSelected = meetingType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMeetingType(option.value)}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                    }`}
                  >
                    <IconComponent className={`w-6 h-6 mx-auto mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {option.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {option.description}
                    </div>
                  </button>
                );
              })}
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Date & Time Selection */}
            <div className="animate-fadeIn [animation-delay:0.4s]">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Choisissez une date
              </h2>
              
              {/* Date Picker */}
              <div className="bg-secondary/30 rounded-lg p-4 border border-border mb-6">
                <div className="grid grid-cols-7 gap-2">
                  {availableDates.map((date) => {
                    const isSelected = isSameDay(date, selectedDate);
                    const dayName = format(date, 'EEE', { locale: fr });
                    const dayNum = format(date, 'd');
                    
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => setSelectedDate(date)}
                        className={`p-2 rounded-lg text-center transition-all ${
                          isSelected 
                            ? 'bg-primary text-white' 
                            : 'hover:bg-secondary'
                        }`}
                      >
                        <div className="text-xs uppercase">{dayName}</div>
                        <div className="text-lg font-semibold">{dayNum}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Créneaux disponibles le {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
              </h3>
              
              {isLoadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : slots.length === 0 ? (
                <div className="bg-secondary/30 rounded-lg p-6 text-center border border-border">
                  <p className="text-muted-foreground">Aucun créneau disponible ce jour.</p>
                  <p className="text-sm text-muted-foreground mt-2">Essayez une autre date.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-primary text-white border-primary'
                            : 'border-border hover:border-primary hover:bg-primary/5'
                        }`}
                      >
                        {format(new Date(slot), 'HH:mm')}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Booking Form */}
            <div className="animate-fadeIn [animation-delay:0.5s]">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Vos informations
              </h2>
              
              <form onSubmit={handleSubmit} className="bg-secondary/30 rounded-lg p-6 border border-border space-y-4">
                <div>
                  <Label htmlFor="name">Nom *</Label>
                  <Input
                    id="name"
                    required
                    placeholder="Votre nom"
                    className="mt-1"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="votre@email.com"
                    className="mt-1"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">
                    Téléphone {meetingType === 'telephone' && <span className="text-accent">*</span>}
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    required={meetingType === 'telephone'}
                    placeholder="+33 6 12 34 56 78"
                    className="mt-1"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  {meetingType === 'telephone' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Requis pour les rendez-vous téléphoniques
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="company">Entreprise</Label>
                  <Input
                    id="company"
                    placeholder="Nom de votre entreprise"
                    className="mt-1"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message (optionnel)</Label>
                  <Textarea
                    id="message"
                    placeholder="Décrivez brièvement votre besoin..."
                    className="mt-1"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>

                {/* Additional guests (for visio meetings) */}
                {meetingType.startsWith('visio') && (
                  <div>
                    <Label className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Inviter des participants
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="email"
                        placeholder="email@exemple.com"
                        value={newGuestEmail}
                        onChange={(e) => setNewGuestEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addGuest();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={addGuest}
                        disabled={!newGuestEmail || !newGuestEmail.includes('@')}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {additionalGuests.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {additionalGuests.map((email) => (
                          <span
                            key={email}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-sm rounded-md"
                          >
                            {email}
                            <button
                              type="button"
                              onClick={() => removeGuest(email)}
                              className="hover:text-accent"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Ces personnes recevront également l'invitation
                    </p>
                  </div>
                )}

                {selectedSlot && (
                  <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                    <p className="text-sm text-foreground">
                      <strong>Créneau sélectionné :</strong><br />
                      {format(new Date(selectedSlot), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={!selectedSlot || isSubmitting}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Confirmation en cours...
                    </>
                  ) : (
                    'Confirmer le rendez-vous'
                  )}
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </BackgroundLayout>
  );
};

export default RendezVous;