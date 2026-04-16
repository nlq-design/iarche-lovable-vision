

# Migration partner_type + partner_subtype — Exécution finale

Plan validé. Exécution en 3 étapes séquentielles.

## Étape 1 — Migration SQL (transaction atomique)

```sql
BEGIN;

ALTER TABLE partners DROP CONSTRAINT IF EXISTS partners_partner_type_check;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS partner_subtype TEXT;

UPDATE partners SET partner_subtype = 'expert_ia' WHERE partner_type = 'expert_ia';
UPDATE partners SET partner_subtype = 'independant' WHERE partner_type = 'independant';
UPDATE partners SET partner_type = 'apporteur_affaires' WHERE partner_type = 'apport_affaires';
UPDATE partners SET partner_type = 'partenaire' WHERE partner_type IN ('expert_ia', 'independant');

ALTER TABLE partners ADD CONSTRAINT partners_partner_type_check 
  CHECK (partner_type IN ('client', 'partenaire', 'affilie', 'apporteur_affaires'));
ALTER TABLE partners ADD CONSTRAINT partners_partner_subtype_check 
  CHECK (partner_subtype IS NULL OR partner_subtype IN ('expert_ia', 'independant', 'apport_affaires'));

COMMIT;
```

Vérif post-migration :
```sql
SELECT partner_type, partner_subtype, COUNT(*) 
FROM partners GROUP BY partner_type, partner_subtype;
```
Attendu : `partenaire/expert_ia ×2`, `partenaire/independant ×8`, `apporteur_affaires/NULL ×1`.

## Étape 2 — Fix `validate_partner_invitation`

Fonction actuellement cassée (réfs `pi.partner_type` et `pi.status` inexistantes), 0 appelant. Réécriture sans `partner_type` dans le retour :

```sql
CREATE OR REPLACE FUNCTION public.validate_partner_invitation(p_token text)
RETURNS TABLE(id uuid, email text, expires_at timestamptz, is_valid boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT pi.id, pi.email, pi.expires_at,
    (pi.accepted_at IS NULL AND pi.expires_at > now()) as is_valid
  FROM partner_invitations pi
  WHERE pi.token = p_token
  LIMIT 1;
END;
$$;
```

## Étape 3 — Code TypeScript (7 fichiers, atomique)

| Fichier | Modification |
|---|---|
| `src/hooks/cockpit/useCockpitPartners.ts` | `PartnerType` (4 valeurs) + `PartnerSubtype` (3) + `partner_subtype` dans interface `Partner` + `PARTNER_TYPES` + `PARTNER_SUBTYPES` + `stats.byType` recalculé + `createPartner` inclut subtype |
| `src/pages/cockpit/CockpitPartenaires.tsx` | `PARTNER_TYPE_CONFIG` (client/UserCheck/vert, partenaire/Brain/violet, affilie/Link2/bleu, apporteur_affaires/Handshake/ambre) + sélecteur subtype dans formulaire + colonne table |
| `src/pages/cockpit/CockpitPartenaireDetail.tsx` | Même `PARTNER_TYPE_CONFIG` + édition subtype + affichage header |
| `src/components/cockpit/LinkedPartnersSection.tsx` | `PARTNER_TYPE_CONFIG` (4 types) |
| `src/pages/partner/PartnerProfile.tsx` | Affichage type + subtype labels FR |
| `src/pages/partner/PartnerDashboard.tsx` | Affichage type + subtype labels FR |
| `supabase/functions/mcp-server/index.ts` | Description filtre `partner_type` (4 valeurs) + `partner_subtype` dans select et `create_partner` |

## Smoke tests post-déploiement

1. Créer 1 partenaire de chaque type (4 types)
2. Créer 1 partenaire avec subtype renseigné
3. Tester flow `validate_partner_invitation` (token d'invitation)
4. Tester MCP `get_partners` filtré par `partner_type=apporteur_affaires`

## Plan d'exécution

Étape 1 + 2 en migration BDD (avec approbation utilisateur), puis Étape 3 atomique sur les 7 fichiers TS, puis redeploy `mcp-server` edge function.

