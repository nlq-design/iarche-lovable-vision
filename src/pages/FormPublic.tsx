import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFormResponses } from '@/hooks/useFormResponses';
import { useFormAnalytics } from '@/hooks/useFormAnalytics';
import { Form, FormField, DEFAULT_FORM_SETTINGS } from '@/types/forms';
import {
  TextField,
  TextareaField,
  EmailField,
  PhoneField,
  NumberField,
  DateField,
  TimeField,
  DateTimeField,
  RadioField,
  CheckboxField,
  SelectField,
  FileField,
  RatingField,
  ScaleField,
  BooleanField,
  SignatureField,
  RGPDField,
  HeadingField,
  ParagraphField,
  DividerField
} from '@/components/forms/fields';
import { supabase } from '@/integrations/supabase/client';
import { normalizeFormFields } from '@/lib/form-fields';

const FormPublic = () => {
  const { slug } = useParams<{ slug: string }>();
  const { submitResponse } = useFormResponses();
  const { trackEvent } = useFormAnalytics();
  
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadForm = async () => {
      if (!slug) {
        console.log('[FormPublic] No slug provided');
        setLoading(false);
        return;
      }
      
      console.log('[FormPublic] Loading form with slug:', slug);
      
      try {
        // Direct Supabase call with timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 10000)
        );
        
        console.log('[FormPublic] Making direct Supabase call...');
        const queryPromise = supabase
          .from('forms')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();
        
        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
        
        console.log('[FormPublic] Supabase response:', { data, error });
        
        if (error) {
          console.error('[FormPublic] Supabase error:', error);
          setError('Erreur de chargement');
          setLoading(false);
          return;
        }
        
        if (data) {
          // Parse form data
          const formData: Form = {
            ...data,
            fields: normalizeFormFields(data.fields),
            settings: data.settings || DEFAULT_FORM_SETTINGS
          };
          setForm(formData);
          // Track view
          trackEvent(formData.id, 'view');
          // Increment views count
          await supabase.rpc('increment_form_views', { form_slug: slug });
        } else {
          console.log('[FormPublic] Form not found');
          setError('Formulaire non trouvé');
        }
      } catch (err) {
        console.error('[FormPublic] Catch error:', err);
        setError('Erreur de connexion');
      }
      
      setLoading(false);
    };
    
    loadForm();
  }, [slug]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
    // Track field interaction
    if (form) {
      trackEvent(form.id, 'field_focus', { fieldId });
    }
  };

  const validateForm = (): boolean => {
    if (!form) return false;
    
    const newErrors: Record<string, string> = {};
    
    form.fields.forEach(field => {
      const value = values[field.id];
      
      // Required validation
      if (field.required) {
        if (value === undefined || value === null || value === '' || 
            (Array.isArray(value) && value.length === 0)) {
          newErrors[field.id] = 'Ce champ est requis';
          return;
        }
      }
      
      // Skip further validation if empty and not required
      if (!value) return;
      
      // Email validation
      if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          newErrors[field.id] = 'Email invalide';
        }
      }
      
      // Min/Max length validation
      if (typeof value === 'string') {
        if (field.minLength && value.length < field.minLength) {
          newErrors[field.id] = `Minimum ${field.minLength} caractères`;
        }
        if (field.maxLength && value.length > field.maxLength) {
          newErrors[field.id] = `Maximum ${field.maxLength} caractères`;
        }
      }
      
      // Number validation
      if (field.type === 'number' && value !== '') {
        const numValue = Number(value);
        if (field.min !== undefined && numValue < field.min) {
          newErrors[field.id] = `Minimum ${field.min}`;
        }
        if (field.max !== undefined && numValue > field.max) {
          newErrors[field.id] = `Maximum ${field.max}`;
        }
      }
      
      // Pattern validation
      if (field.pattern && typeof value === 'string') {
        const regex = new RegExp(field.pattern);
        if (!regex.test(value)) {
          newErrors[field.id] = 'Format invalide';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form || !validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    const metadata = {
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      source: window.location.href,
      device: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' as const : 'desktop' as const
    };
    
    const success = await submitResponse(form.id, values, metadata);
    
    if (success) {
      trackEvent(form.id, 'submit');
      setSubmitted(true);
      
      // Redirect if configured
      if (form.settings?.thankYou?.redirectUrl) {
        setTimeout(() => {
          window.location.href = form.settings.thankYou.redirectUrl!;
        }, 2000);
      }
    } else {
      setError('Erreur lors de la soumission');
    }
    
    setSubmitting(false);
  };

  const renderField = (field: FormField) => {
    const colors = form?.settings?.design?.colors || DEFAULT_FORM_SETTINGS.design.colors;
    const value = values[field.id];
    const fieldError = errors[field.id];
    
    const commonProps = {
      field,
      value,
      onChange: (val: any) => handleFieldChange(field.id, val),
      error: fieldError,
      colors
    };

    switch (field.type) {
      case 'text':
        return <TextField {...commonProps} />;
      case 'textarea':
        return <TextareaField {...commonProps} />;
      case 'email':
        return <EmailField {...commonProps} />;
      case 'phone':
        return <PhoneField {...commonProps} />;
      case 'number':
        return <NumberField {...commonProps} />;
      case 'date':
        return <DateField {...commonProps} />;
      case 'time':
        return <TimeField {...commonProps} />;
      case 'datetime':
        return <DateTimeField {...commonProps} />;
      case 'radio':
        return <RadioField {...commonProps} />;
      case 'checkbox':
        return <CheckboxField {...commonProps} />;
      case 'select':
        return <SelectField {...commonProps} />;
      case 'file':
        return <FileField {...commonProps} />;
      case 'rating':
        return <RatingField {...commonProps} />;
      case 'scale':
        return <ScaleField {...commonProps} />;
      case 'boolean':
        return <BooleanField {...commonProps} />;
      case 'signature':
        return <SignatureField {...commonProps} />;
      case 'rgpd':
        return <RGPDField {...commonProps} privacyUrl="/confidentialite" />;
      case 'heading':
        return <HeadingField field={field} colors={colors} />;
      case 'paragraph':
        return <ParagraphField field={field} colors={colors} />;
      case 'divider':
        return <DividerField field={field} colors={colors} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2">
            {error || 'Formulaire non trouvé'}
          </h1>
          <p className="text-muted-foreground">
            Ce formulaire n'existe pas ou n'est plus disponible.
          </p>
        </div>
      </div>
    );
  }

  const design = form.settings?.design || DEFAULT_FORM_SETTINGS.design;
  const colors = design.colors;

  if (submitted) {
    return (
      <>
        <Helmet>
          <title>{form.title} - Merci | IArche</title>
        </Helmet>
        <div 
          className="min-h-screen flex items-center justify-center p-4"
          style={{ backgroundColor: colors.background }}
        >
          <div className="text-center max-w-md">
            <CheckCircle 
              className="h-16 w-16 mx-auto mb-6" 
              style={{ color: colors.primary }}
            />
            <h1 
              className="text-2xl font-bold mb-4"
              style={{ color: colors.text }}
            >
              {form.settings?.thankYou?.message || 'Merci pour votre réponse !'}
            </h1>
            {form.settings?.thankYou?.redirectUrl && (
              <p className="text-sm opacity-60" style={{ color: colors.text }}>
                Redirection en cours...
              </p>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{form.title} | IArche</title>
        <meta name="description" content={form.description || `Formulaire ${form.title}`} />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div 
        className="min-h-screen py-8 px-4"
        style={{ backgroundColor: colors.background }}
      >
        <div className="max-w-2xl mx-auto">
          {/* Logo v4.0: logo custom ou logo officiel IArche */}
          <div className="flex justify-center mb-6">
            <img 
              src={design.logo || "/logos/iarche-main.svg"} 
              alt="IArche" 
              className="h-10 object-contain"
            />
          </div>
          
          {/* Form container */}
          <div 
            className="rounded-xl shadow-lg p-8"
            style={{ 
              backgroundColor: colors.background,
              border: `1px solid ${colors.primary}15`
            }}
          >
            {/* Title & Description */}
            <div className="mb-8">
              <h1 
                className="text-2xl font-bold mb-2"
                style={{ color: colors.primary }}
              >
                {form.title}
              </h1>
              {form.description && (
                <p 
                  className="text-sm opacity-80"
                  style={{ color: colors.text }}
                >
                  {form.description}
                </p>
              )}
            </div>
            
            {/* Form fields */}
            <form onSubmit={handleSubmit}>
              <div className="flex flex-wrap -mx-2">
                {form.fields.map(field => (
                  <div 
                    key={field.id}
                    className={`px-2 ${
                      field.width === 'half' ? 'w-full md:w-1/2' :
                      field.width === 'third' ? 'w-full md:w-1/3' : 'w-full'
                    }`}
                  >
                    {renderField(field)}
                  </div>
                ))}
              </div>
              
              {/* Submit button */}
              <div className="mt-8">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-6 text-lg font-medium transition-all"
                  style={{
                    backgroundColor: colors.primary,
                    color: colors.background
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Envoi en cours...
                    </>
                  ) : (
                    'Envoyer ma réponse'
                  )}
                </Button>
              </div>
            </form>
          </div>
          
          {/* Footer */}
          <div className="mt-6 text-center">
            <p 
              className="text-xs opacity-50"
              style={{ color: colors.text }}
            >
              Formulaire créé avec IArche
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default FormPublic;
