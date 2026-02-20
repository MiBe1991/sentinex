# Security Policy

## Supported Versions
Security fixes are provided on the latest `main` branch.

## Reporting A Vulnerability
Please do not open public issues for vulnerabilities.

Use one of these channels:
- GitHub private vulnerability reporting (preferred)
- Direct maintainer contact via repository owner profile

Include:
- Affected component and version/commit
- Reproduction steps
- Impact assessment
- Suggested fix (if available)

We will acknowledge reports as quickly as possible and coordinate disclosure once a fix is available.

## Security Scope
Sentinex is a local runtime. Security-critical areas include:
- policy parsing and enforcement
- tool permission boundaries (`http.fetch`, `fs.read`)
- approval flow and bypass risks
- audit integrity and log tampering risk
