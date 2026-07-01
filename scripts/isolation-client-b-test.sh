#!/usr/bin/env bash
# =============================================================================
# Test d'isolation multi-tenant adverse — « Client B »
# =============================================================================
# À lancer À L'ONBOARDING du 1er design partner (tenant B), quand un vrai
# 2e workspace + un user tenant B existent. Vérifie qu'un locataire NE PEUT PAS
# lire/écrire les données d'IArche (workspace fondateur …001) via les edge fns.
#
# Prérequis (variables d'env) :
#   SUPA_URL          = https://xzlnurunjuinmmlctdid.supabase.co
#   USER_B_JWT        = JWT d'un user membre du workspace B (login tenant B)
#   IARCHE_TASK_ID    = un id de tâche d'IArche (workspace …001) pour le test négatif
#   IARCHE_TRANSCR_ID = un id de voice_transcription d'IArche
#   IARCHE_PROPOSAL_ID= un id d'action_proposal d'IArche
#
# PASS attendu : le tenant B ne voit QUE ses données (0 vivier/lead/RAG IArche)
# et se fait refuser (403) l'accès aux ressources IArche par id.
# =============================================================================
set -uo pipefail

SUPA_URL="${SUPA_URL:-https://xzlnurunjuinmmlctdid.supabase.co}"
: "${USER_B_JWT:?USER_B_JWT requis (JWT d'un user tenant B)}"
FN="$SUPA_URL/functions/v1"
AUTH=(-H "Authorization: Bearer $USER_B_JWT" -H "apikey: $USER_B_JWT" -H "Content-Type: application/json")
fail=0

check_empty () { # $1=label $2=json $3=jq-count-path
  local n; n=$(echo "$2" | python3 -c "import sys,json;d=json.load(sys.stdin);print($3)" 2>/dev/null || echo "ERR")
  if [ "$n" = "0" ]; then echo "  ✅ $1 : 0 donnée IArche visible"; else echo "  ❌ $1 : $n (FUITE — tenant B voit des données IArche)"; fail=1; fi
}
check_forbidden () { # $1=label $2=http_code
  if [ "$2" = "403" ] || [ "$2" = "404" ]; then echo "  ✅ $1 : refusé ($2)"; else echo "  ❌ $1 : $2 (FUITE — accès autorisé à une ressource IArche)"; fail=1; fi
}

echo "═══ Test isolation Client B (tenant B → données IArche) ═══"

echo "[1] vivier-insights : le tenant B ne doit voir AUCUN des 166k viviers IArche"
R=$(curl -s -X POST "$FN/vivier-insights" "${AUTH[@]}" -d '{}')
check_empty "vivier-insights total_leads" "$R" "d.get('total_leads', d.get('total', 0))"

echo "[2] vivier-ai-search : recherche → 0 vivier IArche"
R=$(curl -s -X POST "$FN/vivier-ai-search" "${AUTH[@]}" -d '{"query":"entreprises"}')
check_empty "vivier-ai-search results" "$R" "len(d.get('results', d.get('viviers', [])))"

echo "[3] search-embeddings : RAG → 0 embedding CRM d'IArche"
R=$(curl -s -X POST "$FN/search-embeddings" "${AUTH[@]}" -d '{"query":"projet client"}')
check_empty "search-embeddings" "$R" "len(d.get('results', []))"

if [ -n "${IARCHE_TRANSCR_ID:-}" ]; then
  echo "[4] serve-transcription-audio sur une transcription IArche → 403"
  C=$(curl -s -o /dev/null -w '%{http_code}' "$FN/serve-transcription-audio?id=$IARCHE_TRANSCR_ID" "${AUTH[@]}")
  check_forbidden "serve-transcription-audio (audio IArche)" "$C"
fi

if [ -n "${IARCHE_PROPOSAL_ID:-}" ]; then
  echo "[5] execute-action-proposal sur une proposal IArche → 403"
  C=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$FN/execute-action-proposal" "${AUTH[@]}" -d "{\"proposal_id\":\"$IARCHE_PROPOSAL_ID\"}")
  check_forbidden "execute-action-proposal (proposal IArche)" "$C"
fi

echo "═══════════════════════════════════════════════"
if [ "$fail" = "0" ]; then echo "✅ ISOLATION OK — tenant B étanche vis-à-vis d'IArche."; else echo "❌ FUITE(S) DÉTECTÉE(S) — NE PAS revendre en l'état."; exit 1; fi
