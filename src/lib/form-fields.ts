import { FormField } from '@/types/forms';

type RawFormField = Partial<FormField> & {
  name?: string;
  type?: string;
};

const normalizeFormFieldType = (type?: string): FormField['type'] => {
  if (type === 'tel') return 'phone';
  return (type as FormField['type']) || 'text';
};

export const normalizeFormFields = (fields: unknown): FormField[] => {
  if (!Array.isArray(fields)) return [];

  return fields.map((rawField, index) => {
    const field = (rawField && typeof rawField === 'object' ? rawField : {}) as RawFormField;
    const normalizedId = field.id || field.name || field.label || `field_${index + 1}`;

    return {
      ...field,
      id: normalizedId,
      type: normalizeFormFieldType(field.type),
      label: field.label || `Champ ${index + 1}`,
      required: Boolean(field.required),
    } as FormField;
  });
};