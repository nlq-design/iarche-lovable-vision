import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Minimum 2 caractères").max(100, "Maximum 100 caractères"),
  email: z.string().email("Email invalide").max(255, "Email trop long"),
  company: z.string().max(100, "Maximum 100 caractères").optional(),
  subject: z.enum(["audit", "developpement", "accompagnement", "conformite", "autre"], {
    errorMap: () => ({ message: "Sélectionnez un sujet" })
  }),
  message: z.string().trim().min(10, "Minimum 10 caractères").max(1000, "Maximum 1000 caractères")
});

export const newsletterSchema = z.object({
  email: z.string().email("Email invalide").max(255, "Email trop long")
});

export const commentSchema = z.object({
  author_name: z.string().trim().min(2, "Minimum 2 caractères").max(100, "Maximum 100 caractères"),
  author_email: z.string().email("Email invalide").max(255, "Email trop long"),
  content: z.string().trim().min(10, "Minimum 10 caractères").max(2000, "Maximum 2000 caractères")
});

export const leadSchema = z.object({
  name: z.string().trim().min(2, "Minimum 2 caractères").max(100, "Maximum 100 caractères"),
  email: z.string().email("Email invalide").max(255, "Email trop long"),
  company: z.string().max(100, "Maximum 100 caractères").optional(),
  phone: z.string().regex(/^(\+33|0)[1-9](\d{2}){4}$/, "Numéro de téléphone invalide").optional().or(z.literal("")),
  consent_marketing: z.boolean().default(false),
  source: z.enum(['newsletter', 'contact', 'livre-blanc', 'atelier-webinaire'], {
    errorMap: () => ({ message: "Source invalide" })
  }),
  source_id: z.string().uuid().optional()
});

export type ContactFormData = z.infer<typeof contactSchema>;
export type NewsletterFormData = z.infer<typeof newsletterSchema>;
export type CommentFormData = z.infer<typeof commentSchema>;
export type LeadFormData = z.infer<typeof leadSchema>;
