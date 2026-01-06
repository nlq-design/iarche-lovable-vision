import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { BillingEntitiesManager } from "@/components/cockpit/settings/BillingEntitiesManager";
import { CgvTemplatesManager } from "@/components/cockpit/settings/CgvTemplatesManager";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CockpitDocumentSettings() {
  const navigate = useNavigate();

  return (
    <CockpitLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/cockpit/documents')}
            className="h-8 px-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-bold">Paramètres Devis</h1>
              <p className="text-muted-foreground">Configuration des sociétés émettrices et modèles CGV</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <BillingEntitiesManager />
          <CgvTemplatesManager />
        </div>
      </div>
    </CockpitLayout>
  );
}
