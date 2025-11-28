import IArcheLogoFixed from "@/components/ui/IArcheLogoFixed";

const Logo2 = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-semibold text-foreground mb-4">
            Logo IArche — Version figée (gradient hero)
          </h1>
          <p className="text-muted-foreground">
            Gradient exact du hero sans animation
          </p>
          <p className="text-xs text-text-subtle mt-2">
            linear-gradient(270deg, hsl(218, 47%, 20%), hsl(12, 60%, 53%), hsl(218, 47%, 35%), hsl(12, 60%, 53%))
          </p>
        </div>

        {/* Logo Texte Figé - Toutes tailles */}
        <div className="border border-border rounded-lg p-8 bg-background">
          <h2 className="text-xl font-medium text-foreground mb-6">
            Toutes les tailles (sm / md / lg / xl)
          </h2>
          <div className="flex flex-col items-center gap-8">
            <div className="bg-white p-8 rounded-lg border border-border/50 w-full flex items-center justify-center">
              <IArcheLogoFixed size="xl" />
            </div>
            <div className="bg-muted p-8 rounded-lg w-full flex items-center justify-center">
              <IArcheLogoFixed size="lg" />
            </div>
            <div className="bg-foreground p-8 rounded-lg w-full flex items-center justify-center">
              <IArcheLogoFixed size="md" className="opacity-90" />
            </div>
            <div className="bg-gray-900 p-8 rounded-lg w-full flex items-center justify-center">
              <IArcheLogoFixed size="sm" />
            </div>
          </div>
        </div>

        {/* Comparaison côte à côte */}
        <div className="border border-border rounded-lg p-8 bg-background">
          <h2 className="text-xl font-medium text-foreground mb-6 text-center">
            Comparaison des tailles
          </h2>
          <div className="flex gap-8 items-baseline justify-center flex-wrap">
            <div className="text-center">
              <IArcheLogoFixed size="sm" />
              <p className="text-xs text-muted-foreground mt-2">sm (48px)</p>
            </div>
            <div className="text-center">
              <IArcheLogoFixed size="md" />
              <p className="text-xs text-muted-foreground mt-2">md (60px)</p>
            </div>
            <div className="text-center">
              <IArcheLogoFixed size="lg" />
              <p className="text-xs text-muted-foreground mt-2">lg (72px)</p>
            </div>
            <div className="text-center">
              <IArcheLogoFixed size="xl" />
              <p className="text-xs text-muted-foreground mt-2">xl (96px)</p>
            </div>
          </div>
        </div>

        {/* Détails techniques */}
        <div className="border border-border rounded-lg p-8 bg-background">
          <h2 className="text-xl font-medium text-foreground mb-6">
            Spécifications techniques
          </h2>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-foreground">Gradient (270deg - de droite à gauche)</p>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-12 rounded" style={{ background: 'hsl(218, 47%, 20%)' }}></div>
                  <p className="text-muted-foreground">Stop 1: hsl(218, 47%, 20%) - Bleu Nuit foncé</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-12 rounded" style={{ background: 'hsl(12, 60%, 53%)' }}></div>
                  <p className="text-muted-foreground">Stop 2: hsl(12, 60%, 53%) - Terracotta</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-12 rounded" style={{ background: 'hsl(218, 47%, 35%)' }}></div>
                  <p className="text-muted-foreground">Stop 3: hsl(218, 47%, 35%) - Bleu Nuit moyen</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-12 rounded" style={{ background: 'hsl(12, 60%, 53%)' }}></div>
                  <p className="text-muted-foreground">Stop 4: hsl(12, 60%, 53%) - Terracotta</p>
                </div>
              </div>
            </div>
            <div>
              <p className="font-medium text-foreground">Typographie</p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Font: Inter, sans-serif</li>
                <li>Weight: 600 (semibold)</li>
                <li>Line-height: 1.1</li>
                <li>Background-clip: text (pour gradient sur texte)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Visualisation du gradient seul */}
        <div className="border border-border rounded-lg p-8 bg-background">
          <h2 className="text-xl font-medium text-foreground mb-6 text-center">
            Visualisation du gradient
          </h2>
          <div 
            className="h-24 rounded-lg"
            style={{
              background: 'linear-gradient(270deg, hsl(218, 47%, 20%), hsl(12, 60%, 53%), hsl(218, 47%, 35%), hsl(12, 60%, 53%))'
            }}
          />
          <p className="text-xs text-muted-foreground text-center mt-4">
            Direction 270deg (droite → gauche) : Bleu → Terracotta → Bleu → Terracotta
          </p>
        </div>

        {/* Note */}
        <div className="text-center text-sm text-muted-foreground mt-12 pb-8">
          <p>Version figée issue du hero animé de la page d'accueil</p>
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

export default Logo2;
