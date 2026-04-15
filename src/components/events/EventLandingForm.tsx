import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle } from 'lucide-react';
import { Form, FormField } from '@/types/forms';
import { COLORS } from '@/components/admin/medias/shared/tokens';

interface Props {
  articleId: string;
}

/** Determines if two fields should be grouped on the same row (Prénom + Nom pattern) */
const isNamePair = (a: FormField, b: FormField): boolean => {
  const namePatterns = ['prenom', 'prénom', 'firstname', 'first_name', 'nom', 'lastname', 'last_name', 'name'];
  const aKey = (a.name || a.label || '').toLowerCase();
  const bKey = (b.name || b.label || '').toLowerCase();
  const aIsName = namePatterns.some(p => aKey.includes(p));
  const bIsName = namePatterns.some(p => bKey.includes(p));
  return aIsName && bIsName;
};

const fieldKey = (field: FormField) => field.name || field.id;

const EventLandingForm = ({ articleId }: Props) => {
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rgpdAccepted, setRgpdAccepted] = useState(false);

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

    const newErrors: Record<string, string> = {};
    const fields = (form.fields || []) as FormField[];
    fields.forEach((field) => {
      const key = fieldKey(field);
      if (field.required && !values[key]) {
        newErrors[key] = 'Ce champ est requis';
      }
      if (field.type === 'email' && values[key] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[key])) {
        newErrors[key] = 'Email invalide';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);

    try {
      const { error: insertError } = await supabase
        .from('form_responses')
        .insert({
          form_id: form.id,
          data: values,
        });

      if (insertError) throw insertError;

      await supabase.rpc('increment_form_submissions', { form_slug: form.slug });

      const emailField = fields.find(f => f.type === 'email');
      const nameFields = fields.filter(f => f.type === 'text');
      if (emailField && values[fieldKey(emailField)]) {
        const name = nameFields.map(f => values[fieldKey(f)]).filter(Boolean).join(' ') || 'Participant';
        await supabase.rpc('upsert_lead', {
          p_email: values[fieldKey(emailField)],
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
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: COLORS.terracotta }} />
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
      <div className="text-center py-10">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-5"
          style={{ background: `${COLORS.terracotta}15` }}
        >
          <CheckCircle className="h-8 w-8" style={{ color: COLORS.terracotta }} />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Inscription confirmée</h3>
        <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
          {settings.success_message || 'Votre inscription a bien été prise en compte. Vous recevrez un email de confirmation sous peu.'}
        </p>
      </div>
    );
  }

  const fields = (form.fields || []) as FormField[];
  const inputFields = fields.filter(f => f.type !== 'heading' && f.type !== 'paragraph' && f.type !== 'divider' && f.type !== 'rgpd');

  // Build rows: group name pairs on same row
  const rows: FormField[][] = [];
  let i = 0;
  while (i < inputFields.length) {
    if (i + 1 < inputFields.length && isNamePair(inputFields[i], inputFields[i + 1])) {
      rows.push([inputFields[i], inputFields[i + 1]]);
      i += 2;
    } else {
      rows.push([inputFields[i]]);
      i += 1;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors._form && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          {errors._form}
        </div>
      )}

      {rows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className={row.length === 2 ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}
        >
          {row.map((field) => {
            const key = fieldKey(field);
            return (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key} className="text-sm font-medium text-foreground">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  id={key}
                  type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                  placeholder={field.placeholder || ''}
                  value={values[key] || ''}
                  onChange={(e) => {
                    setValues(prev => ({ ...prev, [key]: e.target.value }));
                    setErrors(prev => {
                      const { [key]: _, ...rest } = prev;
                      return rest;
                    });
                  }}
                  className={`h-11 ${errors[key] ? 'border-destructive' : ''}`}
                  style={{
                    borderColor: errors[key] ? undefined : undefined,
                  }}
                />
                {errors[key] && (
                  <p className="text-xs text-destructive">{errors[key]}</p>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* RGPD consent */}
      <div className="flex items-start gap-3 pt-2">
        <Checkbox
          id="rgpd-consent"
          checked={rgpdAccepted}
          onCheckedChange={(checked) => setRgpdAccepted(checked as boolean)}
          className="mt-0.5"
        />
        <Label htmlFor="rgpd-consent" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
          J'accepte que mes données soient utilisées pour le suivi de cet événement et les communications liées.
        </Label>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full h-12 text-base font-semibold text-white border-0 mt-2"
        style={{
          background: `linear-gradient(135deg, ${COLORS.terracotta}, ${COLORS.terracotta}dd)`,
        }}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Envoi en cours…
          </>
        ) : (
          (form.settings as Record<string, any>)?.submit_button_text || "Confirmer mon inscription"
        )}
      </Button>
    </form>
  );
};

export default EventLandingForm;
