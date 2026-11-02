import { fetchWithLogging } from "../backend/apiConfig";

// Recipe links are fetched here, on the device, and sent along with the chat
// message. Many recipe sites sit behind bot protection that rejects requests
// from our backend's server but lets a phone through. The backend parses what
// we send and only fetches the page itself when we got no response (see
// backend/src/endpoints/recipes/importRecipe.ts).

// Mirrors the backend's PrefetchedPage. status is 0 when the request failed
// without a response.
export type PrefetchedPage = {
  url: string;
  status: number;
  jsonLd: string[];
};

const FETCH_TIMEOUT_MS = 10_000;
const MAX_LINKS = 3;
// Pages are often 0.5-1.5MB of HTML; we send only their JSON-LD, and cap it so
// a pathological page can't bloat the chat request.
const MAX_JSON_LD_CHARS = 500_000;

const URL_REGEX = /https?:\/\/[^\s<>"'`]+/gi;

const extractUrls = (text: string): string[] => {
  const urls = (text.match(URL_REGEX) ?? []).map((url) => url.replace(/[.,;:!?)\]]+$/, ""));
  return [...new Set(urls)].slice(0, MAX_LINKS);
};

// Same pattern as the backend parser: the type attribute may be unquoted on
// minified pages.
const extractRecipeJsonLd = (html: string): string[] => {
  const scriptRegex =
    /<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  const blocks: string[] = [];
  let totalChars = 0;

  for (const match of html.matchAll(scriptRegex)) {
    const block = match[1]?.trim();
    // Only blocks that can hold a Recipe node are worth sending.
    if (!block || !/recipe/i.test(block) || totalChars + block.length > MAX_JSON_LD_CHARS) {
      continue;
    }
    blocks.push(block);
    totalChars += block.length;
  }

  return blocks;
};

const prefetchPage = async (url: string): Promise<PrefetchedPage> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetchWithLogging(url, {
      headers: { Accept: "text/html,application/xhtml+xml" },
      signal: controller.signal,
    });
    const jsonLd = response.ok ? extractRecipeJsonLd(await response.text()) : [];
    return { url, status: response.status, jsonLd };
  } catch {
    return { url, status: 0, jsonLd: [] };
  } finally {
    clearTimeout(timeout);
  }
};

// Fetch every link in a message the user is about to send. Never throws: a
// failed fetch is reported as status 0 so the backend can retry it.
export const prefetchRecipePages = (text: string): Promise<PrefetchedPage[]> =>
  Promise.all(extractUrls(text).map(prefetchPage));
