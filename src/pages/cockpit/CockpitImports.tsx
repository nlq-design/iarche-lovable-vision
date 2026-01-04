import { useState } from "react";
import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Send,
  Mic,
  FileText,
  Image,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
  User,
  FolderKanban,
  ExternalLink,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useTelegramImports, useTelegramImportStats, type TelegramImport } from "@/hooks/cockpit/useTelegramImports";
import { Link } from "react-router-dom";

// Processing step icons and labels
const PROCESSING_STEPS = [
  { key: "upload", label: "Upload", icon: Send },
  { key: "transcription", label: "Transcription", icon: Mic },
  { key: "ocr", label: "OCR", icon: FileText },
  { key: "analysis", label: "Analyse IA", icon: Loader2 },
  { key: "done", label: "Terminé", icon: CheckCircle2 },
] as const;

function getTypeIcon(type: string, fileType?: string) {
  if (type === "transcription") {
    return <Mic className="h-4 w-4" />;
  }
  if (fileType?.includes("image") || fileType === "image") {
    return <Image className="h-4 w-4" />;
  }
  return <FileText className="h-4 w-4" />;
}

function ProcessingTimeline({ currentStep, hasError }: { currentStep: TelegramImport["processingStep"]; hasError: boolean }) {
  const stepIndex = PROCESSING_STEPS.findIndex(s => s.key === currentStep);
  
  return (
    <div className="flex items-center gap-1 mt-2">
      {PROCESSING_STEPS.map((step, idx) => {
        const isActive = step.key === currentStep;
        const isPast = idx < stepIndex || currentStep === "done";
        const isError = hasError && isActive;
        const Icon = step.icon;
        
        return (
          <div key={step.key} className="flex items-center">
            <div
              className={`flex items-center justify-center w-6 h-6 rounded-full text-xs transition-all ${
                isError
                  ? "bg-destructive text-destructive-foreground"
                  : isPast
                  ? "bg-primary text-primary-foreground"
                  : isActive
                  ? "bg-primary/80 text-primary-foreground animate-pulse"
                  : "bg-muted text-muted-foreground"
              }`}
              title={step.label}
            >
              {isError ? (
                <AlertCircle className="h-3 w-3" />
              ) : isActive && currentStep !== "done" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
            </div>
            {idx < PROCESSING_STEPS.length - 1 && (
              <div
                className={`w-4 h-0.5 ${
                  isPast ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ImportCard({ item }: { item: TelegramImport }) {
  const hasError = item.processingStep === "error";
  const metadata = item.metadata || {};
  const telegramUser = metadata.telegram_username as string || "Inconnu";
  
  return (
    <div className={`p-4 rounded-lg border transition-all ${
      hasError ? "border-destructive/50 bg-destructive/5" : "bg-card hover:bg-muted/30"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${
            item.type === "transcription" ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-500"
          }`}>
            {getTypeIcon(item.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-sm truncate max-w-[200px]">{item.title}</h4>
              <Badge variant={item.statusVariant} className="text-xs">
                {item.statusLabel}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Send className="h-3 w-3" />
              <span>@{telegramUser}</span>
              <span>•</span>
              <span title={format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: fr })}>
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: fr })}
              </span>
            </div>
            
            {/* Linked entities */}
            {(item.leadName || item.projectName) && (
              <div className="flex items-center gap-3 mt-2 text-xs">
                {item.leadName && (
                  <Link 
                    to={`/cockpit/leads/${item.leadId}`}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <User className="h-3 w-3" />
                    {item.leadName}
                  </Link>
                )}
                {item.projectName && (
                  <Link 
                    to={`/cockpit/projects/${item.projectId}`}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <FolderKanban className="h-3 w-3" />
                    {item.projectName}
                  </Link>
                )}
              </div>
            )}
            
            {/* Error message */}
            {hasError && item.error && (
              <div className="mt-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                {item.error}
              </div>
            )}
            
            {/* Processing timeline */}
            <ProcessingTimeline currentStep={item.processingStep} hasError={hasError} />
          </div>
        </div>
        
        {/* Action button */}
        {item.processingStep === "done" && (
          <Link
            to={item.type === "transcription" ? `/cockpit/transcriptions/${item.id}` : `/cockpit/upload`}
          >
            <Button variant="ghost" size="sm" className="h-8">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function StatsCards({ stats }: { stats: ReturnType<typeof useTelegramImportStats> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{stats.transcriptions}</p>
              <p className="text-xs text-muted-foreground">Audio</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.uploads}</p>
              <p className="text-xs text-muted-foreground">Fichiers</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">En cours</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.done}</p>
              <p className="text-xs text-muted-foreground">Terminés</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{stats.errors}</p>
              <p className="text-xs text-muted-foreground">Erreurs</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CockpitImports() {
  const [filter, setFilter] = useState<"all" | "transcription" | "upload" | "error">("all");
  const { data: imports = [], isLoading, refetch, isFetching } = useTelegramImports(100);
  const stats = useTelegramImportStats();

  const filteredImports = imports.filter(i => {
    if (filter === "all") return true;
    if (filter === "error") return i.processingStep === "error";
    return i.type === filter;
  });

  return (
    <CockpitLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Send className="h-6 w-6 text-primary" />
              Imports Telegram
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Timeline des fichiers et audio importés via le bot Telegram
            </p>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <StatsCards stats={stats} />

        {/* Filters */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              Tous
              <Badge variant="secondary" className="ml-1 text-xs">{imports.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="transcription" className="gap-1.5">
              <Mic className="h-3.5 w-3.5" />
              Audio
              <Badge variant="secondary" className="ml-1 text-xs">{stats.transcriptions}</Badge>
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Fichiers
              <Badge variant="secondary" className="ml-1 text-xs">{stats.uploads}</Badge>
            </TabsTrigger>
            <TabsTrigger value="error" className="gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              Erreurs
              {stats.errors > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">{stats.errors}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Timeline des imports</CardTitle>
                <CardDescription>
                  {filteredImports.length} import{filteredImports.length !== 1 ? "s" : ""} 
                  {filter !== "all" && ` (filtre: ${filter})`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : filteredImports.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Send className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Aucun import Telegram</p>
                    <p className="text-sm mt-1">
                      Envoyez un fichier audio ou document au bot pour le voir ici
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {filteredImports.map((item) => (
                        <ImportCard key={item.id} item={item} />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CockpitLayout>
  );
}
