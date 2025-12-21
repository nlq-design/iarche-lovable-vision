import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  ExternalLink, 
  Users,
  FileText,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCockpitSolutionLeads } from "@/hooks/cockpit";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Solution {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published: boolean | null;
  created_at: string | null;
}

export default function CockpitSolutions() {
  const navigate = useNavigate();
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const { solutionLeadCounts } = useCockpitSolutionLeads();

  useEffect(() => {
    loadSolutions();
  }, []);

  const loadSolutions = async () => {
    const { data, error } = await supabase
      .from("articles")
      .select("id, title, slug, excerpt, cover_image_url, published, created_at")
      .eq("resource_type", "solution")
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setSolutions(data);
    }
    setLoading(false);
  };

  const filteredSolutions = solutions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const publishedCount = solutions.filter(s => s.published).length;
  const totalLeads = Object.values(solutionLeadCounts).reduce((a, b) => a + b, 0);

  return (
    <CockpitLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Solutions commerciales</h1>
            <p className="text-muted-foreground">
              Gérez les leads intéressés par vos solutions
            </p>
          </div>
          <Button variant="outline" asChild>
            <a href="/admin/solutions" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Gérer dans Admin
            </a>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Solutions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{solutions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Publiées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{publishedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Leads intéressés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{totalLeads}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une solution..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Solutions List */}
        <Card>
          <CardHeader>
            <CardTitle>Solutions</CardTitle>
            <CardDescription>
              Cliquez sur une solution pour gérer les leads intéressés
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSolutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mb-3 opacity-50" />
                <p className="font-medium">Aucune solution</p>
                <p className="text-sm">Les solutions créées dans l'admin apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSolutions.map((solution) => {
                  const leadCount = solutionLeadCounts[solution.id] || 0;
                  
                  return (
                    <div
                      key={solution.id}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/cockpit/solutions/${solution.id}`)}
                    >
                      {solution.cover_image_url ? (
                        <img
                          src={solution.cover_image_url}
                          alt={solution.title}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{solution.title}</h3>
                          <Badge variant={solution.published ? "default" : "secondary"}>
                            {solution.published ? "Publiée" : "Brouillon"}
                          </Badge>
                        </div>
                        {solution.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {solution.excerpt}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-1">
                          {solution.created_at && (
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(solution.created_at), "dd MMM yyyy", { locale: fr })}
                            </p>
                          )}
                          {leadCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-primary">
                              <Users className="h-3 w-3" />
                              {leadCount} lead{leadCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CockpitLayout>
  );
}
