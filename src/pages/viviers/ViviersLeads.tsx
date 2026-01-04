import { VivierLayout } from '@/components/viviers/VivierLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Search, 
  Filter, 
  Upload
} from 'lucide-react';
import { Link } from 'react-router-dom';
import LogoArc from '@/components/ui/LogoArc';

export default function ViviersLeads() {
  return (
    <VivierLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leads Vivier</h1>
            <LogoArc size="sm" className="mt-2" />
            <p className="text-muted-foreground mt-2">
              Gérez vos leads froids avant promotion vers le CRM
            </p>
          </div>
          <Button asChild>
            <Link to="/viviers/import">
              <Upload className="w-4 h-4 mr-2" />
              Importer
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher par email, entreprise..." 
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filtres
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun lead dans le vivier</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Importez vos leads froids depuis un fichier CSV ou XLSX pour commencer.
            </p>
            <Button asChild>
              <Link to="/viviers/import">
                <Upload className="w-4 h-4 mr-2" />
                Importer des leads
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </VivierLayout>
  );
}
