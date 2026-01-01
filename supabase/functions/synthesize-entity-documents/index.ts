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

interface ChronologicalEvent {
  date: string;
  dateObj: Date;
  type: string;
  title: string;
  content: string;
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

    // 1. Load dynamic prompt from ai_prompts
    const { data: promptData } = await supabase
      .from('ai_prompts')
      .select('system_prompt, user_prompt, model_config')
      .eq('slug', 'entity-synthesis')
      .single();

    const systemPrompt = promptData?.system_prompt || getDefaultSystemPrompt();
    const userPromptTemplate = promptData?.user_prompt || getDefaultUserPrompt();
    const modelConfig = promptData?.model_config || { model: 'google/gemini-2.5-flash' };

    // 2. Fetch all sources based on entity type
    let entityName = '';
    const events: ChronologicalEvent[] = [];

    // Fetch entity name first
    if (entity_type === 'lead') {
      const { data: lead } = await supabase
        .from('leads')
        .select('name, company, created_at')
        .eq('id', entity_id)
        .single();
      entityName = lead?.company || lead?.name || 'Lead';
      if (lead?.created_at) {
        events.push({
          date: formatDate(lead.created_at),
          dateObj: new Date(lead.created_at),
          type: 'Lead',
          title: 'Création du lead',
          content: `Lead ${lead.name}${lead.company ? ` (${lead.company})` : ''} créé`
        });
      }
    } else if (entity_type === 'project') {
      const { data: project } = await supabase
        .from('projects')
        .select('name, created_at, status')
        .eq('id', entity_id)
        .single();
      entityName = project?.name || 'Projet';
      if (project?.created_at) {
        events.push({
          date: formatDate(project.created_at),
          dateObj: new Date(project.created_at),
          type: 'Projet',
          title: 'Création du projet',
          content: `Projet "${project.name}" créé - Statut: ${project.status}`
        });
      }
    } else if (entity_type === 'solution') {
      const { data: solution } = await supabase
        .from('articles')
        .select('title, created_at')
        .eq('id', entity_id)
        .eq('resource_type', 'solution')
        .single();
      entityName = solution?.title || 'Solution';
    } else if (entity_type === 'document') {
      const { data: doc } = await supabase
        .from('generated_documents')
        .select('title, created_at')
        .eq('id', entity_id)
        .single();
      entityName = doc?.title || 'Document';
    }

    // 3. Fetch uploaded files
    let linkedFiles: any[] = [];
    if (entity_type === 'lead') {
      const { data } = await supabase
        .from('uploaded_files')
        .select('id, original_filename, ai_summary, extracted_content, created_at, file_type')
        .contains('lead_ids', [entity_id]);
      linkedFiles = data || [];
    } else if (entity_type === 'project') {
      const { data } = await supabase
        .from('uploaded_files')
        .select('id, original_filename, ai_summary, extracted_content, created_at, file_type')
        .contains('project_ids', [entity_id]);
      linkedFiles = data || [];
    } else if (entity_type === 'solution') {
      const { data } = await supabase
        .from('uploaded_files')
        .select('id, original_filename, ai_summary, extracted_content, created_at, file_type')
        .contains('solution_ids', [entity_id]);
      linkedFiles = data || [];
    } else if (entity_type === 'document') {
      const { data } = await supabase
        .from('uploaded_files')
        .select('id, original_filename, ai_summary, extracted_content, created_at, file_type')
        .eq('generated_document_id', entity_id);
      linkedFiles = data || [];
    }

    // Add files to events
    linkedFiles.forEach(file => {
      const content = file.ai_summary || file.extracted_content?.substring(0, 1500) || 'Contenu non disponible';
      events.push({
        date: formatDate(file.created_at),
        dateObj: new Date(file.created_at),
        type: 'Document',
        title: file.original_filename,
        content: `[${file.file_type || 'fichier'}] ${content}`
      });
    });

