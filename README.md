# Sentinex

Sentinex is a CLI-first, security-oriented local agent runtime with default-deny policy enforcement, controlled tool execution, and auditable runs.

## Why Sentinex
Modern agent automation needs explicit guardrails. Sentinex is built around security-by-design:
- Default deny policy model
- Explicit tool capabilities
- Interactive approvals
- Append-only JSONL audit trail with rotation
- Local execution (no required SaaS runtime)

## Quickstart
```bash
git clone https://github.com/MiBe1991/sentinex.git
cd sentinex
npm install
npm run build
npx sentinex init
npx sentinex policy lint --fail-on error
npx sentinex run "hello world"
npx sentinex doctor --json
```

## Quickstart (OpenAI Provider, Optional)
1. Set provider in `.sentinex/config.yaml`:
```yaml
llm:
  provider: "openai"
  fallbackToMock: true
  model: "gpt-4.1-mini"
  baseUrl: "https://api.openai.com/v1"
  apiKeyEnv: "OPENAI_API_KEY"
```
2. Set API key in PowerShell:
```bash
$env:OPENAI_API_KEY="your_key_here"
```
3. Run:
```bash
npx sentinex run "fetch https://example.com" --dry-run
```

## Core Commands
```bash
npx sentinex run "hello world"
npx sentinex run "fetch https://example.com" --dry-run
npx sentinex policy test --prompt "contains secret"
npx sentinex policy lint --fail-on warn --json
npx sentinex logs show --json --since 2026-02-20T00:00:00Z --until 2026-02-21T00:00:00Z
npx sentinex logs export --output out/audit.json --format json
npx sentinex doctor --strict --json
```

## Security Model
- Prompt-level deny/allow with deny precedence
- Tool-level deny/allow for `http.fetch` and `fs.read`
- Host/path scope enforcement
- Approval mode: `prompt`, `auto-approve`, `auto-deny`
- Detailed policy diagnostics and linting

## Development
```bash
npm run build
npm run lint:policy
npm test
npm run test:coverage
```

## Project Links
- Contributing: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`
- Code of conduct: `CODE_OF_CONDUCT.md`
- License: `LICENSE`

## Vision
Sentinex aims to become an open-source reference kernel for secure local agent automation.
