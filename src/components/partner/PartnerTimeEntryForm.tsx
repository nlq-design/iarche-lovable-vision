import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { usePartnerProjects } from '@/hooks/partner/usePartnerProjects';
import { usePartnerLeads } from '@/hooks/partner/usePartnerLeads';
import { useCreateTimeEntry, useUpdateTimeEntry, PartnerTimeEntry } from '@/hooks/partner/usePartnerTimeEntries';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const timeEntrySchema = z.object({
  date: z.string().min(1, 'Date requise'),
  hours: z.coerce.number().min(0.25, 'Minimum 0.25h').max(24, 'Maximum 24h'),
  entity_type: z.enum(['project', 'lead', 'none']),
  entity_id: z.string().optional(),
  description: z.string().optional(),
});

type TimeEntryFormData = z.infer<typeof timeEntrySchema>;

interface PartnerTimeEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editEntry?: PartnerTimeEntry | null;
}

export function PartnerTimeEntryForm({ open, onOpenChange, editEntry }: PartnerTimeEntryFormProps) {
  const { data: projects } = usePartnerProjects();
  const { data: leads } = usePartnerLeads();
  const createMutation = useCreateTimeEntry();
  const updateMutation = useUpdateTimeEntry();
  
  const isEditing = !!editEntry;

  const form = useForm<TimeEntryFormData>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      hours: 1,
      entity_type: 'none',
      entity_id: '',
      description: '',
    },
  });

  const entityType = form.watch('entity_type');

  useEffect(() => {
    if (editEntry) {
      form.reset({
        date: editEntry.date,
        hours: editEntry.hours,
        entity_type: editEntry.project_id ? 'project' : editEntry.lead_id ? 'lead' : 'none',
        entity_id: editEntry.project_id || editEntry.lead_id || '',
        description: editEntry.description || '',
      });
    } else {
      form.reset({
        date: new Date().toISOString().split('T')[0],
        hours: 1,
        entity_type: 'none',
        entity_id: '',
        description: '',
      });
    }
  }, [editEntry, form]);

  const onSubmit = async (data: TimeEntryFormData) => {
    try {
      const payload = {
        date: data.date,
        hours: data.hours,
        description: data.description,
        project_id: data.entity_type === 'project' ? data.entity_id : null,
        lead_id: data.entity_type === 'lead' ? data.entity_id : null,
      };

      if (isEditing && editEntry) {
        await updateMutation.mutateAsync({ id: editEntry.id, ...payload });
        toast.success('Temps modifié');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Temps enregistré');
      }
      
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier le temps' : 'Saisir du temps'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifiez les détails de cette saisie' : 'Enregistrez le temps passé sur une mission'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heures</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.25" 
                        min="0.25" 
                        max="24" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="entity_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rattacher à</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Aucun (temps général)</SelectItem>
                      <SelectItem value="project">Un projet</SelectItem>
                      <SelectItem value="lead">Un lead</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {entityType === 'project' && (
              <FormField
                control={form.control}
                name="entity_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projet</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un projet..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {entityType === 'lead' && (
              <FormField
                control={form.control}
                name="entity_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un lead..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leads?.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {lead.company || lead.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Décrivez brièvement les tâches effectuées..."
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Modifier' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
