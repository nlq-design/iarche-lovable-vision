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
      .select("id, title, slug, excerpt, cover_image_url, published, created_at, status")
      .eq("resource_type", "solution")
      .neq("status", "archived")
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
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Solutions</h1>
            <p className="text-sm text-muted-foreground">Gérez les leads par solution</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-sm w-fit" asChild>
            <a href="/admin/solutions" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Gérer dans</span> Admin
            </a>
          </Button>
        </div>

        {/* Stats inline */}
        <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/40 rounded-lg border text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Solutions</span>
            <span className="font-semibold">{solutions.length}</span>
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Publiées</span>
            <span className="font-semibold text-emerald-600">{publishedCount}</span>
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Leads</span>
            <span className="font-semibold text-primary">{totalLeads}</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher une solution..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Solutions List */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Liste des solutions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSolutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">Aucune solution</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSolutions.map((solution) => {
                  const leadCount = solutionLeadCounts[solution.id] || 0;
                  
                  return (
                    <div
                      key={solution.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/cockpit/solutions/${solution.id}`)}
                    >
                      {solution.cover_image_url ? (
                        <img
                          src={solution.cover_image_url}
                          alt={solution.title}
                          className="w-12 h-12 object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-medium text-sm truncate">{solution.title}</h3>
                          <Badge variant={solution.published ? "default" : "secondary"} className="text-xs h-5 px-1.5">
                            {solution.published ? "Publiée" : "Brouillon"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {solution.created_at && (
                            <span>{format(new Date(solution.created_at), "dd MMM yyyy", { locale: fr })}</span>
                          )}
                          {leadCount > 0 && (
                            <span className="flex items-center gap-1 text-primary">
                              <Users className="h-3 w-3" />
                              {leadCount}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
