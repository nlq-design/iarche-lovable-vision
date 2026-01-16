import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Layers } from 'lucide-react';
import { QuoteServiceLine, type ServiceLine } from './QuoteServiceLine';

interface QuoteServicesTableProps {
  services: ServiceLine[];
  onChange: (services: ServiceLine[]) => void;
  currency?: string;
  tvaRate?: number;
}

export const QuoteServicesTable: React.FC<QuoteServicesTableProps> = ({
  services,
  onChange,
  currency = '€',
  tvaRate = 20,
}) => {
  const addLine = () => {
    const newLine: ServiceLine = {
      id: `line-${Date.now()}`,
      description: '',
      details: '',
      quantity: 1,
      unit: 'jour',
      unitPrice: 0,
      isPhase: false,
    };
    onChange([...services, newLine]);
  };

  const addPhase = () => {
    const newPhase: ServiceLine = {
      id: `phase-${Date.now()}`,
      description: 'Nouvelle phase',
      quantity: 0,
      unit: '',
      unitPrice: 0,
      isPhase: true,
    };
    onChange([...services, newPhase]);
  };

  const updateLine = (index: number, line: ServiceLine) => {
    const updated = [...services];
    updated[index] = line;
    onChange(updated);
  };

  const deleteLine = (index: number) => {
    onChange(services.filter((_, i) => i !== index));
  };

  // Calculate totals
  const totalHT = services
    .filter((s) => !s.isPhase)
    .reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);
  
  const tvaAmount = totalHT * (tvaRate / 100);
  const totalTTC = totalHT + tvaAmount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Prestations
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addPhase} className="gap-1.5 h-7 text-xs">
            <Layers className="h-3 w-3" />
            Phase
          </Button>
          <Button variant="outline" size="sm" onClick={addLine} className="gap-1.5 h-7 text-xs">
            <Plus className="h-3 w-3" />
            Ligne
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="p-2 w-8"></th>
                <th className="p-2 text-left font-medium">Description</th>
                <th className="p-2 text-center font-medium w-20">Qté</th>
                <th className="p-2 text-center font-medium w-24">Unité</th>
                <th className="p-2 text-right font-medium w-28">P.U. HT</th>
                <th className="p-2 text-right font-medium w-32">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <p className="text-sm">Aucune prestation</p>
                    <p className="text-xs mt-1">Ajoutez des lignes ou phases pour construire votre devis</p>
                  </td>
                </tr>
              ) : (
                services.map((service, index) => (
                  <QuoteServiceLine
                    key={service.id}
                    line={service}
                    onChange={(line) => updateLine(index, line)}
                    onDelete={() => deleteLine(index)}
                    currency={currency}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        {services.length > 0 && (
          <div className="border-t bg-muted/30 p-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total HT</span>
                  <span className="font-medium tabular-nums">{formatCurrency(totalHT)} {currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">TVA ({tvaRate}%)</span>
                  <span className="tabular-nums">{formatCurrency(tvaAmount)} {currency}</span>
                </div>
                <div className="flex justify-between text-base font-semibold border-t pt-2">
                  <span>Total TTC</span>
                  <span className="tabular-nums text-primary">{formatCurrency(totalTTC)} {currency}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuoteServicesTable;
