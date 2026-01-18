import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

type InvitationStatus = "loading" | "valid" | "invalid" | "expired" | "already_used" | "success";

export default function PartnerAcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<InvitationStatus>("loading");
  const [partnerName, setPartnerName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    checkInvitation();
  }, [token]);

  const checkInvitation = async () => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    try {
      // Check invitation validity directly in the database (no auth required)
      const { data, error } = await supabase
        .from("partner_invitations")
        .select(`
          id,
          email,
          expires_at,
          accepted_at,
          partner:partners!partner_invitations_partner_id_fkey (
            id,
            name,
            user_id
          )
        `)
        .eq("token", token)
        .single();

      if (error || !data) {
        setStatus("invalid");
        return;
      }

      if (data.accepted_at) {
        setStatus("already_used");
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setStatus("expired");
        return;
      }

      if (data.partner?.user_id) {
        setStatus("already_used");
        return;
      }

      setPartnerName(data.partner?.name || "Partenaire");
      setEmail(data.email);
      setStatus("valid");

    } catch (err) {
      console.error("Error checking invitation:", err);
      setStatus("invalid");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("accept-partner-invitation", {
        body: { token, password },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setStatus("success");
      toast.success("Compte créé avec succès !");

      // Auto-login after 2 seconds
      setTimeout(async () => {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!loginError) {
          navigate("/espace-partenaire");
        } else {
          navigate("/admin", { state: { partnerAccess: true } });
        }
      }, 2000);

    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      setErrorMessage(err.message || "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Vérification de l'invitation...</p>
        </div>
      </div>
    );
  }

  // Error states
  if (status === "invalid" || status === "expired" || status === "already_used") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>
              {status === "invalid" && "Invitation invalide"}
              {status === "expired" && "Invitation expirée"}
              {status === "already_used" && "Invitation déjà utilisée"}
            </CardTitle>
            <CardDescription>
              {status === "invalid" && "Ce lien d'invitation n'est pas valide."}
              {status === "expired" && "Cette invitation a expiré. Demandez une nouvelle invitation."}
              {status === "already_used" && "Cette invitation a déjà été acceptée. Connectez-vous pour accéder à l'Espace Partenaire."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate("/")}>
              Accueil
            </Button>
            {status === "already_used" && (
              <Button onClick={() => navigate("/admin", { state: { partnerAccess: true } })}>
                Se connecter
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
            <CardTitle>Compte créé avec succès !</CardTitle>
            <CardDescription>
              Bienvenue dans l'Espace Partenaire IArche. Vous allez être redirigé...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid invitation - show signup form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-primary font-bold text-xl">IA</span>
          </div>
          <CardTitle>Bienvenue, {partnerName} !</CardTitle>
          <CardDescription>
            Créez votre compte pour accéder à l'Espace Partenaire IArche
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  required
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez votre mot de passe"
                required
              />
            </div>

            {errorMessage && (
              <p className="text-sm text-destructive text-center">{errorMessage}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création en cours...
                </>
              ) : (
                "Créer mon compte"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
