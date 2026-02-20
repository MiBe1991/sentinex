# Changelog

All notable changes to this project are documented in this file.

## [0.1.0] - 2026-02-20

### Added
- CLI runtime with prompt execution and dry-run mode.
- YAML policy/config loading with default-deny enforcement.
- Tool support: `http.fetch` and `fs.read` with scoped controls.
- Prompt/tool-level deny rules with deny precedence.
- Interactive approvals (`prompt`, `auto-approve`, `auto-deny`).
- JSONL audit logging with rotation (`maxBytes`, `maxFiles`).
- `policy test` and `policy lint` commands.
- `logs show` and `logs export` with filtering (`run-id`, `type`, `since`, `until`).
- `doctor` diagnostics with JSON output and strict mode.
- Provider architecture with `mock`, OpenAI-compatible provider, and fallback chain.
- CI workflow (Node 20/22), test suite, coverage gate, and CLI blackbox tests.
- Open-source community files: license, contributing, security, code of conduct, issue/PR templates.
