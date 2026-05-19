import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { MCPKeysManager } from "@/components/cockpit/settings/MCPKeysManager";
import { MCPHealthCard } from "@/components/cockpit/settings/MCPHealthCard";
import { Key } from "lucide-react";

export default function CockpitMCPSettings() {
  return (
    <CockpitLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Key className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Connecteur MCP</h1>
            <p className="text-muted-foreground">
              Connectez Claude.ai à votre CRM IArche via le protocole MCP
            </p>
          </div>
        </div>
        <MCPHealthCard />
        <MCPKeysManager />
      </div>
    </CockpitLayout>
  );
}
