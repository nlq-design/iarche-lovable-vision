import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FormField, FormDesignSettings } from '@/types/forms';
import FieldWrapper from './FieldWrapper';

interface RGPDFieldProps {
  field: FormField;
  value: boolean;
  onChange: (value: boolean) => void;
  error?: string;
  colors: FormDesignSettings['colors'];
  privacyUrl?: string;
}

const RGPDField = ({ field, value, onChange, error, colors, privacyUrl }: RGPDFieldProps) => {
  return (
    <FieldWrapper field={field} error={error} colors={colors}>
      <div className="flex items-start gap-3">
        <Checkbox
          id={field.id}
          checked={value ?? false}
          onCheckedChange={(checked) => onChange(checked as boolean)}
          className="mt-0.5"
          style={{ borderColor: colors.primary }}
        />
        <Label 
          htmlFor={field.id}
          className="text-sm cursor-pointer leading-relaxed"
          style={{ color: colors.text }}
        >
          {field.label || "J'accepte que mes données soient traitées conformément à la"}{' '}
          {privacyUrl ? (
            <a 
              href={privacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: colors.primary }}
            >
              politique de confidentialité
            </a>
          ) : (
            'politique de confidentialité'
          )}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      </div>
    </FieldWrapper>
  );
};

export default RGPDField;
