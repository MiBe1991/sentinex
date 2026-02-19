# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains TypeScript source files.
- `src/cli.ts` handles prompt flow and user-facing CLI behavior.
- `src/core/` contains runtime logic (`agent.ts`) and policy evaluation (`policy.ts`).
- `bin/` contains compiled JavaScript output and the executable entrypoint (`bin/sentinex.js`).
- `templates/` stores reusable policy/config templates (for example `templates/policy.yaml`).
- Root docs (`README.md`, `TODO.md`, `ISSUES.md`) track usage and planning.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run build`: compile `src/` to `bin/` using TypeScript (`tsc`).
- `npm start -- run "hello world"`: run the built CLI via Node.
- `npx sentinex run "hello world"`: run through the package binary after build.

Run `npm run build` after source changes to keep `bin/` in sync.

## Coding Style & Naming Conventions
- Language: TypeScript (ES modules, strict mode enabled).
- Indentation: 2 spaces; include semicolons; prefer double quotes to match current files.
- Filenames: lowercase, domain-oriented names (`policy.ts`, `agent.ts`).
- Exports: prefer named exports for core functions.
- Keep CLI orchestration in `src/cli.ts`; keep business logic inside `src/core/`.

## Testing Guidelines
- There is currently no test framework configured.
- When adding tests, use `src/**/__tests__/*.test.ts` or `tests/**/*.test.ts` and keep names aligned with modules.
- Add a `npm test` script when introducing a framework (recommended: Vitest or Jest).
- Minimum expectation for new logic: one success path and one policy/validation failure case.

## Commit & Pull Request Guidelines
- This repository has no existing commits yet; use Conventional Commit style going forward.
- Format: `type(scope): short summary` (example: `feat(policy): add denylist keyword check`).
- Keep commits focused and atomic.
- PRs should include:
  - clear purpose and behavior change summary,
  - linked issue/task when available,
  - CLI output examples for user-visible changes,
  - notes on follow-ups or limitations.

## Security & Configuration Tips
- Do not commit secrets, API keys, or machine-specific credentials.
- Treat policy changes as security-relevant; document defaults and risk tradeoffs in PR descriptions.
