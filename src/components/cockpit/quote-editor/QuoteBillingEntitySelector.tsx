import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Check } from 'lucide-react';
import { type BillingEntity } from '@/hooks/cockpit/useBillingEntities';

interface QuoteBillingEntitySelectorProps {
  entities: BillingEntity[];
  selectedEntityId: string | null;
  onSelect: (entityId: string) => void;
  isLoading?: boolean;
}

export const QuoteBillingEntitySelector: React.FC<QuoteBillingEntitySelectorProps> = ({
  entities,
  selectedEntityId,
  onSelect,
  isLoading = false,
}) => {
  const selectedEntity = entities.find((e) => e.id === selectedEntityId);

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Société émettrice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Sélectionner l'entité de facturation</Label>
          <Select
            value={selectedEntityId || 'none'}
            onValueChange={(v) => onSelect(v === 'none' ? '' : v)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir une société..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucune</SelectItem>
              {entities.map((entity) => (
                <SelectItem key={entity.id} value={entity.id}>
                  <div className="flex items-center gap-2">
                    <span>{entity.name}</span>
                    {entity.is_default && (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1">
                        Par défaut
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selected entity preview */}
        {selectedEntity && (
          <div className="p-3 rounded-lg bg-muted/50 border text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-primary font-medium">
              <Check className="h-3 w-3" />
              {selectedEntity.name}
            </div>
            {selectedEntity.legal_form && (
              <p className="text-muted-foreground">
                {selectedEntity.legal_form}
                {selectedEntity.capital_amount && ` au capital de ${selectedEntity.capital_amount.toLocaleString('fr-FR')} €`}
              </p>
            )}
            {selectedEntity.address && (
              <p className="text-muted-foreground">
                {selectedEntity.address}
                {selectedEntity.postal_code && `, ${selectedEntity.postal_code}`}
                {selectedEntity.city && ` ${selectedEntity.city}`}
              </p>
            )}
            {selectedEntity.siren && (
              <p className="text-muted-foreground">SIREN: {selectedEntity.siren}</p>
            )}
            {selectedEntity.tva_number && (
              <p className="text-muted-foreground">TVA: {selectedEntity.tva_number}</p>
            )}
            {selectedEntity.quote_prefix && (
              <p className="text-muted-foreground mt-2 pt-2 border-t">
                Format numérotation: <code className="bg-muted px-1 rounded">{selectedEntity.quote_prefix}...</code>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuoteBillingEntitySelector;
