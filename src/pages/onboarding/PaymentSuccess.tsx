import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PaymentSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Bienvenue dans IArche</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Votre abonnement est actif. Tout est prêt pour démarrer.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to="/cockpit">Aller à mon Cockpit</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
