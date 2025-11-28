import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Minimum 2 caractères").max(100, "Maximum 100 caractères"),
  email: z.string().email("Email invalide").max(255, "Email trop long"),
  company: z.string().max(100, "Maximum 100 caractères").optional(),
  subject: z.enum(["audit", "developpement", "formation", "conformite", "autre"], {
    errorMap: () => ({ message: "Sélectionnez un sujet" })
  }),
  message: z.string().trim().min(10, "Minimum 10 caractères").max(1000, "Maximum 1000 caractères")
});

export const newsletterSchema = z.object({
  email: z.string().email("Email invalide").max(255, "Email trop long")
});

export type ContactFormData = z.infer<typeof contactSchema>;
export type NewsletterFormData = z.infer<typeof newsletterSchema>;
