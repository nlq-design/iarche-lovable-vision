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
    <section className="py-20 md:py-28 bg-muted">
      <div className="container mx-auto px-6">
        <div className="max-w-xl mx-auto text-center">
          <h2 
            className="text-2xl md:text-3xl font-semibold text-foreground mb-4"
            style={{ 
              visibility: 'hidden',
              animation: 'fadeIn 0.8s ease-out 0.2s forwards',
              willChange: 'opacity, transform'
            }}
          >
            Restez informé
          </h2>
          <p 
            className="text-base text-muted-foreground mb-8 leading-relaxed"
            style={{ 
              visibility: 'hidden',
              animation: 'fadeIn 0.8s ease-out 0.4s forwards',
              willChange: 'opacity, transform'
            }}
          >
            Recevez nos actualités et conseils IA directement dans votre boîte mail.
          </p>

          <form 
            onSubmit={handleSubmit} 
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            style={{ 
              visibility: 'hidden',
              animation: 'fadeIn 0.8s ease-out 0.6s forwards',
              willChange: 'opacity, transform'
            }}
          >
            <Input 
              type="email" 
              name="email"
              placeholder="Votre email professionnel"
              required
              className="flex-1 border-border rounded-lg px-4 py-3 text-sm"
            />
            <Button 
              type="submit"
              className="bg-accent hover:bg-accent/90 text-white font-medium px-6 py-3 rounded-lg whitespace-nowrap"
            >
              S'inscrire →
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;
