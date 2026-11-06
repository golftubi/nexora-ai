# Nexora AI — Neon + Better Auth setup

## Stack
- Next.js App Router on Vercel
- Neon PostgreSQL
- Better Auth (email/password)
- Vercel AI Gateway

## Required environment variables
- `DATABASE_URL`: Neon pooled PostgreSQL connection string (keep server-side).
- `BETTER_AUTH_SECRET`: random secret of at least 32 characters.
- `BETTER_AUTH_URL`: production origin, e.g. `https://nexora-ai-golf90002000-7945.vercel.app`.
- `NEXT_PUBLIC_APP_URL`: same public origin.
- `AI_GATEWAY_MODEL`: exact Vercel AI Gateway model ID.
- `NEXORA_SECURITY_ADMIN_EMAILS`: comma-separated allowlist for the restricted Security & Intelligence assistant.

Never commit real secrets or expose DATABASE_URL / BETTER_AUTH_SECRET with a NEXT_PUBLIC_ prefix.

## Database bootstrap
1. Provision a Neon PostgreSQL project and copy its pooled connection string.
2. Set the environment variables in Vercel Project Settings → Environment Variables.
3. Run `npm install`.
4. Run `npx auth@latest migrate` to create Better Auth's user/session/account/verification tables.
5. Run `psql "$DATABASE_URL" -f db/schema.sql` to create Nexora's application tables.
6. Redeploy the Vercel project.

## Local development
Copy `.env.example` to `.env.local`, fill the server-side values, then run `npm install` and `npm run dev`.

## Current implementation boundary
The first migration adds account registration/sign-in, server-side session verification, assistant access gating, and the initial relational schema. Conversation persistence, organisation administration, document storage/processing, usage billing, email verification, password reset delivery, and production rate-limit storage are follow-on implementation tasks.
