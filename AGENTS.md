# Repository AI Rules

After every code change, the AI must ensure both checks pass before considering the task complete:

1. `npm run biome:check`
2. `npm run typecheck`

If either check fails, the AI must fix the issue and rerun the checks until both pass.
