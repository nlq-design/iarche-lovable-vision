import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail } from 'lucide-react';

interface NewsletterFormProps {
  variant?: 'default' | 'compact';
}

export const NewsletterForm = ({ variant = 'default' }: NewsletterFormProps) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer votre adresse email',
        variant: 'destructive',
      });
      return;
    }

    // Validation email simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer une adresse email valide',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    // Vérifier si l'email est déjà inscrit
    const { data: existingSubscriber } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingSubscriber) {
      toast({
        title: 'Déjà inscrit',
        description: 'Cet email est déjà abonné à notre newsletter',
      });
      setEmail('');
      setLoading(false);
      return;
    }

    // Inscription
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email: email.toLowerCase() });

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de vous inscrire. Veuillez réessayer.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Inscription réussie !',
        description: 'Vous recevrez nos prochains articles par email.',
      });
      setEmail('');
    }

    setLoading(false);
  };

  if (variant === 'compact') {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="votre@email.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="flex-1 bg-background border-border"
        />
        <Button type="submit" disabled={loading} className="whitespace-nowrap">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'S\'inscrire'
          )}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-3">
        <Mail className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Restez informé
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Recevez nos derniers articles sur l'IA directement dans votre boîte mail.
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="votre@email.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="flex-1 bg-background border-border"
            />
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'S\'inscrire'
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};
