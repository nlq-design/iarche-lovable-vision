import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, GripVertical } from 'lucide-react';

export interface ServiceLine {
  id: string;
  description: string;
  details?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  isPhase?: boolean;
}

interface QuoteServiceLineProps {
  line: ServiceLine;
  onChange: (line: ServiceLine) => void;
  onDelete: () => void;
  currency?: string;
}

export const QuoteServiceLine: React.FC<QuoteServiceLineProps> = ({
  line,
  onChange,
  onDelete,
  currency = '€',
}) => {
  const lineTotal = line.quantity * line.unitPrice;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (line.isPhase) {
    return (
      <tr className="bg-muted/50 border-t-2 border-primary/20">
        <td className="p-2">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          </div>
        </td>
        <td colSpan={4} className="p-2">
          <Input
            value={line.description}
            onChange={(e) => onChange({ ...line, description: e.target.value })}
            placeholder="Nom de la phase..."
            className="font-semibold text-sm bg-transparent border-none shadow-none focus-visible:ring-0 p-0 h-auto"
          />
        </td>
        <td className="p-2 text-right">
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b hover:bg-muted/30 transition-colors">
      <td className="p-2 w-8">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
      </td>
      <td className="p-2">
        <div className="space-y-1">
          <Input
            value={line.description}
            onChange={(e) => onChange({ ...line, description: e.target.value })}
            placeholder="Description du service..."
            className="text-sm h-8"
          />
          <Input
            value={line.details || ''}
            onChange={(e) => onChange({ ...line, details: e.target.value })}
            placeholder="Détails optionnels..."
            className="text-xs h-6 text-muted-foreground"
          />
        </div>
      </td>
      <td className="p-2 w-20">
        <Input
          type="number"
          min={0}
          step={0.5}
          value={line.quantity}
          onChange={(e) => onChange({ ...line, quantity: parseFloat(e.target.value) || 0 })}
          className="text-sm h-8 text-center"
        />
      </td>
      <td className="p-2 w-24">
        <Input
          value={line.unit}
          onChange={(e) => onChange({ ...line, unit: e.target.value })}
          placeholder="jour"
          className="text-sm h-8 text-center"
        />
      </td>
      <td className="p-2 w-28">
        <div className="relative">
          <Input
            type="number"
            min={0}
            step={10}
            value={line.unitPrice}
            onChange={(e) => onChange({ ...line, unitPrice: parseFloat(e.target.value) || 0 })}
            className="text-sm h-8 text-right pr-6"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currency}</span>
        </div>
      </td>
      <td className="p-2 w-28 text-right">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm tabular-nums">
            {formatCurrency(lineTotal)} {currency}
          </span>
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
};

export default QuoteServiceLine;
