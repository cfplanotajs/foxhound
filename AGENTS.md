# AGENTS.md

## Project
This is an internal studio dashboard for standardized AI image generation. The purpose is to help artists generate consistent visual assets using reusable master style prompts and multiple image-generation providers.

## Operating Principles
- Build practical internal tooling, not a public SaaS product.
- Prioritize a stable vertical slice over broad unfinished features.
- Keep provider integrations modular.
- Never expose API keys client-side.
- Log exact prompts, preset versions, provider, model, payload metadata, and output paths for auditability.
- Make reasonable assumptions when not blocked.
- Ask questions only when implementation would otherwise be unsafe or impossible.

## Current MVP Scope
The first working version should support:
- local preset JSON config
- prompt composition
- OpenAI image generation
- local image saving
- SQLite metadata logging
- gallery display
- ZIP download

## Out of Scope Until Requested
- authentication
- cloud storage
- Google Gemini / Nano Banana
- Fal.ai / Flux
- OpenAI Batch API
- Redis queues
- CSV upload
- cost dashboard
- deployment
- multi-user permissions

## Code Quality
- Use TypeScript.
- Keep server-side provider logic separate from frontend UI.
- Prefer explicit types for provider requests/responses.
- Keep environment variables documented in `.env.example`.
- Add README updates whenever setup or workflow changes.
- Run available checks before finalizing.

## Verification
Before finishing a task, run the available checks, such as:
- npm run lint
- npm run typecheck
- npm run build

If one of these commands does not exist, mention that clearly and do not invent a replacement.
