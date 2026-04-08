import { resolve } from "node:path";
import dotenv from "dotenv";
import express from "express";
import { setupChatEndpoint } from "./chat";
import { setupHealthEndpoint } from "./health";
import { setupRecipesEndpoint } from "./recipes";

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
setupChatEndpoint(app);
setupRecipesEndpoint(app);

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
