import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SynthesizeRequest {
  entity_type: 'lead' | 'project' | 'solution' | 'document';
  entity_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { entity_type, entity_id }: SynthesizeRequest = await req.json();

    console.log(`[synthesize] Starting for ${entity_type}:${entity_id}`);

    // 1. Fetch linked documents based on entity type
    let linkedFiles: any[] = [];
    let entityName = '';

    if (entity_type === 'lead') {
      const { data: files } = await supabase
        .from('uploaded_files')
        .select('id, original_filename, ai_summary, extracted_content, created_at')
        .contains('lead_ids', [entity_id])
        .order('created_at', { ascending: true });
      linkedFiles = files || [];

      const { data: lead } = await supabase
        .from('leads')
        .select('name, company')
        .eq('id', entity_id)
        .single();
      entityName = lead?.company || lead?.name || 'Lead';

    } else if (entity_type === 'project') {
      const { data: files } = await supabase
        .from('uploaded_files')
        .select('id, original_filename, ai_summary, extracted_content, created_at')
        .contains('project_ids', [entity_id])
        .order('created_at', { ascending: true });
      linkedFiles = files || [];

      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', entity_id)
        .single();
      entityName = project?.name || 'Projet';

    } else if (entity_type === 'solution') {
      const { data: files } = await supabase
        .from('uploaded_files')
        .select('id, original_filename, ai_summary, extracted_content, created_at')
        .contains('solution_ids', [entity_id])
        .order('created_at', { ascending: true });
      linkedFiles = files || [];

      const { data: solution } = await supabase
        .from('articles')
        .select('title')
        .eq('id', entity_id)
        .eq('resource_type', 'solution')
        .single();
      entityName = solution?.title || 'Solution';

    } else if (entity_type === 'document') {
      // For generated_documents, fetch files linked via generated_document_id
      const { data: files } = await supabase
        .from('uploaded_files')
        .select('id, original_filename, ai_summary, extracted_content, created_at')
        .eq('generated_document_id', entity_id)
        .order('created_at', { ascending: true });
      linkedFiles = files || [];

      const { data: doc } = await supabase
        .from('generated_documents')
        .select('title')
        .eq('id', entity_id)
        .single();
      entityName = doc?.title || 'Document';
    }

    console.log(`[synthesize] Found ${linkedFiles.length} files for ${entityName}`);

    if (linkedFiles.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Aucun document lié trouvé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Build context from all documents
    const documentsContext = linkedFiles.map((file, index) => {
      const date = new Date(file.created_at).toLocaleDateString('fr-FR');
      const content = file.ai_summary || file.extracted_content?.substring(0, 2000) || 'Contenu non disponible';
      return `### Document ${index + 1}: ${file.original_filename} (${date})\n${content}`;
    }).join('\n\n---\n\n');

    // 3. Generate synthesis with Lovable AI
    const systemPrompt = `Tu es un assistant expert en synthèse documentaire pour IArche, cabinet de conseil en transformation digitale.

Ta mission : produire une synthèse complète et structurée de tous les documents fournis, en préservant TOUTES les informations importantes.

Règles :
- Ne jamais perdre d'information clé
- Organiser par thématiques ou chronologie selon pertinence
- Identifier les évolutions entre versions si applicable
- Mettre en avant les points d'action et décisions
- Format Markdown avec sections claires
- Longueur adaptée à la quantité d'information (pas de limite)`;

    const userPrompt = `Synthétise les ${linkedFiles.length} documents liés à "${entityName}" (${entity_type}).

${documentsContext}

Produis une synthèse exhaustive en Markdown.`;

    console.log(`[synthesize] Calling Lovable AI...`);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[synthesize] AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requêtes atteinte. Réessayez dans quelques instants.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crédits IA insuffisants.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const synthesis = aiData.choices?.[0]?.message?.content;

    if (!synthesis) {
      throw new Error('No synthesis generated');
    }

    console.log(`[synthesize] Generated synthesis (${synthesis.length} chars)`);

    // 4. Store synthesis in the appropriate table
    let updateError = null;

    if (entity_type === 'lead') {
      const { error } = await supabase
        .from('leads')
        .update({ ai_documents_summary: synthesis })
        .eq('id', entity_id);
      updateError = error;

    } else if (entity_type === 'solution') {
      const { error } = await supabase
        .from('articles')
        .update({ ai_documents_summary: synthesis })
        .eq('id', entity_id);
      updateError = error;

    } else if (entity_type === 'document') {
      const { error } = await supabase
        .from('generated_documents')
        .update({ ai_documents_summary: synthesis })
        .eq('id', entity_id);
      updateError = error;

    } else if (entity_type === 'project') {
      // For projects, create/update a synthesis note instead
      const { data: existingNote } = await supabase
        .from('project_notes')
        .select('id')
        .eq('project_id', entity_id)
        .eq('note_type', 'synthesis')
        .eq('title', 'Synthèse documentaire IA')
        .maybeSingle();

      if (existingNote) {
        const { error } = await supabase
          .from('project_notes')
          .update({ 
            content: synthesis,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingNote.id);
        updateError = error;
      } else {
        const { error } = await supabase
          .from('project_notes')
          .insert({
            project_id: entity_id,
            workspace_id: '00000000-0000-0000-0000-000000000001',
            title: 'Synthèse documentaire IA',
            content: synthesis,
            note_type: 'synthesis',
            tags: ['ia', 'auto-generated']
          });
        updateError = error;
      }
    }

    if (updateError) {
      console.error('[synthesize] Update error:', updateError);
      throw updateError;
    }

    // 5. Log activity
    await supabase.from('activity_log').insert({
      workspace_id: '00000000-0000-0000-0000-000000000001',
      entity_type: entity_type === 'document' ? 'specification' : entity_type,
      entity_id: entity_id,
      activity_type: 'synthesis_generated',
      title: `Synthèse IA générée pour ${entityName}`,
      content: `Synthèse de ${linkedFiles.length} documents`,
      is_ai_generated: true,
      ai_metadata: {
        documents_count: linkedFiles.length,
        synthesis_length: synthesis.length,
        model: 'google/gemini-2.5-flash'
      }
    });

    console.log(`[synthesize] Complete for ${entity_type}:${entity_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        documents_count: linkedFiles.length,
        synthesis_length: synthesis.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[synthesize] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
