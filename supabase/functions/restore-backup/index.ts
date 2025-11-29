import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RestoreRequest {
  backup_id: string;
  tables_to_restore?: string[];
  preview_mode?: boolean;
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

    // Vérifier le rôle admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Accès refusé. Rôle admin requis.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { backup_id, tables_to_restore, preview_mode = false } = await req.json() as RestoreRequest;

    console.log(`Starting restore from backup ${backup_id}, preview_mode: ${preview_mode}`);

    // Récupérer le backup
    const { data: backup, error: backupError } = await supabaseClient
      .from('database_backups')
      .select('*')
      .eq('id', backup_id)
      .single();

    if (backupError || !backup) {
      throw new Error('Backup introuvable');
    }

    if (backup.status !== 'completed') {
      throw new Error('Le backup doit être complété pour être restauré');
    }

    if (!backup.restoration_possible) {
      throw new Error('Ce backup n\'est pas restaurable (échec du test d\'intégrité)');
    }

    // En mode preview, on retourne juste les statistiques
    if (preview_mode) {
      return new Response(
        JSON.stringify({
          success: true,
          preview: true,
          backup_info: {
            id: backup.id,
            created_at: backup.created_at,
            tables_count: backup.tables_backed_up?.length || 0,
            tables_list: backup.tables_backed_up || [],
            file_size_mb: ((backup.file_size_bytes || 0) / 1024 / 1024).toFixed(2),
            backup_type: backup.backup_type,
          },
          warning: 'Mode aperçu activé. Aucune donnée ne sera restaurée.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // TODO: Implémenter la logique de restauration complète
    // Note: La restauration complète nécessite de stocker les données du backup
    // Actuellement, on ne stocke que les métadonnées
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'La restauration complète nécessite une architecture de stockage des backups (à implémenter)',
        suggestion: 'Utilisez preview_mode: true pour voir les détails du backup'
      }),
      {
        status: 501,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in restore-backup:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
