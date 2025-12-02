import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { FormField, FormDesignSettings } from '@/types/forms';
import FieldWrapper from './FieldWrapper';

interface TextareaFieldProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  colors: FormDesignSettings['colors'];
}

const TextareaField = ({ field, value, onChange, error, colors }: TextareaFieldProps) => {
  return (
    <FieldWrapper field={field} error={error} colors={colors}>
      <Textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        minLength={field.minLength}
        maxLength={field.maxLength}
        rows={4}
        className="w-full resize-y"
        style={{
          borderColor: error ? '#ef4444' : undefined,
          backgroundColor: colors.background,
          color: colors.text
        }}
      />
    </FieldWrapper>
  );
};

export default TextareaField;
