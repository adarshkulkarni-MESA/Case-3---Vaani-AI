# Aangan Studio — AI Operations Dashboard

AI-powered studio operations dashboard for Aangan Studio, Pune. A VaaniVoice.ai voice agent handles inbound enquiry calls 24/7, qualifies leads against Nikhil's 5-point rubric, and routes them into a designer workflow — all tracked here.

## Architecture

```
Inbound call
    ↓
VaaniVoice.ai (AI voice agent)
    ↓ webhook (HMAC-verified)
/api/webhooks/vaani
    ↓
Qualification engine (5-point rubric)
    ↓
Neon PostgreSQL (source of truth)
    ├── Qualified → Cal.com booking link + Resend handoff email to designer
    ├── Rejected  → Resend decline email for human review
    └── Pending   → Flagged for front desk
    ↓ (async, founder-only)
HubSpot CRM sync
```

## Roles

| Role     | Access |
|----------|--------|
| Designer | Dashboard, calls, transcripts, qualification, meetings |
| Founder  | All of the above + analytics, AI cost, HubSpot sync |

HubSpot data is **never** exposed to designers at any layer.

## Qualification Rubric (Nikhil's 5 Criteria)

1. **Real project** — design + execution (not advice/styling only)
2. **Service area** — Pune city or PCMC (not Nashik, Mumbai, Talegaon, Lonavala)
3. **Timeline** — site ready for execution within 8–10 weeks of consultation
4. **Budget band** — flagged only on obvious mismatch (caller volunteers low numbers)
5. **Decision-maker** — on the call or authorized representative

The AI voice agent never discloses pricing. When asked, it responds with the approved line only.

## Tech Stack

- **Framework**: Next.js 14 App Router
- **Database**: Neon PostgreSQL + Drizzle ORM
- **Auth**: NextAuth.js v5 (credentials, JWT, role-based)
- **Voice AI**: VaaniVoice.ai (webhook)
- **Scheduling**: Cal.com API v2
- **Email**: Resend
- **CRM**: HubSpot (founder-only)
- **Deployment**: Vercel

## Setup

### 1. Environment variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

Required:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `AUTH_SECRET` — at least 32 random characters
- `VAANI_API_KEY`, `VAANI_PHONE_NUMBER`, `VAANI_WEBHOOK_SECRET`
- `CALCOM_API_KEY`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `FRONT_DESK_EMAIL`
- `HUBSPOT_ACCESS_TOKEN` (founder integration only)
- `NEXT_PUBLIC_APP_URL`

### 2. Database

Run the SQL migration against your Neon database:

```bash
psql $DATABASE_URL < drizzle/0001_initial.sql
```

Or with Drizzle Kit:

```bash
npm run db:push
```

### 3. Seed demo data

Populates 16 real September 2026 call transcripts + demo users:

```bash
npm run seed
```

Demo credentials:
- `priya@aangan.studio` / `designer123` (designer role)
- `nikhil@aangan.studio` / `founder123` (founder role)

### 4. Development

```bash
npm run dev
```

### 5. Deployment (Vercel)

1. Connect the repository to Vercel
2. Add all environment variables from `.env.example`
3. Set the VaaniVoice.ai webhook URL to: `https://your-domain.vercel.app/api/webhooks/vaani`
4. Set the Cal.com webhook URL to: `https://your-domain.vercel.app/api/webhooks/calcom`

## Webhook Security

- **VaaniVoice.ai**: HMAC-SHA256 signature on `x-vaani-signature` header
- **Cal.com**: HMAC-SHA256 signature on `x-cal-signature-256` header
- Idempotency enforced via `webhookEvents` table (prevents duplicate processing)

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run db:push      # Push schema to database (dev)
npm run db:generate  # Generate migration files
npm run db:studio    # Open Drizzle Studio
npm run seed         # Seed demo data
```
