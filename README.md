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
npx sentinex logs show --json --type policy.decision
npx sentinex logs show --since 2026-02-20T00:00:00Z
npx sentinex logs show --since 2026-02-20T00:00:00Z --until 2026-02-21T00:00:00Z
npx sentinex logs export --output out/audit.json --format json --since 2026-02-20T00:00:00Z
npx sentinex doctor --json
npx sentinex doctor --strict
```

`sentinex init` creates `.sentinex/policy.yaml` and `.sentinex/config.yaml` in the current folder.
The runtime loads and validates policy/config on each run.

## OpenAI Provider

Set provider in `.sentinex/config.yaml`:

```yaml
llm:
  provider: "openai"
  fallbackToMock: true
  model: "gpt-4.1-mini"
  baseUrl: "https://api.openai.com/v1"
  apiKeyEnv: "OPENAI_API_KEY"
  timeoutMs: 20000
  maxRetries: 2
  retryDelayMs: 600
```

Then export your API key before running:

```bash
$env:OPENAI_API_KEY="your_key_here"
```

## Features

- Default-deny policy evaluator with YAML schema validation
- Tool capabilities: `http.fetch` (GET only, host whitelist), `fs.read` (scoped roots, max size)
- Tool policy switches: `allow.tools.http.fetch.enabled` / `allow.tools.fs.read.enabled`
- Host allowlist supports exact hosts and wildcard subdomains (example: `*.example.com`)
- Prompt deny rules with priority over allow (`deny.prompts`)
- Interactive approval workflow (`prompt`, `auto-approve`, `auto-deny`)
- JSONL audit logging (`run.started`, `action.requested`, `policy.decision`, `action.result`, `run.finished`)
- Audit rotation via `audit.maxBytes` and `audit.maxFiles`
- Action model + registry + typed errors
- Optional provider integration via mock provider and strict action-plan validation
- OpenAI-compatible provider support via Chat Completions API
- OpenAI request hardening: timeout, retry with backoff for retryable status/network errors
- `logs show` filters (`--run-id`, `--type`) and JSON output (`--json`)
- `doctor` command for quick runtime health checks
- `doctor --json` with category-based exit codes
- `logs show --since <isoDate>` time filtering
- `logs show/export --until <isoDate>` upper time bound filtering
- `logs export` for filtered JSON/JSONL export files
- optional provider fallback chain (`openai -> mock`) via `llm.fallbackToMock`
- `doctor --strict` treats warnings as failures (adds exit bit `64`)
- `policy test --prompt` returns decision stage and matched/invalid regex details
- `doctor` warns on overly broad tool policies (for example `hosts: ["*"]`, root-level `fs.read` scopes)
- Dry-run mode for non-destructive execution checks

## Testing

```bash
npm test
```
