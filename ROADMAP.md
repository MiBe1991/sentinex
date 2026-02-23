# Roadmap

This roadmap reflects the current priorities for `sentinex`. Items may move based on security findings, contributor bandwidth, and user feedback.

## Near Term (v0.2.x)

- `policy lint --fix`: safe autofixes for duplicate entries and canonical ordering
- `policy migrate`: schema migration helper for future policy/config versions
- More CLI e2e coverage for `logs export`, rotated logs, and provider failure paths
- `doctor` improvements (`--report`, severity grouping, better remediation hints)

## Mid Term (v0.3.x)

- Additional providers (e.g. Azure OpenAI / local adapters)
- Provider fallback chains with health checks and cooldowns
- Tool policy hardening (`http.fetch` content-type/status policy, redirects)
- `fs.read` extension filters / deny-globs
- Audit redaction options for sensitive values

## Reliability / Security

- Fuzz/property tests for URL/path/policy matching
- More failure-path tests (timeouts, malformed provider output, partial logs)
- Optional signed audit event chaining / integrity markers

## Docs / Ecosystem

- Threat model documentation page
- Example policies for CI, DevOps, and local triage workflows
- GitHub Discussions onboarding and contribution issue queue

## Out of Scope (for now)

- Broad shell execution by default
- SaaS control plane
- Hidden background tool execution without audit logs
