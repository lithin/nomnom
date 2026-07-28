# Vendored skills

These skills are vendored into the repo (rather than installed via the Claude
Code plugin marketplace) so the whole team shares the same pinned set without
needing the CLI. Claude Code auto-discovers any `SKILL.md` under `.claude/skills/`.

To update a skill, re-copy its directory from the upstream commit below (or bump
to a newer commit) and update this file.

## Origins

| Skill | Upstream | Pinned commit |
|---|---|---|
| `expo-data-fetching` | [expo/skills](https://github.com/expo/skills) `plugins/expo/skills/` | `09eb052` |
| `expo-project-structure` | [expo/skills](https://github.com/expo/skills) `plugins/expo/skills/` | `09eb052` |
| `expo-upgrade` | [expo/skills](https://github.com/expo/skills) `plugins/expo/skills/` | `09eb052` |
| `eas-workflows` | [expo/skills](https://github.com/expo/skills) `plugins/expo/skills/` | `09eb052` |
| `eas-app-stores` | [expo/skills](https://github.com/expo/skills) `plugins/expo/skills/` | `09eb052` |
| `react-native-best-practices` | [callstackincubator/agent-skills](https://github.com/callstackincubator/agent-skills) `skills/` | `f6b87e3` |
| `react-navigation` | [callstackincubator/agent-skills](https://github.com/callstackincubator/agent-skills) `skills/` | `f6b87e3` |
| `neon-postgres` | [neondatabase/agent-skills](https://github.com/neondatabase/agent-skills) | see `../../skills-lock.json` |

## Notes

- `react-native-best-practices`: the upstream `references/images/` screenshots
  (~6 MB of profiling-tool captures) were dropped to keep the repo lean. The
  markdown guidance — what Claude actually reads — is intact, so some reference
  docs link to images that aren't present. Re-copy `references/images/` from
  upstream if you want them back.
- Skipped as not matching this stack: `expo-router` (app uses React Navigation),
  the NativeWind/Tailwind skills (app uses Tamagui), and the brownfield/migration
  skills (greenfield Expo app).
