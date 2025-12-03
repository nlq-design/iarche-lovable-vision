import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface EmailLogEntry {
  recipient_email: string;
  subject: string;
  source_type: string;
  email_type: 'user_confirmation' | 'admin_notification';
  source_id?: string;
  status: 'sent' | 'failed' | 'pending';
  error_message?: string;
  metadata?: Record<string, unknown>;
}

export async function logEmail(entry: EmailLogEntry): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error } = await supabase.from('email_logs').insert({
      recipient_email: entry.recipient_email,
      subject: entry.subject,
      source_type: entry.source_type,
      email_type: entry.email_type,
      source_id: entry.source_id || null,
      status: entry.status,
      error_message: entry.error_message || null,
      metadata: entry.metadata || {},
      sent_at: entry.status === 'sent' ? new Date().toISOString() : null,
    });

    if (error) {
      console.error('Failed to log email:', error);
    } else {
      console.log(`Email logged: ${entry.source_type} -> ${entry.recipient_email} (${entry.status})`);
    }
  } catch (err) {
    console.error('Error in logEmail:', err);
  }
}

export async function logEmailBatch(entries: EmailLogEntry[]): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const records = entries.map(entry => ({
      recipient_email: entry.recipient_email,
      subject: entry.subject,
      source_type: entry.source_type,
      email_type: entry.email_type,
      source_id: entry.source_id || null,
      status: entry.status,
      error_message: entry.error_message || null,
      metadata: entry.metadata || {},
      sent_at: entry.status === 'sent' ? new Date().toISOString() : null,
    }));

    const { error } = await supabase.from('email_logs').insert(records);

    if (error) {
      console.error('Failed to log email batch:', error);
    } else {
      console.log(`Email batch logged: ${entries.length} emails`);
    }
  } catch (err) {
    console.error('Error in logEmailBatch:', err);
  }
}
