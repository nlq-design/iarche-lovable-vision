import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Search, Download, Mail, Building2, Trash2 } from "lucide-react";
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
  const navigate = useNavigate();
  const { leads, stats, isLoading } = useCockpitLeads();
  const { bulkDeleteLeads } = useLeads();
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
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
    navigate(`/cockpit/leads/${lead.id}`);
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
      <div className="p-5 space-y-4">
        {/* Header compact */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Leads</h1>
            <p className="text-sm text-muted-foreground">Base de données prospects</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {selectedIds.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                className="h-8 text-sm"
                onClick={() => setShowBulkDeleteDialog(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Supprimer ({selectedIds.length})
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 text-sm">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Exporter</span>
            </Button>
            <CreateLeadDialog />
          </div>
        </div>

        {/* Stats inline + Search */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-3 bg-muted/40 rounded-lg border">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{stats.total}</span>
            </div>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Contact</span>
              <span className="font-medium text-blue-600">{stats.bySource?.contact || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Newsletter</span>
              <span className="font-medium text-emerald-600">{stats.bySource?.newsletter || 0}</span>
            </div>
          </div>
          
          <div className="flex-1" />
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Rechercher..." 
                className="pl-8 h-8 w-full sm:w-[200px] text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full sm:w-[140px] h-8 text-sm">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="contact">Contact</SelectItem>
                <SelectItem value="newsletter">Newsletter</SelectItem>
                <SelectItem value="atelier-webinaire">Atelier</SelectItem>
                <SelectItem value="livre-blanc">Livre blanc</SelectItem>
                <SelectItem value="formulaire">Formulaire</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Leads Table */}
        <Card className="border shadow-sm">
          <CardHeader className="py-3 px-4 border-b bg-muted/30">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {filteredLeads.length} lead{filteredLeads.length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Users className="h-10 w-10 mb-3 opacity-40" />
                <p className="font-medium">Aucun lead trouvé</p>
                <p className="text-sm">
                  {searchQuery || sourceFilter !== 'all' 
                    ? "Modifiez vos filtres"
                    : "Les leads apparaîtront ici"
                  }
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.length === filteredLeads.length && filteredLeads.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-xs">Contact</TableHead>
                    <TableHead className="text-xs">Entreprise</TableHead>
                    <TableHead className="text-xs">Source</TableHead>
                    <TableHead className="text-xs w-16">Score</TableHead>
                    <TableHead className="text-xs w-24">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow 
                      key={lead.id} 
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => handleRowClick(lead)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()} className="py-2">
                        <Checkbox
                          checked={selectedIds.includes(lead.id)}
                          onCheckedChange={() => {}}
                          onClick={(e) => toggleSelect(lead.id, e)}
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <div>
                          <p className="font-medium text-sm">{lead.name}</p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {lead.company ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{lead.company}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant="secondary" className="text-xs font-normal">
                          {SOURCE_LABELS[lead.source] || lead.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className={`text-sm font-medium ${lead.lead_score && lead.lead_score >= 70 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {lead.lead_score || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-2">
                        {lead.created_at && format(new Date(lead.created_at), 'dd/MM/yy', { locale: fr })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
    </div>

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