    // 4. Fetch voice transcriptions
    let transcriptions: any[] = [];
    if (entity_type === 'lead') {
      const { data } = await supabase
        .from('voice_transcriptions')
        .select('id, title, content, ai_summary, transcription_date, created_at, status')
        .eq('lead_id', entity_id)
        .eq('status', 'completed');
      transcriptions = data || [];
    } else if (entity_type === 'project') {
      const { data } = await supabase
        .from('voice_transcriptions')
        .select('id, title, content, ai_summary, transcription_date, created_at, status')
        .eq('project_id', entity_id)
        .eq('status', 'completed');
      transcriptions = data || [];
    } else if (entity_type === 'solution') {
      const { data } = await supabase
        .from('voice_transcriptions')
        .select('id, title, content, ai_summary, transcription_date, created_at, status')
        .eq('solution_id', entity_id)
        .eq('status', 'completed');
      transcriptions = data || [];
    }

    // Add transcriptions to events (use transcription_date if available)
    transcriptions.forEach(t => {
      const eventDate = t.transcription_date || t.created_at;
      const content = t.ai_summary || t.content?.substring(0, 1500) || '';
      events.push({
        date: formatDate(eventDate),
        dateObj: new Date(eventDate),
        type: 'Transcription',
        title: t.title || 'Transcription audio',
        content
      });
    });

    // 5. Fetch linked partners
    let partners: any[] = [];
    const partnerTable = `${entity_type}_partners`;
    const entityColumn = `${entity_type}_id`;
    
    try {
      const { data } = await supabase
        .from(partnerTable)
        .select(`
          created_at,
          role,
          partner:partners(id, name, type, company)
        `)
        .eq(entityColumn, entity_id);
      partners = data || [];
    } catch (e) {
      console.log(`[synthesize] No partner table for ${entity_type}`);
    }

    // Add partners to events
    partners.forEach(p => {
      if (p.partner) {
        events.push({
          date: formatDate(p.created_at),
          dateObj: new Date(p.created_at),
          type: 'Partenaire',
          title: `${p.partner.name}${p.partner.company ? ` (${p.partner.company})` : ''}`,
          content: `Type: ${p.partner.type || 'non défini'}, Rôle: ${p.role || 'non défini'}`
        });
      }
    });

    // 6. Fetch tasks
    let tasks: any[] = [];
    if (entity_type === 'lead') {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, description, status, priority, due_date, completed_at, created_at')
        .eq('lead_id', entity_id);
      tasks = data || [];
    } else if (entity_type === 'project') {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, description, status, priority, due_date, completed_at, created_at')
        .eq('project_id', entity_id);
      tasks = data || [];
    }

    // Add tasks to events
    tasks.forEach(t => {
      const eventDate = t.due_date || t.created_at;
      events.push({
        date: formatDate(eventDate),
        dateObj: new Date(eventDate),
        type: 'Tâche',
        title: t.title,
        content: `Statut: ${t.status}, Priorité: ${t.priority}${t.description ? `. ${t.description}` : ''}`
      });
    });

    // 7. Fetch bookings
    let bookings: any[] = [];
    if (entity_type === 'lead') {
      const { data } = await supabase
        .from('bookings')
        .select('id, name, email, start_time, status, message, notes')
        .eq('lead_id', entity_id);
      bookings = data || [];
    }

    // Add bookings to events
    bookings.forEach(b => {
      events.push({
        date: formatDate(b.start_time),
        dateObj: new Date(b.start_time),
        type: 'RDV',
        title: `RDV avec ${b.name}`,
        content: `Statut: ${b.status}${b.message ? `. ${b.message}` : ''}${b.notes ? `. Notes: ${b.notes}` : ''}`
      });
    });

    // 8. Fetch generated documents for this entity
    let generatedDocs: any[] = [];
    if (entity_type === 'lead') {
      const { data } = await supabase
        .from('generated_documents')
        .select('id, title, document_type, status, created_at, version')
        .eq('lead_id', entity_id);
      generatedDocs = data || [];
    } else if (entity_type === 'project') {
      const { data } = await supabase
        .from('generated_documents')
        .select('id, title, document_type, status, created_at, version')
        .eq('project_id', entity_id);
      generatedDocs = data || [];
    }

