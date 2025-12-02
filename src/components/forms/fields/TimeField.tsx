import React from 'react';
import { Input } from '@/components/ui/input';
import { FormField, FormDesignSettings } from '@/types/forms';
import FieldWrapper from './FieldWrapper';

interface TimeFieldProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  colors: FormDesignSettings['colors'];
}

const TimeField = ({ field, value, onChange, error, colors }: TimeFieldProps) => {
  return (
    <FieldWrapper field={field} error={error} colors={colors}>
      <Input
        type="time"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
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

export default TimeField;
