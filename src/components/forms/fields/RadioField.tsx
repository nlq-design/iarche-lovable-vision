import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FormField, FormDesignSettings } from '@/types/forms';
import FieldWrapper from './FieldWrapper';

interface RadioFieldProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  colors: FormDesignSettings['colors'];
}

const RadioField = ({ field, value, onChange, error, colors }: RadioFieldProps) => {
  return (
    <FieldWrapper field={field} error={error} colors={colors}>
      <RadioGroup
        value={value || ''}
        onValueChange={onChange}
        className="space-y-2"
      >
        {field.options?.map((option) => (
          <div key={option.id} className="flex items-center space-x-3">
            <RadioGroupItem 
              value={option.value} 
              id={`${field.id}-${option.id}`}
              style={{ borderColor: colors.primary }}
            />
            <Label 
              htmlFor={`${field.id}-${option.id}`}
              className="text-sm cursor-pointer"
              style={{ color: colors.text }}
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </FieldWrapper>
  );
};

export default RadioField;
