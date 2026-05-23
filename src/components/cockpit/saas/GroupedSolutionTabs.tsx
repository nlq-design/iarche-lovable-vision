import { useState, ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  BarChart3, TrendingUp, Activity, Clock, Rocket, Euro, LifeBuoy,
  Map, Megaphone, Users, FileUp, Sparkles,
} from "lucide-react";

type GroupKey = "commercial" | "produit" | "activite" | "reference";

interface TabDef {
  value: string;
  label: string;
  icon?: any;
}

const GROUPS: { key: GroupKey; label: string; defaultTab: string }[] = [
  { key: "commercial", label: "Commercial", defaultTab: "saas" },
  { key: "produit", label: "Produit", defaultTab: "usage" },
  { key: "activite", label: "Activité", defaultTab: "timeline" },
  { key: "reference", label: "Référentiel", defaultTab: "overview" },
];

function buildTabs(solutionLeadsCount: number, documentsCount: number): Record<GroupKey, TabDef[]> {
  return {
    commercial: [
      { value: "saas", label: "Abonnements & Clients", icon: BarChart3 },
      { value: "pipeline", label: "Pipeline", icon: TrendingUp },
      { value: "leads", label: `Prospects (${solutionLeadsCount})`, icon: Users },
      { value: "acquisition", label: "Acquisition", icon: Megaphone },
      { value: "revenue", label: "Revenus", icon: Euro },
    ],
    produit: [
      { value: "usage", label: "Usage & Engagement", icon: Activity },
      { value: "onboarding", label: "Onboarding", icon: Rocket },
      { value: "support", label: "Support & NPS", icon: LifeBuoy },
      { value: "roadmap", label: "Roadmap", icon: Map },
    ],
    activite: [
      { value: "timeline", label: "Timeline", icon: Clock },
      { value: "consulte", label: "Consulte", icon: Sparkles },
      { value: "documents", label: `Documents (${documentsCount})`, icon: FileUp },
    ],
    reference: [
      { value: "overview", label: "Produit & Pricing" },
    ],
  };
}

interface Props {
  solutionLeadsCount: number;
  documentsCount: number;
  children: ReactNode;
}

/**
 * Navigation hiérarchique en 2 niveaux pour le mini-CRM par SaaS.
 * Niveau 1 : groupes (Commercial / Produit / Activité / Référentiel).
 * Niveau 2 : onglets du groupe actif (radix Tabs préservé).
 */
export function GroupedSolutionTabs({ solutionLeadsCount, documentsCount, children }: Props) {
  const [group, setGroup] = useState<GroupKey>("commercial");
  const [activeTab, setActiveTab] = useState<string>("saas");
  const tabs = buildTabs(solutionLeadsCount, documentsCount);

  const handleGroupChange = (k: GroupKey) => {
    setGroup(k);
    const def = GROUPS.find(g => g.key === k)?.defaultTab;
    if (def) setActiveTab(def);
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
      {/* Niveau 1 — Groupes */}
      <div className="flex flex-wrap items-center gap-1 border-b pb-2">
        {GROUPS.map(g => (
          <Button
            key={g.key}
            variant={group === g.key ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs font-medium"
            onClick={() => handleGroupChange(g.key)}
          >
            {g.label}
          </Button>
        ))}
      </div>

      {/* Niveau 2 — Onglets du groupe */}
      <TabsList className="h-9 flex-wrap">
        {tabs[group].map(t => {
          const Icon = t.icon;
          return (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5 text-sm h-7">
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {t.label}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {children}
    </Tabs>
  );
}
