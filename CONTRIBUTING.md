# Contributing

Thanks for contributing to Sentinex.

## Local Setup
```bash
npm install
npm run build
npx sentinex init
```

## Development Checks
Run these before opening a PR:
```bash
npm run build
npm run lint:policy
npm test
npm run test:coverage
```

## Branching And Commits
- Create feature branches from `main`.
- Use conventional commit messages, e.g.:
  - `feat(policy): add deny path checks`
  - `fix(cli): handle invalid since date`
  - `test(runtime): add audit rotation tests`

## Pull Requests
- Keep PRs focused and small where possible.
- Describe behavior changes and security impact.
- Link related issues.
- Include CLI examples for user-visible changes.

## Security-Sensitive Areas
Changes to `src/core/policy.ts`, `src/core/runtime.ts`, `src/core/tools/*`, and audit behavior should include tests and clear rationale in the PR.
