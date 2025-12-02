import React from 'react';
import { FormField, FormDesignSettings } from '@/types/forms';

interface HeadingFieldProps {
  field: FormField;
  colors: FormDesignSettings['colors'];
}

const HeadingField = ({ field, colors }: HeadingFieldProps) => {
  return (
    <div className="mb-6">
      <h3 
        className="text-lg font-semibold"
        style={{ color: colors.primary }}
      >
        {field.label}
      </h3>
      {field.helpText && (
        <p className="text-sm mt-1 opacity-70" style={{ color: colors.text }}>
          {field.helpText}
        </p>
      )}
    </div>
  );
};

export default HeadingField;
