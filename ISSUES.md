# Suggested GitHub Issues

## Issue 1 – Implement `sentinex init`
Create `.sentinex/` folder with policy.yaml and config.yaml templates.
Must be idempotent. Add --force flag.

## Issue 2 – YAML Policy Loader
Parse `.sentinex/policy.yaml`.
Validate schema.
Return default config if missing.

## Issue 3 – Policy Evaluator
Implement default-deny logic.
Support:
- http.fetch with host whitelist
- fs.read with path prefix
- exec disabled by default

## Issue 4 – Audit Log
Append-only JSONL logger.
Events:
- run.started
- action.requested
- policy.decision
- action.result
- run.finished

## Issue 5 – http.fetch Tool
GET only.
Host whitelist enforcement.
Timeout + max response size.
Proper audit integration.