    // Add generated docs to events
    generatedDocs.forEach(d => {
      events.push({
        date: formatDate(d.created_at),
        dateObj: new Date(d.created_at),
        type: 'Document généré',
        title: d.title,
        content: `Type: ${d.document_type}, Version: ${d.version || '1.0'}, Statut: ${d.status}`
      });
    });

    console.log(`[synthesize] Collected ${events.length} events for ${entityName}`);

    // Check if we have any data to synthesize
    if (events.length <= 1) {
      return new Response(
        JSON.stringify({ success: false, message: 'Pas assez de données liées pour générer une synthèse' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 9. Sort events chronologically
    events.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    // 10. Build chronological context
    const chronologicalContext = events.map((e, idx) => 
      `### ${idx + 1}. [${e.date}] ${e.type}: ${e.title}\n${e.content}`
    ).join('\n\n---\n\n');

    // 11. Prepare user prompt with variables
    const synthesisDate = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const userPrompt = userPromptTemplate
      .replace('{{synthesis_date}}', synthesisDate)
      .replace('{{entity_name}}', entityName)
      .replace('{{entity_type}}', entity_type)
      .replace('{{chronological_context}}', chronologicalContext);

    console.log(`[synthesize] Calling Lovable AI with ${modelConfig.model || 'google/gemini-2.5-flash'}...`);

    // 12. Generate synthesis with Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelConfig.model || 'google/gemini-2.5-flash',
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

    // 13. Store synthesis in the appropriate table
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
      const { data: existingNote } = await supabase
        .from('project_notes')
        .select('id')
        .eq('project_id', entity_id)
        .eq('note_type', 'synthesis')
        .eq('title', 'Synthèse IA Transversale')
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
            title: 'Synthèse IA Transversale',
            content: synthesis,
            note_type: 'synthesis',
            tags: ['ia', 'auto-generated', 'transversal']
          });
        updateError = error;
      }
    }

    if (updateError) {
      console.error('[synthesize] Update error:', updateError);
      throw updateError;
    }

    // 14. Log activity with detailed metadata
    const sourceCounts = {
      documents: linkedFiles.length,
      transcriptions: transcriptions.length,
      partners: partners.length,
      tasks: tasks.length,
      bookings: bookings.length,
      generated_documents: generatedDocs.length
    };

    await supabase.from('activity_log').insert({
      workspace_id: '00000000-0000-0000-0000-000000000001',
      entity_type: entity_type === 'document' ? 'specification' : entity_type,
      entity_id: entity_id,
      activity_type: 'synthesis_generated',
      title: `Synthèse IA transversale générée pour ${entityName}`,
      content: `Synthèse de ${events.length} événements (${Object.entries(sourceCounts).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k}`).join(', ')})`,
      is_ai_generated: true,
      ai_metadata: {
        events_count: events.length,
        source_counts: sourceCounts,
        synthesis_length: synthesis.length,
        model: modelConfig.model || 'google/gemini-2.5-flash',
        synthesis_date: synthesisDate
      }
    });

    console.log(`[synthesize] Complete for ${entity_type}:${entity_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        events_count: events.length,
        source_counts: sourceCounts,
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function getDefaultSystemPrompt(): string {
  return `Tu es un assistant expert en synthèse documentaire pour IArche, cabinet de conseil en transformation digitale.

Ta mission : produire une synthèse chronologique EXHAUSTIVE de toutes les informations liées à une entité.

Règles :
- Respecter strictement l'ordre chronologique
- Ne jamais perdre d'information clé
- Organiser par thématiques et chronologie
- Identifier les évolutions entre versions
- Mettre en avant les points d'action et décisions
- Format Markdown avec sections claires`;
}

function getDefaultUserPrompt(): string {
  return `Date de synthèse : {{synthesis_date}}

Entité : {{entity_name}} ({{entity_type}})

=== CONTEXTE CHRONOLOGIQUE ===

{{chronological_context}}

Produis une synthèse exhaustive en respectant strictement la chronologie.`;
}
