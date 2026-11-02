import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the agent so we can see what the endpoint builds it with.
const { createChatAgent } = vi.hoisted(() => ({ createChatAgent: vi.fn() }));
vi.mock("../src/endpoints/chat/agent", () => ({ MODEL_NAME: "test-model", createChatAgent }));
vi.mock("../src/shared/db", () => import("./testDb"));

import { createApp } from "../src/app";
import { resetTestDb } from "./testDb";

const app = createApp();

describe("POST /chat prefetched pages", () => {
  beforeAll(() => {
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterAll(() => {
    process.env.GEMINI_API_KEY = undefined;
  });

  beforeEach(() => {
    resetTestDb();
    createChatAgent.mockReset();
    createChatAgent.mockReturnValue({
      invoke: vi.fn().mockResolvedValue({ messages: [{ content: "Here it is" }] }),
    });
  });

  it("hands well-formed device-fetched pages to the agent and drops malformed ones", async () => {
    const page = {
      url: "https://example.com/pancakes",
      status: 200,
      // Large enough to exceed express.json's 100kb default.
      jsonLd: [`{"@type":"Recipe","description":"${"x".repeat(200_000)}"}`],
    };

    const res = await request(app)
      .post("/chat")
      .set("x-api-key", "test-api-key")
      .send({
        messages: [{ role: "user", text: page.url }],
        prefetchedPages: [page, { url: "https://example.com/bad", status: "200" }, "junk"],
      });

    expect(res.status).toBe(200);
    expect(createChatAgent).toHaveBeenCalledWith(expect.any(String), [page]);
  });

  it("passes no pages when the app sent none", async () => {
    await request(app)
      .post("/chat")
      .set("x-api-key", "test-api-key")
      .send({ messages: [{ role: "user", text: "hi" }] });

    expect(createChatAgent).toHaveBeenCalledWith(expect.any(String), []);
  });
});
