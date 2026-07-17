# Primer

**Preps you before you build.**

Tell Primer what you want to build. It hands you back the stack, the tools, and a senior-level execution-ready prompt — refined through conversation, saved forever, ready to paste into any AI platform.

## How it works

```
You describe your idea → Primer analyzes it → Returns: stack + tools + skills + prompt
You refine ("make it mobile-first") → New version in the same session → Copy the final prompt
```

Primer is model-agnostic — it never recommends a specific AI model. What you paste the prompt into is your choice.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS v4 |
| Backend | Next.js Route Handlers (`/app/api/*`) |
| Auth | Supabase Auth (Google OAuth) — httpOnly cookies, no localStorage |
| Database | Supabase Postgres — RLS, sessions, generations |
| LLM (internal) | Groq API (Llama 3.3 70B) — free tier, 30 req/min |
| Hosting | Vercel + Supabase (both free-tier) |
| Rate limiting | In-memory sliding window (10 req / 15 min per IP) |

## Project structure

```
primer/
├── apps/web/                    # Next.js 15 — UI + API routes
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/            # Sign-in, sign-out, user info
│   │   │   ├── generate/        # LLM-powered generation
│   │   │   ├── generations/     # Version browsing
│   │   │   └── sessions/        # History listing + claim flow
│   │   ├── auth/callback/       # OAuth redirect handler
│   │   ├── layout.tsx           # Root layout + auth provider
│   │   └── page.tsx             # Single-page app
│   ├── components/
│   │   ├── auth-provider.tsx    # Auth context
│   │   └── auth-modal.tsx       # Profile + history + claim
│   └── middleware.ts            # Session refresh + anonymous cookie
│
├── packages/
│   ├── ui/                      # Shared React components
│   ├── db/                      # Supabase client + CRUD
│   ├── engine/                  # LLM orchestrator + rate limiter
│   └── config/                  # Shared eslint/tsconfig
│
├── .env.example                 # Required environment variables
└── package.json                 # Turborepo root
```

---

## Step-by-step setup

### Prerequisites

