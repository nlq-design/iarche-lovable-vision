import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FormField, FormDesignSettings } from '@/types/forms';
import FieldWrapper from './FieldWrapper';

interface BooleanFieldProps {
  field: FormField;
  value: boolean;
  onChange: (value: boolean) => void;
  error?: string;
  colors: FormDesignSettings['colors'];
}

const BooleanField = ({ field, value, onChange, error, colors }: BooleanFieldProps) => {
  return (
    <FieldWrapper field={field} error={error} colors={colors}>
      <div className="flex items-center gap-3">
        <Switch
          id={field.id}
          checked={value ?? false}
          onCheckedChange={onChange}
        />
        <Label 
          htmlFor={field.id}
          className="text-sm cursor-pointer"
          style={{ color: colors.text }}
        >
          {value ? 'Oui' : 'Non'}
        </Label>
      </div>
    </FieldWrapper>
  );
};

export default BooleanField;
