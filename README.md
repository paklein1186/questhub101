# Change The Game — QuestHub Portal

A community-driven platform connecting creators, guilds, organizations, and territories through quests, services, courses, and collaborative governance.

## Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **State Management**: TanStack Query v5
- **UI**: shadcn/ui + Tailwind CSS + Framer Motion
- **Rich Text**: TipTap v2
- **i18n**: i18next (EN/FR)
- **Package Manager**: Bun (recommended) or npm

## Getting Started

```bash
# Clone and install
git clone https://github.com/paklein1186/questhub101.git
cd questhub101
bun install        # or: npm install --legacy-peer-deps

# Set up environment
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY

# Start dev server
bun run dev        # → http://localhost:8080
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/public key |
| `VITE_SENTRY_DSN` | No | Sentry error tracking DSN |

## Project Structure

```
src/
├── components/         # Reusable UI components (~200+ files)
│   ├── ui/             # shadcn/ui primitives (Button, Dialog, etc.)
│   ├── admin/          # Admin panel components
│   ├── chat/           # Chat bubble & messaging
│   ├── feed/           # Social feed (PostCard, PostComposer)
│   ├── home/           # Dashboard widgets (MyTaskBoard, YourUniverse)
│   ├── pi/             # Pi AI assistant panel
│   └── topic/          # Topic/house ecosystem views
├── hooks/              # Custom React hooks (~67 hooks)
│   ├── useAuth.tsx     # Auth context & session management
│   ├── useCurrentUser.tsx  # Current user context with role/xp
│   └── ...
├── lib/                # Utility modules
│   ├── utils.ts        # cn() helper, formatting
│   ├── slots.ts        # Booking slot generation
│   ├── permissions.ts  # Role-based access control
│   ├── logger.ts       # Centralized logging (dev/prod aware)
│   └── monitoring.ts   # Optional Sentry + Web Vitals
├── pages/              # Route-level page components (~130 pages)
│   ├── admin/          # Admin sub-pages (lazy-loaded)
│   └── ...
├── integrations/       # Supabase client & generated types
├── services/           # API service layer
├── types/              # Shared TypeScript interfaces
├── i18n/               # Translation files (en.json, fr.json)
└── test/               # Test setup & mocks
```

## Key Architectural Patterns

**Routing**: All routes defined in `src/App.tsx`. Public pages render directly; protected pages wrap with `<RequireAuth>`. Admin pages are lazy-loaded under `/admin/*` with `<AdminLayout>`.

**Data Fetching**: All server state managed via TanStack Query. Hooks in `src/hooks/` encapsulate queries (`useQuery`) and mutations (`useMutation`) for each domain. The Supabase client lives in `src/integrations/supabase/client.ts`.

**Hub Pages**: Major sections (Explore, Vision, Ecosystem, Legal) use a Hub pattern — a parent page with tab navigation that renders sub-pages as embedded components.

**Error Handling**: `<ErrorBoundary>` wraps the app and admin sections. `useSupabaseError` hook provides centralized Supabase error parsing with user-friendly toasts.

**Logging**: Use `import { logger } from "@/lib/logger"` instead of `console.*`. Debug/info logs are silenced in production.

## Scripts

```bash
bun run dev          # Start dev server (port 8080)
bun run build        # Production build
bun run preview      # Preview production build
bun run lint         # ESLint check
bun run test         # Run Vitest test suite
ANALYZE=true bun run build  # Build with bundle analysis
```

## CI/CD

GitHub Actions CI runs on every push/PR to `main`:
- Lint + type-check + build (one job)
- Tests (parallel job)

Config: `.github/workflows/ci.yml`

## Database

257 Supabase tables with Row-Level Security (RLS). Migrations live in `supabase/migrations/`. Key security policies enforce that users can only read/write their own data, with admin overrides where needed.

## Contributing

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make changes following existing patterns
3. Ensure `bun run lint` and `bun run build` pass
4. Open a PR against `main`

### Code Conventions

- Use `logger.*` instead of `console.*`
- Prefer named exports for components
- Use `cn()` from `@/lib/utils` for conditional classes
- All Supabase queries go through custom hooks in `src/hooks/`
- i18n: wrap user-facing strings with `t()` from `useTranslation()`
