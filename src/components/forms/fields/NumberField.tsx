import React from 'react';
import { Input } from '@/components/ui/input';
import { FormField, FormDesignSettings } from '@/types/forms';
import FieldWrapper from './FieldWrapper';

interface NumberFieldProps {
  field: FormField;
  value: number | string;
  onChange: (value: number | string) => void;
  error?: string;
  colors: FormDesignSettings['colors'];
}

const NumberField = ({ field, value, onChange, error, colors }: NumberFieldProps) => {
  return (
    <FieldWrapper field={field} error={error} colors={colors}>
      <Input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder={field.placeholder}
        required={field.required}
        min={field.min}
        max={field.max}
        step={field.step || 1}
        className="w-full"
        style={{
          borderColor: error ? '#ef4444' : undefined,
          backgroundColor: colors.background,
          color: colors.text
        }}
      />
    </FieldWrapper>
  );
};

export default NumberField;
