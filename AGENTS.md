# Repository AI Rules

After every code change, the AI must ensure both checks pass before considering the task complete:

1. `npm run biome:check`
2. `npm run typecheck`

If either check fails, the AI must fix the issue and rerun the checks until both pass.

## App rules

When creating any UI, split out new components into their own files if the original file where the component is added is becoming hundreds of lines long. Also split them out when they are logically separate.

Generic and widely reused hooks, logic, and components should be split out into their own files.

Group things by domain insterad of by file type. Eg instead of grouping by components, group by the topic such as chat.

## Backend rules

Ensure that all data saved in the DB has related Prisma schema. Always prefer Prisma helper queries over raw queries where practical.