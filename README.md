# Nexora AI

**One Platform. Multiple Intelligences.**

Nexora AI is a modular AI workspace built with Next.js, TypeScript, Vercel AI SDK, Vercel AI Gateway, Neon PostgreSQL and Better Auth.

## Specialist assistants
- General Intelligence
- Technology & Developer
- Business & Entrepreneurship
- Research & Documents
- Education & Learning
- Security & Intelligence (restricted by a server-side email allowlist)

## Web and PWA
The web app includes a web app manifest, install metadata, service-worker registration and an offline fallback page. The service worker deliberately does not cache API responses, authentication routes, conversation data or other private content.

- Android: use Chrome's **Install app** or **Add to Home screen** option.
- iPhone/iPad: use Safari's **Share → Add to Home Screen** option.
- PWA installation requires HTTPS in production.

## Android and iOS application shell
The project is configured for Capacitor. The native projects are generated locally from this repository:

1. Install Node.js 22 or later and the platform tooling.
2. Run `npm install`.
3. Set `NEXORA_MOBILE_WEB_URL` to the public, HTTPS Nexora deployment URL.
4. Run `npm run cap:add:android` and/or `npm run cap:add:ios` once.
5. Run `npm run cap:sync`.
6. Open Android Studio with `npm run cap:open:android`; open Xcode with `npm run cap:open:ios`.
7. Configure signing, app icons, privacy disclosures and store metadata before release.

Android builds require Android Studio and an Android SDK. iOS builds and App Store submission require macOS, Xcode and an Apple Developer account. Do not point the mobile apps at a Vercel deployment protected by team SSO; the app's production origin must be publicly accessible over HTTPS and use the same authentication and backend services.

The native shell uses the hosted Next.js app because Nexora relies on server-side API routes, Better Auth sessions and Neon-backed data. Do not switch to static export: that would break the server features.

## Local development
1. Install Node.js 22 or later.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Set the Neon database connection string, Better Auth secret and AI Gateway model.
5. Run `npm run db:auth:migrate`.
6. Run `npm run db:app:migrate`.
7. Run `npm run dev`.

## Environment variables
- `DATABASE_URL`: Neon pooled PostgreSQL connection string; server-only.
- `BETTER_AUTH_SECRET`: random secret, at least 32 characters.
- `BETTER_AUTH_URL`: canonical production origin; leave unset for preview deployments if relying on request-origin inference.
- `NEXT_PUBLIC_APP_URL`: public app origin.
- `NEXORA_MOBILE_WEB_URL`: publicly accessible HTTPS origin loaded by the Capacitor app.
- `AI_GATEWAY_MODEL`: exact provider/model ID supported by Vercel AI Gateway.
- `NEXORA_SECURITY_ADMIN_EMAILS`: comma-separated allowlist for the restricted Security & Intelligence assistant.

Never commit secrets or expose database/auth credentials through `NEXT_PUBLIC_*` variables.

## Database
Better Auth owns the authentication tables (`user`, `session`, `account`, and `verification`). Run the Better Auth migration first, then apply `db/schema.sql` for organisations, memberships, assistant catalogue, conversations, messages, usage records and audit logs.

See [README-NEON-MIGRATION.md](./README-NEON-MIGRATION.md) for the deployment checklist.

## Current implementation scope
The current implementation includes the specialist workspace UI, email/password registration and sign-in, Better Auth session checks on the chat API, server-side restricted-assistant access, and the initial Neon application schema.

Conversation/message persistence, organisation administration UI, document upload and processing, usage metering integration, billing, admin console, email delivery for password resets/verification, distributed rate-limit storage, and a full production security review remain follow-on work. The app must not be treated as production-ready until those controls and the database bootstrap are complete.

## Deploy
Connect this repository to the Vercel project. Configure the environment variables in Vercel Project Settings and redeploy after the Neon database is provisioned. Do not commit secrets.
