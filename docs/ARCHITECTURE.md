# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     React SPA (Vite)                     │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐ │
│  │  Pages   │→ │Components│→ │  Hooks    │→ │Supabase│ │
│  │ (Routes) │  │  (UI)    │  │ (Queries) │  │ Client │ │
│  └──────────┘  └──────────┘  └───────────┘  └───┬────┘ │
│                                                   │      │
└───────────────────────────────────────────────────┼──────┘
                                                    │
                    ┌───────────────────────────────┼──────┐
                    │           Supabase             │      │
                    │  ┌────────┐  ┌──────┐  ┌─────┴────┐ │
                    │  │  Auth  │  │  DB  │  │ Storage  │ │
                    │  │(email, │  │(257  │  │ (images, │ │
                    │  │ OAuth) │  │tables)│  │  files)  │ │
                    │  └────────┘  └──────┘  └──────────┘ │
                    │  ┌─────────────────┐                 │
                    │  │  Edge Functions  │                 │
                    │  │  (webhooks, AI)  │                 │
                    │  └─────────────────┘                 │
                    │  ┌─────────────────┐                 │
                    │  │  RLS Policies   │                 │
                    │  │ (row security)  │                 │
                    │  └─────────────────┘                 │
                    └──────────────────────────────────────┘
```

## Data Flow

1. **User action** → Page component handles event
2. **Page** delegates to a custom hook (`useXxxQuery`, `useXxxMutation`)
3. **Hook** calls Supabase client with typed query
4. **TanStack Query** caches response, manages loading/error states
5. **Component** renders data from hook, uses `cn()` for styling

## Key Domains

| Domain | Tables | Pages | Hooks |
|--------|--------|-------|-------|
| Quests | quests, quest_applications, quest_updates | QuestDetail, QuestSettings | useQuestQueries |
| Guilds | guilds, guild_members, guild_roles | GuildDetail, GuildEdit | useEntityQueries |
| Services & Bookings | services, bookings, availability_rules | ServiceDetail, BookingDetail | useBookings, useAvailability |
| Feed & Social | posts, post_attachments, comments | FeedHub, PostCard | useFeedQueries |
| Courses | courses, lessons, enrollments | CourseDetail, LessonView | useCourseQueries |
| Territories | territories, territory_members | TerritoryPortal, TerritoriesHome | useTerritoryQueries |
| Economy | ctg_wallets, xp_transactions, plans | BuyXpPage, CreditShopPage | useWallet, useXp |
| Admin | (reads all tables) | admin/* (30 pages) | useAdminStats |

## Auth & Permissions

Authentication is handled by Supabase Auth (email/password + social OAuth). The `useAuth` hook provides session state; `<RequireAuth>` guards protected routes.

Authorization uses a **gradient access model** defined in `src/lib/permissions.ts`. Each feature can set an audience level (PUBLIC → FOLLOWERS → MEMBERS → ACTIVE_ROLES → SELECTED_ROLES → OPERATIONS_TEAM → ADMINS_ONLY). The `evaluateAudience()` function checks the user's relationship to the entity.

Database-level security is enforced via PostgreSQL RLS policies on all 257 tables.

## Internationalization

The app supports English and French via i18next. Translation files are in `src/i18n/`. Use `const { t } = useTranslation()` and wrap user-facing strings with `t("key")`.

## Error Handling

Three layers of error handling:

1. **ErrorBoundary** (`src/components/ErrorBoundary.tsx`) — catches React render crashes, shows recovery UI
2. **useSupabaseError** (`src/hooks/useSupabaseError.ts`) — parses Supabase errors into user-friendly toasts
3. **Monitoring** (`src/lib/monitoring.ts`) — optional Sentry integration for production error tracking

## Styling Conventions

- Use Tailwind utility classes exclusively (no CSS modules)
- Combine classes with `cn()` from `src/lib/utils`
- Follow shadcn/ui component patterns for new UI primitives
- Dark mode via `next-themes` with `class` strategy
