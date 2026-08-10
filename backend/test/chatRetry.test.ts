import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the agent so we can script Gemini's flaky outputs (empty completions,
// tool-code garble, clean replies) and assert the endpoint's retry loop.
const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }));
vi.mock("../src/endpoints/chat/agent", () => ({
  MODEL_NAME: "test-model",
  createChatAgent: () => ({ invoke: mockInvoke }),
}));
vi.mock("../src/shared/db", () => import("./testDb"));

import { createApp } from "../src/app";
import { UNEXECUTED_TOOL_CALL_MESSAGE } from "../src/endpoints/chat/replyGuards";
import { resetTestDb, testDb } from "./testDb";

const app = createApp();
const API_KEY = "test-api-key";

// Shape the endpoint reads: result.messages[last].content.
const agentResult = (content: unknown) => ({ messages: [{ content }] });
const EMPTY = agentResult([]);
const GARBLE = agentResult("```tool_code\nprint(default_api.saveRecipe())\n```");
const clean = (text: string) => agentResult(text);

// A turn where the saveRecipe tool ran (its ToolMessage carries the ready-made
// link) and the model then produced `reply` as its final message.
const savedResult = (reply: string, id: string) => ({
  messages: [
    {
      name: "saveRecipe",
      content: `Recipe successfully saved. Include this link in your reply so the user can open it: [Eggs](recipe://${id})`,
    },
    { content: reply },
  ],
});

const sendChat = () =>
  request(app)
    .post("/chat")
    .set("x-api-key", API_KEY)
    .send({ messages: [{ role: "user", text: "save it" }] });

describe("POST /chat retry loop", () => {
  beforeAll(() => {
    // setup.ts deletes GEMINI_API_KEY; the endpoint needs it set to proceed.
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterAll(() => {
    process.env.GEMINI_API_KEY = undefined;
  });

  beforeEach(() => {
    resetTestDb();
    mockInvoke.mockReset();
  });

  it("does not retry when the first reply is usable", async () => {
    mockInvoke.mockResolvedValueOnce(clean("Here you go!"));

    const res = await sendChat();

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("Here you go!");
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it("retries an empty completion and returns the recovered reply", async () => {
    mockInvoke
      .mockResolvedValueOnce(EMPTY)
      .mockResolvedValueOnce(clean("Saved! [Eggs](recipe://abc-123)"));

    const res = await sendChat();

    expect(res.body.reply).toBe("Saved! [Eggs](recipe://abc-123)");
    expect(mockInvoke).toHaveBeenCalledTimes(2);

    // The recovered reply is what gets persisted to the chat history.
    const messages = await testDb.chatMessage.findMany({ where: { role: "assistant" } });
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toBe("Saved! [Eggs](recipe://abc-123)");
  });

  it("gives up after exactly 3 attempts when every reply is empty", async () => {
    mockInvoke.mockResolvedValue(EMPTY);

    const res = await sendChat();

    expect(res.body.reply).toBe("Could not generate response");
    expect(mockInvoke).toHaveBeenCalledTimes(3);
    // A failed turn is not persisted as an assistant message.
    expect(await testDb.chatMessage.count({ where: { role: "assistant" } })).toBe(0);
  });

  it("surfaces the tool-code error after 3 garbled attempts", async () => {
    mockInvoke.mockResolvedValue(GARBLE);

    const res = await sendChat();

    expect(res.body.reply).toBe(UNEXECUTED_TOOL_CALL_MESSAGE);
    expect(mockInvoke).toHaveBeenCalledTimes(3);
    expect(await testDb.chatMessage.count({ where: { role: "assistant" } })).toBe(0);
  });

  it("appends the saved-recipe link when the model reply omits it", async () => {
    mockInvoke.mockResolvedValueOnce(savedResult("Saved! Enjoy your dinner.", "abc-123"));

    const res = await sendChat();

    expect(res.body.reply).toBe("Saved! Enjoy your dinner.\n\n[Eggs](recipe://abc-123)");
    // The enforced link is persisted to chat history, not just the response.
    const messages = await testDb.chatMessage.findMany({ where: { role: "assistant" } });
    expect(messages[0].text).toBe("Saved! Enjoy your dinner.\n\n[Eggs](recipe://abc-123)");
  });

  it("does not duplicate the link when the model already included it", async () => {
    mockInvoke.mockResolvedValueOnce(savedResult("Saved it: [Eggs](recipe://abc-123)", "abc-123"));

    const res = await sendChat();

    expect(res.body.reply).toBe("Saved it: [Eggs](recipe://abc-123)");
  });
});
