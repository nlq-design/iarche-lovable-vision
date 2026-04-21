import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Copy, Check, Trash2, Key, ExternalLink, Clock, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants/workspace";

interface McpKey {
  id: string;
  key_prefix: string;
  label: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  workspace_id: string;
}

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const MCP_SERVER_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/mcp-server`;

export function MCPKeysManager() {
  const queryClient = useQueryClient();
  const ctxWorkspaceId = useWorkspaceId();
  const [createOpen, setCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch keys
  const { data: keys, isLoading } = useQuery({
    queryKey: ["mcp-api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("mcp-api-keys", {
        body: { action: "list" },
      });
      if (error) throw error;
      return (data?.keys || []) as McpKey[];
    },
  });

  // Create key
  const createMutation = useMutation({
    mutationFn: async (label: string) => {
      const { data, error } = await supabase.functions.invoke("mcp-api-keys", {
        body: {
          action: "create",
          label,
          workspace_id: ctxWorkspaceId ?? DEFAULT_WORKSPACE_ID,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setGeneratedKey(data.key);
      queryClient.invalidateQueries({ queryKey: ["mcp-api-keys"] });
      toast.success("Clé MCP créée avec succès");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Revoke key
  const revokeMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const { data, error } = await supabase.functions.invoke("mcp-api-keys", {
        body: { action: "revoke", key_id: keyId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp-api-keys"] });
      toast.success("Clé révoquée");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!newLabel.trim()) return;
    createMutation.mutate(newLabel.trim());
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseCreate = () => {
    setCreateOpen(false);
    setNewLabel("");
    setGeneratedKey(null);
    setCopied(false);
  };

  const getKeyStatus = (key: McpKey): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    if (key.revoked_at) return { label: "Révoquée", variant: "destructive" };
    if (key.expires_at && new Date(key.expires_at) < new Date()) return { label: "Expirée", variant: "secondary" };
    return { label: "Active", variant: "default" };
  };

  return (
    <div className="space-y-6">
      {/* Keys management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Clés API MCP
            </CardTitle>
            <CardDescription>
              Gérez les clés d'accès pour le connecteur Claude.ai
            </CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={(open) => { if (!open) handleCloseCreate(); else setCreateOpen(true); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Générer une clé
              </Button>
            </DialogTrigger>
            <DialogContent>
              {!generatedKey ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Nouvelle clé MCP</DialogTitle>
                    <DialogDescription>
                      Cette clé permettra à Claude.ai d'accéder à votre CRM.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="label">Nom de la clé</Label>
                      <Input
                        id="label"
                        placeholder="Ex: Claude Desktop, Poste bureau..."
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={handleCloseCreate}>Annuler</Button>
                    <Button onClick={handleCreate} disabled={!newLabel.trim() || createMutation.isPending}>
                      {createMutation.isPending ? "Génération..." : "Générer"}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-green-600">
                      <Shield className="h-5 w-5" />
                      Clé générée avec succès
                    </DialogTitle>
                    <DialogDescription className="text-destructive font-medium">
                      ⚠️ Copiez cette clé maintenant — elle ne sera plus affichée.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="bg-muted p-3 rounded-md font-mono text-sm break-all select-all">
                      {generatedKey}
                    </div>
                    <Button
                      className="w-full"
                      variant={copied ? "default" : "outline"}
                      onClick={() => handleCopy(generatedKey)}
                    >
                      {copied ? (
                        <><Check className="h-4 w-4 mr-2" />Copié !</>
                      ) : (
                        <><Copy className="h-4 w-4 mr-2" />Copier la clé</>
                      )}
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCloseCreate}>Fermer</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Chargement...</p>
          ) : !keys?.length ? (
            <p className="text-muted-foreground text-sm">
              Aucune clé MCP. Cliquez sur "Générer une clé" pour commencer.
            </p>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => {
                const status = getKeyStatus(key);
                return (
                  <div key={key.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{key.label}</span>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-mono">{key.key_prefix}•••</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Créée {formatDistanceToNow(new Date(key.created_at), { addSuffix: true, locale: fr })}
                        </span>
                        {key.last_used_at && (
                          <span>
                            Dernière utilisation : {formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true, locale: fr })}
                          </span>
                        )}
                      </div>
                    </div>
                    {!key.revoked_at && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Révoquer cette clé ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              La clé "{key.label}" sera définitivement désactivée. 
                              Toute connexion Claude.ai utilisant cette clé cessera de fonctionner.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => revokeMutation.mutate(key.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Révoquer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Connecter à Claude.ai
          </CardTitle>
          <CardDescription>
            Suivez ces étapes pour relier Claude à votre CRM IArche
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li>
              Ouvrez <strong>Claude.ai</strong> → <strong>Paramètres</strong> → <strong>Connecteurs</strong> → <strong>Ajouter un connecteur personnalisé</strong>
            </li>
            <li>
              <span>URL du serveur :</span>
              <div className="mt-1 flex items-center gap-2">
                <code className="bg-muted px-2 py-1 rounded text-xs break-all">
                  {MCP_SERVER_URL}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => { navigator.clipboard.writeText(MCP_SERVER_URL); toast.success("URL copiée"); }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </li>
            <li>
              <span>En-tête <strong>Authorization</strong> :</span>
              <div className="mt-1">
                <code className="bg-muted px-2 py-1 rounded text-xs">
                  Bearer [VOTRE_CLÉ_MCP]
                </code>
              </div>
            </li>
          </ol>

          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <p className="font-medium mb-1">🛡️ Sécurité</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Chaque clé est liée à votre workspace et utilisateur</li>
              <li>Seul le hash SHA-256 est stocké en base — la clé en clair n'est jamais conservée</li>
              <li>Vous pouvez révoquer une clé à tout moment</li>
              <li>9 outils disponibles : leads, opportunités, projets, propositions d'action, alertes Sentinel</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