- **Node.js 20+** — [Download](https://nodejs.org/)
- **pnpm 9+** — Install via `npm install -g pnpm` or [corepack](https://nodejs.org/api/corepack.html): `corepack enable && corepack prepare pnpm@latest --activate`
- **A Supabase account** — Free tier at [supabase.com](https://supabase.com)
- **A Groq API key** — Free tier at [console.groq.com](https://console.groq.com)

---

### Step 1: Clone and install dependencies

```bash
git clone <repo-url>
cd primer
pnpm install
```

This installs all dependencies for the monorepo (apps/web, packages/db, packages/engine, packages/ui, packages/config).

---

### Step 2: Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and click **New project**.
2. Choose a name (e.g., "primer"), set a secure database password, and pick a region close to you.
3. Wait ~2 minutes for the project to provision.
4. Once ready, go to **Project Settings → API** and note down the following:

   | Variable | Where to find it |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | **Project URL** — looks like `https://xxxxx.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **anon public** key |
   | `SUPABASE_SERVICE_ROLE_KEY` | **service_role** key (⚠️ keep this secret — never expose it client-side) |

---

### Step 3: Set up environment variables

```bash
cp .env.example apps/web/.env.local
```

Open `apps/web/.env.local` and fill in your values:

```env
# Your Supabase project URL (from Step 2)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Your Supabase anon/public key (from Step 2)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Server-side only — used by createServiceRoleClient() to bypass RLS
# for internal tables (anon_sessions). Get it from Supabase dashboard
# → Project Settings → API → service_role key. NOT exposed to the client.
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Your Groq API key (get one at https://console.groq.com/keys)
GROQ_API_KEY=gsk_your_groq_api_key_here

# Optional — your app's public URL (defaults to http://localhost:3000)
# NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

---

### Step 4: Enable Google OAuth in Supabase

1. In your Supabase dashboard, go to **Authentication → Providers**.
2. Click **Google** and toggle it **Enabled**.
3. You'll need a Google OAuth client ID and secret:
   - Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
   - Create a new OAuth 2.0 Client ID (Web application type)
   - Add `https://xxxxx.supabase.co/auth/v1/callback` as an authorized redirect URI
   - Copy the Client ID and Client Secret into Supabase
4. Under **Authentication → URL Configuration**, set **Site URL** to `http://localhost:3000`.
5. In the same section, add `http://localhost:3000/auth/callback` to **Redirect URLs**.

---

### Step 5: Run the database migration

Your Supabase project needs three tables: `anon_sessions`, `sessions`, and `generations`.

**Option A: Run via Supabase SQL Editor (easiest)**

1. In your Supabase dashboard, go to **SQL Editor**.
2. Click **New query**.
3. Open `packages/db/migrations/001_auth_tables.sql` and copy the entire contents.
4. Paste into the SQL Editor and click **Run**.
5. Verify all three tables appear under **Table Editor**.

**Option B: Run via Supabase CLI**

```bash
# Install Supabase CLI: https://supabase.com/docs/guides/cli
supabase link --project-ref <your-project-ref>
supabase db push
```

---

### Step 6: Start the development server

```bash
pnpm dev
```

This starts the Next.js dev server on [http://localhost:3000](http://localhost:3000) with Turborepo watch mode — changes to any `packages/` directory are hot-reloaded automatically.

---

### Step 7: Verify everything works

1. **Open** [http://localhost:3000](http://localhost:3000) — you should see the onboarding wizard.
2. **Complete the onboarding** (3 questions about your project).
3. **Submit a prompt** — this calls `POST /api/generate`, which uses Groq API to analyze your idea and generates a structured recommendation.
4. **Check the response** — you should see a recommendation panel with stack, tools, and skills.
5. **Sign in with Google** — click the profile icon (top-right), then "Continue with Google".
6. **Verify session persistence** — your anonymous generations should be claimed and visible in the profile modal.

If you get stuck, check:

| Symptom | Likely cause |
|---|---|
| `POST /api/generate` returns 500 with `"Could not find the table 'public.sessions'"` | Database tables not created — run the migration (see Step 5) |
| `GROQ_API_KEY is not configured` | Missing or incorrect `GROQ_API_KEY` in `apps/web/.env.local` |
| Google sign-in redirects to an error page | OAuth redirect URL not configured correctly (see Step 4) |
| Anonymous sessions not persisting after sign-in | Google email may differ; check Supabase Auth users |
| Onboarding doesn't appear | Clear cookies/local data or check `middleware.ts` |

---

## Features

- **Anonymous browsing** — No sign-up required for the first 3 generations
- **Google OAuth** — Persistent login via httpOnly cookies (no localStorage)
- **Onboarding wizard** — 3 questions seed your first prompt
- **Real LLM generation** — Groq-powered stack/tools/skills recommendations
- **Refinement** — Iterate on your prompt, each version saved
- **Version history** — Browse previous versions with prev/next navigation
- **Session history** — Paginated, lazy-loaded, accessible from the profile modal
- **Anonymous session claim** — Sign in later to claim your pre-signup sessions
- **Rate limiting** — In-memory per-IP sliding window (configurable)
- **Anonymous usage cap** — 3 free generations before requiring sign-in

## Architecture decisions

- **No localStorage/sessionStorage** — All session state lives in httpOnly cookies (auth) or server-side Postgres (data). The browser never reads or writes auth tokens.
- **Single-page app** — The entire product is `/`. No sidebar. History, profile, and settings live in a top-right modal.
- **Single deployable** — `apps/web` is the only deployable, keeping it at two managed services (Vercel + Supabase).
- **Swappable engine** — `packages/engine` is pure TypeScript with no framework dependency. It can be lifted into a standalone service later.

## API reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/generate` | POST | Generate a recommendation from an idea |
| `/api/generations` | GET | Browse session generations (by `session_id`) |
| `/api/sessions` | GET | List user sessions (paginated) |
| `/api/sessions/claim` | POST | Claim anonymous sessions after sign-in |
| `/api/sessions/pending-claim` | GET | Check how many anonymous sessions can be claimed |
| `/api/auth/user` | GET | Get current user info |
| `/api/auth/signin` | GET | Start Google OAuth flow |
| `/api/auth/signout` | GET | Sign out and redirect home |
| `/auth/callback` | GET | OAuth callback handler |

## License

MIT
