

# Plan : Fix trigger `restrict_forms_counter_updates` + désactiver formulaire doublon

## Probleme

Le trigger `restrict_forms_counter_updates` bloque les updates MCP sur `forms` car `auth.uid()` est NULL avec `service_role`. Le check `has_role(auth.uid(), 'admin')` retourne false, et le trigger rejette toute modification non-compteur.

## Actions

### 1. Migration SQL — autoriser service_role dans le trigger

Modifier la fonction pour détecter le rôle JWT `service_role` (en plus de `admin`) :

```sql
CREATE OR REPLACE FUNCTION public.restrict_forms_counter_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  new_data jsonb;
  old_data jsonb;
BEGIN
  -- Admins and service_role can update any fields
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- service_role bypasses (MCP, edge functions)
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- ... rest unchanged (counter-only logic)
$$;
```

### 2. Désactiver le formulaire doublon

Via l'outil insert :
```sql
UPDATE forms SET is_active = false WHERE id = '6c2b3a02-0a77-4116-9e06-78f0b4a80c7e';
```

### 3. Vérification

Tester `update_form` MCP avec `is_active = false` sur un formulaire de test pour confirmer que le trigger ne bloque plus.

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| Migration SQL | `CREATE OR REPLACE FUNCTION restrict_forms_counter_updates` |
| Données | `UPDATE forms SET is_active = false` (doublon) |

