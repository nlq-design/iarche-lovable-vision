import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { BillingEntitiesManager } from "@/components/cockpit/settings/BillingEntitiesManager";
import { CgvTemplatesManager } from "@/components/cockpit/settings/CgvTemplatesManager";
import { Settings, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function CockpitSettings() {
  const navigate = useNavigate();

  return (
    <CockpitLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-bold">Paramètres</h1>
              <p className="text-muted-foreground">Configuration des sociétés et modèles de documents</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/cockpit/settings/mcp")}>
            <Key className="h-4 w-4 mr-2" />
            Connecteur MCP
          </Button>
        </div>

        <div className="grid gap-6">
          <BillingEntitiesManager />
          <CgvTemplatesManager />
        </div>
      </div>
    </CockpitLayout>
  );
}
