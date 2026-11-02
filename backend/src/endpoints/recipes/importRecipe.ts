// Import a recipe from a URL by reading its schema.org/Recipe JSON-LD (parsing
// lives in recipeJsonLd.ts).
//
// The page is preferably fetched by the app on the user's device and sent
// along with the chat message as a PrefetchedPage: many recipe sites sit
// behind bot protection that rejects requests from our server (Node's fetch
// and Cloud Run's datacenter IPs), but lets a phone through. When the app sent
// nothing for a URL - or its fetch never got a response - we fetch the page
// here as a fallback.
//
// When there is no usable recipe we report why (blocked by the site, page
// failed to load, or no recipe data on it) rather than guessing. The chat
// agent turns that into a plain reply (see agentTools + agent system prompt).
//
// On success we hand the agent the structured fields we found; the agent
// formats them into the house recipe format and estimates only what JSON-LD
// did not provide (e.g. nutrition, servings). Anything the source gave us is
// passed through verbatim so the LLM never re-estimates known values.

import { getErrorMessage } from "../../shared/utils";
import { type ParsedRecipe, parseRecipeFromHtml, parseRecipeFromJsonLd } from "./recipeJsonLd";

// A page the app fetched on the user's device. status is the HTTP status the
// device got, or 0 when its request failed without a response (offline,
// timeout). jsonLd holds the raw contents of the page's ld+json blocks - the
// app sends only those, not the whole (often megabyte-sized) HTML.
export type PrefetchedPage = {
  url: string;
  status: number;
  jsonLd: string[];
};

export type ImportFailureReason = "blocked" | "fetch-failed" | "no-recipe";

export type ImportRecipeResult =
  | { ok: true; recipe: ParsedRecipe }
  | { ok: false; reason: ImportFailureReason };

const FETCH_TIMEOUT_MS = 10_000;

// Statuses bot protection answers with (Cloudflare, Akamai, etc.).
const BLOCKED_STATUSES = new Set([401, 403, 429]);

// A real User-Agent: some sites return a stripped page (or block) the default
// fetch agent, and the JSON-LD only appears on the full HTML response.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export class PageFetchError extends Error {
  constructor(
    message: string,
    // HTTP status, or undefined when no response arrived.
    readonly status?: number,
  ) {
    super(message);
    this.name = "PageFetchError";
  }
}

export const fetchPageHtml = async (url: string): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new PageFetchError(`Fetch failed with status ${response.status}`, response.status);
    }

    return await response.text();
  } catch (error) {
    if (error instanceof PageFetchError) {
      throw error;
    }
    throw new PageFetchError(getErrorMessage(error));
  } finally {
    clearTimeout(timeout);
  }
};

const failureForStatus = (status: number): ImportFailureReason =>
  BLOCKED_STATUSES.has(status) ? "blocked" : "fetch-failed";

const logFailure = (url: string, source: "device" | "server", reason: string, detail: string) => {
  console.warn(`Recipe import failed (${reason}, fetched on ${source}) for ${url}: ${detail}`);
};

const importFromPrefetched = (page: PrefetchedPage): ImportRecipeResult => {
  if (page.status < 200 || page.status >= 300) {
    const reason = failureForStatus(page.status);
    logFailure(page.url, "device", reason, `status ${page.status}`);
    return { ok: false, reason };
  }

  const recipe = parseRecipeFromJsonLd(page.jsonLd);
  if (!recipe) {
    logFailure(page.url, "device", "no-recipe", `${page.jsonLd.length} JSON-LD block(s)`);
    return { ok: false, reason: "no-recipe" };
  }

  return { ok: true, recipe };
};

const importFromServer = async (url: string): Promise<ImportRecipeResult> => {
  let html: string;
  try {
    html = await fetchPageHtml(url);
  } catch (error) {
    const status = error instanceof PageFetchError ? error.status : undefined;
    const reason = status === undefined ? "fetch-failed" : failureForStatus(status);
    logFailure(url, "server", reason, getErrorMessage(error));
    return { ok: false, reason };
  }

  const recipe = parseRecipeFromHtml(html);
  if (!recipe) {
    logFailure(url, "server", "no-recipe", `${html.length} bytes of HTML`);
    return { ok: false, reason: "no-recipe" };
  }

  return { ok: true, recipe };
};

export const importRecipe = async (
  url: string,
  prefetched?: PrefetchedPage,
): Promise<ImportRecipeResult> => {
  // status 0: the device never got a response, so it tells us nothing about
  // the page - try from the server instead.
  if (prefetched && prefetched.status !== 0) {
    return importFromPrefetched(prefetched);
  }
  return importFromServer(url);
};
