import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { BillingEntitiesManager } from "@/components/cockpit/settings/BillingEntitiesManager";
import { CgvTemplatesManager } from "@/components/cockpit/settings/CgvTemplatesManager";
import { Settings } from "lucide-react";

export default function CockpitSettings() {
  return (
    <CockpitLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Paramètres</h1>
            <p className="text-muted-foreground">Configuration des sociétés et modèles de documents</p>
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
