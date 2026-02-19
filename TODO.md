# Sentinex Roadmap / TODO

## v0.2 – Policy + Audit + http.fetch

### Core
- [x] Implement `sentinex init`
- [x] YAML policy loader with validation
- [x] Default-deny policy evaluator
- [x] Interactive approval flow
- [x] JSONL audit logger

### Tools
- [x] http.fetch (GET only, host whitelist)
- [x] fs.read (scoped, size-limited)

### CLI
- [x] sentinex policy test
- [x] sentinex logs show

---

## v0.3 – Action Model

- [x] Introduce Action union type
- [x] Tool registry abstraction
- [x] Error classes (PolicyDeniedError, ToolExecutionError)
- [x] Unit tests for policy + tools

---

## v0.4 – LLM Integration (Optional)

- [x] Provider interface
- [x] JSON action plan schema
- [x] Strict validation before execution
- [x] Dry-run mode
