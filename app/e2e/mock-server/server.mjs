// Dependency-free mock of the nomnom backend for e2e tests.
// The app is pointed here via EXPO_PUBLIC_API_URL (see app/e2e/run.sh).
// Response shapes mirror backend/src/endpoints/*; state is in-memory and
// resets on every server start so each e2e run begins from the same fixtures.
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_API_PORT ?? 4001);

const RECIPE_ID = "e2e-recipe-1";
const CHAT_SESSION_ID = "e2e-chat-session-1";

// Contract: GET /recipes always returns a chatSessionId — recipes are created
// from chats and linked at creation, and the backend backfills any recipe
// missing one during retrieval. The linked session holds the conversation the
// edit button opens.
const recipeFixture = {
  id: RECIPE_ID,
  title: "Lemon Pancakes",
  content:
    "## Ingredients\n\n- 1 cup flour\n- 1 lemon\n- 2 eggs\n\n## Steps\n\n1. Mix everything.\n2. Fry until golden.",
  imageUrl: null,
  createdAt: "2026-07-01T10:00:00.000Z",
  chatSessionId: CHAT_SESSION_ID,
  tags: ["breakfast"],
};

// Image picker candidates. fullUrl uses the Unsplash image host the backend
// PATCH endpoint requires; the images themselves need not load for the flow —
// tiles are tapped by testID (see recipes/ImagePickerScreen.tsx).
const imageOptionsFixture = [
  {
    id: "e2e-image-1",
    thumbUrl: "https://images.unsplash.com/e2e-1?w=200",
    fullUrl: "https://images.unsplash.com/e2e-1?w=1080",
    alt: "Lemon pancakes on a plate",
    credit: "E2E Photographer",
  },
  {
    id: "e2e-image-2",
    thumbUrl: "https://images.unsplash.com/e2e-2?w=200",
    fullUrl: "https://images.unsplash.com/e2e-2?w=1080",
    alt: "A stack of pancakes",
    credit: "E2E Photographer",
  },
];

const chatMessagesFixture = [
  {
    id: `${RECIPE_ID}-history-1`,
    chatId: CHAT_SESSION_ID,
    role: "user",
    text: `I want to update the recipe "${recipeFixture.title}". Let's start with what we have. Please provide the current recipe and I will tell you what to change.`,
    createdAt: "2026-07-01T10:00:01.000Z",
  },
  {
    id: `${RECIPE_ID}-history-2`,
    chatId: CHAT_SESSION_ID,
    role: "assistant",
    text: `Sure. Here is the current recipe for "${recipeFixture.title}":\n\n${recipeFixture.content}\n\nWhat would you like me to update?`,
    createdAt: "2026-07-01T10:00:02.000Z",
  },
];

// More than one page (PAGE_SIZE = 10) of chat sessions so GET /chats is called
// with an advancing offset, exercising the chat-history list's "load more"
// pagination. Titles are unique and zero-padded so a flow can scroll to a late
// page and confirm rows aren't duplicated (see the pagination e2e flow).
const HISTORY_CHAT_COUNT = 23;
const historyChatEntries = Array.from({ length: HISTORY_CHAT_COUNT }, (_, index) => {
  const label = String(index + 1).padStart(2, "0");
  const id = `e2e-history-chat-${label}`;
  // Descending minute keeps a stable order independent of Map iteration.
  const minute = String(59 - index).padStart(2, "0");
  return [
    id,
    {
      id,
      title: `E2E History Chat ${label}`,
      createdAt: `2026-07-01T09:${minute}:00.000Z`,
      messages: [
        {
          id: `${id}-message-1`,
          chatId: id,
          role: "user",
          text: `Opened history chat ${label}.`,
          createdAt: `2026-07-01T09:${minute}:01.000Z`,
        },
      ],
    },
  ];
});

const buildInitialState = () => ({
  recipes: [{ ...recipeFixture }],
  chatSessions: new Map([
    ...historyChatEntries.map(([id, session]) => [
      id,
      { ...session, messages: session.messages.map((message) => ({ ...message })) },
    ]),
    [
      CHAT_SESSION_ID,
      {
        id: CHAT_SESSION_ID,
        title: recipeFixture.title,
        createdAt: "2026-07-01T10:00:00.000Z",
        messages: [...chatMessagesFixture],
      },
    ],
  ]),
});

let state = buildInitialState();

