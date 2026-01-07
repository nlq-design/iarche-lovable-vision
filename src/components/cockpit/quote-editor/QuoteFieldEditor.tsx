import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface QuoteFieldEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'email' | 'tel' | 'url' | 'date' | 'textarea';
  rows?: number;
  icon?: React.ReactNode;
  hint?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export const QuoteFieldEditor: React.FC<QuoteFieldEditorProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  rows = 3,
  icon,
  hint,
  className,
  required = false,
  disabled = false,
}) => {
  const inputId = `field-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={inputId} className="flex items-center gap-1.5 text-sm font-medium">
        {icon}
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      
      {type === 'textarea' ? (
        <Textarea
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className="resize-none"
        />
      ) : (
        <Input
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}
      
      {hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
};

export default QuoteFieldEditor;
