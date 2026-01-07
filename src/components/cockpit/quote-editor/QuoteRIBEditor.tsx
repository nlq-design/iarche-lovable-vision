import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard } from 'lucide-react';

export interface RIBData {
  iban: string;
  bic: string;
  titulaire: string;
  banque: string;
}

interface QuoteRIBEditorProps {
  rib: RIBData;
  onChange: (rib: RIBData) => void;
}

// Format IBAN with spaces for readability
function formatIBAN(iban: string): string {
  return iban.replace(/[^A-Z0-9]/gi, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();
}

// Validate IBAN format (basic check)
function isValidIBAN(iban: string): boolean {
  const cleanIban = iban.replace(/\s/g, '');
  return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/.test(cleanIban);
}

export const QuoteRIBEditor: React.FC<QuoteRIBEditorProps> = ({
  rib,
  onChange,
}) => {
  const handleIbanChange = (value: string) => {
    // Clean and format
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 34);
    onChange({ ...rib, iban: cleaned });
  };

  const handleBicChange = (value: string) => {
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 11);
    onChange({ ...rib, bic: cleaned });
  };

  const isIbanValid = !rib.iban || isValidIBAN(rib.iban);

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Coordonnées bancaires (RIB)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="rib-titulaire">Titulaire du compte</Label>
          <Input
            id="rib-titulaire"
            value={rib.titulaire}
            onChange={(e) => onChange({ ...rib, titulaire: e.target.value })}
            placeholder="SARL IArche"
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="rib-banque">Banque</Label>
          <Input
            id="rib-banque"
            value={rib.banque}
            onChange={(e) => onChange({ ...rib, banque: e.target.value })}
            placeholder="Crédit Mutuel"
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="rib-iban" className="flex items-center gap-2">
            IBAN
            {!isIbanValid && <span className="text-xs text-destructive">(format invalide)</span>}
          </Label>
          <Input
            id="rib-iban"
            value={formatIBAN(rib.iban)}
            onChange={(e) => handleIbanChange(e.target.value)}
            placeholder="FR76 1234 5678 9012 3456 7890 123"
            className={`mt-1 font-mono text-sm ${!isIbanValid ? 'border-destructive' : ''}`}
          />
        </div>
        
        <div>
          <Label htmlFor="rib-bic">BIC / SWIFT</Label>
          <Input
            id="rib-bic"
            value={rib.bic}
            onChange={(e) => handleBicChange(e.target.value)}
            placeholder="CMCIFR2A"
            className="mt-1 font-mono text-sm"
          />
        </div>

        {rib.iban && rib.bic && rib.titulaire && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
            <p className="text-xs text-muted-foreground mb-2">Aperçu sur le devis :</p>
            <div className="text-xs space-y-0.5">
              <p><strong>Titulaire :</strong> {rib.titulaire}</p>
              <p><strong>Banque :</strong> {rib.banque}</p>
              <p><strong>IBAN :</strong> {formatIBAN(rib.iban)}</p>
              <p><strong>BIC :</strong> {rib.bic}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuoteRIBEditor;
