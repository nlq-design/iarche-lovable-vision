import IArcheLogo from "@/components/ui/IArcheLogo";

const Logo = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-semibold text-foreground mb-4">
            Logo IArche — Version figée
          </h1>
          <p className="text-muted-foreground">
            Gradient optimisé : 0-30% Bleu Nuit → 30-70% Transition → 70-100% Terracotta
          </p>
        </div>

        {/* Logo Texte - Toutes tailles */}
        <div className="border border-border rounded-lg p-8 bg-background">
          <h2 className="text-xl font-medium text-foreground mb-6">
            Toutes les tailles (sm / md / lg / xl)
          </h2>
          <div className="flex flex-col items-center gap-8">
            <div className="bg-white p-8 rounded-lg border border-border/50 w-full flex items-center justify-center">
              <IArcheLogo size="xl" />
            </div>
            <div className="bg-muted p-8 rounded-lg w-full flex items-center justify-center">
              <IArcheLogo size="lg" />
            </div>
            <div className="bg-foreground p-8 rounded-lg w-full flex items-center justify-center">
              <IArcheLogo size="md" className="opacity-90" />
            </div>
            <div className="flex gap-6 items-baseline">
              <div className="text-center">
                <IArcheLogo size="sm" />
                <p className="text-xs text-muted-foreground mt-2">sm (24px)</p>
              </div>
              <div className="text-center">
                <IArcheLogo size="md" />
                <p className="text-xs text-muted-foreground mt-2">md (36px)</p>
              </div>
              <div className="text-center">
                <IArcheLogo size="lg" />
                <p className="text-xs text-muted-foreground mt-2">lg (48px)</p>
              </div>
              <div className="text-center">
                <IArcheLogo size="xl" />
                <p className="text-xs text-muted-foreground mt-2">xl (72px)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Analyse du gradient */}
        <div className="border border-border rounded-lg p-8 bg-background">
          <h2 className="text-xl font-medium text-foreground mb-6">
            Répartition du gradient
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded" style={{ background: '#1A2B4A' }}></div>
              <div>
                <p className="font-medium text-foreground">0-30% : Bleu Nuit pur</p>
                <p className="text-sm text-muted-foreground">Couvre "IA"</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded" style={{ background: 'linear-gradient(90deg, #1A2B4A 0%, #D15A3E 100%)' }}></div>
              <div>
                <p className="font-medium text-foreground">30-70% : Zone de transition</p>
                <p className="text-sm text-muted-foreground">Couvre "rc" (violet/mauve)</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded" style={{ background: '#D15A3E' }}></div>
              <div>
                <p className="font-medium text-foreground">70-100% : Terracotta pur</p>
                <p className="text-sm text-muted-foreground">Couvre "he"</p>
              </div>
            </div>
          </div>
        </div>

        {/* Comparaison avec SVG logos */}
        <div className="border border-border rounded-lg p-8 bg-background">
          <h2 className="text-xl font-medium text-foreground mb-6 text-center">
            Comparaison — Logo texte vs SVG
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-6 rounded-lg border border-border/50 w-full flex items-center justify-center">
                <IArcheLogo size="lg" />
              </div>
              <p className="text-xs text-muted-foreground">Logo Texte</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-6 rounded-lg border border-border/50 w-full flex items-center justify-center">
                <img src="/logo-iarche.svg" alt="Gradient SVG" className="h-12" />
              </div>
              <p className="text-xs text-muted-foreground">SVG Gradient</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="bg-foreground p-6 rounded-lg w-full flex items-center justify-center">
                <img src="/logo-iarche-white.svg" alt="Blanc" className="h-12" />
              </div>
              <p className="text-xs text-muted-foreground">SVG Blanc</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-6 rounded-lg border border-border/50 w-full flex items-center justify-center">
                <img src="/logo-iarche-dark.svg" alt="Bleu Nuit" className="h-12" />
              </div>
              <p className="text-xs text-muted-foreground">SVG Bleu Nuit</p>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="text-center text-sm text-muted-foreground mt-12 pb-8">
          <p>Page temporaire de validation — Version figée issue du hero animé</p>
          <p className="mt-2">
            <a href="/" className="text-primary hover:underline">
              ← Retour à l'accueil
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Logo;
