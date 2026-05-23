---
name: Persona Workspace P4
description: Colonne workspaces.ai_persona JSONB + helper persona.ts + variables {{persona_*}} pour multi-tenant IA
type: feature
---

## Phase P4 livrée (23/05/2026)

### Schema
- `workspaces.ai_persona` JSONB NOT NULL avec defaults : `{assistant_name, company, city, role, tone, language}`
- Workspace IArche Interne seedé : Nicolas / IArche / Bayonne / Expert senior / Zero Friction
- RPC `get_workspace_persona(uuid)` SECURITY DEFINER avec fallback générique

### Code helper
- `supabase/functions/_shared/persona.ts`
  - `getWorkspacePersona(supabase, workspaceId)` avec cache 5 min
  - `injectPersona(text, persona)` remplace `{{persona_assistant_name}}`, `{{persona_company}}`, `{{persona_city}}`, `{{persona_role}}`, `{{persona_tone}}`, `{{persona_language}}`

### Limitation assumée
- **56 prompts ai_prompts existants NON refactorés** — mention de "Nicolas/IArche/Bayonne" en dur subsiste
- Stratégie : refactor JUSTE-À-TEMPS lors du 1er onboarding multi-tenant réel (chantier P4-bis)
- Pour MVP solo IArche, aucun impact

### Usage attendu (futurs prompts)
```ts
const persona = await getWorkspacePersona(supabase, workspaceId);
const promptText = injectPersona(loaded.system_prompt, persona);
```
