import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/shared/db", () => import("./testDb"));

import { createApp } from "../src/app";
import { resetTestDb, testDb } from "./testDb";

const app = createApp();
const API_KEY = "test-api-key";

const seedLinkedRecipe = async () => {
  const session = await testDb.chatSession.create({
    data: { title: "Carbonara" },
  });
  await testDb.chatMessage.createMany({
    data: [
      {
        chatId: session.id,
        role: "user",
        text: "Give me a carbonara recipe",
        createdAt: new Date("2026-07-01T10:00:00.000Z"),
      },
      {
        chatId: session.id,
        role: "assistant",
        text: "Here is a carbonara recipe: eggs, guanciale, pecorino.",
        createdAt: new Date("2026-07-01T10:00:01.000Z"),
      },
    ],
  });
  return testDb.recipe.create({
    data: {
      title: "Carbonara",
      content: "Eggs, guanciale, pecorino.",
      chatSessionId: session.id,
    },
  });
};

const seedUnlinkedRecipe = () =>
  testDb.recipe.create({
    data: {
      title: "Lemon Pancakes",
      content: "Flour, lemon, eggs.",
      chatSessionId: null,
    },
  });

describe("GET /recipes", () => {
  beforeEach(() => {
    resetTestDb();
  });

  it("rejects requests without a valid API key", async () => {
    await request(app).get("/recipes").expect(401);
    await request(app).get("/recipes").set("x-api-key", "wrong-key").expect(401);
  });

  it("returns every recipe with a chatSessionId, backfilling recipes without one", async () => {
    const linked = await seedLinkedRecipe();
    const unlinked = await seedUnlinkedRecipe();

    const response = await request(app).get("/recipes").set("x-api-key", API_KEY).expect(200);

    const { recipes } = response.body as {
      recipes: Array<{ id: string; title: string; chatSessionId: string | null }>;
    };

    expect(recipes).toHaveLength(2);
    for (const recipe of recipes) {
      expect(recipe.chatSessionId).toBeTruthy();
    }

    const linkedResult = recipes.find((r) => r.id === linked.id);
    expect(linkedResult?.chatSessionId).toBe(linked.chatSessionId);

    // The previously unlinked recipe got a persisted session, not a throwaway id.
    const backfilledId = recipes.find((r) => r.id === unlinked.id)?.chatSessionId;
    const backfilledSession = await testDb.chatSession.findUnique({
      where: { id: backfilledId ?? "" },
    });
    expect(backfilledSession).not.toBeNull();
  });

  it("seeds a backfilled chat so the edit chat opens with the recipe context", async () => {
    const unlinked = await seedUnlinkedRecipe();

    const listResponse = await request(app).get("/recipes").set("x-api-key", API_KEY).expect(200);
    const chatSessionId = listResponse.body.recipes[0].chatSessionId as string;

    const messagesResponse = await request(app)
      .get(`/chats/${chatSessionId}/messages`)
      .set("x-api-key", API_KEY)
      .expect(200);

    const { messages } = messagesResponse.body as {
      messages: Array<{ role: string; text: string }>;
    };

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("user");
    expect(messages[0].text).toContain(unlinked.title);
    expect(messages[1].role).toBe("assistant");
    expect(messages[1].text).toContain(unlinked.content);
  });

  it("backfills at most once: repeated fetches keep the same chatSessionId", async () => {
    await seedUnlinkedRecipe();

    const first = await request(app).get("/recipes").set("x-api-key", API_KEY).expect(200);
    const second = await request(app).get("/recipes").set("x-api-key", API_KEY).expect(200);

    expect(second.body.recipes[0].chatSessionId).toBe(first.body.recipes[0].chatSessionId);

    const sessionCount = await testDb.chatSession.count();
    expect(sessionCount).toBe(1);
  });
});

describe("GET /recipes/:id", () => {
  beforeEach(() => {
    resetTestDb();
  });

  it("rejects requests without a valid API key", async () => {
    const recipe = await seedLinkedRecipe();
    await request(app).get(`/recipes/${recipe.id}`).expect(401);
    await request(app).get(`/recipes/${recipe.id}`).set("x-api-key", "wrong-key").expect(401);
  });

  it("returns the recipe with its tags flattened to names", async () => {
    const linked = await seedLinkedRecipe();

    const response = await request(app)
      .get(`/recipes/${linked.id}`)
      .set("x-api-key", API_KEY)
      .expect(200);

    expect(response.body.id).toBe(linked.id);
    expect(response.body.title).toBe("Carbonara");
    expect(response.body.chatSessionId).toBe(linked.chatSessionId);
    expect(Array.isArray(response.body.tags)).toBe(true);
  });

  it("responds 404 for an unknown id", async () => {
    await request(app)
      .get("/recipes/00000000-0000-0000-0000-000000000000")
      .set("x-api-key", API_KEY)
      .expect(404);
  });

  it("backfills a chatSessionId for a recipe without one", async () => {
    const unlinked = await seedUnlinkedRecipe();

    const response = await request(app)
      .get(`/recipes/${unlinked.id}`)
      .set("x-api-key", API_KEY)
      .expect(200);

    expect(response.body.chatSessionId).toBeTruthy();

    // A persisted session, not a throwaway id.
    const session = await testDb.chatSession.findUnique({
      where: { id: response.body.chatSessionId },
    });
    expect(session).not.toBeNull();
  });

  it("backfills at most once: repeated fetches keep the same chatSessionId", async () => {
    const unlinked = await seedUnlinkedRecipe();

    const first = await request(app)
      .get(`/recipes/${unlinked.id}`)
      .set("x-api-key", API_KEY)
      .expect(200);
    const second = await request(app)
      .get(`/recipes/${unlinked.id}`)
      .set("x-api-key", API_KEY)
      .expect(200);

    expect(second.body.chatSessionId).toBe(first.body.chatSessionId);
    expect(await testDb.chatSession.count()).toBe(1);
  });
});

describe("DELETE /recipes/:id", () => {
  beforeEach(() => {
    resetTestDb();
  });

  it("deletes a recipe", async () => {
    const recipe = await seedLinkedRecipe();

    await request(app).delete(`/recipes/${recipe.id}`).set("x-api-key", API_KEY).expect(200);

    const remaining = await testDb.recipe.count();
    expect(remaining).toBe(0);
  });
});
