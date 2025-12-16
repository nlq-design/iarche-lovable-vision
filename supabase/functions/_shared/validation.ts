import { z } from 'https://esm.sh/zod@3.22.4';

// ============================================
// SHARED VALIDATION SCHEMAS FOR EDGE FUNCTIONS
// ============================================

// Common field validators
const emailValidator = z.string().email().max(255).trim();
const nameValidator = z.string().min(1).max(100).trim();
const phoneValidator = z.string().max(20).optional();
const companyValidator = z.string().max(200).optional();
const messageValidator = z.string().max(5000).optional();
const uuidValidator = z.string().uuid();

// Form notification schema
export const formNotificationSchema = z.object({
  form_id: z.string().min(1).max(100),
  form_title: z.string().min(1).max(200),
  form_fields: z.array(z.object({
    id: z.string(),
    label: z.string(),
    type: z.string(),
  })).optional(),
  response_data: z.record(z.any()),
  respondent_email: emailValidator.optional(),
  admin_email: emailValidator.optional(),
  send_to_respondent: z.boolean().optional(),
  custom_subject: z.string().max(200).optional(),
  custom_message: z.string().max(2000).optional(),
});

// User confirmation schema
export const userConfirmationSchema = z.object({
  email: emailValidator,
  name: nameValidator,
  source_type: z.enum(['contact', 'newsletter', 'livre-blanc', 'solution-contact', 'booking']),
  source_context: z.string().max(500).optional(),
  source_id: z.string().max(100).optional(),
  livre_blanc_title: z.string().max(300).optional(),
  file_url: z.string().url().max(2000).optional(),
});

// Atelier confirmation schema
export const atelierConfirmationSchema = z.object({
  name: nameValidator,
  email: emailValidator,
  atelier_title: z.string().min(1).max(300),
  atelier_id: uuidValidator.optional(),
  event_date: z.string().nullable(),
  event_location: z.string().max(500).nullable(),
  heure_debut: z.string().max(10).nullable(),
  type_evenement: z.string().max(100).nullable(),
});

// Lead notification schema
export const leadNotificationSchema = z.object({
  lead_id: z.string().min(1).max(100),
  name: nameValidator,
  email: emailValidator,
  company: companyValidator,
  phone: phoneValidator,
  source: z.string().min(1).max(50),
  source_context: z.string().max(500).optional(),
  message: messageValidator,
  event_details: z.object({
    date: z.string().nullable(),
    location: z.string().max(500).nullable(),
    heure_debut: z.string().max(10).nullable(),
    type_evenement: z.string().max(100).nullable(),
  }).optional(),
});

// Calendar booking schemas
export const bookingDataSchema = z.object({
  name: nameValidator,
  email: emailValidator,
  phone: phoneValidator,
  company: companyValidator,
  message: messageValidator,
  startTime: z.string().datetime(),
  bookingTypeId: uuidValidator,
  meetingType: z.enum(['visio', 'telephone', 'presentiel']).optional(),
  additionalGuests: z.array(emailValidator).max(10).optional(),
  solutionSlug: z.string().max(100).optional(),
});

export const calendarBookingSchema = z.object({
  action: z.enum(['get-slots', 'create-booking', 'cancel-booking']),
  bookingTypeSlug: z.string().max(100).optional(),
  date: z.string().optional(),
  bookingData: bookingDataSchema.optional(),
  bookingId: uuidValidator.optional(),
});

// Validation helper function
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  corsHeaders: Record<string, string>
): { success: true; data: T } | { success: false; response: Response } {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    console.error('[Validation Error]', JSON.stringify(result.error.flatten(), null, 2));
    return {
      success: false,
      response: new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: result.error.flatten().fieldErrors 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      ),
    };
  }
  
  return { success: true, data: result.data };
}

export type FormNotificationRequest = z.infer<typeof formNotificationSchema>;
export type UserConfirmationRequest = z.infer<typeof userConfirmationSchema>;
export type AtelierConfirmationRequest = z.infer<typeof atelierConfirmationSchema>;
export type LeadNotificationRequest = z.infer<typeof leadNotificationSchema>;
export type CalendarBookingRequest = z.infer<typeof calendarBookingSchema>;
export type BookingData = z.infer<typeof bookingDataSchema>;
