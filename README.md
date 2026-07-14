# NomNom 🍜

NomNom is a personal AI recipe assistant. You chat with an agent about what to cook — ideate new dishes, ask for full recipes, tweak existing ones — and it saves the recipes it creates into your own recipe collection, complete with generated images and tags. Think of it as a cookbook that writes itself while you talk to it.

## What's inside

The project is a monorepo with three parts:

- **`app/`** — an [Expo](https://expo.dev) / React Native mobile app (Tamagui UI, React Navigation). It has two main areas: a chat screen with history for talking to the assistant, and a recipes screen for browsing and viewing saved recipes.
- **`backend/`** — an Express API (TypeScript, run with `tsx`). The chat endpoint drives a [LangChain](https://langchain.com) agent backed by Google **Gemini** (`gemini-2.5-flash`) with tools to save and update recipes. Recipes, tags, chat sessions, and messages are stored in **PostgreSQL** via **Prisma**, with `pgvector` embeddings on recipes and tags. Recipe images are generated via `@google/genai`.
- **`infra/`** — Terraform + scripts to deploy the backend to **Google Cloud Run**, with secrets in Secret Manager and the database on [Neon](https://neon.tech). See [infra/README.md](infra/README.md) for details.

All backend requests from the app are authenticated with an `x-api-key` header.

## Prerequisites

- **Node.js 24** (see [.tool-versions](.tool-versions))
- A **PostgreSQL** database with the `vector` extension (a free [Neon](https://neon.tech) database works well)
- A **Gemini API key** ([Google AI Studio](https://aistudio.google.com))
- For the mobile app: the [Expo Go](https://expo.dev/go) app on your phone, or an iOS/Android simulator

## Running locally

### 1. Install dependencies

```bash
# from the repo root (installs root + backend workspace)
npm install

# the app has its own package.json
cd app && npm install && cd ..
```

### 2. Configure the backend

Create `backend/.env`:

```bash
DATABASE_URL=postgres://...        # your Postgres/Neon dev database
GEMINI_API_KEY=...                 # Gemini API key
BACKEND_API_KEY=...                # any secret string; the app must send the same value
```

Then apply the database migrations:

```bash
npm run deploy:dev   # runs `prisma migrate dev` in the backend workspace
```

### 3. Start the backend

```bash
npm run dev
```

The API listens on port `8080` by default (override with `PORT`). A health check is available at `GET /health`.

### 4. Configure and start the app

Create `app/.env`:

```bash
EXPO_PUBLIC_API_URL=http://<your-machine-ip>:8080   # not localhost if testing on a physical phone
EXPO_PUBLIC_BACKEND_API_KEY=...                     # same value as BACKEND_API_KEY above
```

Then start Expo:

```bash
cd app
npm start            # scan the QR code with Expo Go
# or:
npm run ios          # iOS simulator
npm run android      # Android emulator
npm run start:tunnel # tunnel mode, useful if your phone can't reach your machine directly
```

## Checks

Before committing, make sure both pass:

```bash
npm run biome:check   # lint/format
npm run typecheck     # backend + app TypeScript
# or both at once:
npm run check
```

## Deployment

The backend deploys to Cloud Run with a single command from the repo root:

```bash
npm run deploy:backend
```

This builds and pushes the Docker image, manages the backend API key secret, and runs `terraform apply`. Full details, required secrets, and the Neon environment mapping are documented in [infra/README.md](infra/README.md).
