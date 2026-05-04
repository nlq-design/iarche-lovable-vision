import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PaymentCancelled() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <Info className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Paiement annulé</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Aucun montant n’a été débité. Vous pouvez activer votre abonnement plus tard depuis
              vos paramètres de facturation.
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
