import React from 'react';
import { FormField, FormDesignSettings } from '@/types/forms';

interface FieldWrapperProps {
  field: FormField;
  error?: string;
  children: React.ReactNode;
  colors: FormDesignSettings['colors'];
}

const FieldWrapper = ({ field, error, children, colors }: FieldWrapperProps) => {
  const widthClass = field.width === 'half' ? 'w-full md:w-1/2' : field.width === 'third' ? 'w-full md:w-1/3' : 'w-full';
  
  return (
    <div className={`mb-6 ${widthClass} ${field.className || ''}`}>
      {field.label && field.type !== 'heading' && field.type !== 'paragraph' && field.type !== 'divider' && (
        <label 
          className="block text-sm font-medium mb-2"
          style={{ color: colors.text }}
        >
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {field.helpText && (
        <p className="text-xs mt-1.5 opacity-60" style={{ color: colors.text }}>
          {field.helpText}
        </p>
      )}
      {error && (
        <p className="text-xs mt-1.5 text-red-500">{error}</p>
      )}
    </div>
  );
};

export default FieldWrapper;
