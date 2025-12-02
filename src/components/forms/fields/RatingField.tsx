import React from 'react';
import { Star } from 'lucide-react';
import { FormField, FormDesignSettings } from '@/types/forms';
import FieldWrapper from './FieldWrapper';

interface RatingFieldProps {
  field: FormField;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  colors: FormDesignSettings['colors'];
}

const RatingField = ({ field, value, onChange, error, colors }: RatingFieldProps) => {
  const maxRating = field.max || 5;
  const [hovered, setHovered] = React.useState<number | null>(null);

  return (
    <FieldWrapper field={field} error={error} colors={colors}>
      <div className="flex items-center gap-1">
        {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => {
          const isFilled = rating <= (hovered ?? value ?? 0);
          return (
            <button
              key={rating}
              type="button"
              className="p-1 transition-transform hover:scale-110"
              onMouseEnter={() => setHovered(rating)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onChange(rating)}
            >
              <Star
                className="h-7 w-7 transition-colors"
                fill={isFilled ? colors.secondary : 'transparent'}
                stroke={isFilled ? colors.secondary : colors.text}
                strokeWidth={1.5}
              />
            </button>
          );
        })}
      </div>
      {(field.minLabel || field.maxLabel) && (
        <div className="flex justify-between mt-1 text-xs opacity-60" style={{ color: colors.text }}>
          <span>{field.minLabel}</span>
          <span>{field.maxLabel}</span>
        </div>
      )}
    </FieldWrapper>
  );
};

export default RatingField;
