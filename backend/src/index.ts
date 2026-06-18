import { resolve } from "node:path";
import dotenv from "dotenv";
import express from "express";
import { setupChatEndpoint } from "./endpoints/chat";
import { setupChatsEndpoint } from "./endpoints/chats";
import { setupHealthEndpoint } from "./endpoints/health";
import { setupRecipesEndpoint } from "./endpoints/recipes";
import { enforceApiKey } from "./shared/auth";

const loadLocalEnv = () => {
  // In production (for example Cloud Run), env vars come from service config/secrets.
  if (process.env.NODE_ENV === "production") {
    return;
  }

  dotenv.config({ path: resolve(__dirname, "../.env") });
};

loadLocalEnv();

const app = express();
const port = Number(process.env.PORT) || 8080;

app.use(express.json());

setupHealthEndpoint(app);
app.use(enforceApiKey);
setupChatEndpoint(app);
setupChatsEndpoint(app);
setupRecipesEndpoint(app);

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
