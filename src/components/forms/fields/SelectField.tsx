import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField, FormDesignSettings } from '@/types/forms';
import FieldWrapper from './FieldWrapper';

interface SelectFieldProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  colors: FormDesignSettings['colors'];
}

const SelectField = ({ field, value, onChange, error, colors }: SelectFieldProps) => {
  return (
    <FieldWrapper field={field} error={error} colors={colors}>
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger 
          className="w-full"
          style={{
            borderColor: error ? '#ef4444' : undefined,
            backgroundColor: colors.background,
            color: colors.text
          }}
        >
          <SelectValue placeholder={field.placeholder || 'Sélectionner...'} />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((option) => (
            <SelectItem key={option.id} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldWrapper>
  );
};

export default SelectField;
