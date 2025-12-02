import React from 'react';
import { Slider } from '@/components/ui/slider';
import { FormField, FormDesignSettings } from '@/types/forms';
import FieldWrapper from './FieldWrapper';

interface ScaleFieldProps {
  field: FormField;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  colors: FormDesignSettings['colors'];
}

const ScaleField = ({ field, value, onChange, error, colors }: ScaleFieldProps) => {
  const min = field.min ?? 0;
  const max = field.max ?? 10;
  const step = field.step ?? 1;

  return (
    <FieldWrapper field={field} error={error} colors={colors}>
      <div className="pt-2 pb-4">
        <Slider
          value={[value ?? min]}
          onValueChange={([v]) => onChange(v)}
          min={min}
          max={max}
          step={step}
          className="w-full"
        />
        <div className="flex justify-between mt-2">
          <span className="text-xs" style={{ color: colors.text }}>
            {field.minLabel || min}
          </span>
          <span 
            className="text-sm font-medium px-3 py-1 rounded"
            style={{ 
              backgroundColor: colors.primary + '10',
              color: colors.primary 
            }}
          >
            {value ?? min}
          </span>
          <span className="text-xs" style={{ color: colors.text }}>
            {field.maxLabel || max}
          </span>
        </div>
      </div>
    </FieldWrapper>
  );
};

export default ScaleField;
