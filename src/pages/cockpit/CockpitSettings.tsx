import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { OwnerProfileManager } from "@/components/cockpit/settings/OwnerProfileManager";
import { BillingEntitiesManager } from "@/components/cockpit/settings/BillingEntitiesManager";
import { CgvTemplatesManager } from "@/components/cockpit/settings/CgvTemplatesManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Users, Handshake, CreditCard, Plug } from "lucide-react";
import { Link } from "react-router-dom";

const NAV = [
  { to: "/cockpit/settings/team", icon: Users, title: "Équipe", desc: "Membres, rôles et invitations." },
  { to: "/cockpit/settings/partners", icon: Handshake, title: "Partenaires", desc: "Accès portail, visibilité et digest IA." },
  { to: "/cockpit/settings/billing", icon: CreditCard, title: "Abonnement", desc: "Plan, factures et limites." },
  { to: "/cockpit/settings/mcp", icon: Plug, title: "Connecteur MCP", desc: "Tokens et intégrations IA." },
];

export default function CockpitSettings() {
  return (
    <CockpitLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
            <p className="text-muted-foreground">Configuration de votre espace IArche.</p>
          </div>
        </div>

        <div className="grid gap-6">
          <OwnerProfileManager />
          <BillingEntitiesManager />
          <CgvTemplatesManager />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="block group">
              <Card className="transition-colors group-hover:border-primary/40">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <n.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{n.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {n.desc}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </CockpitLayout>
  );
}
