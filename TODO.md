# Sentinex Roadmap / TODO

## v0.2 – Policy + Audit + http.fetch

### Core
- [ ] Implement `sentinex init`
- [ ] YAML policy loader with validation
- [ ] Default-deny policy evaluator
- [ ] Interactive approval flow
- [ ] JSONL audit logger

### Tools
- [ ] http.fetch (GET only, host whitelist)
- [ ] fs.read (scoped, size-limited)

### CLI
- [ ] sentinex policy test
- [ ] sentinex logs show

---

## v0.3 – Action Model

- [ ] Introduce Action union type
- [ ] Tool registry abstraction
- [ ] Error classes (PolicyDeniedError, ToolExecutionError)
- [ ] Unit tests for policy + tools

---

## v0.4 – LLM Integration (Optional)

- [ ] Provider interface
- [ ] JSON action plan schema
- [ ] Strict validation before execution
- [ ] Dry-run mode
