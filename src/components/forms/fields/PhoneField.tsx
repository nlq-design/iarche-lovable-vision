import React from 'react';
import { Input } from '@/components/ui/input';
import { FormField, FormDesignSettings } from '@/types/forms';
import FieldWrapper from './FieldWrapper';

interface PhoneFieldProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  colors: FormDesignSettings['colors'];
}

const PhoneField = ({ field, value, onChange, error, colors }: PhoneFieldProps) => {
  const formatPhone = (input: string) => {
    // Remove non-digits
    const digits = input.replace(/\D/g, '');
    // Format as French phone number
    if (digits.startsWith('33')) {
      return '+' + digits;
    }
    return digits;
  };

  return (
    <FieldWrapper field={field} error={error} colors={colors}>
      <Input
        type="tel"
        value={value || ''}
        onChange={(e) => onChange(formatPhone(e.target.value))}
        placeholder={field.placeholder || '06 12 34 56 78'}
        required={field.required}
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

export default PhoneField;
