import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Eye, Download, Plus, Trash2, GripVertical, Upload, X, Loader2 } from 'lucide-react';
import { useBrochures, useBrochure } from '@/hooks/useBrochures';
import { Brochure, BrochureSections, BrochureKeyPoint, BrochurePricingPlan, BrochureExportSettings as ExportSettingsType, defaultSections, defaultExportSettings } from '@/types/brochure';
import BrochureWebView from '@/components/admin/brochures/BrochureWebView';
import BrochurePDFExport from '@/components/admin/brochures/BrochurePDFExport';
import BrochureExportSettingsComponent from '@/components/admin/brochures/BrochureExportSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const BrochureEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = !id || id === 'new';
  const { data: existingBrochure, isLoading } = useBrochure(isNew ? undefined : id);
  const { createBrochure, updateBrochure } = useBrochures();

  const [formData, setFormData] = useState<Partial<Brochure>>({
    title: '',
    slug: '',
    cover_title: '',
    cover_subtitle: '',
    cover_image_url: '',
    sections: defaultSections,
    custom_colors: { primary: null, accent: null },
    export_settings: defaultExportSettings,
    published: false,
  });

  const [showPreview, setShowPreview] = useState(false);
  const [showPDFExport, setShowPDFExport] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erreur', description: 'Seules les images sont acceptées', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('brochure-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('brochure-images')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, cover_image_url: publicUrl }));
      toast({ title: 'Image uploadée' });
    } catch (error) {
      toast({ title: 'Erreur', description: "Échec de l'upload", variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, cover_image_url: '' }));
  };

  useEffect(() => {
    if (existingBrochure) {
      setFormData(existingBrochure);
    }
  }, [existingBrochure]);

  const updateSection = <K extends keyof BrochureSections>(
    sectionKey: K,
    updates: Partial<BrochureSections[K]>
  ) => {
    setFormData(prev => ({
      ...prev,
      sections: {
        ...prev.sections!,
        [sectionKey]: { ...prev.sections![sectionKey], ...updates },
      },
    }));
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: isNew ? generateSlug(title) : prev.slug,
    }));
  };

  const addKeyPoint = () => {
    const newPoint: BrochureKeyPoint = {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      icon: 'CheckCircle',
    };
    updateSection('keyPoints', {
      points: [...(formData.sections?.keyPoints.points || []), newPoint],
    });
  };

  const updateKeyPoint = (index: number, updates: Partial<BrochureKeyPoint>) => {
    const points = [...(formData.sections?.keyPoints.points || [])];
    points[index] = { ...points[index], ...updates };
    updateSection('keyPoints', { points });
  };

  const removeKeyPoint = (index: number) => {
    const points = formData.sections?.keyPoints.points.filter((_, i) => i !== index) || [];
    updateSection('keyPoints', { points });
  };

  const addPricingPlan = () => {
    const newPlan: BrochurePricingPlan = {
      id: crypto.randomUUID(),
      name: '',
      price: '',
      period: '/mois',
      features: [],
      highlighted: false,
    };
    updateSection('pricing', {
      plans: [...(formData.sections?.pricing.plans || []), newPlan],
    });
  };

  const updatePricingPlan = (index: number, updates: Partial<BrochurePricingPlan>) => {
    const plans = [...(formData.sections?.pricing.plans || [])];
    plans[index] = { ...plans[index], ...updates };
    updateSection('pricing', { plans });
  };

  const removePricingPlan = (index: number) => {
    const plans = formData.sections?.pricing.plans.filter((_, i) => i !== index) || [];
    updateSection('pricing', { plans });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug || !formData.cover_title) {
      toast({ title: 'Erreur', description: 'Remplissez les champs obligatoires', variant: 'destructive' });
      return;
    }

    if (isNew) {
      createBrochure.mutate(formData, {
        onSuccess: () => navigate('/admin/brochures'),
      });
    } else {
      updateBrochure.mutate({ id, ...formData } as Brochure, {
        onSuccess: () => navigate('/admin/brochures'),
      });
    }
  };

  if (!isNew && isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/brochures')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-primary">
                {isNew ? 'Nouvelle brochure' : 'Modifier la brochure'}
              </h1>
              <p className="text-muted-foreground">{formData.title || 'Sans titre'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Aperçu
            </Button>
            {!isNew && (
              <Button variant="outline" onClick={() => setShowPDFExport(true)}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            )}
            <Button onClick={handleSave} disabled={createBrochure.isPending || updateBrochure.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="space-y-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="content">Contenu</TabsTrigger>
                <TabsTrigger value="pricing">Tarifs</TabsTrigger>
                <TabsTrigger value="settings">Paramètres</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Informations générales</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Titre (admin) *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Ex: Présentation Collaboria"
                      />
                    </div>
                    <div>
                      <Label>Slug *</Label>
                      <Input
                        value={formData.slug}
                        onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                        placeholder="collaboria-presentation"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        URL: /brochure/{formData.slug || 'slug'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Couverture</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Titre principal *</Label>
                      <Input
                        value={formData.cover_title}
                        onChange={(e) => setFormData(prev => ({ ...prev, cover_title: e.target.value }))}
                        placeholder="Collaboria"
                      />
                    </div>
                    <div>
                      <Label>Sous-titre</Label>
                      <Input
                        value={formData.cover_subtitle || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, cover_subtitle: e.target.value }))}
                        placeholder="La solution collaborative intelligente"
                      />
                    </div>
                    <div>
                      <Label>Image de couverture</Label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      
                      {formData.cover_image_url ? (
                        <div className="relative mt-2">
                          <img 
                            src={formData.cover_image_url} 
                            alt="Couverture" 
                            className="w-full max-w-xs rounded-lg border border-border"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={removeImage}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="mt-2 border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {isUploading ? (
                            <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">Cliquer pour uploader</p>
                            </>
                          )}
                        </div>
                      )}
                      
                      <div className="mt-2">
                        <Label className="text-xs text-muted-foreground">Ou entrer une URL</Label>
                        <Input
                          value={formData.cover_image_url || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, cover_image_url: e.target.value }))}
                          placeholder="https://..."
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="content" className="space-y-4 mt-4">
                {/* Introduction */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Introduction</CardTitle>
                      <Switch
                        checked={formData.sections?.introduction.enabled}
                        onCheckedChange={(checked) => updateSection('introduction', { enabled: checked })}
                      />
                    </div>
                  </CardHeader>
                  {formData.sections?.introduction.enabled && (
                    <CardContent>
                      <Textarea
                        value={formData.sections?.introduction.content}
                        onChange={(e) => updateSection('introduction', { content: e.target.value })}
                        placeholder="Présentez votre solution..."
                        rows={4}
                      />
                    </CardContent>
                  )}
                </Card>

                {/* Points clés */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Points clés</CardTitle>
                      <Switch
                        checked={formData.sections?.keyPoints.enabled}
                        onCheckedChange={(checked) => updateSection('keyPoints', { enabled: checked })}
                      />
                    </div>
                  </CardHeader>
                  {formData.sections?.keyPoints.enabled && (
                    <CardContent className="space-y-4">
                      {formData.sections?.keyPoints.points.map((point, index) => (
                        <div key={point.id} className="flex items-start gap-2 p-3 border rounded-lg">
                          <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                          <div className="flex-1 space-y-2">
                            <Input
                              value={point.title}
                              onChange={(e) => updateKeyPoint(index, { title: e.target.value })}
                              placeholder="Titre du point"
                            />
                            <Textarea
                              value={point.description}
                              onChange={(e) => updateKeyPoint(index, { description: e.target.value })}
                              placeholder="Description"
                              rows={2}
                            />
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeKeyPoint(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" onClick={addKeyPoint} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter un point
                      </Button>
                    </CardContent>
                  )}
                </Card>

                {/* Détails */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Détails</CardTitle>
                      <Switch
                        checked={formData.sections?.details.enabled}
                        onCheckedChange={(checked) => updateSection('details', { enabled: checked })}
                      />
                    </div>
                  </CardHeader>
                  {formData.sections?.details.enabled && (
                    <CardContent>
                      <Textarea
                        value={formData.sections?.details.content}
                        onChange={(e) => updateSection('details', { content: e.target.value })}
                        placeholder="Détaillez les fonctionnalités..."
                        rows={6}
                      />
                    </CardContent>
                  )}
                </Card>

                {/* Témoignage */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Témoignage</CardTitle>
                      <Switch
                        checked={formData.sections?.testimonial.enabled}
                        onCheckedChange={(checked) => updateSection('testimonial', { enabled: checked })}
                      />
                    </div>
                  </CardHeader>
                  {formData.sections?.testimonial.enabled && (
                    <CardContent className="space-y-4">
                      <Textarea
                        value={formData.sections?.testimonial.quote}
                        onChange={(e) => updateSection('testimonial', { quote: e.target.value })}
                        placeholder="Citation du client..."
                        rows={3}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Auteur</Label>
                          <Input
                            value={formData.sections?.testimonial.author}
                            onChange={(e) => updateSection('testimonial', { author: e.target.value })}
                            placeholder="Jean Dupont"
                          />
                        </div>
                        <div>
                          <Label>Entreprise</Label>
                          <Input
                            value={formData.sections?.testimonial.company}
                            onChange={(e) => updateSection('testimonial', { company: e.target.value })}
                            placeholder="Acme Corp"
                          />
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Section Tarification</CardTitle>
                      <Switch
                        checked={formData.sections?.pricing.enabled}
                        onCheckedChange={(checked) => updateSection('pricing', { enabled: checked })}
                      />
                    </div>
                  </CardHeader>
                  {formData.sections?.pricing.enabled && (
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Titre de la section</Label>
                        <Input
                          value={formData.sections?.pricing.title}
                          onChange={(e) => updateSection('pricing', { title: e.target.value })}
                          placeholder="Nos formules"
                        />
                      </div>
                      <Separator />
                      {formData.sections?.pricing.plans.map((plan, index) => (
                        <div key={plan.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="font-semibold">Formule {index + 1}</Label>
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">Mise en avant</Label>
                              <Switch
                                checked={plan.highlighted}
                                onCheckedChange={(checked) => updatePricingPlan(index, { highlighted: checked })}
                              />
                              <Button variant="ghost" size="icon" onClick={() => removePricingPlan(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <Input
                              value={plan.name}
                              onChange={(e) => updatePricingPlan(index, { name: e.target.value })}
                              placeholder="Nom"
                            />
                            <Input
                              value={plan.price}
                              onChange={(e) => updatePricingPlan(index, { price: e.target.value })}
                              placeholder="Prix"
                            />
                            <Input
                              value={plan.period || ''}
                              onChange={(e) => updatePricingPlan(index, { period: e.target.value })}
                              placeholder="/mois"
                            />
                          </div>
                          <Textarea
                            value={plan.features.join('\n')}
                            onChange={(e) => updatePricingPlan(index, { features: e.target.value.split('\n').filter(Boolean) })}
                            placeholder="Une feature par ligne"
                            rows={3}
                          />
                        </div>
                      ))}
                      <Button variant="outline" onClick={addPricingPlan} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter une formule
                      </Button>
                    </CardContent>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Section Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Activer la section contact</Label>
                      <Switch
                        checked={formData.sections?.contact.enabled}
                        onCheckedChange={(checked) => updateSection('contact', { enabled: checked })}
                      />
                    </div>
                    {formData.sections?.contact.enabled && (
                      <>
                        <div>
                          <Label>Texte du CTA</Label>
                          <Input
                            value={formData.sections?.contact.cta_text}
                            onChange={(e) => updateSection('contact', { cta_text: e.target.value })}
                            placeholder="Nous contacter"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Afficher les coordonnées</Label>
                          <Switch
                            checked={formData.sections?.contact.show_coordinates}
                            onCheckedChange={(checked) => updateSection('contact', { show_coordinates: checked })}
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Personnalisation des couleurs</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Laissez vide pour utiliser les couleurs par défaut de la charte graphique.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Couleur primaire</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={formData.custom_colors?.primary || '#1A2B4A'}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              custom_colors: { ...prev.custom_colors, primary: e.target.value }
                            }))}
                            className="h-10 w-16 rounded border border-border cursor-pointer"
                          />
                          <Input
                            value={formData.custom_colors?.primary || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              custom_colors: { ...prev.custom_colors, primary: e.target.value || null }
                            }))}
                            placeholder="#1A2B4A"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Couleur accent</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={formData.custom_colors?.accent || '#B04A32'}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              custom_colors: { ...prev.custom_colors, accent: e.target.value }
                            }))}
                            className="h-10 w-16 rounded border border-border cursor-pointer"
                          />
                          <Input
                            value={formData.custom_colors?.accent || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              custom_colors: { ...prev.custom_colors, accent: e.target.value || null }
                            }))}
                            placeholder="#B04A32"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        custom_colors: { primary: null, accent: null }
                      }))}
                    >
                      Réinitialiser aux couleurs par défaut
                    </Button>
                  </CardContent>
                </Card>

                {/* Export Settings */}
                <BrochureExportSettingsComponent
                  settings={formData.export_settings || defaultExportSettings}
                  onChange={(settings) => setFormData(prev => ({ ...prev, export_settings: settings }))}
                />

                <Card>
                  <CardHeader>
                    <CardTitle>Publication</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Publier la brochure</Label>
                        <p className="text-sm text-muted-foreground">
                          Rendre accessible via le lien public
                        </p>
                      </div>
                      <Switch
                        checked={formData.published}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, published: checked }))}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Live Preview (desktop) */}
          <div className="hidden lg:block sticky top-6">
            <Card className="h-[calc(100vh-200px)] overflow-hidden">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Aperçu en direct</CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-full overflow-auto">
                <div className="transform scale-50 origin-top-left w-[200%]">
                  <BrochureWebView brochure={formData as Brochure} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-background overflow-auto">
          <div className="sticky top-0 z-10 bg-background border-b p-4 flex justify-between items-center">
            <h2 className="font-semibold">Aperçu de la brochure</h2>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Fermer
            </Button>
          </div>
          <BrochureWebView brochure={formData as Brochure} />
        </div>
      )}

      {/* PDF Export Modal */}
      {showPDFExport && (
        <BrochurePDFExport
          brochure={formData as Brochure}
          onClose={() => setShowPDFExport(false)}
        />
      )}
    </AdminLayout>
  );
};

export default BrochureEditor;
