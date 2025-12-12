import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyRequest {
  backup_id: string;
}

Deno.serve(async (req) => {
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

    // Vérifier l'authentification admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentification requise' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin role
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.error('Admin access denied for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { backup_id } = await req.json() as VerifyRequest;

    console.log(`Starting integrity check for backup ${backup_id}`);

    // Récupérer le backup
    const { data: backup, error: backupError } = await supabaseClient
      .from('database_backups')
      .select('*')
      .eq('id', backup_id)
      .single();

    if (backupError || !backup) {
      throw new Error('Backup introuvable');
    }

    const checks = {
      has_tables: false,
      has_file_size: false,
      is_completed: false,
      no_errors: false,
      all_critical_tables: false,
    };

    let integrityScore = 0;
    const issues: string[] = [];

    // Vérification 1: Tables sauvegardées
    if (backup.tables_backed_up && backup.tables_backed_up.length > 0) {
      checks.has_tables = true;
      integrityScore += 20;
    } else {
      issues.push('Aucune table sauvegardée');
    }

    // Vérification 2: Taille du fichier
    if (backup.file_size_bytes && backup.file_size_bytes > 0) {
      checks.has_file_size = true;
      integrityScore += 20;
    } else {
      issues.push('Taille du backup invalide');
    }

    // Vérification 3: Statut complété
    if (backup.status === 'completed') {
      checks.is_completed = true;
      integrityScore += 20;
    } else {
      issues.push(`Statut du backup: ${backup.status}`);
    }

    // Vérification 4: Pas d'erreurs
    if (!backup.error_message) {
      checks.no_errors = true;
      integrityScore += 20;
    } else {
      issues.push(`Erreur détectée: ${backup.error_message}`);
    }

    // Vérification 5: Tables critiques présentes
    const criticalTables = ['articles', 'user_roles', 'admin_audit_logs'];
    const hasCriticalTables = criticalTables.every(table => 
      backup.tables_backed_up?.includes(table)
    );
    
    if (hasCriticalTables) {
      checks.all_critical_tables = true;
      integrityScore += 20;
    } else {
      issues.push('Tables critiques manquantes');
    }

    // Déterminer le statut d'intégrité
    let integrityStatus = 'failed';
    if (integrityScore >= 90) {
      integrityStatus = 'excellent';
    } else if (integrityScore >= 70) {
      integrityStatus = 'good';
    } else if (integrityScore >= 50) {
      integrityStatus = 'warning';
    }

    const restorationPossible = integrityScore >= 70;

    // Mettre à jour le backup avec les résultats
    await supabaseClient
      .from('database_backups')
      .update({
        integrity_check_status: integrityStatus,
        integrity_check_at: new Date().toISOString(),
        restoration_possible: restorationPossible,
      })
      .eq('id', backup_id);

    console.log(`Integrity check completed: ${integrityStatus} (${integrityScore}/100)`);

    // Envoyer une alerte si problème détecté
    if (integrityScore < 70) {
      try {
        await supabaseClient.functions.invoke('send-security-alert', {
          body: {
            alert: {
              severity: 'high',
              title: 'Problème d\'intégrité de backup détecté',
              description: `Le backup ${backup_id} a échoué le test d\'intégrité.`,
              details: {
                backup_id,
                integrity_score: integrityScore,
                status: integrityStatus,
                issues: issues.join(', '),
                restoration_possible: restorationPossible,
              }
            }
          }
        });
      } catch (notifError) {
        console.error('Error sending integrity alert:', notifError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        backup_id,
        integrity_check: {
          status: integrityStatus,
          score: integrityScore,
          restoration_possible: restorationPossible,
          checks,
          issues: issues.length > 0 ? issues : null,
          timestamp: new Date().toISOString(),
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in verify-backup-integrity:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
