
# Agent Builder pour Guildes & Entités

## Vision

Permettre à chaque guilde/entité de créer son **propre agent IA** (style "Pi local de guilde") avec :
- **RAG** (base de connaissances vectorisée) nourrie en continu
- **Connecteurs entrants** : Google Drive, Nextcloud, upload manuel, URLs
- **Canaux conversationnels** : Telegram, WhatsApp, Signal, widget web embarqué
- **Bouclage MCP** : tout ce que l'agent ingère devient queryable par le MCP de la guilde, et tout ce qu'il produit (résumés, posts, contributions) peut être poussé via les outils MCP existants

L'agent agit donc comme un **opérateur local** qui parle aux membres sur leurs canaux, comprend leur contexte interne (drive, docs), et écrit dans la guilde via le MCP.

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  Sources (ingestion)        Canaux (conversation)            │
│  ─────────────────          ──────────────────────           │
│  • Google Drive (poll)      • Telegram bot                   │
│  • Nextcloud (WebDAV)       • WhatsApp (Twilio/Meta)         │
│  • Upload manuel            • Signal (signal-cli bridge)     │
│  • URLs / sitemaps          • Widget web (iframe)            │
│         │                            │                       │
│         ▼                            ▼                       │
│  ┌──────────────┐            ┌──────────────┐                │
│  │  Ingestion   │            │   Inbox      │                │
│  │  edge fn     │            │   edge fn    │                │
│  └──────┬───────┘            └──────┬───────┘                │
│         │ chunk + embed             │                        │
│         ▼                           ▼                        │
│  ┌──────────────────────────────────────────┐                │
│  │  guild_agent_documents (pgvector)        │                │
│  │  guild_agent_messages                    │                │
│  └──────────────┬───────────────────────────┘                │
│                 │                                            │
│                 ▼                                            │
│  ┌──────────────────────────────────────────┐                │
│  │  guild-agent-respond (edge fn)           │                │
│  │  - retrieval (top-K vector search)       │                │
│  │  - Lovable AI Gateway (Gemini)           │                │
│  │  - peut appeler le MCP de la guilde      │                │
│  │    avec un token système (write scope)   │                │
│  └──────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

## Données (nouvelles tables)

- `guild_agents` — 1 agent par guilde/entité : `id, guild_id, name, persona_prompt, model, status, created_by`
- `guild_agent_sources` — `id, agent_id, type ('gdrive'|'nextcloud'|'upload'|'url'), config jsonb (credentials chiffrés, folder_id, webdav_url…), last_sync_at, status`
- `guild_agent_documents` — `id, agent_id, source_id, external_id, title, chunk_index, content text, embedding vector(1536), metadata jsonb`
- `guild_agent_channels` — `id, agent_id, type ('telegram'|'whatsapp'|'signal'|'web'), config jsonb (webhook secret, phone, channel_id), status`
- `guild_agent_conversations` — `id, agent_id, channel_id, external_chat_id, member_user_id (nullable)`
- `guild_agent_messages` — `id, conversation_id, role, content, tool_calls jsonb, created_at`

RLS : seuls les admins/source de la guilde lisent/écrivent. `service_role` pour les edge functions.

## Edge functions

1. **`guild-agent-ingest`** — webhook + cron qui pull les sources, chunk (≈ 1000 chars), embed via Lovable AI Gateway (`google/gemini-embedding-001`), upsert dans `guild_agent_documents`.
2. **`guild-agent-respond`** — reçoit un message utilisateur, fait retrieval pgvector top-5, appelle Gemini avec persona + contexte + définitions des outils MCP de la guilde, stream la réponse.
3. **`channel-telegram`** — webhook `/telegram/:agent_id`, vérifie `secret_token`, route vers `guild-agent-respond`, renvoie la réponse via `sendMessage`.
4. **`channel-whatsapp`** — webhook Twilio/Meta, idem.
5. **`channel-signal`** — endpoint pour signal-cli REST API (self-hosted), documenté mais optionnel.

