import { MarkdownIt } from "react-native-markdown-display";

/**
 * Shared markdown-it parser used for all in-app markdown rendering.
 *
 * `linkify` is explicitly disabled. react-native-markdown-display already
 * leaves it off by default (it only sets `typographer: true`), so pinning it
 * here is defense-in-depth: it stops the vulnerable linkify-it `mailto:` scan
 * loop from ever being reached, and prevents a future config change from
 * silently re-enabling autolinking. linkify-it has an unpatched
 * quadratic-complexity ReDoS on attacker-controlled text
 * (GHSA-v245-v573-v5vm, GHSA-22p9-wv53-3rq4) with no non-breaking fix
 * available while markdown-it pins linkify-it@^5.
 *
 * Explicit markdown links (e.g. `[label](recipe://id)`) are unaffected; only
 * autodetection of bare URLs/emails in plain text is disabled.
 */
export const markdownItInstance = MarkdownIt({
  typographer: true,
  linkify: false,
});
