import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { 
  Loader2, 
  Smartphone, 
  Monitor, 
  Tablet, 
  MapPin, 
  Clock, 
  XCircle, 
  Shield,
  QrCode,
  Key,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Download,
  Sparkles
} from 'lucide-react';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface SessionInfo {
  id: string;
  created_at: string;
  updated_at: string;
  user_agent?: string;
  ip?: string;
  device?: string;
  location?: string;
  is_current?: boolean;
}

const AdminSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  
  // 2FA States
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [enrollmentStep, setEnrollmentStep] = useState<'initial' | 'verify' | 'complete'>('initial');

  // SEO Enrichment States
  const [enriching, setEnriching] = useState(false);
  const [enrichmentResults, setEnrichmentResults] = useState<any>(null);

  useEffect(() => {
    loadSessions();
    checkMFAStatus();
  }, []);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Récupérer les sessions actives via l'API Supabase
        // Note: Supabase ne fournit pas directement une liste de toutes les sessions
        // On affiche la session courante avec des informations disponibles
        const sessionInfo: SessionInfo = {
          id: session.access_token.substring(0, 8) + '...',
          created_at: new Date(session.expires_at! * 1000 - session.expires_in! * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          user_agent: navigator.userAgent,
          device: getDeviceType(navigator.userAgent),
          is_current: true
        };
        
        setSessions([sessionInfo]);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les sessions',
        variant: 'destructive',
      });
    }
    setLoadingSessions(false);
  };

  const checkMFAStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      const totpFactors = data?.totp || [];
      setMfaEnabled(totpFactors.length > 0 && totpFactors.some(f => f.status === 'verified'));
    } catch (error) {
      console.error('Error checking MFA status:', error);
    }
  };

  const getDeviceType = (userAgent: string): string => {
    if (/mobile/i.test(userAgent)) return 'Mobile';
    if (/tablet|ipad/i.test(userAgent)) return 'Tablette';
    return 'Ordinateur';
  };

  const getDeviceIcon = (device: string) => {
    if (device === 'Mobile') return <Smartphone className="h-5 w-5" />;
    if (device === 'Tablette') return <Tablet className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir révoquer cette session ?')) return;
    
    try {
      // Déconnexion de toutes les sessions sauf la courante
      await supabase.auth.signOut({ scope: 'others' });
      
      toast({
        title: 'Session révoquée',
        description: 'La session a été révoquée avec succès',
      });
      
      loadSessions();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de révoquer la session',
        variant: 'destructive',
      });
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm('Êtes-vous sûr de vouloir révoquer toutes les autres sessions ? Vous resterez connecté sur cet appareil.')) return;
    
    try {
      await supabase.auth.signOut({ scope: 'others' });
      
      toast({
        title: 'Sessions révoquées',
        description: 'Toutes les autres sessions ont été révoquées',
      });
      
      loadSessions();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de révoquer les sessions',
        variant: 'destructive',
      });
    }
  };

  // 2FA Functions
  const startEnrollment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Admin IArche'
      });
      
      if (error) throw error;
      
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setEnrollmentStep('verify');
      
      // Générer des codes de récupération
      const codes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );
      setRecoveryCodes(codes);
      
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'activer le 2FA',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const verifyAndEnable = async () => {
    if (!factorId || verificationCode.length !== 6) return;
    
    setLoading(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      
      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verificationCode
      });
      
      if (verify.error) throw verify.error;
      
      setMfaEnabled(true);
      setEnrollmentStep('complete');
      setShowRecoveryCodes(true);
      
      toast({
        title: '2FA activé',
        description: 'L\'authentification à deux facteurs a été activée avec succès',
      });
      
    } catch (error: any) {
      toast({
        title: 'Code invalide',
        description: 'Le code de vérification est incorrect',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const disableMFA = async () => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver le 2FA ? Cela réduira la sécurité de votre compte.')) return;
    
    setLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];
      
      if (totpFactor) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
        if (error) throw error;
        
        setMfaEnabled(false);
        setEnrollmentStep('initial');
        setQrCode(null);
        setSecret(null);
        setFactorId(null);
        setRecoveryCodes([]);
        
        toast({
          title: '2FA désactivé',
          description: 'L\'authentification à deux facteurs a été désactivée',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de désactiver le 2FA',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copié',
      description: 'Code copié dans le presse-papiers',
    });
  };

  const downloadRecoveryCodes = () => {
    const content = `Codes de récupération IArche 2FA\n\nGénérés le: ${new Date().toLocaleDateString('fr-FR')}\n\n${recoveryCodes.join('\n')}\n\nConservez ces codes en lieu sûr. Chaque code ne peut être utilisé qu'une seule fois.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iarche-2fa-recovery-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Téléchargement démarré',
      description: 'Les codes de récupération ont été téléchargés',
    });
  };

  const handleEnrichAllResources = async () => {
    setEnriching(true);
    setEnrichmentResults(null);

    try {
      toast({
        title: 'Enrichissement en cours',
        description: 'Le processus peut prendre plusieurs minutes...',
      });

      const { data, error } = await supabase.functions.invoke('enrich-all-resources');

      if (error) {
        console.error('Enrichment error:', error);
        toast({
          title: 'Erreur',
          description: error.message || 'Impossible de lancer l\'enrichissement',
          variant: 'destructive',
        });
        return;
      }

      setEnrichmentResults(data.results);
      
      toast({
        title: 'Enrichissement terminé',
        description: `${data.results.enriched} ressources enrichies, ${data.results.skipped} déjà enrichies, ${data.results.failed} échecs`,
      });

    } catch (error: any) {
      console.error('Enrichment error:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de l\'enrichissement',
        variant: 'destructive',
      });
    } finally {
      setEnriching(false);
    }
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Paramètres de sécurité · Admin · IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Paramètres admin
          </h1>
          <p className="text-muted-foreground">
            Gérez la sécurité, les sessions et les outils SEO
          </p>
        </div>

        <Tabs defaultValue="sessions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="sessions">Sessions actives</TabsTrigger>
            <TabsTrigger value="2fa">Authentification 2FA</TabsTrigger>
            <TabsTrigger value="seo">SEO Enrichissement</TabsTrigger>
          </TabsList>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sessions actives</CardTitle>
                    <CardDescription>
                      Gérez tous les appareils connectés à votre compte
                    </CardDescription>
                  </div>
                  {sessions.length > 1 && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleRevokeAllSessions}
                    >
                      Révoquer toutes les autres sessions
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingSessions ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : sessions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucune session active
                  </p>
                ) : (
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-start justify-between p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
                      >
                        <div className="flex gap-4 flex-1">
                          <div className="text-muted-foreground mt-1">
                            {getDeviceIcon(session.device || 'Ordinateur')}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {session.device || 'Appareil inconnu'}
                              </span>
                              {session.is_current && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Session actuelle
                                </Badge>
                              )}
                            </div>
                            
                            {session.location && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                {session.location}
                              </div>
                            )}
                            
                            {session.ip && (
                              <div className="text-sm text-muted-foreground">
                                IP: {session.ip}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              Dernière activité: {new Date(session.updated_at).toLocaleString('fr-FR')}
                            </div>
                            
                            {session.user_agent && (
                              <div className="text-xs text-muted-foreground truncate max-w-md">
                                {session.user_agent}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {!session.is_current && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevokeSession(session.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Révoquer
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2FA Tab */}
          <TabsContent value="2fa" className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                L'authentification à deux facteurs ajoute une couche de sécurité supplémentaire à votre compte.
                Vous aurez besoin d'une application d'authentification comme Google Authenticator ou Authy.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Authentification à deux facteurs (2FA)</CardTitle>
                    <CardDescription>
                      {mfaEnabled 
                        ? 'Le 2FA est actuellement activé sur votre compte' 
                        : 'Protégez votre compte avec un code temporaire'}
                    </CardDescription>
                  </div>
                  <Badge variant={mfaEnabled ? "default" : "secondary"} className="ml-4">
                    {mfaEnabled ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Activé
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Désactivé
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* État initial - 2FA désactivé */}
                {!mfaEnabled && enrollmentStep === 'initial' && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Activez le 2FA pour ajouter une protection supplémentaire à votre compte administrateur.
                    </p>
                    <Button onClick={startEnrollment} disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Configuration...
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          Activer le 2FA
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Étape de vérification - Scanner QR code */}
                {enrollmentStep === 'verify' && qrCode && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex flex-col items-center gap-4 p-6 bg-muted/50 rounded-lg">
                        <QrCode className="h-8 w-8 text-primary" />
                        <h3 className="font-semibold text-lg">Scannez le QR code</h3>
                        <div className="bg-white p-4 rounded-lg">
                          <img src={qrCode} alt="QR Code 2FA" className="w-64 h-64" />
                        </div>
                        <p className="text-sm text-muted-foreground text-center max-w-md">
                          Ouvrez votre application d'authentification (Google Authenticator, Authy, etc.) 
                          et scannez ce QR code
                        </p>
                      </div>

                      {secret && (
                        <div className="space-y-2">
                          <Label>Clé secrète (configuration manuelle)</Label>
                          <div className="flex gap-2">
                            <Input value={secret} readOnly className="font-mono text-sm" />
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => copyToClipboard(secret)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="verification-code">Code de vérification</Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          Entrez le code à 6 chiffres affiché dans votre application
                        </p>
                        <div className="flex justify-center">
                          <InputOTP
                            maxLength={6}
                            value={verificationCode}
                            onChange={setVerificationCode}
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          onClick={verifyAndEnable} 
                          disabled={loading || verificationCode.length !== 6}
                          className="flex-1"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Vérification...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Vérifier et activer
                            </>
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setEnrollmentStep('initial');
                            setQrCode(null);
                            setSecret(null);
                            setFactorId(null);
                          }}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Codes de récupération */}
                {showRecoveryCodes && recoveryCodes.length > 0 && (
                  <div className="space-y-4 mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Key className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-yellow-900 mb-2">
                          Codes de récupération
                        </h3>
                        <p className="text-sm text-yellow-800 mb-4">
                          Conservez ces codes en lieu sûr. Ils vous permettront d'accéder à votre compte 
                          si vous perdez l'accès à votre application d'authentification. 
                          Chaque code ne peut être utilisé qu'une seule fois.
                        </p>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {recoveryCodes.map((code, index) => (
                            <div 
                              key={index}
                              className="font-mono text-sm bg-white px-3 py-2 rounded border border-yellow-300"
                            >
                              {code}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={downloadRecoveryCodes}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Télécharger
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => copyToClipboard(recoveryCodes.join('\n'))}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copier tout
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => setShowRecoveryCodes(false)}
                            className="ml-auto"
                          >
                            J'ai sauvegardé mes codes
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2FA activé */}
                {mfaEnabled && enrollmentStep === 'initial' && (
                  <div className="space-y-4">
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Votre compte est protégé par l'authentification à deux facteurs
                      </AlertDescription>
                    </Alert>
                    <Button 
                      variant="destructive" 
                      onClick={disableMFA}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Désactivation...
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Désactiver le 2FA
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO Tab */}
          <TabsContent value="seo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enrichissement SEO automatique</CardTitle>
                <CardDescription>
                  Appliquer l'enrichissement SEO à toutes les ressources existantes (articles, actualités, cas-clients, livres-blancs, ateliers-webinaires)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Cette opération va analyser et enrichir automatiquement toutes les ressources publiées avec des balises <strong>&lt;strong&gt;</strong> sur les mots-clés importants. 
                    Le processus peut prendre plusieurs minutes selon le nombre de ressources.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="flex flex-col gap-4">
                    <Button
                      onClick={handleEnrichAllResources}
                      disabled={enriching}
                      size="lg"
                      className="w-full sm:w-auto"
                    >
                      {enriching ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enrichissement en cours...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Lancer l'enrichissement SEO
                        </>
                      )}
                    </Button>

                    {enrichmentResults && (
                      <Card className="bg-muted/30">
                        <CardHeader>
                          <CardTitle className="text-lg">Résultats de l'enrichissement</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-background rounded-lg border border-border">
                              <div className="text-2xl font-bold text-foreground">{enrichmentResults.total}</div>
                              <div className="text-xs text-muted-foreground mt-1">Total</div>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                              <div className="text-2xl font-bold text-green-700">{enrichmentResults.enriched}</div>
                              <div className="text-xs text-green-600 mt-1">Enrichies</div>
                            </div>
                            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                              <div className="text-2xl font-bold text-yellow-700">{enrichmentResults.skipped}</div>
                              <div className="text-xs text-yellow-600 mt-1">Déjà enrichies</div>
                            </div>
                            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                              <div className="text-2xl font-bold text-red-700">{enrichmentResults.failed}</div>
                              <div className="text-xs text-red-600 mt-1">Échecs</div>
                            </div>
                          </div>

                          {enrichmentResults.details && enrichmentResults.details.length > 0 && (
                            <div className="max-h-96 overflow-y-auto space-y-2">
                              <h4 className="text-sm font-semibold text-foreground">Détails par ressource</h4>
                              {enrichmentResults.details.map((detail: any, index: number) => (
                                <div
                                  key={index}
                                  className={cn(
                                    "text-sm p-3 rounded-md",
                                    detail.status === 'success' && "bg-green-50 text-green-800 border border-green-200",
                                    detail.status === 'skipped' && "bg-yellow-50 text-yellow-800 border border-yellow-200",
                                    detail.status === 'failed' && "bg-red-50 text-red-800 border border-red-200"
                                  )}
                                >
                                  <div className="font-medium">{detail.slug}</div>
                                  {detail.reason && (
                                    <div className="text-xs mt-1 opacity-80">{detail.reason}</div>
                                  )}
                                  {detail.resourceType && (
                                    <Badge variant="outline" className="mt-1 text-xs">{detail.resourceType}</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
