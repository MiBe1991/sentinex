# Sentinex Agent v0.4

Secure Local Agent Runtime (CLI-first, Policy-based)

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
npx sentinex init
npx sentinex run "hello world"
npx sentinex run "fetch https://example.com" --dry-run
npx sentinex policy test --tool http.fetch --url https://example.com
npx sentinex logs show --limit 20
```

`sentinex init` creates `.sentinex/policy.yaml` and `.sentinex/config.yaml` in the current folder.
The runtime loads and validates policy/config on each run.

## Features

- Default-deny policy evaluator with YAML schema validation
- Tool capabilities: `http.fetch` (GET only, host whitelist), `fs.read` (scoped roots, max size)
- Interactive approval workflow (`prompt`, `auto-approve`, `auto-deny`)
- JSONL audit logging (`run.started`, `action.requested`, `policy.decision`, `action.result`, `run.finished`)
- Action model + registry + typed errors
- Optional provider integration via mock provider and strict action-plan validation
- Dry-run mode for non-destructive execution checks

## Testing

```bash
npm test
```
