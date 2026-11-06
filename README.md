# Nexora AI

**One Platform. Multiple Intelligences.**

Nexora AI is a modular AI workspace built with Next.js, TypeScript, Vercel AI SDK, Vercel AI Gateway and Supabase foundations.

## Assistants
- General Intelligence
- Technology & Developer
- Business & Entrepreneurship
- Research & Documents
- Education & Learning
- Security & Intelligence (authentication gate; add a dedicated permission claim before production use)

## Local development
1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and configure the AI Gateway model and credentials.
4. Run `npm run dev`.

## Environment
- `AI_GATEWAY_MODEL`: provider/model identifier supported by Vercel AI Gateway.
- `AI_GATEWAY_API_KEY`: optional gateway API key for local development; use Vercel OIDC where supported in deployment.
- Supabase URL and anon key are reserved for authentication integration.

## Current scope
This repository is an MVP foundation. Persistent conversations, complete Supabase sign-in, document ingestion, organisation-level RBAC, metering, billing, admin tools, abuse controls and a production security review remain to be implemented. The Security assistant currently has only a basic authentication gate and must not be treated as production access control.

## Deploy
Connect this repository to the Vercel project and configure environment variables before deploying. Never commit secrets.