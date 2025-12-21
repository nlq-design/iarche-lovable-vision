import { useState } from 'react';
import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Search, Download, Mail, Phone, Building2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCockpitLeads } from '@/hooks/cockpit';
import { useLeads } from '@/hooks/shared/useLeads';
import { CreateLeadDialog } from '@/components/cockpit/dialogs';
import { LeadDetailSheet } from '@/components/cockpit/LeadDetailSheet';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SOURCE_LABELS: Record<string, string> = {
  'contact': 'Contact',
  'newsletter': 'Newsletter',
  'atelier-webinaire': 'Atelier/Webinaire',
  'livre-blanc': 'Livre blanc',
  'formulaire': 'Formulaire',
};

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  company_size?: string | null;
  industry?: string | null;
  source: string;
  source_context?: string | null;
  message?: string | null;
  qualification_status?: string | null;
  lead_score?: number | null;
  consent_marketing?: boolean | null;
  created_at?: string | null;
  last_contacted_at?: string | null;
}

const CockpitLeads = () => {
  const { leads, stats, isLoading } = useCockpitLeads();
  const { bulkDeleteLeads } = useLeads();
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  // Filter leads
  const filteredLeads = leads?.filter(lead => {
    const matchesSearch = searchQuery === '' || 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.company?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
    
    return matchesSearch && matchesSource;
  }) || [];

  const handleRowClick = (lead: Lead) => {
    setSelectedLead(lead);
    setSheetOpen(true);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map(l => l.id));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    bulkDeleteLeads.mutate(selectedIds, {
      onSuccess: () => {
        setSelectedIds([]);
        setShowBulkDeleteDialog(false);
      }
    });
  };

  return (
    <CockpitLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leads</h1>
            <p className="text-muted-foreground">Base de données contacts & prospects</p>
          </div>
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setShowBulkDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer ({selectedIds.length})
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <CreateLeadDialog />
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher par nom, email, entreprise..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sources</SelectItem>
                  <SelectItem value="contact">Contact</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                  <SelectItem value="atelier-webinaire">Atelier/Webinaire</SelectItem>
                  <SelectItem value="livre-blanc">Livre blanc</SelectItem>
                  <SelectItem value="formulaire">Formulaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards - Simplified */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Total leads", value: stats.total, color: "text-primary" },
            { label: "Contact", value: stats.bySource?.contact || 0, color: "text-blue-600" },
            { label: "Newsletter", value: stats.bySource?.newsletter || 0, color: "text-green-600" },
            { label: "Autres", value: (stats.bySource?.atelier || 0) + (stats.bySource?.livreBlanc || 0), color: "text-purple-600" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Liste des leads ({filteredLeads.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Users className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Aucun lead trouvé</p>
                <p className="text-sm">
                  {searchQuery || sourceFilter !== 'all' 
                    ? "Modifiez vos filtres pour voir plus de résultats"
                    : "Les leads apparaîtront ici une fois créés"
                  }
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.length === filteredLeads.length && filteredLeads.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow 
                      key={lead.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(lead)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(lead.id)}
                          onCheckedChange={() => {}}
                          onClick={(e) => toggleSelect(lead.id, e)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </div>
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.company ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{lead.company}</span>
                            {lead.industry && (
                              <Badge variant="outline" className="text-xs">
                                {lead.industry}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {SOURCE_LABELS[lead.source] || lead.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={lead.lead_score && lead.lead_score >= 70 ? 'default' : 'secondary'}>
                          {lead.lead_score || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.created_at && format(new Date(lead.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lead Detail Sheet */}
      <LeadDetailSheet 
        lead={selectedLead}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {selectedIds.length} lead(s) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les leads sélectionnés seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CockpitLayout>
  );
};

export default CockpitLeads;