Les tokens des canaux et OAuth Drive sont stockés chiffrés dans `config jsonb` (pgsodium si dispo, sinon noté comme limitation).

## UI

### `src/pages/guild/GuildAgentSettings.tsx` (nouvelle page, onglet "Agent")

Sections :
1. **Identité de l'agent** — nom, avatar, persona (textarea), modèle (Gemini Flash par défaut).
2. **Sources de connaissances** — liste + bouton "Ajouter une source" → modale avec onglets :
   - Google Drive (OAuth via connecteur)
   - Nextcloud (URL WebDAV + login/app password)
   - Upload de fichiers (PDF/MD/DOCX → `document--parse_document` côté edge)
   - URL/sitemap
   - Affiche `last_sync_at`, nb de documents, bouton "Re-sync".
3. **Canaux conversationnels** — liste + bouton "Connecter un canal" :
   - Telegram → demande le bot token (créé via @BotFather), affiche l'URL du webhook à coller, ou utilise le connecteur Telegram si configuré.
   - WhatsApp → choix Twilio / Meta Business, demande les secrets.
   - Signal → instructions self-host signal-cli + URL.
   - Web widget → snippet `<iframe>` à embarquer.
4. **Outils MCP** — toggle "Permettre à l'agent d'écrire dans la guilde via MCP" (génère automatiquement un token interne `system` avec scope `write`, jamais exposé).
5. **Historique & journal** — derniers messages, dernières ingestions, erreurs.

### Composants
- `src/components/guild/agent/AgentIdentityForm.tsx`
- `src/components/guild/agent/AgentSourcesPanel.tsx`
- `src/components/guild/agent/AgentChannelsPanel.tsx`
- `src/components/guild/agent/AgentConversationsLog.tsx`

Intégration dans `GuildSettings.tsx` : nouvel onglet **"Agent IA"** à côté de **"MCP Tokens"**.

Le même pattern est réutilisable pour `CompanySettings`, `PodSettings` (entités) en factorisant un hook `useEntityAgent({ entityType, entityId })`.

## Sécurité & coûts

- Quota par guilde (messages/jour, documents/Mo) — réutiliser `usePlanLimits`.
- Credits 🔷 : chaque message agent et chaque ingestion consomme des credits (rate aligné avec `agent_billing_profiles`).
- Tous les secrets canaux/OAuth chiffrés côté DB ; aucune fuite dans les logs.
- Admins-only sur les settings, end-users uniquement comme interlocuteurs sur les canaux.

## Étapes d'implémentation (proposées dans cet ordre)

1. **DB + RLS** : tables ci-dessus, extension `vector`, index HNSW, fonction `match_guild_agent_documents`.
2. **Edge fn `guild-agent-ingest`** + ingestion "Upload manuel" (le plus simple, valide la chaîne complète).
3. **Edge fn `guild-agent-respond`** avec retrieval + Gemini, sans MCP outils.
4. **UI Settings** : onglet Agent IA, formulaire identité + panneau Sources (upload only).
5. **Canal Telegram** (le plus simple à câbler) + widget web embed.
6. **Connecteur Google Drive** (OAuth via connecteur Lovable, sync incrémentale).
7. **Tools MCP** : l'agent peut appeler `create_post`, `log_contribution`, etc. via le token système.
8. **Nextcloud WebDAV**, puis **WhatsApp**, puis **Signal**.

Je propose de démarrer par les **étapes 1 → 4** (fondations : DB, ingestion upload, génération de réponse, UI) dans le premier lot. Les canaux et connecteurs externes suivent dans des lots dédiés pour ne pas tout casser d'un coup.

Tu valides ce plan, ou tu veux que j'ajuste la portée (par ex. commencer directement par Telegram + Drive en sautant l'upload manuel) ?