const sendJson = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const { pathname } = url;
  console.log(`[mock-api] ${req.method} ${pathname}`);

  // Test hook: reset fixtures without restarting the server.
  if (req.method === "POST" && pathname === "/__reset") {
    state = buildInitialState();
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/health") {
    sendJson(res, 200, { status: "ok" });
    return;
  }

  if (req.method === "GET" && pathname === "/recipes") {
    sendJson(res, 200, { recipes: state.recipes, source: "mock" });
    return;
  }

  // GET /recipes/:id/image-options returns Unsplash-style candidates the image
  // picker offers (see backend/src/endpoints/recipes/index.ts). Matched before
  // the single-segment /recipes/:id route since it has an extra path segment.
  const imageOptionsMatch = pathname.match(/^\/recipes\/([^/]+)\/image-options$/);
  if (req.method === "GET" && imageOptionsMatch) {
    const recipe = state.recipes.find((r) => r.id === imageOptionsMatch[1]);
    if (!recipe) {
      sendJson(res, 404, { error: "Recipe not found" });
      return;
    }
    sendJson(res, 200, { options: imageOptionsFixture });
    return;
  }

  const recipeByIdMatch = pathname.match(/^\/recipes\/([^/]+)$/);

  // GET /recipes/:id returns the recipe object directly (no envelope) — the app
  // calls this when a recipe:// link is tapped in chat (see recipes/api.ts).
  if (req.method === "GET" && recipeByIdMatch) {
    const recipe = state.recipes.find((r) => r.id === recipeByIdMatch[1]);
    if (!recipe) {
      sendJson(res, 404, { error: "Recipe not found" });
      return;
    }
    sendJson(res, 200, recipe);
    return;
  }

  // PATCH /recipes/:id sets the chosen image and returns the updated recipe
  // (tags already flattened), mirroring the backend PATCH endpoint.
  if (req.method === "PATCH" && recipeByIdMatch) {
    const recipe = state.recipes.find((r) => r.id === recipeByIdMatch[1]);
    if (!recipe) {
      sendJson(res, 404, { error: "Recipe not found" });
      return;
    }
    const body = await readBody(req);
    if (typeof body.imageUrl !== "string") {
      sendJson(res, 400, { error: "Invalid imageUrl" });
      return;
    }
    recipe.imageUrl = body.imageUrl;
    sendJson(res, 200, recipe);
    return;
  }

  if (req.method === "DELETE" && recipeByIdMatch) {
    state.recipes = state.recipes.filter((r) => r.id !== recipeByIdMatch[1]);
    sendJson(res, 200, { success: true });
    return;
  }

  if (req.method === "GET" && pathname === "/chats") {
    // Mirror backend/src/endpoints/chats: cap limit at 50, page via offset, and
    // report hasMore from the total count so the client keeps loading pages.
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 10, 0), 50);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
    const all = [...state.chatSessions.values()];
    const chats = all.slice(offset, offset + limit).map(({ id, title, createdAt }) => ({
      id,
      title,
      createdAt,
    }));
    sendJson(res, 200, {
      chats,
      totalCount: all.length,
      hasMore: offset + chats.length < all.length,
    });
    return;
  }

  const chatMessagesMatch = pathname.match(/^\/chats\/([^/]+)\/messages$/);
  if (req.method === "GET" && chatMessagesMatch) {
    const session = state.chatSessions.get(chatMessagesMatch[1]);
    if (!session) {
      sendJson(res, 404, { error: "Chat not found" });
      return;
    }
    sendJson(res, 200, { messages: session.messages });
    return;
  }

  if (req.method === "POST" && pathname === "/chat") {
    const body = await readBody(req);
    const chatId = body.chatId ?? CHAT_SESSION_ID;
    // Mirror the "surface existing recipes" feature: the assistant replies by
    // surfacing the saved recipe as a recipe:// link the app makes tappable. The
    // reply is just the link so the rendered message bubble's text node is
    // exactly the recipe title — matchable and tappable by Maestro (a link
    // embedded in a sentence merges into the paragraph's text node).
    sendJson(res, 200, {
      reply: `[${recipeFixture.title}](recipe://${RECIPE_ID})`,
      chatId,
    });
    return;
  }

  sendJson(res, 404, { error: `No mock for ${req.method} ${pathname}` });
});

server.listen(PORT, () => {
  console.log(`[mock-api] listening on http://localhost:${PORT}`);
});
