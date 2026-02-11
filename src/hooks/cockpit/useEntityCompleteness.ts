import { useMemo } from 'react';

/**
 * Critical fields per entity type — used to calculate completeness
 * and detect which fields need enrichment via Interview Mode.
 */
const LEAD_CRITICAL_FIELDS = [
  { key: 'email', label: 'Email', weight: 3 },
  { key: 'phone', label: 'Téléphone', weight: 2 },
  { key: 'company', label: 'Entreprise', weight: 2 },
  { key: 'position', label: 'Poste', weight: 1 },
  { key: 'industry', label: 'Secteur', weight: 1 },
  { key: 'company_size', label: 'Taille entreprise', weight: 1 },
  { key: 'siret', label: 'SIRET', weight: 1 },
  { key: 'website', label: 'Site web', weight: 1 },
  { key: 'city', label: 'Ville', weight: 1 },
  { key: 'qualification_status', label: 'Statut qualification', weight: 2 },
] as const;

const PROJECT_CRITICAL_FIELDS = [
  { key: 'description', label: 'Description', weight: 2 },
  { key: 'status', label: 'Statut', weight: 2 },
  { key: 'budget_amount', label: 'Budget', weight: 3 },
  { key: 'start_date', label: 'Date début', weight: 2 },
  { key: 'target_end_date', label: 'Date cible fin', weight: 2 },
  { key: 'assigned_to', label: 'Assigné à', weight: 1 },
  { key: 'lead_id', label: 'Lead lié', weight: 1 },
] as const;

const OPPORTUNITY_CRITICAL_FIELDS = [
  { key: 'value_amount', label: 'Valeur estimée', weight: 3 },
  { key: 'stage', label: 'Étape pipeline', weight: 2 },
  { key: 'expected_close_date', label: 'Date clôture prévue', weight: 2 },
  { key: 'lead_id', label: 'Lead lié', weight: 2 },
  { key: 'description', label: 'Description', weight: 1 },
] as const;

type FieldDef = { key: string; label: string; weight: number };

function getFieldsForType(entityType: 'lead' | 'opportunity' | 'project'): readonly FieldDef[] {
  switch (entityType) {
    case 'lead': return LEAD_CRITICAL_FIELDS;
    case 'project': return PROJECT_CRITICAL_FIELDS;
    case 'opportunity': return OPPORTUNITY_CRITICAL_FIELDS;
  }
}

function isFieldFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (typeof value === 'number' && value === 0) return false;
  return true;
}

export interface CompletenessResult {
  /** 0–100 percentage */
  score: number;
  /** Total weight of filled fields */
  filledWeight: number;
  /** Total possible weight */
  totalWeight: number;
  /** Fields that are missing */
  missingFields: { key: string; label: string; weight: number }[];
  /** Fields that are filled */
  filledFields: { key: string; label: string }[];
  /** Severity: 'critical' (<40%), 'warning' (<70%), 'good' (>=70%) */
  severity: 'critical' | 'warning' | 'good';
  /** Missing field keys only — for InterviewModeDialog */
  missingFieldKeys: string[];
}

/**
 * Calculate entity completeness score and missing fields.
 * Use this to show completeness indicators and trigger proactive interviews.
 */
export function useEntityCompleteness(
  entityType: 'lead' | 'opportunity' | 'project',
  entityData: Record<string, unknown> | null | undefined
): CompletenessResult {
  return useMemo(() => {
    if (!entityData) {
      return {
        score: 0,
        filledWeight: 0,
        totalWeight: 0,
        missingFields: [],
        filledFields: [],
        severity: 'critical' as const,
        missingFieldKeys: [],
      };
    }

    const fields = getFieldsForType(entityType);
    let filledWeight = 0;
    let totalWeight = 0;
    const missingFields: { key: string; label: string; weight: number }[] = [];
    const filledFields: { key: string; label: string }[] = [];

    for (const field of fields) {
      totalWeight += field.weight;
      if (isFieldFilled(entityData[field.key])) {
        filledWeight += field.weight;
        filledFields.push({ key: field.key, label: field.label });
      } else {
        missingFields.push({ key: field.key, label: field.label, weight: field.weight });
      }
    }

    const score = totalWeight > 0 ? Math.round((filledWeight / totalWeight) * 100) : 0;
    const severity = score < 40 ? 'critical' : score < 70 ? 'warning' : 'good';

    // Sort missing by weight descending (most important first)
    missingFields.sort((a, b) => b.weight - a.weight);

    return {
      score,
      filledWeight,
      totalWeight,
      missingFields,
      filledFields,
      severity,
      missingFieldKeys: missingFields.map(f => f.key),
    };
  }, [entityType, entityData]);
}
