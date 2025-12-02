import React from 'react';
import { FormField, FormDesignSettings } from '@/types/forms';

interface ParagraphFieldProps {
  field: FormField;
  colors: FormDesignSettings['colors'];
}

const ParagraphField = ({ field, colors }: ParagraphFieldProps) => {
  return (
    <div className="mb-6">
      <p 
        className="text-sm leading-relaxed"
        style={{ color: colors.text }}
      >
        {field.label}
      </p>
    </div>
  );
};

export default ParagraphField;
