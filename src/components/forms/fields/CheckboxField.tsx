import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FormField, FormDesignSettings } from '@/types/forms';
import FieldWrapper from './FieldWrapper';

interface CheckboxFieldProps {
  field: FormField;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  colors: FormDesignSettings['colors'];
}

const CheckboxField = ({ field, value = [], onChange, error, colors }: CheckboxFieldProps) => {
  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter(v => v !== optionValue));
    }
  };

  return (
    <FieldWrapper field={field} error={error} colors={colors}>
      <div className="space-y-2">
        {field.options?.map((option) => (
          <div key={option.id} className="flex items-center space-x-3">
            <Checkbox 
              id={`${field.id}-${option.id}`}
              checked={value.includes(option.value)}
              onCheckedChange={(checked) => handleChange(option.value, checked as boolean)}
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
      </div>
    </FieldWrapper>
  );
};

export default CheckboxField;
