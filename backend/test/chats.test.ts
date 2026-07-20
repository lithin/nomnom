import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/shared/db", () => import("./testDb"));

import { createApp } from "../src/app";
import { resetTestDb, testDb } from "./testDb";

const app = createApp();
const API_KEY = "test-api-key";

const seedSessions = async (count: number) => {
  const sessions = [];
  for (let index = 0; index < count; index += 1) {
    sessions.push(
      await testDb.chatSession.create({
        data: {
          title: `Chat ${index + 1}`,
          createdAt: new Date(Date.UTC(2026, 6, 1, 10, index)),
        },
      }),
    );
  }
  return sessions;
};

describe("GET /chats", () => {
  beforeEach(() => {
    resetTestDb();
  });

  it("returns a page of chats with pagination metadata", async () => {
    await seedSessions(3);

    const response = await request(app)
      .get("/chats?limit=2&offset=0")
      .set("x-api-key", API_KEY)
      .expect(200);

    expect(response.body.chats).toHaveLength(2);
    expect(response.body.totalCount).toBe(3);
    expect(response.body.hasMore).toBe(true);

    // Newest first.
    expect(response.body.chats[0].title).toBe("Chat 3");
  });

  it("reports hasMore=false on the final page", async () => {
    await seedSessions(3);

    const response = await request(app)
      .get("/chats?limit=2&offset=2")
      .set("x-api-key", API_KEY)
      .expect(200);

    expect(response.body.chats).toHaveLength(1);
    expect(response.body.hasMore).toBe(false);
  });
});

describe("GET /chats/:chatId/messages", () => {
  beforeEach(() => {
    resetTestDb();
  });

  it("returns messages in chronological order", async () => {
    const [session] = await seedSessions(1);
    await testDb.chatMessage.createMany({
      data: [
        {
          chatId: session.id,
          role: "assistant",
          text: "Second",
          createdAt: new Date("2026-07-01T10:00:01.000Z"),
        },
        {
          chatId: session.id,
          role: "user",
          text: "First",
          createdAt: new Date("2026-07-01T10:00:00.000Z"),
        },
      ],
    });

    const response = await request(app)
      .get(`/chats/${session.id}/messages`)
      .set("x-api-key", API_KEY)
      .expect(200);

    expect(response.body.messages.map((m: { text: string }) => m.text)).toEqual([
      "First",
      "Second",
    ]);
  });

  it("returns 404 for an unknown chat", async () => {
    await request(app).get("/chats/nope/messages").set("x-api-key", API_KEY).expect(404);
  });
});
