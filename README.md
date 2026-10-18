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

The database migrations create five tables:

| Table | Purpose | Main relationships and fields |
| --- | --- | --- |
| `anon_sessions` | Anonymous usage tracked by the `primer_anon_id` cookie | `cookie_id` is unique; `generations_used` tracks usage |
| `sessions` | A user's idea and its refinement history | `user_id` for signed-in ownership or `anon_cookie_id` for anonymous ownership; has title and timestamps |
| `generations` | One generated version in a session | `session_id` references `sessions`; stores input, formatted prompt, stack/tools/skills JSON, format, structured spec, change summary, and version number |
| `primer_api_keys` | Signed-in developer API credentials | Stores a one-way key hash and owner; only the service role accesses it |
| `public_prompts` | A published generation in the public library | `generation_id` references `generations`; stores slug, title, summary, stack summary, visibility, and view count |

Row-level security is enabled for application tables. Anonymous session bookkeeping is server-managed; the service-role key is only used in server code. Review each migration before applying it to a database.

## Database migrations

Apply all ten SQL files, in numerical order, to a new Supabase project:

1. [`001_auth_tables.sql`](packages/db/migrations/001_auth_tables.sql) â€” creates anonymous sessions, sessions, generations, indexes, and initial RLS policies.
2. [`002_fix_rls_anonymous.sql`](packages/db/migrations/002_fix_rls_anonymous.sql) â€” historical anonymous access policy update, tightened by migration 006.
3. [`003_claim_anon_policy.sql`](packages/db/migrations/003_claim_anon_policy.sql) â€” historical claim policy, replaced by server-side claiming in migration 006.
4. [`004_enable_rls_anon_sessions.sql`](packages/db/migrations/004_enable_rls_anon_sessions.sql) â€” enables RLS and blocks direct client access to anonymous usage rows.
5. [`005_public_prompts.sql`](packages/db/migrations/005_public_prompts.sql) â€” creates the public prompt library and adds generation format storage.
6. [`006_secure_anonymous_ownership.sql`](packages/db/migrations/006_secure_anonymous_ownership.sql) â€” limits direct access to user-owned rows and adds atomic anonymous quota functions.

7. [`007_engine_v2_spec.sql`](packages/db/migrations/007_engine_v2_spec.sql) â€” stores structured engine specifications and per-version change summaries.

8. [`008_public_library.sql`](packages/db/migrations/008_public_library.sql) adds public library tags and moderation fields.
9. [`009_api_keys.sql`](packages/db/migrations/009_api_keys.sql) creates private storage for hashed API keys.
10. [`010_hide_moderated_prompts.sql`](packages/db/migrations/010_hide_moderated_prompts.sql) ensures flagged and hidden publications are not directly selectable.

For an existing installation, apply only migrations that have not already run, in numerical order. Migrations 009 and 010 add API-key storage and tighten public visibility for moderated prompts.

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

Copy `.env.example` to `apps/web/.env.local` and set the values described below. Apply all ten migrations to Supabase, then start the app:

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
| `NEXT_PUBLIC_ADS_ENABLED` | No | Reserves ad slots when `true`; ad provider scripts load only after optional consent and when a slot nears the viewport |
| `NEXT_PUBLIC_AD_PROVIDER` | No | `adsense` (default) or `custom`; custom providers use `NEXT_PUBLIC_AD_SCRIPT_URL` |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | No | AdSense client ID, such as `ca-pub-...` |
| `NEXT_PUBLIC_ADSENSE_SLOT_*` | No | AdSense slot IDs for the generation result, public prompt sidebar, and explore sidebar |
| `ADSENSE_PUBLISHER_ID` / `ADS_TXT_CONTENT` | No | Generates a Google ads.txt line or serves custom ads.txt contents |
| `NEXT_PUBLIC_CLOUDFLARE_BEACON_TOKEN` | No | Enables Cloudflare Web Analytics after optional consent |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Enables browser error monitoring after optional consent; personal data and tracing are disabled by default |
| `UPSTASH_REDIS_REST_URL` | Production | Upstash Redis REST endpoint used by the generation rate limiter |
| `UPSTASH_REDIS_REST_TOKEN` | Production | Server-only Upstash Redis REST token |
| `ANON_GENERATION_CAP` | No | Anonymous generation quota; defaults to `3` |
| `NEXT_PUBLIC_USD_NGN_ESTIMATE_RATE` | No | Planning conversion rate for NGN cost estimates shown in USD; defaults to `1,500` |

## Privacy and optional services

A first-party consent banner keeps advertising, Cloudflare Web Analytics, and Sentry disabled until a visitor allows optional services. The choice is saved in the `primer_consent` cookie and can be changed with Privacy settings. Privacy, terms, and cookie details are available at `/privacy`, `/terms`, and `/cookies`.

## Growth tools

The intake flow scores idea clarity and offers optional prompt improvements before asking 3–6 tailored follow-up questions. Region preferences include Nigeria payment options and low-bandwidth requirements. Monthly NGN ranges are planning estimates, not provider quotes. USD equivalents use `NEXT_PUBLIC_USD_NGN_ESTIMATE_RATE` (default 1,500 NGN/USD), an editable planning assumption rather than a live exchange rate.

Signed-in users can create and revoke API keys at `/developers`. A key is shown once and only its SHA-256 hash is stored. The public endpoint is `POST /api/v1/generate` with a Bearer key and a JSON body containing `input` (up to 4,000 characters), plus optional `format`, `region` and `low_bandwidth`. Each key is independently rate limited. API generation is stateless and does not create a saved session.

The dependency-free Node.js CLI is in `packages/cli`. Set `PRIMER_API_KEY`, then use `primer generate --input "Build a clinic app" --region nigeria --low-bandwidth`; optionally set `PRIMER_API_URL` for a self-hosted Primer endpoint.

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
