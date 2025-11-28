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
    <section className="py-16 bg-muted">
      <div className="container mx-auto px-6">
        <div className="max-w-md mx-auto text-center">
          <h2 
            className="text-2xl md:text-3xl font-semibold text-foreground mb-3"
            style={{ 
              visibility: 'hidden',
              animation: 'fadeIn 0.8s ease-out 0.2s forwards'
            }}
          >
            Restez informé
          </h2>
          <p 
            className="text-muted-foreground mb-6"
            style={{ 
              visibility: 'hidden',
              animation: 'fadeIn 0.8s ease-out 0.4s forwards'
            }}
          >
            Recevez nos actualités et conseils IA directement dans votre boîte mail.
          </p>

          <form 
            onSubmit={handleSubmit} 
            className="flex flex-col sm:flex-row gap-2"
            style={{ 
              visibility: 'hidden',
              animation: 'fadeIn 0.8s ease-out 0.6s forwards'
            }}
          >
            <Input 
              type="email" 
              name="email"
              placeholder="Votre email"
              required
              className="flex-1 border-border rounded-lg px-4 py-3"
            />
            <Button 
              type="submit"
              className="bg-accent hover:bg-accent/90 text-background font-medium"
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
