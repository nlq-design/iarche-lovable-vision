import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface LinkedGeneratedDocumentsSectionProps {
  entityType: 'lead' | 'project' | 'partner' | 'solution';
  entityId: string | undefined;
  title?: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  devis: { label: 'Devis', variant: 'default' },
  cdc: { label: 'CDC', variant: 'secondary' },
  proposition: { label: 'Proposition', variant: 'outline' },
  autre: { label: 'Autre', variant: 'outline' },
};

export function LinkedGeneratedDocumentsSection({ 
  entityType, 
  entityId, 
  title = "Documents liés" 
}: LinkedGeneratedDocumentsSectionProps) {
  const navigate = useNavigate();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['linked-generated-documents', entityType, entityId],
    queryFn: async () => {
      if (!entityId) return [];

      if (entityType === 'lead') {
        const { data, error } = await supabase
          .from('generated_documents')
          .select('id, title, document_type, status, created_at')
          .eq('lead_id', entityId)
          .order('created_at', { ascending: false });
        
        if (error) return [];
        return data;
      } else if (entityType === 'project') {
        const { data, error } = await supabase
          .from('generated_documents')
          .select('id, title, document_type, status, created_at')
          .eq('project_id', entityId)
          .order('created_at', { ascending: false });
        
        if (error) return [];
        return data;
      } else if (entityType === 'partner') {
        // Documents via junction table
        const { data: links } = await supabase
          .from('document_partners')
          .select('document_id')
          .eq('partner_id', entityId);
        
        if (!links || links.length === 0) return [];
        
        const { data, error } = await supabase
          .from('generated_documents')
          .select('id, title, document_type, status, created_at')
          .in('id', links.map(l => l.document_id))
          .order('created_at', { ascending: false });
        
        if (error) return [];
        return data;
      } else if (entityType === 'solution') {
        // Solution -> Leads -> Documents
        const { data: solutionLeads } = await supabase
          .from('solution_leads')
          .select('lead_id')
          .eq('solution_id', entityId);
        
        if (!solutionLeads || solutionLeads.length === 0) return [];
        
        const { data, error } = await supabase
          .from('generated_documents')
          .select('id, title, document_type, status, created_at')
          .in('lead_id', solutionLeads.map(sl => sl.lead_id))
          .order('created_at', { ascending: false });
        
        if (error) return [];
        return data;
      }
      
      return [];
    },
    enabled: !!entityId,
  });

  const getDocumentSlug = (doc: any): string => {
    const prefix = doc.document_type === 'cdc' ? 'cdc' : 
                   doc.document_type === 'devis' ? 'devis' : 
                   doc.document_type === 'proposition' ? 'proposition' : 'doc';
    // Generate slug from title
    const titleSlug = doc.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
    return `${prefix}-${titleSlug}`;
  };

  return (
    <Card className="border">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {title}
        </CardTitle>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-7 text-xs"
          onClick={() => navigate('/cockpit/documents')}
        >
          <Plus className="h-3 w-3 mr-1" />
          Créer
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-sm text-muted-foreground">Chargement...</div>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">Aucun document lié</p>
            <p className="text-xs">Créez un document depuis /cockpit/documents</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc: any) => {
              const typeConfig = DOCUMENT_TYPE_LABELS[doc.document_type] || DOCUMENT_TYPE_LABELS.autre;
              
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/cockpit/documents/${getDocumentSlug(doc)}`)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.created_at && format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={typeConfig.variant} className="text-xs h-5">
                      {typeConfig.label}
                    </Badge>
                    <Badge 
                      variant={doc.status === 'approved' ? 'default' : 'secondary'} 
                      className="text-xs h-5 capitalize"
                    >
                      {doc.status === 'draft' ? 'Brouillon' : 
                       doc.status === 'approved' ? 'Validé' : 
                       doc.status === 'sent' ? 'Envoyé' : doc.status}
                    </Badge>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
