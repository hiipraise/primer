# Primer

Primer prepares you to build. Describe an app idea and Primer returns a recommended stack, tools, skills, and an execution ready prompt. Refine the result over multiple versions, save it in a session, or publish it to the public prompt library.

## How it works

1. The Next.js app collects an idea and sends it to the server API.
2. The engine applies rate limits and asks Groq to generate a recommendation.
3. The database package stores sessions and generations in Supabase Postgres.
4. The UI displays the result and lets users refine it, sign in, or publish it.

## Architecture

The deployable app runs on Vercel and uses Supabase for Auth and Postgres. Production generation limiting also requires Upstash Redis so limits are shared across serverless instances. Groq is the model API provider used by the server-side engine.

```text
apps/web        Next.js App Router UI, API routes, OAuth callback
packages/engine Groq orchestration, output parsing, formatting, rate limiting
packages/db     Supabase clients and session/generation/library queries
packages/ads    Environment-gated ad slot component
packages/config Shared TypeScript and ESLint configuration
```

The browser uses Supabase Auth through server-managed cookies. Application session and generation data is stored in Postgres; the app does not use `localStorage` or `sessionStorage` for auth or sessions. `packages/engine` contains the model integration, while `apps/web` is the only deployable application. Zod validates API inputs. Production rate limiting uses `@upstash/ratelimit` with Upstash Redis so limits are shared across serverless instances; local development uses the in-memory implementation.

## Data model

The database migrations create four tables:

| Table | Purpose | Main relationships and fields |
| --- | --- | --- |
| `anon_sessions` | Anonymous usage tracked by the `primer_anon_id` cookie | `cookie_id` is unique; `generations_used` tracks usage |
| `sessions` | A user's idea and its refinement history | `user_id` for signed-in ownership or `anon_cookie_id` for anonymous ownership; has title and timestamps |
| `generations` | One generated version in a session | `session_id` references `sessions`; stores input, formatted prompt, stack/tools/skills JSON, format, structured spec, change summary, and version number |
| `public_prompts` | A published generation in the public library | `generation_id` references `generations`; stores slug, title, summary, stack summary, visibility, and view count |

Row-level security is enabled for application tables. Anonymous session bookkeeping is server-managed; the service-role key is only used in server code. Review each migration before applying it to a database.

## Database migrations

Apply all seven SQL files, in numerical order, to a new Supabase project:

1. [`001_auth_tables.sql`](packages/db/migrations/001_auth_tables.sql) — creates anonymous sessions, sessions, generations, indexes, and initial RLS policies.
2. [`002_fix_rls_anonymous.sql`](packages/db/migrations/002_fix_rls_anonymous.sql) — historical anonymous access policy update, tightened by migration 006.
3. [`003_claim_anon_policy.sql`](packages/db/migrations/003_claim_anon_policy.sql) — historical claim policy, replaced by server-side claiming in migration 006.
4. [`004_enable_rls_anon_sessions.sql`](packages/db/migrations/004_enable_rls_anon_sessions.sql) — enables RLS and blocks direct client access to anonymous usage rows.
5. [`005_public_prompts.sql`](packages/db/migrations/005_public_prompts.sql) — creates the public prompt library and adds generation format storage.
6. [`006_secure_anonymous_ownership.sql`](packages/db/migrations/006_secure_anonymous_ownership.sql) — limits direct access to user-owned rows and adds atomic anonymous quota functions.

7. [`007_engine_v2_spec.sql`](packages/db/migrations/007_engine_v2_spec.sql) — stores structured engine specifications and per-version change summaries.

For an existing installation that has already applied migrations 001–005, review and apply only migration 006. It changes RLS policies and installs the quota functions; it does not delete application data.

Run each file in order with the Supabase SQL Editor, or link the project and use the Supabase CLI migration workflow. Do not re-run these files on a database that already has them applied.

## Requirements

- Node.js 20 or newer
- pnpm 9.15.9 (managed with Corepack or installed separately)
- A Supabase project with Google OAuth configured
- A Groq API key

## Setup

```sh
git clone <repo-url>
cd primer
pnpm install
```

Copy `.env.example` to `apps/web/.env.local` and set the values described below. Apply all seven migrations to Supabase, then start the app:

```sh
pnpm dev
```

Open <http://localhost:3000>. To enable Google sign-in, enable Google under Supabase Authentication providers and add the local and deployed `/auth/callback` URLs to Supabase's redirect URL allowlist.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public anon key used by the app |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only service-role key for privileged database operations; never expose it to the browser |
| `GROQ_API_KEY` | Yes | Server-side Groq API key |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical app URL used for OAuth redirects; defaults to `http://localhost:3000` |
| `ADS_ENABLED` | No | Enables ad slots when set to `true`; defaults to disabled |
| `NEXT_PUBLIC_CLOUDFLARE_BEACON_TOKEN` | No | Enables Cloudflare Web Analytics when set; analytics is omitted when unset |
| `UPSTASH_REDIS_REST_URL` | Production | Upstash Redis REST endpoint used by the generation rate limiter |
| `UPSTASH_REDIS_REST_TOKEN` | Production | Server-only Upstash Redis REST token |
| `ANON_GENERATION_CAP` | No | Anonymous generation quota; defaults to `3` |

## API reference

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/generate` | POST | Generate or refine a recommendation |
| `/api/generations` | GET | Fetch a session's generations or a selected version; uses `session_id` and optional `version` query parameters |
| `/api/generations/[id]/publish` | POST | Publish or unpublish a generation |
| `/api/sessions` | GET | List the signed-in user's sessions with pagination |
| `/api/sessions/claim` | POST | Claim anonymous sessions after sign-in |
| `/api/sessions/pending-claim` | GET | Count anonymous sessions available to claim |
| `/api/explore` | GET | List public prompts with pagination and optional tag filter |
| `/api/auth/user` | GET | Return the current signed-in user, if any |
| `/api/auth/signin` | GET | Start the Google OAuth flow and return its URL |
| `/api/auth/signout` | POST | Sign out the current user |
| `/auth/callback` | GET | Complete the Supabase OAuth callback |

## Development commands

```sh
pnpm dev        # Run the web app in development
pnpm typecheck  # Type-check workspace packages
pnpm lint       # Lint workspace packages
pnpm test       # Run package tests
pnpm build      # Build the workspace
```

GitHub Actions runs install, typecheck, lint, test, and build on pushes and pull requests. Local development uses the in-memory rate limiter; production requires the Upstash variables above.

## License

Primer is released under the MIT License. See [LICENSE](LICENSE).
