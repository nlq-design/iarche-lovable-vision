#!/usr/bin/env bash
#
# isolation-lint.sh — Garde-fou DÉTERMINISTE de non-régression multi-tenant.
#
# Échoue (exit 1) si une edge function utilisant un client service_role (bypass RLS)
# lit une TABLE TENANT-SCOPED sans jamais référencer `workspace_id` dans son corps.
# C'est la classe de fuite fermée en P0 (2026-07-01/02) : un service_role qui sert
# les données d'un tenant à un autre faute de filtre `workspace_id`.
#
# Philosophie : barrière déterministe (cf. .claude/rules/autonomy.md) plutôt que revue
# LLM. Réutilise l'allowlist issue de l'audit consolidé
# (docs/audit-isolation-ia-rag-service-role-2026-07-01.md § faux positifs / résidus).
#
# Usage :  scripts/isolation-lint.sh            (depuis la racine du repo)
# CI     :  l'ajouter au workflow lint ; un FAIL bloque le merge.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUNCS_DIR="$ROOT/supabase/functions"

# Tables tenant-scoped : contiennent une colonne workspace_id et portent des données
# appartenant à un locataire. Un accès service_role à ces tables DOIT être filtré par
# workspace (soit directement, soit via resolveCallerWorkspace).
TENANT_TABLES=(
  viviers vivier_campaigns leads lead_contacts opportunities
  voice_transcriptions action_proposals resource_embeddings
  ai_semantic_cache ai_agent_memory partners projects specifications
)

# Allowlist : fonctions LÉGITIMEMENT non filtrées par workspace appelant.
# Raisons (audit 2026-07-01) : jobs cron/système (pas de JWT appelant, opèrent sur …001
# en mono-tenant), webhooks (auth par signature), flux token-authed, config globale,
# super-admin-only (assertSuperAdmin), ou fonctions déjà tenant-aware via le body.
# Retirer une entrée d'ici = exiger qu'elle porte un filtre workspace_id.
ALLOWLIST=(
  seed-intent-anchors                # config globale (intent anchors partagés)
  vivier-cleanup                     # assertSuperAdmin (super-admin only)
  accept-partner-invitation          # flux token-authed
  accept-team-invitation             # flux token-authed
  transcription-worker               # cron (poll AssemblyAI, pas de JWT appelant)
  score-viviers-batch                # scopé via resolveCallerWorkspace (déjà tenant-aware)
  stripe-webhook                     # webhook signé (pas de JWT appelant)
  instantly-webhook                  # webhook signé
  telegram-proactive-notifications   # ⚠️ DÉPRÉCIÉ, verify_jwt=false — PENDING REMOVAL (SEC-003)
)

in_allowlist() {
  local fn="$1"
  for a in "${ALLOWLIST[@]}"; do [[ "$a" == "$fn" ]] && return 0; done
  return 1
}

tables_regex="$(IFS='|'; echo "${TENANT_TABLES[*]}")"
violations=0
checked=0

while IFS= read -r idx; do
  fn="$(basename "$(dirname "$idx")")"
  grep -q "SUPABASE_SERVICE_ROLE_KEY" "$idx" || continue   # service_role uniquement
  # accède-t-elle à une table tenant-scoped ?
  grep -Eq "\.from\((['\"])(${tables_regex})\1\)" "$idx" || continue
  checked=$((checked + 1))
  in_allowlist "$fn" && continue
  # Sûre si elle filtre par workspace OU gate l'accès (HQ-admin / interne service_role) :
  # une fn tenant-scopée OU réservée au HQ/interne n'expose pas de données cross-tenant.
  if ! grep -Eq "workspace_id|resolveCallerWorkspace|IARCHE_FOUNDER_WORKSPACE|assertSuperAdmin|isInternal|user_roles" "$idx"; then
    hit="$(grep -oE "\.from\((['\"])(${tables_regex})\1\)" "$idx" | sort -u | tr '\n' ' ')"
    echo "❌ $fn : accès service_role à une table tenant SANS filtre workspace_id → $hit"
    violations=$((violations + 1))
  fi
done < <(find "$FUNCS_DIR" -name index.ts -not -path '*/_shared/*')

echo "─────────────────────────────────────────────"
echo "Isolation lint : $checked fn(s) service_role touchant des tables tenant vérifiées, $violations violation(s)."
if [[ "$violations" -gt 0 ]]; then
  echo "→ Ajouter un filtre .eq('workspace_id', …) / resolveCallerWorkspace, OU inscrire la fn"
  echo "  dans ALLOWLIST avec sa justification si l'accès global est légitime (cron/webhook/token)."
  exit 1
fi
echo "✅ Aucune fuite d'isolation service_role détectée."
