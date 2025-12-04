import React from 'react';
import { FormField, FormDesignSettings } from '@/types/forms';

interface ParagraphFieldProps {
  field: FormField;
  colors: FormDesignSettings['colors'];
}

const ParagraphField = ({ field, colors }: ParagraphFieldProps) => {
  return (
    <div className="mb-6">
      {field.label && (
        <p 
          className="text-sm font-medium leading-relaxed"
          style={{ color: colors.text }}
        >
          {field.label}
        </p>
      )}
      {field.helpText && (
        <p 
          className="text-sm leading-relaxed mt-1 opacity-80 whitespace-pre-line"
          style={{ color: colors.text }}
        >
          {field.helpText}
        </p>
      )}
    </div>
  );
};

export default ParagraphField;
