import express from "express";
import { setupChatEndpoint } from "./endpoints/chat";
import { setupChatsEndpoint } from "./endpoints/chats";
import { setupHealthEndpoint } from "./endpoints/health";
import { setupRecipesEndpoint } from "./endpoints/recipes";
import { enforceApiKey } from "./shared/auth";

// App construction lives here (without listen) so integration tests can drive
// the real middleware and routes over HTTP.
export const createApp = () => {
  const app = express();

  // Above the 100kb default: chat requests can carry recipe JSON-LD the app
  // fetched on the device (see recipes/importRecipe.ts).
  app.use(express.json({ limit: "2mb" }));

  setupHealthEndpoint(app);
  app.use(enforceApiKey);
  setupChatEndpoint(app);
  setupChatsEndpoint(app);
  setupRecipesEndpoint(app);

  return app;
};
