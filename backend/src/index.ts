import { resolve } from "node:path";
import dotenv from "dotenv";
import { createApp } from "./app";

const loadLocalEnv = () => {
  // In production (for example Cloud Run), env vars come from service config/secrets.
  if (process.env.NODE_ENV === "production") {
    return;
  }

  dotenv.config({ path: resolve(__dirname, "../.env") });
};

loadLocalEnv();

const app = createApp();
const port = Number(process.env.PORT) || 8080;

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
