const Logo = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-semibold text-foreground mb-4">
            Logo IArche - Aperçu
          </h1>
          <p className="text-muted-foreground">
            Prévisualisation des 4 versions du logo
          </p>
        </div>

        {/* Logo Gradient Principal */}
        <div className="border border-border rounded-lg p-8 bg-background">
          <h2 className="text-xl font-medium text-foreground mb-6">
            1. Logo Principal (Gradient)
          </h2>
          <div className="flex flex-col items-center gap-6">
            <div className="bg-white p-8 rounded-lg border border-border/50">
              <img 
                src="/logo-iarche.svg" 
                alt="Logo IArche Gradient SVG" 
                className="h-24"
              />
            </div>
            <div className="bg-muted p-8 rounded-lg">
              <img 
                src="/logo-iarche.svg" 
                alt="Logo IArche Gradient SVG" 
                className="h-24"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              <code>logo-iarche.svg</code> - Gradient Bleu Nuit → Terracotta (65/35%)
            </p>
          </div>
        </div>

        {/* Logo PNG */}
        <div className="border border-border rounded-lg p-8 bg-background">
          <h2 className="text-xl font-medium text-foreground mb-6">
            2. Logo PNG (512x512)
          </h2>
          <div className="flex flex-col items-center gap-6">
            <div className="bg-white p-8 rounded-lg border border-border/50">
              <img 
                src="/logo-iarche.png" 
                alt="Logo IArche PNG" 
                className="h-24"
              />
            </div>
            <div className="bg-muted p-8 rounded-lg">
              <img 
                src="/logo-iarche.png" 
                alt="Logo IArche PNG" 
                className="h-24"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              <code>logo-iarche.png</code> - Pour réseaux sociaux et présentations
            </p>
          </div>
        </div>

        {/* Logo Blanc */}
        <div className="border border-border rounded-lg p-8 bg-background">
          <h2 className="text-xl font-medium text-foreground mb-6">
            3. Logo Blanc (Fonds Sombres)
          </h2>
          <div className="flex flex-col items-center gap-6">
            <div className="bg-foreground p-8 rounded-lg">
              <img 
                src="/logo-iarche-white.svg" 
                alt="Logo IArche Blanc" 
                className="h-24"
              />
            </div>
            <div className="bg-gray-800 p-8 rounded-lg">
              <img 
                src="/logo-iarche-white.svg" 
                alt="Logo IArche Blanc" 
                className="h-24"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              <code>logo-iarche-white.svg</code> - Version monochrome pour fonds sombres
            </p>
          </div>
        </div>

        {/* Logo Bleu Nuit */}
        <div className="border border-border rounded-lg p-8 bg-background">
          <h2 className="text-xl font-medium text-foreground mb-6">
            4. Logo Bleu Nuit (Version sobre)
          </h2>
          <div className="flex flex-col items-center gap-6">
            <div className="bg-white p-8 rounded-lg border border-border/50">
              <img 
                src="/logo-iarche-dark.svg" 
                alt="Logo IArche Bleu Nuit" 
                className="h-24"
              />
            </div>
            <div className="bg-muted p-8 rounded-lg">
              <img 
                src="/logo-iarche-dark.svg" 
                alt="Logo IArche Bleu Nuit" 
                className="h-24"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              <code>logo-iarche-dark.svg</code> - Version monochrome sobre
            </p>
          </div>
        </div>

        {/* Comparaison côte à côte */}
        <div className="border border-border rounded-lg p-8 bg-background">
          <h2 className="text-xl font-medium text-foreground mb-6 text-center">
            Comparaison - Toutes les versions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-6 rounded-lg border border-border/50 w-full flex items-center justify-center">
                <img src="/logo-iarche.svg" alt="Gradient" className="h-16" />
              </div>
              <p className="text-xs text-muted-foreground">Gradient</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-6 rounded-lg border border-border/50 w-full flex items-center justify-center">
                <img src="/logo-iarche.png" alt="PNG" className="h-16" />
              </div>
              <p className="text-xs text-muted-foreground">PNG</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="bg-foreground p-6 rounded-lg w-full flex items-center justify-center">
                <img src="/logo-iarche-white.svg" alt="Blanc" className="h-16" />
              </div>
              <p className="text-xs text-muted-foreground">Blanc</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-6 rounded-lg border border-border/50 w-full flex items-center justify-center">
                <img src="/logo-iarche-dark.svg" alt="Bleu Nuit" className="h-16" />
              </div>
              <p className="text-xs text-muted-foreground">Bleu Nuit</p>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="text-center text-sm text-muted-foreground mt-12 pb-8">
          <p>Page temporaire de validation - À supprimer après confirmation</p>
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
