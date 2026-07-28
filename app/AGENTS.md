# App (React Native / Expo)

The shared code-organization rules in the root `AGENTS.md` apply here too. This
file adds UI specifics.

## Styling

Component colors must always come from the theme (`app/src/theme/config.ts`, via `useTheme()` or `$token` props) rather than hardcoded values, unless specified otherwise.
