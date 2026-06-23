# ProctorAI

An AI-powered online proctored exam platform. Instructors create and publish exams with AI-generated questions; students take them under camera + microphone monitoring with real-time AI cheating detection and flagging.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` — auto-provisioned by Replit Clerk

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Clerk Express middleware
- DB: PostgreSQL + Drizzle ORM
- Auth: Replit-managed Clerk
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind v4 + shadcn/ui + Clerk React

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (users, exams, questions, sessions, flags)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/proctor-ai/src/` — React frontend
- `artifacts/proctor-ai/src/pages/` — All page components

## Architecture decisions

- Camera + mic video is processed client-side only; only flag metadata (type, timestamp) is persisted — no raw video stored
- Access codes are generated at exam publish time; students join using a code
- Two role flows: instructor (create/manage/review) and student (join/take/review)
- AI question generation is server-side using topic + question type + difficulty
- Flag review workflow: pending → dismissed | confirmed

## Product

- **Instructors** create proctored exams, add questions manually or via AI generation, publish to students via access codes, view session results with flagged cheating incidents and short clips
- **Students** join exams via access code, take them with mandatory camera + mic, get scored results after submission
- **AI monitoring** watches the video feed during exams and flags suspicious behavior (face not visible, multiple faces, looking away, phone detected, etc.)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `@layer theme, base, clerk, components, utilities;` must come BEFORE `@import 'tailwindcss'` in index.css (Clerk + Tailwind v4 ordering)
- `tailwindcss({ optimize: false })` in vite.config.ts required for Clerk themes in prod builds
- Clerk proxy path is `/api/__clerk` — hardcoded in clerkProxyMiddleware
- Clerk dev keys warning in console is expected and harmless

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `.local/skills/clerk-auth/references/setup-and-customization.md` for auth troubleshooting
