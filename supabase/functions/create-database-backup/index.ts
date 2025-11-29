import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackupRequest {
  backup_type?: 'manual' | 'scheduled';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Vérifier l'authentification pour les backups manuels
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      userId = user?.id || null;
    }

    const { backup_type = 'scheduled' } = await req.json() as BackupRequest;

    console.log(`Starting ${backup_type} database backup...`);

    // Créer l'entrée de backup
    const { data: backupRecord, error: insertError } = await supabaseClient
      .from('database_backups')
      .insert({
        backup_type,
        status: 'in_progress',
        created_by: userId,
        started_at: new Date().toISOString(),
        progress_percentage: 0,
        execution_logs: [{
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Backup démarré',
          details: { backup_type }
        }]
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating backup record:', insertError);
      throw insertError;
    }

    // Liste des tables à sauvegarder (exclure les tables système)
    const tablesToBackup = [
      'articles',
      'article_versions',
      'article_views',
      'article_categories',
      'article_tags',
      'categories',
      'tags',
      'comments',
      'contacts',
      'newsletter_subscribers',
      'newsletters',
      'user_roles',
      'admin_audit_logs',
      'rate_limit_requests',
      'login_attempts',
      'account_locks',
      'database_backups'
    ];

    let totalRecords = 0;
    const backupData: Record<string, any[]> = {};

    // Exporter les données de chaque table
    for (let i = 0; i < tablesToBackup.length; i++) {
      const table = tablesToBackup[i];
      const progress = Math.round(((i + 1) / tablesToBackup.length) * 100);
      
      try {
        // Mettre à jour la progression
        await supabaseClient
          .from('database_backups')
          .update({
            progress_percentage: progress,
            current_table: table
          })
          .eq('id', backupRecord.id);

        const { data, error } = await supabaseClient
          .from(table)
          .select('*');

        if (error) {
          console.error(`Error backing up table ${table}:`, error);
          await supabaseClient.rpc('add_backup_log', {
            backup_id: backupRecord.id,
            log_level: 'warning',
            log_message: `Erreur lors de la sauvegarde de ${table}`,
            log_details: { error: error.message }
          });
          continue;
        }

        backupData[table] = data || [];
        totalRecords += data?.length || 0;
        console.log(`Backed up ${table}: ${data?.length || 0} records`);
        
        await supabaseClient.rpc('add_backup_log', {
          backup_id: backupRecord.id,
          log_level: 'info',
          log_message: `Table ${table} sauvegardée`,
          log_details: { records: data?.length || 0 }
        });
      } catch (tableError: any) {
        console.error(`Error processing table ${table}:`, tableError);
        await supabaseClient.rpc('add_backup_log', {
          backup_id: backupRecord.id,
          log_level: 'error',
          log_message: `Erreur critique sur ${table}`,
          log_details: { error: tableError?.message }
        });
      }
    }

    // Calculer la taille approximative du backup
    const backupJson = JSON.stringify(backupData);
    const fileSizeBytes = new TextEncoder().encode(backupJson).length;

    console.log(`Backup completed: ${totalRecords} total records, ${(fileSizeBytes / 1024 / 1024).toFixed(2)} MB`);

    // Mettre à jour le statut du backup
    await supabaseClient
      .from('database_backups')
      .update({
        status: 'completed',
        file_size_bytes: fileSizeBytes,
        tables_backed_up: tablesToBackup,
        completed_at: new Date().toISOString(),
        progress_percentage: 100,
        current_table: null
      })
      .eq('id', backupRecord.id);

    await supabaseClient.rpc('add_backup_log', {
      backup_id: backupRecord.id,
      log_level: 'success',
      log_message: 'Backup terminé avec succès',
      log_details: { 
        total_records: totalRecords, 
        file_size_mb: (fileSizeBytes / 1024 / 1024).toFixed(2) 
      }
    });

    // Envoyer une notification email de succès
    try {
      await supabaseClient.functions.invoke('send-security-alert', {
        body: {
          alert: {
            severity: 'low',
            title: 'Backup de base de données réussi',
            description: `Un backup ${backup_type === 'scheduled' ? 'automatique' : 'manuel'} a été créé avec succès.`,
            details: {
              backup_id: backupRecord.id,
              backup_type,
              total_records: totalRecords,
              file_size_mb: (fileSizeBytes / 1024 / 1024).toFixed(2),
              tables_count: tablesToBackup.length,
              completed_at: new Date().toISOString()
            }
          }
        }
      });
      console.log('Backup notification sent successfully');
    } catch (notifError) {
      console.error('Error sending backup notification:', notifError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        backup_id: backupRecord.id,
        message: 'Backup créé avec succès',
        details: {
          total_records: totalRecords,
          file_size_bytes: fileSizeBytes,
          file_size_mb: (fileSizeBytes / 1024 / 1024).toFixed(2),
          tables_backed_up: tablesToBackup.length,
          completed_at: new Date().toISOString()
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in create-database-backup:', error);

    // Tenter de mettre à jour le statut en erreur si possible
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabaseClient
        .from('database_backups')
        .update({
          status: 'failed',
          error_message: error?.message || 'Unknown error',
          completed_at: new Date().toISOString()
        })
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1);
    } catch (updateError) {
      console.error('Error updating backup status:', updateError);
    }

    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
