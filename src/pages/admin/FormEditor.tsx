import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Eye, Settings, Copy, QrCode, 
  GripVertical, Trash2, Plus, ChevronDown, Download, Palette, Image as ImageIcon, X
} from 'lucide-react';
import QRCode from 'react-qr-code';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useForms } from '@/hooks/useForms';
import { Form, FormField, FieldType, FIELD_TYPE_INFO, FIELD_CATEGORIES, DEFAULT_FORM_SETTINGS } from '@/types/forms';
import { useToast } from '@/hooks/use-toast';
import * as LucideIcons from 'lucide-react';

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Field Library Component
const FieldLibrary = ({ onAddField }: { onAddField: (type: FieldType) => void }) => {
  const [openCategories, setOpenCategories] = useState<string[]>(FIELD_CATEGORIES.map(c => c));

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const fieldsByCategory = FIELD_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = Object.entries(FIELD_TYPE_INFO)
      .filter(([_, info]) => info.category === cat)
      .map(([type, info]) => ({ type: type as FieldType, ...info }));
    return acc;
  }, {} as Record<string, Array<{ type: FieldType; label: string; icon: string; isInput: boolean }>>);

  return (
    <div className="space-y-2">
      {FIELD_CATEGORIES.map(category => (
        <Collapsible
          key={category}
          open={openCategories.includes(category)}
          onOpenChange={() => toggleCategory(category)}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg">
            {category}
            <ChevronDown className={`h-4 w-4 transition-transform ${openCategories.includes(category) ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            {fieldsByCategory[category]?.map(field => {
              const IconComponent = (LucideIcons as any)[field.icon] || LucideIcons.HelpCircle;
              return (
                <button
                  key={field.type}
                  onClick={() => onAddField(field.type)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <IconComponent className="h-4 w-4" />
                  {field.label}
                </button>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
};

// Sortable Field Item
const SortableFieldItem = ({ 
  field, 
  isSelected, 
  onSelect, 
  onDelete 
}: { 
  field: FormField; 
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fieldInfo = FIELD_TYPE_INFO[field.type];
  const IconComponent = (LucideIcons as any)[fieldInfo?.icon] || LucideIcons.HelpCircle;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-card border rounded-lg p-4 cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <button
          className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <IconComponent className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium truncate">
              {field.label || `Champ ${fieldInfo?.label}`}
            </span>
            {field.required && (
              <Badge variant="secondary" className="text-xs">Requis</Badge>
            )}
          </div>
          {field.placeholder && (
            <p className="text-xs text-muted-foreground truncate">
              {field.placeholder}
            </p>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Field Configuration Panel
const FieldConfig = ({ 
  field, 
  onChange 
}: { 
  field: FormField | null; 
  onChange: (updates: Partial<FormField>) => void;
}) => {
  if (!field) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Sélectionnez un champ pour le configurer
      </div>
    );
  }

  const fieldInfo = FIELD_TYPE_INFO[field.type];
  const hasOptions = ['radio', 'checkbox', 'select'].includes(field.type);

  const addOption = () => {
    const newOption = { id: generateId(), label: 'Nouvelle option', value: `option_${(field.options?.length || 0) + 1}` };
    onChange({ options: [...(field.options || []), newOption] });
  };

  const updateOption = (index: number, updates: Partial<typeof field.options[0]>) => {
    const newOptions = [...(field.options || [])];
    newOptions[index] = { ...newOptions[index], ...updates };
    onChange({ options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = (field.options || []).filter((_, i) => i !== index);
    onChange({ options: newOptions });
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <Label>Label</Label>
        <Input
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="mt-1.5"
        />
      </div>

      {fieldInfo?.isInput && field.type !== 'rgpd' && (
        <div>
          <Label>Placeholder</Label>
          <Input
            value={field.placeholder || ''}
            onChange={(e) => onChange({ placeholder: e.target.value })}
            className="mt-1.5"
          />
        </div>
      )}

      {fieldInfo?.isInput && (
        <div className="flex items-center justify-between">
          <Label>Obligatoire</Label>
          <Switch
            checked={field.required}
            onCheckedChange={(checked) => onChange({ required: checked })}
          />
        </div>
      )}

      <div>
        <Label>Texte d'aide</Label>
        <Textarea
          value={field.helpText || ''}
          onChange={(e) => onChange({ helpText: e.target.value })}
          className="mt-1.5"
          rows={2}
        />
      </div>

      {hasOptions && (
        <div>
          <Label>Options</Label>
          <div className="space-y-2 mt-2">
            {field.options?.map((option, index) => (
              <div key={option.id} className="flex items-center gap-2">
                <Input
                  value={option.label}
                  onChange={(e) => updateOption(index, { label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOption(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addOption} className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Ajouter une option
            </Button>
          </div>
        </div>
      )}

      {(field.type === 'number' || field.type === 'scale') && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Min</Label>
              <Input
                type="number"
                value={field.min ?? ''}
                onChange={(e) => onChange({ min: e.target.value ? Number(e.target.value) : undefined })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Max</Label>
              <Input
                type="number"
                value={field.max ?? ''}
                onChange={(e) => onChange({ max: e.target.value ? Number(e.target.value) : undefined })}
                className="mt-1.5"
              />
            </div>
          </div>
        </>
      )}

      {(field.type === 'rating' || field.type === 'scale') && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Label min</Label>
            <Input
              value={field.minLabel || ''}
              onChange={(e) => onChange({ minLabel: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Label max</Label>
            <Input
              value={field.maxLabel || ''}
              onChange={(e) => onChange({ maxLabel: e.target.value })}
              className="mt-1.5"
            />
          </div>
        </div>
      )}

      {field.type === 'file' && (
        <>
          <div>
            <Label>Types acceptés</Label>
            <Input
              value={field.accept || ''}
              onChange={(e) => onChange({ accept: e.target.value })}
              placeholder=".pdf,.jpg,.png"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Taille max (MB)</Label>
            <Input
              type="number"
              value={field.maxSize ?? ''}
              onChange={(e) => onChange({ maxSize: e.target.value ? Number(e.target.value) : undefined })}
              className="mt-1.5"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Fichiers multiples</Label>
            <Switch
              checked={field.multiple || false}
              onCheckedChange={(checked) => onChange({ multiple: checked })}
            />
          </div>
        </>
      )}

      {(field.type === 'text' || field.type === 'textarea') && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Min caractères</Label>
            <Input
              type="number"
              value={field.minLength ?? ''}
              onChange={(e) => onChange({ minLength: e.target.value ? Number(e.target.value) : undefined })}
              className="mt-1.5"
              min={0}
            />
          </div>
          <div>
            <Label>Max caractères</Label>
            <Input
              type="number"
              value={field.maxLength ?? ''}
              onChange={(e) => onChange({ maxLength: e.target.value ? Number(e.target.value) : undefined })}
              className="mt-1.5"
              min={0}
            />
          </div>
        </div>
      )}

      <div>
        <Label>Largeur</Label>
        <Select
          value={field.width || 'full'}
          onValueChange={(v) => onChange({ width: v as 'full' | 'half' | 'third' })}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full">Pleine largeur</SelectItem>
            <SelectItem value="half">Moitié</SelectItem>
            <SelectItem value="third">Tiers</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

// Main FormEditor Component
const FormEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getFormById, updateForm, createForm } = useForms();
  
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('general');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const isNew = id === 'new';

  useEffect(() => {
    if (isNew) {
      setForm({
        id: '',
        title: 'Nouveau formulaire',
        slug: '',
        fields: [],
        settings: DEFAULT_FORM_SETTINGS,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
        views_count: 0,
        submissions_count: 0,
      });
      setLoading(false);
    } else if (id) {
      loadForm(id);
    }
  }, [id]);

  const loadForm = async (formId: string) => {
    setLoading(true);
    const data = await getFormById(formId);
    if (data) {
      setForm(data);
    } else {
      toast({ title: 'Erreur', description: 'Formulaire non trouvé', variant: 'destructive' });
      navigate('/admin/formulaires');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);

    try {
      if (isNew) {
        const created = await createForm(form.title);
        if (created) {
          await updateForm(created.id, {
            fields: form.fields,
            settings: form.settings,
            description: form.description,
          });
          toast({ title: 'Succès', description: 'Formulaire créé' });
          navigate(`/admin/formulaires/${created.id}`);
        }
      } else {
        await updateForm(form.id, {
          title: form.title,
          description: form.description,
          fields: form.fields,
          settings: form.settings,
          is_active: form.is_active,
        });
        toast({ title: 'Succès', description: 'Formulaire sauvegardé' });
      }
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur lors de la sauvegarde', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addField = (type: FieldType) => {
    console.log('addField called with type:', type, 'form:', form);
    if (!form) {
      console.log('addField: form is null, returning');
      return;
    }
    
    const fieldInfo = FIELD_TYPE_INFO[type];
    const newField: FormField = {
      id: generateId(),
      type,
      label: fieldInfo?.label || type,
      required: false,
      options: ['radio', 'checkbox', 'select'].includes(type) 
        ? [{ id: generateId(), label: 'Option 1', value: 'option_1' }]
        : undefined,
    };

    console.log('addField: creating new field:', newField);
    setForm({ ...form, fields: [...form.fields, newField] });
    setSelectedFieldId(newField.id);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    if (!form) return;
    setForm({
      ...form,
      fields: form.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
    });
  };

  const deleteField = (fieldId: string) => {
    if (!form) return;
    setForm({
      ...form,
      fields: form.fields.filter(f => f.id !== fieldId)
    });
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    
    if (over && active.id !== over.id && form) {
      const oldIndex = form.fields.findIndex(f => f.id === active.id);
      const newIndex = form.fields.findIndex(f => f.id === over.id);
      
      setForm({
        ...form,
        fields: arrayMove(form.fields, oldIndex, newIndex)
      });
    }
  };

  const selectedField = form?.fields.find(f => f.id === selectedFieldId) || null;

  const copyLink = () => {
    if (!form) return;
    navigator.clipboard.writeText(`${window.location.origin}/f/${form.slug}`);
    toast({ title: 'Lien copié' });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!form) return null;

  return (
    <AdminLayout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/formulaires')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="font-semibold border-none focus-visible:ring-0 text-lg w-64"
            />
          </div>
          
          <div className="flex items-center gap-2">
            {!isNew && (
              <>
                <Button variant="outline" size="sm" onClick={copyLink}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copier lien
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/f/${form.slug}`, '_blank')}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4 mr-1" />
              Paramètres
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
            <div className="flex items-center gap-2 ml-2 pl-2 border-l">
              <span className="text-sm text-muted-foreground">Actif</span>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
            </div>
          </div>
        </div>

        {/* Main Content - 3 Columns */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column - Field Library */}
          <div className="w-64 border-r bg-muted/30 overflow-y-auto p-4">
            <h3 className="font-semibold text-sm mb-4 text-muted-foreground uppercase tracking-wide">
              Champs
            </h3>
            <FieldLibrary onAddField={addField} />
          </div>

          {/* Center Column - Canvas */}
          <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
            <div className="max-w-2xl mx-auto">
              {form.fields.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    Glissez des champs depuis la bibliothèque ou cliquez pour ajouter
                  </p>
                  <Button variant="outline" onClick={() => addField('text')}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter un champ texte
                  </Button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={form.fields.map(f => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {form.fields.map(field => (
                        <SortableFieldItem
                          key={field.id}
                          field={field}
                          isSelected={selectedFieldId === field.id}
                          onSelect={() => setSelectedFieldId(field.id)}
                          onDelete={() => deleteField(field.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>

          {/* Right Column - Configuration */}
          <div className="w-80 border-l bg-background overflow-y-auto">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Configuration
              </h3>
            </div>
            <FieldConfig
              field={selectedField}
              onChange={(updates) => selectedFieldId && updateField(selectedFieldId, updates)}
            />
          </div>
        </div>

        {/* Settings Dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Paramètres du formulaire</DialogTitle>
            </DialogHeader>
            <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab}>
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="design">Design</TabsTrigger>
                <TabsTrigger value="qrcode">QR Code</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="rgpd">RGPD</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4 mt-4">
                <div>
                  <Label>Titre</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={form.description || ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="mt-1.5"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Message de remerciement</Label>
                  <Textarea
                    value={form.settings.thankYou.message}
                    onChange={(e) => setForm({
                      ...form,
                      settings: {
                        ...form.settings,
                        thankYou: { ...form.settings.thankYou, message: e.target.value }
                      }
                    })}
                    className="mt-1.5"
                    rows={2}
                  />
                </div>
              </TabsContent>

              <TabsContent value="design" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Couleur principale</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        type="color"
                        value={form.settings.design.colors.primary}
                        onChange={(e) => setForm({
                          ...form,
                          settings: {
                            ...form.settings,
                            design: { 
                              ...form.settings.design, 
                              colors: { ...form.settings.design.colors, primary: e.target.value }
                            }
                          }
                        })}
                        className="h-10 w-14 rounded border cursor-pointer"
                      />
                      <Input
                        value={form.settings.design.colors.primary}
                        onChange={(e) => setForm({
                          ...form,
                          settings: {
                            ...form.settings,
                            design: { 
                              ...form.settings.design, 
                              colors: { ...form.settings.design.colors, primary: e.target.value }
                            }
                          }
                        })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Couleur secondaire</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        type="color"
                        value={form.settings.design.colors.secondary}
                        onChange={(e) => setForm({
                          ...form,
                          settings: {
                            ...form.settings,
                            design: { 
                              ...form.settings.design, 
                              colors: { ...form.settings.design.colors, secondary: e.target.value }
                            }
                          }
                        })}
                        className="h-10 w-14 rounded border cursor-pointer"
                      />
                      <Input
                        value={form.settings.design.colors.secondary}
                        onChange={(e) => setForm({
                          ...form,
                          settings: {
                            ...form.settings,
                            design: { 
                              ...form.settings.design, 
                              colors: { ...form.settings.design.colors, secondary: e.target.value }
                            }
                          }
                        })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Fond</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        type="color"
                        value={form.settings.design.colors.background}
                        onChange={(e) => setForm({
                          ...form,
                          settings: {
                            ...form.settings,
                            design: { 
                              ...form.settings.design, 
                              colors: { ...form.settings.design.colors, background: e.target.value }
                            }
                          }
                        })}
                        className="h-10 w-14 rounded border cursor-pointer"
                      />
                      <Input
                        value={form.settings.design.colors.background}
                        onChange={(e) => setForm({
                          ...form,
                          settings: {
                            ...form.settings,
                            design: { 
                              ...form.settings.design, 
                              colors: { ...form.settings.design.colors, background: e.target.value }
                            }
                          }
                        })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Texte</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        type="color"
                        value={form.settings.design.colors.text}
                        onChange={(e) => setForm({
                          ...form,
                          settings: {
                            ...form.settings,
                            design: { 
                              ...form.settings.design, 
                              colors: { ...form.settings.design.colors, text: e.target.value }
                            }
                          }
                        })}
                        className="h-10 w-14 rounded border cursor-pointer"
                      />
                      <Input
                        value={form.settings.design.colors.text}
                        onChange={(e) => setForm({
                          ...form,
                          settings: {
                            ...form.settings,
                            design: { 
                              ...form.settings.design, 
                              colors: { ...form.settings.design.colors, text: e.target.value }
                            }
                          }
                        })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Logo */}
                <div className="pt-4 border-t">
                  <Label>Logo personnalisé</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Input
                      value={form.settings.design.logo || ''}
                      onChange={(e) => setForm({
                        ...form,
                        settings: {
                          ...form.settings,
                          design: { ...form.settings.design, logo: e.target.value }
                        }
                      })}
                      placeholder="URL du logo (https://...)"
                      className="flex-1"
                    />
                    {form.settings.design.logo && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setForm({
                          ...form,
                          settings: {
                            ...form.settings,
                            design: { ...form.settings.design, logo: undefined }
                          }
                        })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {form.settings.design.logo && (
                    <div className="mt-3 p-4 bg-muted rounded-lg flex justify-center">
                      <img 
                        src={form.settings.design.logo} 
                        alt="Logo preview" 
                        className="h-12 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Entrez l'URL d'une image hébergée (PNG, JPG, SVG)
                  </p>
                </div>
                
                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Afficher barre gradient</Label>
                    <Switch
                      checked={form.settings.design.showGradientBar}
                      onCheckedChange={(checked) => setForm({
                        ...form,
                        settings: {
                          ...form.settings,
                          design: { ...form.settings.design, showGradientBar: checked }
                        }
                      })}
                    />
                  </div>
                  {form.settings.design.showGradientBar && (
                    <div>
                      <Label>Taille de la barre</Label>
                      <Select
                        value={form.settings.design.barSize}
                        onValueChange={(v) => setForm({
                          ...form,
                          settings: {
                            ...form.settings,
                            design: { ...form.settings.design, barSize: v as any }
                          }
                        })}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sm">Petite</SelectItem>
                          <SelectItem value="md">Moyenne</SelectItem>
                          <SelectItem value="lg">Grande</SelectItem>
                          <SelectItem value="xl">Très grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Label>Afficher lignes de canalisation</Label>
                    <Switch
                      checked={form.settings.design.showCanalisations || false}
                      onCheckedChange={(checked) => setForm({
                        ...form,
                        settings: {
                          ...form.settings,
                          design: { ...form.settings.design, showCanalisations: checked }
                        }
                      })}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="qrcode" className="space-y-4 mt-4">
                {isNew ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <QrCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Sauvegardez d'abord le formulaire pour générer un QR Code</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-white p-4 rounded-lg shadow-sm" id="qr-code-container">
                        <QRCode
                          value={`${window.location.origin}/f/${form.slug}`}
                          size={200}
                          level="H"
                          fgColor={form.settings.design.colors.primary}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        {window.location.origin}/f/{form.slug}
                      </p>
                    </div>
                    
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const svg = document.querySelector('#qr-code-container svg');
                          if (svg) {
                            const svgData = new XMLSerializer().serializeToString(svg);
                            const blob = new Blob([svgData], { type: 'image/svg+xml' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `qr-${form.slug}.svg`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        SVG
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const svg = document.querySelector('#qr-code-container svg');
                          if (svg) {
                            const canvas = document.createElement('canvas');
                            canvas.width = 400;
                            canvas.height = 400;
                            const ctx = canvas.getContext('2d');
                            const img = new Image();
                            const svgData = new XMLSerializer().serializeToString(svg);
                            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                            const url = URL.createObjectURL(svgBlob);
                            img.onload = () => {
                              ctx?.drawImage(img, 0, 0, 400, 400);
                              const pngUrl = canvas.toDataURL('image/png');
                              const a = document.createElement('a');
                              a.href = pngUrl;
                              a.download = `qr-${form.slug}.png`;
                              a.click();
                              URL.revokeObjectURL(url);
                            };
                            img.src = url;
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        PNG
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/f/${form.slug}`);
                          toast({ title: 'Lien copié' });
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copier lien
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notifications" className="space-y-4 mt-4">
                <div>
                  <Label>Email admin</Label>
                  <Input
                    type="email"
                    value={form.settings.notifications.adminEmail || ''}
                    onChange={(e) => setForm({
                      ...form,
                      settings: {
                        ...form.settings,
                        notifications: { ...form.settings.notifications, adminEmail: e.target.value }
                      }
                    })}
                    placeholder="admin@example.com"
                    className="mt-1.5"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Envoyer confirmation au répondant</Label>
                  <Switch
                    checked={form.settings.notifications.sendToRespondent}
                    onCheckedChange={(checked) => setForm({
                      ...form,
                      settings: {
                        ...form.settings,
                        notifications: { ...form.settings.notifications, sendToRespondent: checked }
                      }
                    })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="rgpd" className="space-y-4 mt-4">
                <div>
                  <Label>Durée de rétention (jours)</Label>
                  <Input
                    type="number"
                    value={form.settings.rgpd.retentionDays}
                    onChange={(e) => setForm({
                      ...form,
                      settings: {
                        ...form.settings,
                        rgpd: { ...form.settings.rgpd, retentionDays: Number(e.target.value) }
                      }
                    })}
                    className="mt-1.5"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Purge automatique</Label>
                  <Switch
                    checked={form.settings.rgpd.autoPurge}
                    onCheckedChange={(checked) => setForm({
                      ...form,
                      settings: {
                        ...form.settings,
                        rgpd: { ...form.settings.rgpd, autoPurge: checked }
                      }
                    })}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default FormEditor;
