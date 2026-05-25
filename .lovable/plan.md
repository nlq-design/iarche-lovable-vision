## Plan v2 — correction `create_document` (custom_data + parsing JSON)

### 1. Injection du brief MCP — généralisée (ajustement A)
Dans `supabase/functions/generate-document/index.ts`, ajouter un bloc prompt **prioritaire** construit à partir de `inputContext` (= `custom_data` MCP), commun à tous les types :

- Table `FIELDS_TO_PRESERVE` par `document_type` (training_program, quote, spec, proposal, invitation) listant les champs verrouillés (date, lieu, stagiaires, formateur, organisme, montants, TVA, périmètre, livrables, etc.).
- Bloc injecté en tête du `userPrompt` :
  ```
  BRIEF UTILISATEUR (PRIORITAIRE — UTILISER TEL QUEL)
  ```json
  {custom_data}
  ```
  Règles :
  - Utilise EXCLUSIVEMENT ces valeurs pour : {lockedFields}
  - N'invente AUCUNE donnée présente dans le brief
  - Si une info verrouillée manque : écris littéralement [À COMPLÉTER]
  - Conserve noms propres, codes (ROME, NAF, IDCC), prix et dates EXACTS
  ```
- Remplacer la consigne actuelle "invente du réaliste" du `training_program` par "absent → [À COMPLÉTER]". Garder l’inventivité uniquement pour les sections rédactionnelles non verrouillées (objectifs pédagogiques, structure narrative).

### 2. Contrat MCP → Edge — inchangé
`mcp-server.create_document` continue d’envoyer `custom_data` dans `context`. Aucun breaking change. Ajout d’un log côté Edge : `console.log("[generate-document] custom_data keys:", Object.keys(inputContext||{}))` pour traçabilité (clés seulement, pas de valeurs).

### 3. Parsing JSON — diagnostic d’abord, refactor ensuite (ajustement B)
- **Avant** de remplacer le parser : `console.log("[generate-document] raw AI response (first 500 chars):", aiResult.content.slice(0,500))` pour comprendre pourquoi le strip actuel a échoué (fences mal positionnées, prose avant, BOM, multiples blocs).
- Remplacer le strip regex par une fonction `extractJsonObject(text)` à compteur d’accolades, qui ignore les `{` à l’intérieur de chaînes JSON, gère les échappements, et retourne l’objet racine quel que soit le bruit autour (fences, prose, BOM).
- Conserver le `sanitizeJsonString` existant comme étape 2 (réparation `\'`, newlines bruts).
- Côté prompt système : ajouter "Réponds UNIQUEMENT par un objet JSON. AUCUN bloc markdown, AUCUN backtick, AUCUN texte avant ou après."
- Si l’AI Gateway Lovable supporte `response_format: { type: "json_object" }`, l’ajouter dans `callAI("lovable", ...)` (vérification rapide avant). Sinon le nettoyage défensif suffit.

### 4. Plan de test (ajustement C + D)
| # | Test | Validation |
|---|------|------------|
| 1 | `custom_data` 8 marqueurs `XXXTEST_*` | Tous présents dans le doc |
| 2 | `custom_data` partiel (3/10 champs, marqueur `is_test:true`) | Marqueurs présents + `[À COMPLÉTER]` sur champs absents, zéro hallucination |
| 3 | 5 appels successifs payload complet | Zéro `invalid_ai_response` |
| 4 | Payload ATEKA réel | Doc 1-1 avec le brief préparé |
| 5 | `get_document_detail` sur doc final | Sections + metadata cohérentes |

Convention : tout test passe par `custom_data.is_test = true` pour nettoyage ultérieur facile (filtre SQL).

### Détails techniques
- Fichier touché : `supabase/functions/generate-document/index.ts` (prompts + parser).
- Fichier audité sans modif : `supabase/functions/mcp-server/index.ts` (contrat déjà bon).
- Pas de migration BDD.
- Déploiement auto Edge + redéploiement explicite via `deploy_edge_functions` pour forcer la prise d’effet.
- Vérification post-deploy via `curl_edge_functions` test #1 avant de rendre la main.

### Contraintes timing
Périmètre serré, livrable visé < 30 min de build pour laisser le temps des 5 tests avant 22h. Si le diagnostic du raw response (étape 3) révèle une cause inattendue, je m’arrête et redemande arbitrage avant d’étendre le scope.