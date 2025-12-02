import React from 'react';
import { FormField, FormDesignSettings } from '@/types/forms';

interface DividerFieldProps {
  field: FormField;
  colors: FormDesignSettings['colors'];
}

const DividerField = ({ field, colors }: DividerFieldProps) => {
  return (
    <div className="my-8">
      <hr 
        className="border-t"
        style={{ borderColor: colors.primary + '20' }}
      />
    </div>
  );
};

export default DividerField;
