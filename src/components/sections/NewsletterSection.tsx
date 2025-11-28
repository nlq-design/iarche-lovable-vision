import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const NewsletterSection = () => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    console.log('Newsletter subscription:', email);
  };

  return (
    <section id="newsletter" className="pt-8 md:pt-10 pb-12 md:pb-16 bg-muted">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-primary mb-4 invisible animate-fadeIn [animation-delay:0.2s]">
            Restez informé
          </h2>
          <p className="text-base md:text-lg text-muted-foreground mb-6 leading-relaxed max-w-xl mx-auto invisible animate-fadeIn [animation-delay:0.4s]">
            Recevez nos actualités et conseils IA directement dans votre boîte mail.
          </p>

          <form 
            onSubmit={handleSubmit} 
            className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto mb-4 invisible animate-fadeIn [animation-delay:0.6s]"
          >
            <Input 
              type="email" 
              name="email"
              placeholder="votre@email.fr"
              required
              className="flex-1 border-border rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-accent focus:border-accent transition-all"
            />
            <Button 
              type="submit"
              className="bg-accent hover:bg-accent/90 focus:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 text-white font-medium px-6 py-3 rounded-lg whitespace-nowrap text-base transition-all"
            >
              S'inscrire →
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mb-8 invisible animate-fadeIn [animation-delay:0.7s]">
            En vous inscrivant, vous acceptez notre{' '}
            <a 
              href="/confidentialite" 
              className="text-accent hover:underline focus:underline focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 rounded"
            >
              politique de confidentialité
            </a>
          </p>
        </div>
        
        <p className="text-sm text-muted-foreground tracking-widest text-center invisible animate-fadeIn [animation-delay:0.8s]">
          Agence IA · Bayonne · Pays Basque · France
        </p>
      </div>
    </section>
  );
};

export default NewsletterSection;
