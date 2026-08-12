// Import a recipe from a URL by reading its schema.org/Recipe JSON-LD.
//
// Deliberately JSON-LD-only: almost every recipe site embeds this structured
// data for Google rich results, so parsing it is reliable and needs no LLM.
// When a page has no usable Recipe JSON-LD - or the JSON-LD is missing either
// ingredients or instructions - we report the link as unparseable rather than
// guessing. The chat agent turns that into a plain "can't read this link"
// reply (see agentTools + agent system prompt).
//
// On success we hand the agent the structured fields we found; the agent
// formats them into the house recipe format and estimates only what JSON-LD
// did not provide (e.g. nutrition, servings). Anything the source gave us is
// passed through verbatim so the LLM never re-estimates known values.

export type ParsedRecipe = {
  title: string;
  ingredients: string[];
  instructions: string[];
  // Optional: present only when the source provided them.
  servings?: string;
  nutrition?: Record<string, string>;
};

export type ExtractRecipeResult =
  | { ok: true; recipe: ParsedRecipe }
  | { ok: false; reason: "unparseable" };

const FETCH_TIMEOUT_MS = 10_000;

// A real User-Agent: some sites return a stripped page (or block) the default
// fetch agent, and the JSON-LD only appears on the full HTML response.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export const fetchPageHtml = async (url: string): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
};

// Pull the raw contents of every <script type="application/ld+json"> block.
const extractJsonLdBlocks = (html: string): string[] => {
  const blocks: string[] = [];
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match = scriptRegex.exec(html);
  while (match !== null) {
    const raw = match[1]?.trim();
    if (raw) {
      blocks.push(raw);
    }
    match = scriptRegex.exec(html);
  }

  return blocks;
};

const isRecipeNode = (node: unknown): node is Record<string, unknown> => {
  if (!node || typeof node !== "object") {
    return false;
  }
  const type = (node as { "@type"?: unknown })["@type"];
  if (typeof type === "string") {
    return type.toLowerCase() === "recipe";
  }
  if (Array.isArray(type)) {
    return type.some((t) => typeof t === "string" && t.toLowerCase() === "recipe");
  }
  return false;
};

// A JSON-LD block may be a single node, an array of nodes, or a document with
// an @graph array. Flatten all of them so we can scan for a Recipe node.
const collectNodes = (parsed: unknown): unknown[] => {
  if (Array.isArray(parsed)) {
    return parsed.flatMap(collectNodes);
  }
  if (parsed && typeof parsed === "object") {
    const graph = (parsed as { "@graph"?: unknown })["@graph"];
    if (Array.isArray(graph)) {
      return [parsed, ...graph.flatMap(collectNodes)];
    }
    return [parsed];
  }
  return [];
};

const findRecipeNode = (blocks: string[]): Record<string, unknown> | null => {
  for (const block of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block);
    } catch {
      // Skip malformed blocks; other blocks on the page may still parse.
      continue;
    }

    const recipeNode = collectNodes(parsed).find(isRecipeNode);
    if (recipeNode) {
      return recipeNode;
    }
  }

  return null;
};

const decodeEntities = (text: string): string =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ");

// JSON-LD text fields sometimes carry inline HTML and entities. Strip tags and
// decode common entities so the agent gets clean plain text.
const cleanText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  return decodeEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(cleanText).filter(Boolean);
  }
  const single = cleanText(value);
  return single ? [single] : [];
};

// recipeInstructions can be a string, an array of strings, an array of
// HowToStep objects, or HowToSection objects that nest HowToStep items.
const parseInstructions = (value: unknown): string[] => {
  if (typeof value === "string") {
    return toStringArray(value);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item): string[] => {
    if (typeof item === "string") {
      const text = cleanText(item);
      return text ? [text] : [];
    }
    if (item && typeof item === "object") {
      const node = item as Record<string, unknown>;
      const type = typeof node["@type"] === "string" ? (node["@type"] as string) : "";
      if (type.toLowerCase() === "howtosection" && Array.isArray(node.itemListElement)) {
        return parseInstructions(node.itemListElement);
      }
      const text = cleanText(node.text ?? node.name);
      return text ? [text] : [];
    }
    return [];
  });
};

const NUTRITION_FIELDS: Array<[key: string, label: string]> = [
  ["calories", "Calories"],
  ["proteinContent", "Protein"],
  ["fatContent", "Fat"],
  ["saturatedFatContent", "Saturated fat"],
  ["carbohydrateContent", "Carbohydrates"],
  ["sugarContent", "Sugar"],
  ["fiberContent", "Fibre"],
  ["sodiumContent", "Sodium"],
];

const parseNutrition = (value: unknown): Record<string, string> | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const node = value as Record<string, unknown>;
  const nutrition: Record<string, string> = {};
  for (const [key, label] of NUTRITION_FIELDS) {
    const cleaned = cleanText(node[key]);
    if (cleaned) {
      nutrition[label] = cleaned;
    }
  }
  return Object.keys(nutrition).length > 0 ? nutrition : undefined;
};

const parseServings = (value: unknown): string | undefined => {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first === "number" && Number.isFinite(first)) {
    return String(first);
  }
  const cleaned = cleanText(first);
  return cleaned || undefined;
};

// Turn a Recipe JSON-LD node into our structured shape, or null if it lacks
// the two fields a recipe cannot do without: ingredients and instructions.
export const parseRecipeNode = (node: Record<string, unknown>): ParsedRecipe | null => {
  const ingredients = toStringArray(node.recipeIngredient ?? node.ingredients);
  const instructions = parseInstructions(node.recipeInstructions);

  if (ingredients.length === 0 || instructions.length === 0) {
    return null;
  }

  const title = cleanText(node.name) || "Untitled";
  const servings = parseServings(node.recipeYield);
  const nutrition = parseNutrition(node.nutrition);

  return {
    title,
    ingredients,
    instructions,
    ...(servings ? { servings } : {}),
    ...(nutrition ? { nutrition } : {}),
  };
};

// Pure extraction from already-fetched HTML - no network. Kept separate so it
// can be unit-tested directly against fixtures.
export const extractRecipeFromHtml = (html: string): ExtractRecipeResult => {
  const recipeNode = findRecipeNode(extractJsonLdBlocks(html));
  if (!recipeNode) {
    return { ok: false, reason: "unparseable" };
  }

  const recipe = parseRecipeNode(recipeNode);
  if (!recipe) {
    return { ok: false, reason: "unparseable" };
  }

  return { ok: true, recipe };
};

export const extractRecipeFromUrl = async (url: string): Promise<ExtractRecipeResult> => {
  const html = await fetchPageHtml(url);
  return extractRecipeFromHtml(html);
};
