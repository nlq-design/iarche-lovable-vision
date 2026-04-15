import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle } from 'lucide-react';
import { Form, FormField } from '@/types/forms';

interface Props {
  articleId: string;
}

const EventLandingForm = ({ articleId }: Props) => {
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadForm();
  }, [articleId]);

  const loadForm = async () => {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('article_id', articleId)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!error && data) {
      setForm(data as unknown as Form);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    // Validate required fields
    const newErrors: Record<string, string> = {};
    const fields = (form.fields || []) as FormField[];
    fields.forEach((field) => {
      if (field.required && !values[field.id]) {
        newErrors[field.id] = 'Ce champ est requis';
      }
      if (field.type === 'email' && values[field.id] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[field.id])) {
        newErrors[field.id] = 'Email invalide';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);

    try {
      // Insert form response
      const { error: insertError } = await supabase
        .from('form_responses')
        .insert({
          form_id: form.id,
          data: values,
        });

      if (insertError) throw insertError;

      // Increment submissions count
      await supabase.rpc('increment_form_submissions', { form_slug: form.slug });

      // Also create a lead via upsert_lead if email exists
      const emailField = fields.find(f => f.type === 'email');
      const nameFields = fields.filter(f => f.type === 'text');
      if (emailField && values[emailField.id]) {
        const name = nameFields.map(f => values[f.id]).filter(Boolean).join(' ') || 'Participant';
        await supabase.rpc('upsert_lead', {
          p_email: values[emailField.id],
          p_name: name,
          p_source: 'atelier',
          p_source_context: form.title,
        });
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Form submission error:', err);
      setErrors({ _form: 'Une erreur est survenue. Veuillez réessayer.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!form) {
    return (
      <p className="text-muted-foreground text-center py-4">
        Les inscriptions ne sont pas encore ouvertes.
      </p>
    );
  }

  if (submitted) {
    const settings = form.settings as Record<string, any> || {};
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Inscription confirmée !</h3>
        <p className="text-muted-foreground">
          {settings.success_message || 'Votre inscription a bien été prise en compte. Vous recevrez un email de confirmation.'}
        </p>
      </div>
    );
  }

  const fields = (form.fields || []) as FormField[];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors._form && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          {errors._form}
        </div>
      )}

      {fields
        .filter(f => f.type !== 'heading' && f.type !== 'paragraph' && f.type !== 'divider')
        .map((field) => (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
              placeholder={field.placeholder || ''}
              value={values[field.id] || ''}
              onChange={(e) => {
                setValues(prev => ({ ...prev, [field.id]: e.target.value }));
                setErrors(prev => {
                  const { [field.id]: _, ...rest } = prev;
                  return rest;
                });
              }}
              className={errors[field.id] ? 'border-destructive' : ''}
            />
            {errors[field.id] && (
              <p className="text-xs text-destructive">{errors[field.id]}</p>
            )}
          </div>
        ))}

      <Button type="submit" disabled={submitting} className="w-full mt-4">
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Envoi en cours...
          </>
        ) : (
          (form.settings as Record<string, any>)?.submit_button_text || "Confirmer mon inscription"
        )}
      </Button>
    </form>
  );
};

export default EventLandingForm;
