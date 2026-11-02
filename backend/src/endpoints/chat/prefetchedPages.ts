import type { PrefetchedPage } from "../recipes/importRecipe";

const isPrefetchedPage = (value: unknown): value is PrefetchedPage => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const page = value as Record<string, unknown>;
  return (
    typeof page.url === "string" &&
    typeof page.status === "number" &&
    Array.isArray(page.jsonLd) &&
    page.jsonLd.every((block) => typeof block === "string")
  );
};

// Keep only well-formed entries from the request body; anything malformed is
// dropped so the import falls back to fetching the page on the server.
export const parsePrefetchedPages = (value: unknown): PrefetchedPage[] =>
  Array.isArray(value) ? value.filter(isPrefetchedPage) : [];
