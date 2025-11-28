import { Helmet } from 'react-helmet';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Mail, Linkedin } from 'lucide-react';

const Contact = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted - Backend integration à venir');
  };

  return (
    <BackgroundLayout>
      <Helmet>
        <title>Contact · IArche · Agence IA Bayonne</title>
        <meta 
          name="description" 
          content="Une question ? Un projet IA ? Contactez IArche, agence IA à Bayonne. Réponse sous 24h." 
        />
        <link rel="canonical" href="https://iarche.fr/contact" />
      </Helmet>
      
      <Header />
      
      <main className="min-h-screen pt-20">
        <section className="max-w-6xl mx-auto px-6 py-16">
          {/* En-tête */}
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 invisible animate-fadeIn [animation-delay:0.1s]">
              Contact
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto invisible animate-fadeIn [animation-delay:0.2s]">
              Une question ? Un projet ? Parlons-en.
            </p>
          </div>

          {/* 2 colonnes : Formulaire + Coordonnées */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Formulaire */}
            <div className="invisible animate-fadeIn [animation-delay:0.3s]">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="nom">Nom *</Label>
                  <Input 
                    id="nom" 
                    type="text" 
                    placeholder="Votre nom" 
                    required 
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="votre@email.com" 
                    required 
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="entreprise">Entreprise (optionnel)</Label>
                  <Input 
                    id="entreprise" 
                    type="text" 
                    placeholder="Nom de votre entreprise" 
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="sujet">Sujet *</Label>
                  <Select required>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Sélectionnez un sujet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="audit">Audit & Conseil</SelectItem>
                      <SelectItem value="developpement">Développement</SelectItem>
                      <SelectItem value="formation">Formation</SelectItem>
                      <SelectItem value="conformite">Conformité</SelectItem>
                      <SelectItem value="autre">Autre demande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Décrivez votre projet ou votre question..." 
                    required 
                    className="mt-2 min-h-[150px]"
                  />
                </div>

                <Button 
                  type="submit" 
                  size="lg"
                  className="w-full bg-accent hover:bg-accent/90 text-white"
                >
                  Envoyer
                </Button>
              </form>
            </div>

            {/* Coordonnées */}
            <div className="invisible animate-fadeIn [animation-delay:0.4s] space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  Nos coordonnées
                </h2>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <Mail className="w-6 h-6 text-accent shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-foreground mb-1">Email</p>
                      <a 
                        href="mailto:nlq@iarche.fr" 
                        className="text-muted-foreground hover:text-accent transition-colors"
                      >
                        nlq@iarche.fr
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <MapPin className="w-6 h-6 text-accent shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-foreground mb-1">Localisation</p>
                      <p className="text-muted-foreground">
                        Bayonne, France
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Linkedin className="w-6 h-6 text-accent shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-foreground mb-1">LinkedIn</p>
                      <a 
                        href="https://linkedin.com" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-accent transition-colors"
                      >
                        Suivez-nous sur LinkedIn
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-secondary/50 rounded-lg p-6 border border-border">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Temps de réponse :</strong> Nous nous engageons à répondre à toutes les demandes sous 24h ouvrées.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </BackgroundLayout>
  );
};

export default Contact;
