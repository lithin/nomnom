// Gemini (via LangChain) sometimes emits a function call as plain text - a
// "tool_code" block like `print(default_api.saveRecipe(...))` - instead of
// actually invoking the tool. When that happens no tool runs (so nothing is
// saved), yet the model often still claims success. We detect this
// narrated-but-unexecuted tool call by its Gemini-specific markers, which never
// appear in a normal recipe reply, and retry / surface a clear error rather
// than showing the garble or a fabricated confirmation.
const UNEXECUTED_TOOL_CALL_MARKERS = /\btool_code\b|\bdefault_api\s*\./i;

export const looksLikeUnexecutedToolCall = (text: string): boolean =>
  UNEXECUTED_TOOL_CALL_MARKERS.test(text);

// A reply worth another agent attempt: Gemini either produced nothing (an empty
// completion - common on the save turn, ~1 in 6) or narrated a tool call as
// text instead of running it. Both are transient; re-invoking usually recovers.
export const isRetriableReply = (reply: string | null): boolean =>
  !reply || looksLikeUnexecutedToolCall(reply);

// Shown when Gemini keeps printing tool code as text even after a retry. The
// conversation is wedged, so the cleanest recovery is a fresh chat.
export const UNEXECUTED_TOOL_CALL_MESSAGE =
  "Sorry - the AI didn't return a valid response (it printed tool code instead of running the tool). Please start a new chat and try again.";
